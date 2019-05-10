const grpc = require('grpc')
const path = require('path')
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
    this.waitCount = 0
  }

  send (event, logger) {
    this.waitCount++
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
          this.waitCount--
          return reject(err)
        }
        this.metrics.reportSuccess(this.method, event.topic)
        this.waitCount--
        return resolve(res)
      })
    })
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
}

module.exports = Sync
