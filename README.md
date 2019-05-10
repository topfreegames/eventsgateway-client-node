[![Build Status](https://travis-ci.org/topfreegames/eventsgateway-client-node.svg?branch=master)](https://travis-ci.org/topfreegames/eventsgateway-client-node)

# eventsgateway-client-node
Node client for eventsgateway server.


### Install

```
npm install eventsgateway-client-node
```

Compatible with node 6+, uses generators instead of async/await for extended compatibility.


### Example Usage

```javascript
const EventsGatewayClient = require('eventsgateway-client-node')

// config containing grpc server address and kafka topic
const config = {
  "grpc": {
    "serveraddress": "localhost:9999"
  },
  "kafkatopic": "default-topic"
}

// initialize the client
const eventsgatewayclient = new EventsGatewayClient(config)

// send event to configured topic
// calls should be wrapped in a try/catch
try {
  yield this.app.eventsGatewayClient.send(
    'pingEvent',
    {
      status: `${123}`,     // all values must be sent as strings
      msg: 'my string msg',
    }
  )
} catch (err) {
  // no need to log here, eventsGateway already logs failures
}

// send event to custom topic
try {
  yield this.app.eventsGatewayClient.sendToTopic(
    'pingEvent',
	'my-topic'
    {
      status: `${123}`,
      msg: 'my string msg',
    }
  )
} catch (err) {}
```

### Metrics

### Datadog StatsD

```javascript
// include statds information for sending metrics
const config = {
  "grpc": {
    "serveraddress": "localhost:9999"
  },
  "kafkatopic": "default-topic",
  "statsd": {
    "host": "127.0.0.1",
    "port": 8125,
    "globalTags": ['game:my-game', `host:127.0.0.1`],
  }
}

```

Response time metrics including error codes will be sent to the given host and port.

### Prometheus

Response time, success and error counters are exposed in a koa app.
```javascript
// Prometheus metrics endpoint
// available at localhost:$EVENTSGATEWAY_PROMETHEUS_PORT
// defaults to localhost:9090
eventsgatewayclient.metrics.prometheus.listen() // blocking!
```
