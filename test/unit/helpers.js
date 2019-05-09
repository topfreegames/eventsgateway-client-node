const parsePrometheusResponse = (text) => {
  const messages = text.split(/\r?\n/)
  return messages.map((m) => {
    if (m.startsWith('#') || m.length === 0) {
      return null
    }
    const re = /(.*){(.*)}\s(\d)/
    const matches = re.exec(m)
    const tags = {}
    matches[2].split(',').forEach((t) => {
      tags[t.split('=')[0]] = JSON.parse(t.split('=')[1])
    })
    return { metric: matches[1], tags, val: parseInt(matches[3], 10) }
  }).filter(m => !!m)
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

module.exports = {
  parsePrometheusResponse,
  sleep
}
