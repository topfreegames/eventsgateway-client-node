'use strict';

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

var os = require('os');

var path = require('path');

var uuid = require('uuid/v4');

var defaultConfig = require('./config/default.json');

var logger = require('./lib/logger');

var metricsPrometheus = require('./lib/metricsPrometheus');

var MetricsStatsd = require('./lib/metricsStatsd'); // protoPath must be absolute


var protoPath = path.resolve(__dirname, './protos/eventsgateway/grpc/protobuf/events.proto');
var eventsProto = grpc.load(protoPath).eventsgateway;

var Client =
/*#__PURE__*/
function () {
  function Client(config, topic) {
    _classCallCheck(this, Client);

    this.hostname = os.hostname();
    this.config = config || defaultConfig;
    this.topic = topic || this.config.kafkatopic;

    if (!this.topic) {
      throw Error('no kafka topic informed');
    }

    var address = this.config.grpc.serveraddress;

    if (!address) {
      throw Error('no grpc server address informed');
    }

    this.grpcClient = new eventsProto.GRPCForwarder(address, grpc.credentials.createInsecure());
    this.logger = logger.child({
      source: 'eventsgateway/client',
      topic: this.topic,
      serverAddr: address
    });
    this.metrics = {
      statsd: new MetricsStatsd(this.config.statsd || {}),
      prometheus: metricsPrometheus
    };
  }

  _createClass(Client, [{
    key: "reportResponseTime",
    value: function reportResponseTime(method, topic, timeUsed, err) {
      this.metrics.prometheus.clientRequestsResponseTime.labels(this.hostname, method, topic).observe(timeUsed);
      this.metrics.statsd.report('eventsgateway.response_time_ms', topic, method, timeUsed, err);
    }
  }, {
    key: "reportFailure",
    value: function reportFailure(method, topic, err) {
      var e = err.toString();
      this.metrics.prometheus.clientRequestsFailureCounter.labels(this.hostname, method, topic, e).inc();
    }
  }, {
    key: "reportSuccess",
    value: function reportSuccess(method, topic) {
      this.metrics.prometheus.clientRequestsSuccessCounter.labels(this.hostname, method, topic).inc();
    }
  }, {
    key: "sendToTopic",
    value:
    /*#__PURE__*/
    regeneratorRuntime.mark(function sendToTopic(name, topic, props) {
      var _this = this;

      var method, startTime, args, l;
      return regeneratorRuntime.wrap(function sendToTopic$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (name) {
                _context.next = 2;
                break;
              }

              throw Error('event name cannot be empty');

            case 2:
              if (topic) {
                _context.next = 4;
                break;
              }

              throw Error('topic cannot be empty');

            case 4:
              method = '/eventsgateway.GRPCForwarder/SendEvent';
              startTime = Date.now(); // currently there are no interceptors in node-grpc
              // the proposal was already accepted
              // https://github.com/grpc/proposal/blob/master/L5-NODEJS-CLIENT-INTERCEPTORS.md
              // but the PR is still ongoing
              // https://github.com/grpc/grpc-node/pull/59

              args = {
                id: uuid(),
                name: name,
                topic: topic,
                props: props,
                timestamp: Date.now()
              };
              l = this.logger.child({
                operation: 'sendToTopic',
                event: name,
                args: args,
                method: method
              });
              l.debug('sending event');
              _context.next = 11;
              return new Promise(function (resolve, reject) {
                _this.grpcClient.sendEvent(args, function (err, res) {
                  var timeUsed = Date.now() - startTime;

                  _this.reportResponseTime(method, topic, timeUsed, err);

                  l.child({
                    timeUsed: timeUsed,
                    reply: res
                  }).debug('request processed');

                  if (err) {
                    _this.reportFailure(method, topic, err);

                    l.child({
                      timeUsed: timeUsed,
                      err: err
                    }).error('error processing request');
                    return reject(err);
                  }

                  _this.reportSuccess(method, topic);

                  return resolve(res);
                });
              });

            case 11:
              return _context.abrupt("return", _context.sent);

            case 12:
            case "end":
              return _context.stop();
          }
        }
      }, sendToTopic, this);
    })
  }, {
    key: "send",
    value:
    /*#__PURE__*/
    regeneratorRuntime.mark(function send(name, props) {
      return regeneratorRuntime.wrap(function send$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return this.sendToTopic(name, this.topic, props);

            case 2:
              return _context2.abrupt("return", _context2.sent);

            case 3:
            case "end":
              return _context2.stop();
          }
        }
      }, send, this);
    })
  }]);

  return Client;
}();

module.exports = Client;
