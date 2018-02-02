const client = require('prom-client')
const Koa = require('koa')
const Router = require('koa-router')
const logger = require('./logger')

const app = new Koa()
const router = new Router()

process.env.NODE_ENV = process.env.NODE_ENV || 'development'
process.env.EVENTSGATEWAY_PROMETHEUS_PORT = process.env.EVENTSGATEWAY_PROMETHEUS_PORT || 9090

logger.debug('configuring app')
process.on('uncaughtException', err => (
  logger.error({ err }, 'caught exception')
))

// Prometheus Metrics
const clientRequestsResponseTime = new client.Summary({
  name: 'eventsgateway_client_response_time_ms',
  help: 'the response time in ms of calls to server',
  percentiles: [0.7, 0.95, 0.99],
  labelNames: ['clientHost', 'route', 'topic'],
})

const clientRequestsSuccessCounter = new client.Counter({
  name: 'eventsgateway_client_requests_success_counter',
  help: 'the count of successfull client requests to the server',
  labelNames: ['clientHost', 'route', 'topic'],
})

const clientRequestsFailureCounter = new client.Counter({
  name: 'eventsgateway_client_requests_failure_counter',
  help: 'the count of failed client requests to the server',
  labelNames: ['clientHost', 'route', 'topic', 'reason'],
})

// Catch all uncaught errors
app.use(function* validate(next) {
  try {
    yield next
  } catch (err) {
    this.status = 500
    logger.error({ err }, 'uncaught exception')
    this.body = { error: err }
  }
})

// Routes
app.use(router.routes())

app.on('error', err => (
  logger.error({ err }, err.message)
))


logger.debug('finished configuring app...')
router.get('/metrics', function* metrics(next) {
  this.set('Content-Type', client.register.contentType)
  this.body = client.register.metrics()
  this.status = 200
  yield next
})

module.exports = {
  listen: () => {
    const port = process.env.EVENTSGATEWAY_PROMETHEUS_PORT
    return app.listen(port, (err) => {
      if (err) {
        logger.error(err)
      } else {
        logger.info(`Prometheus Metrics API listening on port ${port}`)
      }
    })
  },
  clientRequestsResponseTime,
  clientRequestsSuccessCounter,
  clientRequestsFailureCounter,
}
