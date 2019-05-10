const metricsPrometheus = require('./metricsPrometheus')

class MetricsReporter {
  constructor(config) {
    this.prometheus = metricsPrometheus
  }

  reportResponseTime(method, topic, timeElapsed, err) {
    this.prometheus.clientRequestsResponseTime.labels(
      method,
      topic
    ).observe(timeElapsed)
  }

  reportFailure(method, topic, err) {
    const e = err.toString()
    this.prometheus.clientRequestsFailureCounter.labels(
      method,
      topic,
      e
    ).inc()
  }

  reportSuccess(method, topic) {
    this.prometheus.clientRequestsSuccessCounter.labels(
      method,
      topic
    ).inc()
  }

  reportDropped(topic) {
    this.prometheus.clientRequestsDroppedCounter.labels(
      topic
    ).inc()
  }
}

module.exports = MetricsReporter
