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
const clientRequestsResponseTime = new client.Histogram({
  name: 'eventsgateway_client_response_time_ms',
  help: 'the response time in ms of calls to server',
  buckets: [1, 5, 10, 30, 90, 160, 240],
  labelNames: ['route', 'topic'],
})

const clientRequestsSuccessCounter = new client.Counter({
  name: 'eventsgateway_client_requests_success_counter',
  help: 'the count of successfull client requests to the server',
  labelNames: ['route', 'topic'],
})

const clientRequestsFailureCounter = new client.Counter({
  name: 'eventsgateway_client_requests_failure_counter',
  help: 'the count of failed client requests to the server',
  labelNames: ['route', 'topic', 'reason'],
})

const clientRequestsDroppedCounter = new client.Counter({
  name: 'eventsgateway_client_requests_dropped_counter',
  help: 'the count of dropped client requests to the server',
  labelNames: ['topic'],
})

// Catch all uncaught errors
app.use((ctx, next) => {
  try {
    next()
  } catch (err) {
    ctx.status = 500
    logger.error({ err }, 'uncaught exception')
    ctx.body = { error: err }
  }
})

// Routes
app.use(router.routes())

app.on('error', err => (
  logger.error({ err }, err.message)
))


logger.debug('finished configuring app...')
router.get('/metrics', (ctx, next) => {
  ctx.set('Content-Type', client.register.contentType)
  ctx.body = client.register.metrics()
  ctx.status = 200
  next()
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
  clientRequestsDroppedCounter,
}
