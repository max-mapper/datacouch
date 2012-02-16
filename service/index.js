var tako = require('tako')
  , couch = require('couch')
  , http = require('http')
  , stoopid = require('stoopid')
  , api = require('./api')
  , auth = require('./auth')
  , database_provisioner = require('./database_provisioner')
  , csv_uploader = require('./csv_uploader')
  , transformer = require('./transformer')
  , defaults = require('./defaults')
  ;
  
module.exports = function (opts) {
  var exports = {}
  exports.opts = defaults(opts)
  
  var t = tako({logger:stoopid.logger('tako'), socketio:{logger:stoopid.logger('socketio')}})

  for (i in exports.opts) t[i] = exports.opts[i]
  
  // Run through all the sub applications
  auth(t)
  database_provisioner(t)
  csv_uploader(t)
  transformer(t)
  api(t)
  
  return t
}
