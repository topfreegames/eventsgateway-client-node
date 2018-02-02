const grpc = require('grpc')
const path = require('path')
const uuid = require('uuid/v4')
const defaultConfig = require('./config/default.json')

// protoPath must be absolute
const protoPath = path.resolve(__dirname, './protos/eventsgateway/grpc/protobuf/events.proto')
const eventsProto = grpc.load(protoPath).eventforwarder

class Client {
  constructor(config, topic) {
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
  }

  * sendToTopic(name, topic, props) {
    const args = {
      id: uuid(),
      name,
      topic,
      props,
      timestamp: Date.now(),
    }
    return yield new Promise((resolve, reject) => {
      this.grpcClient.sendEvent(args, (err, res) => {
        if (err) {
          return reject(err)
        }
        return resolve(res)
      })
    })
  }

  * send(name, props) {
    return yield this.sendToTopic(name, this.topic, props)
  }
}

module.exports = Client
