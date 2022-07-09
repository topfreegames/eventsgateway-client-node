/* eslint-disable import/no-extraneous-dependencies */
const prometheusclient = require('prom-client')
const sap = require('supertest-as-promised')
const sinon = require('sinon')
const { v4: uuidv4 } = require('uuid');
const { expect } = require('chai')
const {
  afterEach, beforeEach, describe, it,
} = require('mocha')

const helpers = require('./helpers')
const configDefault = require('./../../src/config/default.json')
const Client = require('./../../src/client')

describe('Client', () => {
  describe('Constructor', () => {
    it('returns client if no error and default config and topic', () => {
      const client = new Client()
      expect(client.config).to.equal(configDefault)
      expect(client.topic).to.equal(configDefault.kafkatopic)
      expect(client.producer).not.to.equal(undefined)
      expect(client.logger).not.to.equal(undefined)
      expect(client.producer.metrics).not.to.equal(undefined)
      expect(client.producer.metrics.prometheus).not.to.equal(undefined)
    })

    it('returns client with provided config and topic', () => {
      const configTest = JSON.parse(JSON.stringify(configDefault))
      configTest.kafkatopic = 'test-default-topic'
      const client = new Client(configTest, 'my-topic')
      expect(client.config).to.equal(configTest)
      expect(client.topic).to.equal('my-topic')
      expect(client.producer).not.to.equal(undefined)
      expect(client.logger).not.to.equal(undefined)
      expect(client.producer.metrics).not.to.equal(undefined)
      expect(client.producer.metrics.prometheus).not.to.equal(undefined)
    })

    it('throws exception if no kafka topic', () => {
      const config = JSON.parse(JSON.stringify(configDefault))
      delete config.kafkatopic

      const getClient = () => new Client(config)
      expect(getClient).to.throw('no kafka topic informed')
    })

    it('throws exception if no server address', () => {
      const config = JSON.parse(JSON.stringify(configDefault))
      delete config.grpc.serveraddress

      const getClient = () => new Client(config)
      expect(getClient).to.throw('no grpc server address informed')
    })
  })

  describe('Send To Topic', () => {
    let client
    let sendEventStub
    let name
    let props
    let topic

    beforeEach(() => {
      client = new Client()
      sendEventStub = sinon.stub(client.producer.grpcClient, 'sendEvent')
      name = 'EventName'
      props = {
        prop1: 'val1',
        prop2: 'val2',
      }
      topic = 'my-topic'
    })

    afterEach(() => {
      client.producer.grpcClient.sendEvent.restore()
    })

    it('sends event to specific topic', function* () {
      sendEventStub.callsArgWith(2, null, {})
      const res = yield client.sendToTopic(name, topic, props)
      expect(Object.keys(res)).to.have.length(0)
      expect(sendEventStub.calledOnce).to.equal(true)
      const sentEvent = sendEventStub.getCall(0).args[0]
      expect(sentEvent.id).to.be.a('string')
      expect(sentEvent.id).to.have.length.gt(0)
      expect(sentEvent.name).to.equal(name)
      expect(sentEvent.topic).to.equal(topic)
      expect(sentEvent.props).to.equal(props)
      expect(sentEvent.timestamp).to.be.a('number')
      expect(sentEvent.timestamp).to.be.approximately(Date.now(), 100)
    })

    it('throws exception if event rpc call failed', function* () {
      const error = new Error('some error occured')
      sendEventStub.callsArgWith(2, error, null)
      try {
        yield client.sendToTopic(name, topic, props)
        throw new Error('should not reach this line of code')
      } catch (e) {
        expect(sendEventStub.calledOnce).to.equal(true)
        expect(e).to.equal(error)
      }
    })
  })

  describe('Send', () => {
    let client
    let sendEventStub
    let name
    let props

    beforeEach(() => {
      client = new Client()
      sendEventStub = sinon.stub(client.producer.grpcClient, 'sendEvent')
      name = 'EventName'
      props = {
        prop1: 'val1',
        prop2: 'val2',
      }
    })

    afterEach(() => {
      client.producer.grpcClient.sendEvent.restore()
    })

    it('sends event to configured topic', function* () {
      sendEventStub.callsArgWith(2, null, {})
      const res = yield client.send(name, props)
      expect(Object.keys(res)).to.have.length(0)
      expect(sendEventStub.calledOnce).to.equal(true)
      const sentEvent = sendEventStub.getCall(0).args[0]
      expect(sentEvent.id).to.be.a('string')
      expect(sentEvent.id).to.have.length.gt(0)
      expect(sentEvent.name).to.equal(name)
      expect(sentEvent.topic).to.equal(configDefault.kafkatopic)
      expect(sentEvent.props).to.equal(props)
      expect(sentEvent.timestamp).to.be.a('number')
      expect(sentEvent.timestamp).to.be.approximately(Date.now(), 100)
    })

    it('throws exception if event rpc call failed', function* () {
      const error = new Error('some error occured')
      sendEventStub.callsArgWith(2, error, null)
      try {
        yield client.send(name, props)
        throw new Error('should not reach this line of code')
      } catch (e) {
        expect(sendEventStub.calledOnce).to.equal(true)
        expect(e).to.equal(error)
      }
    })
  })

  describe('Metrics', () => {
    let client
    let sendEventStub
    let name
    let props
    let metricsServer
    let request

    beforeEach(() => {
      client = new Client(undefined, uuidv4())
      sendEventStub = sinon.stub(client.producer.grpcClient, 'sendEvent')
      name = 'EventName'
      props = {
        prop1: 'val1',
        prop2: 'val2',
      }
      prometheusclient.register.resetMetrics()
      metricsServer = client.producer.metrics.prometheus.listen()
      request = sap.agent(metricsServer)
    })

    afterEach(() => {
      client.producer.grpcClient.sendEvent.restore()
      metricsServer.close()
    })

    it('reports metrics in the /metrics endpoint - success', function* () {
      sendEventStub.callsArgWith(2, null, {})
      const res = yield client.send(name, props)
      expect(Object.keys(res)).to.have.length(0)
      expect(sendEventStub.calledOnce).to.equal(true)

      const metricsRes = yield request.get('/metrics')
      expect(metricsRes.status).to.equal(200)
      expect(metricsRes.headers['content-type']).to.equal(prometheusclient.contentType)
      expect(metricsRes.text).not.to.have.length(0)
      const parsedRes = helpers.parsePrometheusResponse(metricsRes.text)
        .filter(r => r.tags.topic === client.topic)
      parsedRes.forEach((r) => {
        expect(r.tags.route).to.equal('/eventsgateway.GRPCForwarder/SendEvent')
        expect(r.tags.topic).to.equal(client.topic)
      })
      const resTime = parsedRes.filter(r => r.metric === 'eventsgateway_client_response_time_ms_bucket')
      expect(resTime).to.have.length(8) // num buckets and +Inf
      const resSuccess = parsedRes.filter(r => r.metric ===
                                          'eventsgateway_client_requests_success_counter')
      expect(resSuccess).to.have.length(1) // num requests
      const resFailure = parsedRes.filter(r => r.metric ===
                                          'eventsgateway_client_requests_failure_counter')
      expect(resFailure).to.have.length(0)
    })

    it('reports metrics in the /metrics endpoint - failure', function* () {
      const error = new Error('some error occured')
      sendEventStub.callsArgWith(2, error, null)
      try {
        yield client.send(name, props)
        throw new Error('should not reach this line of code')
      } catch (e) {
        expect(sendEventStub.calledOnce).to.equal(true)
        expect(e).to.equal(error)

        const metricsRes = yield request.get('/metrics')
        expect(metricsRes.status).to.equal(200)
        expect(metricsRes.headers['content-type']).to.equal(prometheusclient.contentType)
        expect(metricsRes.text).not.to.have.length(0)
        const parsedRes = helpers.parsePrometheusResponse(metricsRes.text)
          .filter(r => r.tags.topic === client.topic)
        const resTime = parsedRes.filter(r => r.metric === 'eventsgateway_client_response_time_ms_bucket')
        expect(resTime).to.have.length(8) // num buckets and +Inf
        parsedRes.forEach((r) => {
          expect(r.tags.route).to.equal('/eventsgateway.GRPCForwarder/SendEvent')
          expect(r.tags.topic).to.equal(client.topic)
        })
        const resFailure = parsedRes.filter(r => r.metric ===
                                            'eventsgateway_client_requests_failure_counter')
        expect(resFailure).to.have.length(1) // num requests
        expect(resFailure[0].tags.reason).to.equal(error.toString())
        const resSuccess = parsedRes.filter(r => r.metric ===
                                            'eventsgateway_client_requests_success_counter')
        expect(resSuccess).to.have.length(0)
      }
    })
  })
})
