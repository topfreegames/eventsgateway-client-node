const os = require('os')
const metricsPrometheus = require('./metricsPrometheus')

class MetricsReporter {
  constructor(config) {
    this.hostname = os.hostname()
    this.prometheus = metricsPrometheus
  }

  reportResponseTime(method, topic, timeElapsed, err) {
    this.prometheus.clientRequestsResponseTime.labels(
      this.hostname,
      method,
      topic
    ).observe(timeElapsed)
  }

  reportFailure(method, topic, err) {
    const e = err.toString()
    this.prometheus.clientRequestsFailureCounter.labels(
      this.hostname,
      method,
      topic,
      e
    ).inc()
  }

  reportSuccess(method, topic) {
    this.prometheus.clientRequestsSuccessCounter.labels(
      this.hostname,
      method,
      topic
    ).inc()
  }

  reportDropped(topic) {
    this.prometheus.clientRequestsDroppedCounter.labels(
      this.hostname,
      topic
    ).inc()
  }
}

module.exports = MetricsReporter
