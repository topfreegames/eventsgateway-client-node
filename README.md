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

// Prometheus metrics endpoint
// available at localhost:$EVENTSGATEWAY_PROMETHEUS_PORT
// defaults to localhost:9090
eventsgatewayclient.metrics.listen() // blocking!

// send event to configured topic
yield eventsgatewayclient.send('MyEvent1', { prop1: 'val1' })

// send event to custom topic
yield eventsgatewayclient.sendToTopic('MyEvent1', 'my-topic', { prop1: 'val1' })
```
