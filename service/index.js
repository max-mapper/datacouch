var tako = require('tako')
  , router = tako.router()
  , couch = require('couch')
  , http = require('http')
  , stoopid = require('stoopid')
  , api = require('./api')
  , auth = require('./auth')
  , burritomaps = require('./burritomaps')
  , database_provisioner = require('./database_provisioner')
  , csv_uploader = require('./csv_uploader')
  , transformer = require('./transformer')
  , socks = require('./socks')
  , defaults = require('./defaults')
  ;
  
module.exports = function (opts) {
  var exports = {}
  exports.opts = defaults(opts)
  
  var t = tako({logger:stoopid.logger('tako'), socketio:{logger:stoopid.logger('socketio')}})

  for (i in exports.opts) t[i] = exports.opts[i]

  // Run through all the sub applications
  auth(t)
  socks(t)
  database_provisioner(t)
  csv_uploader(t)
  transformer(t)
  api(t)

  router.port = exports.opts.port
  burritomaps(router, t)
  router.default(t)
  
  return router
}
