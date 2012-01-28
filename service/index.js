var tako = require('tako')
  , couch = require('couch')
  , http = require('http')
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
  
  var t = tako()

  for (i in exports.opts) t[i] = exports.opts[i]
  
  // Run through all the sub applications
  auth(t)
  database_provisioner(t)
  csv_uploader(t)
  transformer(t)
  api(t)
  
  exports.app = t
  t._listen = t.listen
  
  // Setup listen function for default port
  exports.createServer = function (cb) {
    t.listen = function (cb) {
      t._listen(function(handler) {   
        return http.createServer(handler)
      }, t.port, cb)
    }
    return t
  }
  return exports
}
