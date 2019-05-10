class WaitGroup {
  constructor (logger, waitIntervalMs = 1000) {
    this.count = 0
    this.logger = logger
    this.waitIntervalMs = waitIntervalMs
  }

  add (num = 1) {
    this.count += num
  }

  done (num = 1) {
    this.count -= num
  }

  async wait () {
    if (this.count === 0) {
      return
    }
    this.logger.info(`waiting on ${this.count} events`)
    await new Promise(resolve => {
      setTimeout(async () => {
        await this.wait()
        resolve()
      }, this.waitIntervalMs)
    })
  }
}

module.exports = WaitGroup
