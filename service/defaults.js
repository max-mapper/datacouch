var _ = require('underscore')
  , url = require('url')
  , defaults = 
    { couchurl : process.env['DATACOUCH_ROOT'] || "http://admin:admin@localhost:5984"
    , appsurl : process.env['DATACOUCH_APPS'] || "burritomap.com"
    , vhosturl : process.env['DATACOUCH_VHOST'] || "http://dev.datacouch.com"
    , port : 80
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