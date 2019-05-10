const grpc = require('grpc')
const path = require('path')
const uuid = require('uuid/v4')
const MetricsReporter = require('./../lib/metricsReporter')
const util = require('./../lib/util')
const protoPath = path.resolve(__dirname, './protos/eventsgateway/grpc/protobuf/events.proto')
const eventsProto = grpc.load(protoPath).eventsgateway

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
    this.waitIntervalMs = util.getValue(this.config.producer, 'waitIntervalMs', 1000)
    this.batch = []
    this.currentSendEventsRef = null
    this.waitCount = 0
  }

  send (event) {
    this.waitCount++
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
      id: uuid(),
      retry: 0,
      events
    }
    this.waitCount++ // wait on this batch
    this.waitCount -= req.events.length // stop waiting on it's individual events
    this.__sendEvents(req, 0)
  }

  async gracefulStop () {
    if (this.waitCount === 0) {
      return
    }
    this.logger.info(`waiting on ${this.waitCount} events`)
    await new Promise(resolve => {
      setTimeout(async () => {
        await this.gracefulStop()
        resolve()
      }, this.waitIntervalMs)
    })
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
      this.waitCount--
      return
    }
    const startTime = Date.now()
    this.grpcClient.sendEvents(req, (err, res) => {
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
      let fc = 0
      req.events.forEach((event, i) => {
        if (failureIndexes.length > fc && i === failureIndexes[fc]) {
          this.metrics.reportFailure(this.method, event.topic, "couldn't produce event")
          fc++
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
      this.waitCount--
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
