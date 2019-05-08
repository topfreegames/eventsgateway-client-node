const bunyan = require('bunyan')

const level = process.env.LOG_LEVEL || 'info'

const logger = bunyan.createLogger(Object.assign({
  streams: [{ stream: process.stdout, level }],
  serializers: bunyan.stdSerializers,
}, { name: 'eventsgateway/client', src: false }))

module.exports = logger
