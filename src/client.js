const grpc = require('grpc')
const uuid = require('uuid/v4')
const defaultConfig = require('./config/default.json')
const logger = require('./lib/logger')
const producer = require('./producer')

class Client {
  constructor(config, topic) {
    this.config = config || defaultConfig
    this.topic = topic || this.config.kafkatopic
    if (!this.topic) {
      throw Error('no kafka topic informed')
    }
    this.logger = logger.child({
      source: 'eventsgateway/client',
      topic: this.topic,
    })
    this.producer = new producer.Sync(this.config, topic)
  }

  sendToTopic(name, topic, props) {
    if (!name) {
      throw Error('event name cannot be empty')
    }
    if (!topic) {
      throw Error('topic cannot be empty')
    }
    // currently there are no interceptors in node-grpc
    // the proposal was already accepted
    // https://github.com/grpc/proposal/blob/master/L5-NODEJS-CLIENT-INTERCEPTORS.md
    // but the PR is still ongoing
    // https://github.com/grpc/grpc-node/pull/59
    const event = {
      id: uuid(),
      name,
      topic,
      props,
      timestamp: Date.now(),
    }
    const l = this.logger.child({
      operation: 'sendToTopic',
      event,
    })
    l.debug('sending event')
    return this.producer.send(event, l)
  }

  send(name, props) {
    return this.sendToTopic(name, this.topic, props)
  }
}

module.exports = Client
