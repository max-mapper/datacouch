var _ = require('underscore')
  , url = require('url')
  , defaults = 
    { couchurl : "http://localhost:5984"
    , vhosturl : "http://localhost:9999"
    , port : 9999
    , twitterKey: process.env['DATACOUCH_TWITTER_KEY']
    , twitterSecret: process.env['DATACOUCH_TWITTER_SECRET']
    }
  ;
  
module.exports = function (obj) { 
  obj = _.extend(defaults, obj || {})
  if (obj.vhosturl && !obj.port) obj.port = url.parse(obj.vhosturl).port
  if (obj.vhosturl[obj.vhosturl.length - 1] !== '/') obj.vhosturl += '/' 
  if (obj.couchurl[obj.couchurl.length - 1] !== '/') obj.couchurl += '/'
  return obj 
}