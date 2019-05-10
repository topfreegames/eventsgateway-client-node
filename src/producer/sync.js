const grpc = require('grpc')
const path = require('path')
const WaitGroup = require('./waitGroup')
const MetricsReporter = require('./../lib/metricsReporter')
const util = require('./../lib/util')
const protoPath = path.resolve(__dirname, './protos/eventsgateway/grpc/protobuf/events.proto')
const eventsProto = grpc.load(protoPath).eventsgateway

class Sync {
  constructor(config, logger) {
    this.config = config
    this.address = this.config.grpc.serveraddress
    if (!this.address) {
      throw Error('no grpc server address informed')
    }
    this.logger = logger.child({ address: this.address })
    this.grpcClient = new eventsProto.GRPCForwarder(
      this.address, grpc.credentials.createInsecure()
    )
    this.metrics = new MetricsReporter(this.config)
    this.method = '/eventsgateway.GRPCForwarder/SendEvent'
    this.waitIntervalMs = util.getValue(this.config.producer, 'waitIntervalMs', 1000)
    const waitIntervalMs = util.getValue(this.config.producer, 'waitIntervalMs', 1000)
    this.wg = new WaitGroup(this.logger, waitIntervalMs)
  }

  send (event, logger) {
    this.wg.add(1)
    const startTime = Date.now()
    const l = logger.child({ address: this.address, method: this.method })
    return new Promise((resolve, reject) => {
      this.grpcClient.sendEvent(event, (err, res) => {
        const timeElapsed = Date.now() - startTime
        this.metrics.reportResponseTime(this.method, event.topic, timeElapsed, err)
        l.child({ timeElapsed, reply: res }).debug('request processed')
        if (err) {
          this.metrics.reportFailure(this.method, event.topic, err)
          l.child({ timeElapsed, err }).error('error processing request')
          this.wg.done(1)
          return reject(err)
        }
        this.metrics.reportSuccess(this.method, event.topic)
        this.wg.done(1)
        return resolve(res)
      })
    })
  }

  gracefulStop () {
    return this.wg.wait()
  }
}

module.exports = Sync
