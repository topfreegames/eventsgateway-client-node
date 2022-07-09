const { v4: uuidv4 } = require('uuid');
require("core-js/stable");
require("regenerator-runtime/runtime");
const defaultConfig = require('./config/default.json')
const logger = require('./lib/logger')
const producer = require('./producer')

class Client {
  constructor (config, topic) {
    this.config = config || defaultConfig
    this.topic = topic || this.config.kafkatopic
    if (!this.topic) {
      throw Error('no kafka topic informed')
    }
    this.logger = logger.child({
      source: 'eventsgateway/client',
      topic: this.topic,
    })
    const pClass = this.config.producer.async ? producer.Async : producer.Sync
    this.producer = new pClass(this.config, this.logger)
  }

  sendToTopic (name, topic, props) {
    if (!name) {
      throw Error('event name cannot be empty')
    }
    if (!topic) {
      throw Error('topic cannot be empty')
    }
    const event = {
      id: uuidv4(),
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

  send (name, props) {
    return this.sendToTopic(name, this.topic, props)
  }

  gracefulStop () {
    return this.producer.gracefulStop()
  }
}

module.exports = Client
