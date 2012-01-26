var _ = require('underscore')
  , url = require('url')
  , path = require('path')
  , defaults = 
    { ddoc: "http://data.ic.ht/datacouch/_design/datacouch"
    , vhost: "http://example.com"
    , port: 9999
    , attachments: path.resolve(__dirname)
    }
  ;
  
module.exports = function (obj) { 
  obj = _.extend(defaults, obj || {})
  if (obj.vhost[obj.vhost.length - 1] !== '/') obj.vhost += '/' 
  if (obj.ddoc[obj.ddoc.length - 1] !== '/') obj.ddoc += '/'
  return obj 
}