/* eslint-disable import/no-extraneous-dependencies */
const os = require('os')
const prometheusclient = require('prom-client')
const sap = require('supertest-as-promised')
const sinon = require('sinon')
const uuid = require('uuid/v4')
const { expect } = require('chai')
const {
  afterEach, beforeEach, describe, it,
} = require('mocha')
require('co-mocha')

const helpers = require('./helpers')
const producer = require('./../../src/producer')
const configDefault = require('./../../src/config/default.json')
const Client = require('./../../src/client')

describe('Async Producer', () => {
  let configTest = {}

  beforeEach(() => {
    configTest = JSON.parse(JSON.stringify(configDefault))
    configTest.producer.maxRetries = 0
    configTest.producer.retryIntervalMs = 0
    configTest.producer.batchSize = 1
    configTest.producer.lingerIntervalMs = 0
    configTest.producer.waitIntervalMs = 0
  })

  describe('Constructor', () => {
    it('returns sync client with default config', () => {
      const client = new Client()
      expect(client.config).to.equal(configDefault)
      expect(client.topic).to.equal(configDefault.kafkatopic)
      expect(client.producer).not.to.equal(undefined)
      expect(client.producer).to.be.an.instanceof(producer.Sync)
      expect(client.logger).not.to.equal(undefined)
      expect(client.producer.metrics).not.to.equal(undefined)
      expect(client.producer.metrics.hostname).to.equal(os.hostname())
      expect(client.producer.metrics.prometheus).not.to.equal(undefined)
    })

    it('returns async client with modified test config', () => {
      configTest.producer.async = true
      const client = new Client(configTest, 'my-topic')
      expect(client.config).to.equal(configTest)
      expect(client.topic).to.equal('my-topic')
      expect(client.producer).not.to.equal(undefined)
      expect(client.producer).to.be.an.instanceof(producer.Async)
      expect(client.logger).not.to.equal(undefined)
      expect(client.producer.metrics).not.to.equal(undefined)
      expect(client.producer.metrics.hostname).to.equal(os.hostname())
      expect(client.producer.metrics.prometheus).not.to.equal(undefined)
    })
  })

  describe('Send To Topic', () => {
    let client
    let sendEventsStub
    let name
    let props
    let topic
    let request

    beforeEach(() => {
      configTest.producer.async = true
      configTest.producer.maxRetries = 0
      client = new Client(configTest, 'my-topic')
      sendEventsStub = sinon.stub(client.producer.grpcClient, 'sendEvents')
      name = 'EventName'
      props = {
        prop1: 'val1',
        prop2: 'val2',
      }
      topic = 'my-topic'
      prometheusclient.register.resetMetrics()
      metricsServer = client.producer.metrics.prometheus.listen()
      request = sap.agent(metricsServer)
    })

    afterEach(() => {
      client.producer.grpcClient.sendEvents.restore()
      metricsServer.close()
    })

    it('sends event to specific topic', function* () {
      sendEventsStub.callsArgWith(1, null, {})
      client.sendToTopic(name, topic, props)
      expect(sendEventsStub.calledOnce).to.equal(true)
      const req = sendEventsStub.getCall(0).args[0]
      expect(req.id).to.be.a('string')
      expect(req.id).to.have.length.gt(0)
      expect(req.events).to.be.instanceof(Array)
      expect(req.events).to.have.lengthOf(1)
      expect(req.retry).to.equal(0)
      const event = req.events[0]
      expect(event.id).to.be.a('string')
      expect(event.id).to.have.length.gt(0)
      expect(event.name).to.equal(name)
      expect(event.topic).to.equal(topic)
      expect(event.props).to.equal(props)
      expect(event.timestamp).to.be.a('number')
      expect(event.timestamp).to.be.approximately(Date.now(), 100)
    })

    it('failures are reported', function* () {
      const error = new Error('some error occurred')
      sendEventsStub.callsArgWith(1, error, null)
      client.sendToTopic(name, topic, props)
      expect(sendEventsStub.calledOnce).to.equal(true)
      const metricsRes = yield request.get('/metrics')
      expect(metricsRes.status).to.equal(200)
      expect(metricsRes.headers['content-type']).to.equal(prometheusclient.contentType)
      expect(metricsRes.text).not.to.have.length(0)
      const parsedRes = helpers.parsePrometheusResponse(metricsRes.text)
        .filter(r => r.tags.topic === client.topic)
      let counterFailureShow = 0
      let counterSuccessShow = 0
      parsedRes.forEach(r => {
        if (r.metric === 'eventsgateway_client_requests_failure_counter') {
          counterFailureShow++
          expect(r.val).to.equal(1)
          expect(r.tags.clientHost).to.equal(os.hostname())
          expect(r.tags.route).to.equal('/eventsgateway.GRPCForwarder/SendEvents')
          expect(r.tags.topic).to.equal('my-topic')
          expect(r.tags.reason).to.equal('Error: some error occurred')
        } else if (r.metric === 'eventsgateway_client_requests_success_counter') {
          counterSuccessShow++
        }
      })
      expect(counterFailureShow).to.be.equal(1)
      expect(counterSuccessShow).to.be.equal(0)
    })

    const rebuildClient = configTest => {
      client = new Client(configTest, 'my-topic')
      sendEventsStub = sinon.stub(client.producer.grpcClient, 'sendEvents')
    }

    describe('Retries', () => {
      it('should retry on error', async () => {
        configTest.producer.async = true
        configTest.producer.maxRetries = 1
        rebuildClient(configTest)
        const error = new Error('some error occurred')
        sendEventsStub.onCall(0).callsArgWith(1, error, null)
        sendEventsStub.onCall(1).callsArgWith(1, null, {})
        client.sendToTopic(name, topic, props)
        await helpers.sleep(5)
        expect(sendEventsStub.callCount).to.equal(2)
      })

      it('should retry only failed indexes', async () => {
        configTest.producer.async = true
        configTest.producer.lingerIntervalMs = 10
        configTest.producer.batchSize = 2
        configTest.producer.maxRetries = 1
        rebuildClient(configTest)
        sendEventsStub.onCall(0).callsArgWith(1, null, { failureIndexes: [1] })
        sendEventsStub.onCall(1).callsArgWith(1, null, { failureIndexes: [] })
        client.sendToTopic('event-0', topic, props)
        client.sendToTopic('event-1', topic, props)
        await helpers.sleep(5)
        expect(sendEventsStub.callCount).to.equal(2)
        expect(sendEventsStub.getCall(0).args.length).to.equal(2)
        expect(sendEventsStub.getCall(0).args[0].events).to.be.instanceof(Array)
        expect(sendEventsStub.getCall(0).args[0].events.length).to.be.equal(2)
        expect(sendEventsStub.getCall(0).args[0].events[0].name).to.be.equal('event-0')
        expect(sendEventsStub.getCall(0).args[0].events[1].name).to.be.equal('event-1')
        expect(sendEventsStub.getCall(1).args.length).to.equal(2)
        expect(sendEventsStub.getCall(1).args[0].events).to.be.instanceof(Array)
        expect(sendEventsStub.getCall(1).args[0].events.length).to.be.equal(1)
        expect(sendEventsStub.getCall(1).args[0].events[0].name).to.be.equal('event-1')
      })

      it('should drop failed indexes after max retries', async () => {
        configTest.producer.async = true
        configTest.producer.lingerIntervalMs = 10
        configTest.producer.batchSize = 2
        configTest.producer.maxRetries = 1
        rebuildClient(configTest)
        sendEventsStub.onCall(0).callsArgWith(1, null, { failureIndexes: [1] })
        sendEventsStub.onCall(1).callsArgWith(1, null, { failureIndexes: [0] })
        client.sendToTopic('event-0', topic, props)
        client.sendToTopic('event-1', topic, props)
        await helpers.sleep(5)
        expect(sendEventsStub.callCount).to.equal(2)
        expect(sendEventsStub.getCall(0).args.length).to.equal(2)
        expect(sendEventsStub.getCall(0).args[0].events).to.be.instanceof(Array)
        expect(sendEventsStub.getCall(0).args[0].events.length).to.be.equal(2)
        expect(sendEventsStub.getCall(0).args[0].events[0].name).to.be.equal('event-0')
        expect(sendEventsStub.getCall(0).args[0].events[1].name).to.be.equal('event-1')
        expect(sendEventsStub.getCall(1).args.length).to.equal(2)
        expect(sendEventsStub.getCall(1).args[0].events).to.be.instanceof(Array)
        expect(sendEventsStub.getCall(1).args[0].events.length).to.be.equal(1)
        expect(sendEventsStub.getCall(1).args[0].events[0].name).to.be.equal('event-1')
      })
    })

    describe('Batches', () => {
      it('should wait for lingerIntervalMs when not complete', async () => {
        configTest.producer.async = true
        configTest.producer.batchSize = 2
        configTest.producer.lingerIntervalMs = 5
        rebuildClient(configTest)
        sendEventsStub.onCall(0).callsArgWith(1, null, {})
        client.sendToTopic(name, topic, props)
        expect(sendEventsStub.callCount).to.equal(0)
        await helpers.sleep(10)
        expect(sendEventsStub.callCount).to.equal(1)
        expect(sendEventsStub.getCall(0).args.length).to.equal(2)
        expect(sendEventsStub.getCall(0).args[0].events).to.be.instanceof(Array)
        expect(sendEventsStub.getCall(0).args[0].events.length).to.be.equal(1)
        expect(sendEventsStub.getCall(0).args[0].events[0].name).to.be.equal(name)
      })
    })

    describe('Wait', () => {
      it('should wait until all events are sent or max retries', async () => {
        configTest.producer.async = true
        configTest.producer.batchSize = 2
        configTest.producer.lingerIntervalMs = 10
        configTest.producer.waitIntervalMs = 6
        rebuildClient(configTest)
        sendEventsStub.onCall(0).callsArgWith(1, null, {})
        gracefulStopStub = sinon.stub(client.producer.wg, 'wait')
        gracefulStopStub.callThrough()
        client.sendToTopic(name, topic, props)
        await helpers.sleep(5)
        expect(sendEventsStub.callCount).to.equal(0)
        await client.gracefulStop()
        expect(sendEventsStub.callCount).to.equal(1)
        expect(gracefulStopStub.callCount).to.equal(2)
      })
    })
  })
})
