function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

var grpc = require('grpc');

var uuid = require('uuid/v4');

var defaultConfig = require('./config/default.json');

var logger = require('./lib/logger');

var producer = require('./producer');

var Client =
/*#__PURE__*/
function () {
  function Client(config, topic) {
    _classCallCheck(this, Client);

    this.config = config || defaultConfig;
    this.topic = topic || this.config.kafkatopic;

    if (!this.topic) {
      throw Error('no kafka topic informed');
    }

    this.logger = logger.child({
      source: 'eventsgateway/client',
      topic: this.topic
    });
    this.producer = new producer.Sync(this.config, topic);
  }

  _createClass(Client, [{
    key: "sendToTopic",
    value: function sendToTopic(name, topic, props) {
      if (!name) {
        throw Error('event name cannot be empty');
      }

      if (!topic) {
        throw Error('topic cannot be empty');
      } // currently there are no interceptors in node-grpc
      // the proposal was already accepted
      // https://github.com/grpc/proposal/blob/master/L5-NODEJS-CLIENT-INTERCEPTORS.md
      // but the PR is still ongoing
      // https://github.com/grpc/grpc-node/pull/59


      var event = {
        id: uuid(),
        name: name,
        topic: topic,
        props: props,
        timestamp: Date.now()
      };
      var l = this.logger.child({
        operation: 'sendToTopic',
        event: event
      });
      l.debug('sending event');
      return this.producer.send(event, l);
    }
  }, {
    key: "send",
    value: function send(name, props) {
      return this.sendToTopic(name, this.topic, props);
    }
  }]);

  return Client;
}();

module.exports = Client;
