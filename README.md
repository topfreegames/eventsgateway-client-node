[![Build Status](https://travis-ci.org/topfreegames/eventsgateway-client-node.svg?branch=master)](https://travis-ci.org/topfreegames/eventsgateway-client-node)

# eventsgateway-client-node
Node client for eventsgateway server.


## Install

```
npm install eventsgateway-client-node
```

Compatible with node 6+

## Example Usage

```javascript
const EventsGatewayClient = require('eventsgateway-client-node')

// config containing grpc server address and kafka topic
const config = {
  "producer": {
    "async": true, // if you want to use the async or sync dispatch
    "maxRetries": 3, // (async-only) how many times to retry a dispatch if it fails
    "retryIntervalMs": 1000, // (async-only) first wait time before a retry, formula => 2^retryNumber * retryInterval
    "batchSize": 10, // (async-only) maximum number of messages to send in a batch
    "lingerIntervalMs": 500, // (async-only) // how long to wait before sending messages, in the hopes of filling the batch
    "waitIntervalMs": 1000 // polling interval to check whether all events were sent before shutting down
  },
  "grpc": {
    "serveraddress": "localhost:9999",
    "timeout": 500
  },
  "kafkatopic": "default-topic" // default topic to send messages
}

// initialize the client
const eventsgatewayclient = new EventsGatewayClient(config)

// send event to configured topic
// calls should be wrapped in a try/catch
try {
  // async client, no need to await
  this.app.eventsGatewayClient.send('pingEvent', { some: 'value' })
  // sync client, block if you want to handle errors
  await this.app.eventsGatewayClient.send('pingEvent', { some: 'value' })
} catch (err) {
  // no need to log here, eventsGateway already logs failures
}

// send event to custom topic
try {
  // no need to `await` async send, if you're using sync client, use `await`
  // as well, and handle failures
  // async client, no need to await
  this.app.eventsGatewayClient.sendToTopic('pingEvent', 'my-topic', { some: 'value' })
  // sync client, block if you want to handle errors
  await this.app.eventsGatewayClient.sendToTopic('pingEvent', 'my-topic', { some: 'value' })
} catch (err) {}
```

## Metrics

### Prometheus

Response time, success and error counters are exposed in a koa app.
```javascript
// Prometheus metrics endpoint
// available at localhost:$EVENTSGATEWAY_PROMETHEUS_PORT
// defaults to localhost:9090
eventsgatewayclient.metrics.prometheus.listen() // blocking!
```
