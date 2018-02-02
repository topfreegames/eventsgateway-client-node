/* eslint-disable import/no-extraneous-dependencies */
const sinon = require('sinon')
const { expect } = require('chai')
const {
  afterEach, beforeEach, describe, it,
} = require('mocha')
require('co-mocha')

const configDefault = require('./../../config/default.json')
const configTest = require('./../../config/test.json')
const Client = require('./../../client')

describe('Client', () => {
  describe('Constructor', () => {
    it('returns client if no error and default config and topic', () => {
      const client = new Client()
      expect(client.config).to.equal(configDefault)
      expect(client.topic).to.equal(configDefault.kafkatopic)
      expect(client.grpcClient).not.to.equal(undefined)
    })

    it('returns client with provided config and topic', () => {
      const client = new Client(configTest, 'my-topic')
      expect(client.config).to.equal(configTest)
      expect(client.topic).to.equal('my-topic')
      expect(client.grpcClient).not.to.equal(undefined)
    })

    it('throws exception if no kafka topic', () => {
      const config = JSON.parse(JSON.stringify(configTest))
      delete config.kafkatopic

      const getClient = () => new Client(config)
      expect(getClient).to.throw('no kafka topic informed')
    })

    it('throws exception if no server address', () => {
      const config = JSON.parse(JSON.stringify(configTest))
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
      sendEventStub = sinon.stub(client.grpcClient, 'sendEvent')
      name = 'EventName'
      props = {
        prop1: 'val1',
        prop2: 'val2',
      }
      topic = 'my-topic'
    })

    afterEach(() => {
      client.grpcClient.sendEvent.restore()
    })

    it('sends event to specific topic', function* () {
      sendEventStub.callsArgWith(1, null, {})
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
      sendEventStub.callsArgWith(1, error, null)
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
      sendEventStub = sinon.stub(client.grpcClient, 'sendEvent')
      name = 'EventName'
      props = {
        prop1: 'val1',
        prop2: 'val2',
      }
    })

    afterEach(() => {
      client.grpcClient.sendEvent.restore()
    })

    it('sends event to configured topic', function* () {
      sendEventStub.callsArgWith(1, null, {})
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
      sendEventStub.callsArgWith(1, error, null)
      try {
        yield client.send(name, props)
        throw new Error('should not reach this line of code')
      } catch (e) {
        expect(sendEventStub.calledOnce).to.equal(true)
        expect(e).to.equal(error)
      }
    })
  })
})
