var events = require('events')
  , util = require('util')
  , global = new events.EventEmitter()  
  ;

function formatter (msg, ctx) {
  while (msg.indexOf('%') !== -1) {
    var start = msg.indexOf('%')
      , end = msg.indexOf(' ', start)
      ;
    if (end === -1) end = msg.length 
    msg = msg.slice(0, start) + ctx[msg.slice(start+1, end)] + msg.slice(end)
  }
  return msg
}
global.formatter = formatter

function Logger (name) {
  var self = this
  self.name = name
  self.on('log', function (msg, ctx) {
    if (self.listeners('msg').length) {
      msg = (self.formatter || global.formatter) (msg, ctx)
      self.emit('msg', msg, ctx)
    }
  })
}
util.inherits(Logger, events.EventEmitter)

module.exports = function (name) {
  var logger = new Logger(name)
  function log (msg, ctx) {
    if (!msg) throw new Error('msg is a required argument.')
    if (!ctx) ctx = {} 
    logger.emit('log', msg, ctx)
  }
  log.error = function (e) {
    logger.emit('error', e)
  }
  logger.log = log
  log.logger = logger
  global.emit('logger', logger)
  return log
}

module.exports.stderr = function () {
  global.on('logger', function (logger) {
    logger.on('msg', function (msg, ctx) {
      console.error('['+logger.name+'] '+msg)
    })
  })
}
module.exports.stdout = function () {
  global.on('logger', function (logger) {
    logger.on('msg', function (msg, ctx) {
      console.log('['+logger.name+'] '+msg)
    })
  })
}
module.exports.formatter = function (f) {
  if (f) global.formatter = f
  return global.formatter
}
