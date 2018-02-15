const StatsD = require('hot-shots')

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

class Client {
  constructor(options) {
    this.options = JSON.parse(JSON.stringify(options))
    this.options.maxBufferSize = process.env.NODE_ENV === 'test' ? 0 : options.maxBufferSize || 1000
    this.options.bufferFlushInterval = options.bufferFlushInterval || 1000
    // eslint-disable-next-line eqeqeq
    this.options.cacheDns = (options.cacheDns != undefined) ? options.cacheDns : true
    this.options.sampleRate = options.sampleRate || 1
    this.options.mock = process.env.NODE_ENV === 'test' ? true : options.mock
    this.client = new StatsD(this.options)
  }

  report(metric, topic, method, duration, err) {
    // folows https://godoc.org/google.golang.org/grpc/codes convention
    const status = err ? err.code : 0
    const tags = [
      `status_code:${status}`,
      `topic:${topic}`,
      `method:${method}`,
    ].concat(this.globalTags)
    this.client.histogram(metric, duration, tags)
  }
}

module.exports = Client
