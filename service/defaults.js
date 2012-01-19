var _ = require('underscore')
  , url = require('url')
  , defaults = 
    { couchurl : process.env.COUCHURL || "http://data.ic.ht"
    , vhosturl : process.env.VHOSTURL || "http://datacouch.com"
    , port : process.env.VHOSTPORT || 9999
    }
  ;
  
module.exports = function (obj) { 
  obj = _.extend(defaults, obj || {})
  if (obj.vhosturl && !obj.port) obj.port = url.parse(obj.vhosturl).port
  if (obj.vhosturl[obj.vhosturl.length - 1] !== '/') obj.vhosturl += '/' 
  if (obj.couchurl[obj.couchurl.length - 1] !== '/') obj.couchurl += '/'
  return obj 
}