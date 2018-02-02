const grpc = require('grpc')
const os = require('os')
const path = require('path')
const uuid = require('uuid/v4')
const defaultConfig = require('./config/default.json')

const logger = require('./lib/logger')
const metrics = require('./lib/metrics')

// protoPath must be absolute
const protoPath = path.resolve(__dirname, './protos/eventsgateway/grpc/protobuf/events.proto')
const eventsProto = grpc.load(protoPath).eventsgateway

class Client {
  constructor(config, topic) {
    this.hostname = os.hostname()
    this.config = config || defaultConfig
    this.topic = topic || this.config.kafkatopic
    if (!this.topic) {
      throw Error('no kafka topic informed')
    }

    const address = this.config.grpc.serveraddress
    if (!address) {
      throw Error('no grpc server address informed')
    }
    this.grpcClient = new eventsProto.GRPCForwarder(address, grpc.credentials.createInsecure())
    this.logger = logger.child({
      source: 'eventsgateway/client',
      topic: this.topic,
      serverAddr: address,
    })
    this.metrics = metrics
  }

  * sendToTopic(name, topic, props) {
    if (!name) {
      throw Error('event name cannot be empty')
    }
    if (!topic) {
      throw Error('topic cannot be empty')
    }
    const l = this.logger.child({
      operation: 'sendToTopic',
      event: name,
    })
    l.debug('sending event')
    const method = 'sendEvent'
    const startTime = Date.now()
    // currently there are no interceptors in node-grpc
    // the proposal was already accepted
    // https://github.com/grpc/proposal/blob/master/L5-NODEJS-CLIENT-INTERCEPTORS.md
    // but the PR is still ongoing
    // https://github.com/grpc/grpc-node/pull/59
    const args = {
      id: uuid(),
      name,
      topic,
      props,
      timestamp: Date.now(),
    }
    return yield new Promise((resolve, reject) => {
      this.grpcClient.sendEvent(args, (err, res) => {
        const timeUsed = Date.now() - startTime
        metrics.clientRequestsResponseTime.labels(this.hostname, method, topic).observe(timeUsed)
        l.child({ timeUsed, reply: res }).debug('request processed')
        if (err) {
          const e = err.toString()
          metrics.clientRequestsFailureCounter.labels(this.hostname, method, topic, e).inc()
          l.child({ timeUsed, err }).error('error processing request')
          return reject(err)
        }
        metrics.clientRequestsSuccessCounter.labels(this.hostname, method, topic).inc()
        return resolve(res)
      })
    })
  }

  * send(name, props) {
    return yield this.sendToTopic(name, this.topic, props)
  }
}

module.exports = Client
