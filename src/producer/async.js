const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path')
const { v4: uuidv4 } = require('uuid');
const WaitGroup = require('./waitGroup')
const MetricsReporter = require('./../lib/metricsReporter')
const util = require('./../lib/util')
const protoPath = path.resolve(__dirname, './protos/eventsgateway/grpc/protobuf/events.proto')
const packageDefinition = protoLoader.loadSync(protoPath);
const eventsProto = grpc.loadPackageDefinition(packageDefinition).eventsgateway;

class Async {
  constructor(config, logger) {
    this.config = config
    this.address = this.config.grpc.serveraddress
    if (!this.address) {
      throw Error('no grpc server address informed')
    }
    this.grpcClient = new eventsProto.GRPCForwarder(
      this.address, grpc.credentials.createInsecure()
    )
    this.logger = logger.child({ address: this.address })
    this.metrics = new MetricsReporter(this.config)
    this.method = '/eventsgateway.GRPCForwarder/SendEvents'
    this.lingerIntervalMs = util.getValue(this.config.producer, 'lingerIntervalMs', 500)
    this.batchSize = util.getValue(this.config.producer, 'batchSize', 10)
    this.maxRetries = util.getValue(this.config.producer, 'maxRetries', 3)
    this.retryIntervalMs = util.getValue(this.config.producer, 'retryIntervalMs', 1000)
    this.batch = []
    this.currentSendEventsRef = null
    const waitIntervalMs = util.getValue(this.config.producer, 'waitIntervalMs', 1000)
    this.wg = new WaitGroup(this.logger, waitIntervalMs)
    this.timeout = parseInt(util.getValue(this.config.grpc, 'timeout', 500))
  }

  send (event) {
    this.wg.add(1)
    this.batch = this.batch.concat(event)
    if (this.batch.length >= this.batchSize) {
      clearTimeout(this.currentSendEventsRef)
      this.sendEvents()
      return
    }
    this.currentSendEventsRef =
      setTimeout(this.sendEvents.bind(this), this.lingerIntervalMs)
  }

  sendEvents () {
    if (this.batch.length === 0) {
      return
    }
    const events = this.batch
    this.batch = []
    const req = {
      id: uuidv4(),
      retry: 0,
      events
    }
    this.wg.add(1) // wait on this batch
    this.wg.done(req.events.length) // stop waiting on it's individual events
    this.__sendEvents(req, 0)
  }

  gracefulStop () {
    return this.wg.wait()
  }

  __sendEvents (req) {
    const l = this.logger.child({
      requestId: req.id,
      method: this.method,
      retryCount: req.retry,
      size: req.events.length
    })
    if (req.retry > this.maxRetries) {
      l.info('dropped events due to max retries')
      req.events.forEach(event => this.metrics.reportDropped(event.topic))
      this.wg.done(1)
      return
    }
    const startTime = Date.now()
    this.grpcClient.sendEvents(req, { deadline: util.getDeadline(this.timeout) }, (err, res) => {
      const timeElapsed = Date.now() - startTime
      req.events.forEach(event => {
        this.metrics.reportResponseTime(this.method, event.topic, timeElapsed, err)
      })
      l.child({ timeElapsed, reply: res }).debug('request processed')
      if (err) {
        req.events.forEach(event => {
          this.metrics.reportFailure(this.method, event.topic, err)
        })
        l.child({ timeElapsed, err }).error('error processing request')
        this.__sendEventsWithRetryDelay(req)
        return
      }
      let failureIndexes = []
      if (res && res.failureIndexes && Array.isArray(res.failureIndexes)) {
        failureIndexes = res.failureIndexes
      }
      const failed = failureIndexes.reduce((acc, idx) => {
        acc[idx] = true
        return acc
      }, {})
      req.events.forEach((event, i) => {
        if (failed[i]) {
          this.metrics.reportFailure(this.method, event.topic, "couldn't produce event")
          return
        }
        this.metrics.reportSuccess(this.method, event.topic)
      })
      if (failureIndexes.length > 0) {
        const reqCpy = Object.assign({}, req)
        reqCpy.events = failureIndexes.map(i => req.events[i])
        this.__sendEventsWithRetryDelay(reqCpy)
        return
      }
      this.wg.done(1)
    })
  }

  __sendEventsWithRetryDelay (req) {
    setTimeout(
      () => {
        req.retry += 1
        this.__sendEvents(req)
      },
      Math.pow(2, req.retry) * this.retryIntervalMs
    )
  }
}

module.exports = Async
