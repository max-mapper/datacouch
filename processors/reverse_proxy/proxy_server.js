var _ = require('underscore')
  , http = require('http')
  , httpProxy = require('http-proxy')
  ;

var vhost = "dcreverseproxy.nodejitsu.com"

function pathSegments(req) {
  var path = req.url
  if (path.length === 1) return [""]
  if (_.first(path) === "/") path = _.rest(path).join('')
  return path.split('/')
}

var proxyServer = httpProxy.createServer(function (req, res, proxy) {
  var proxyPaths = {
      "twitter": "dcauth.nodejitsu.com"
    , "wiki": "dcsharejs.nodejitsu.com"
    , "upload": "dcuploader.nodejitsu.com"
    }
    , host = req.headers.host
    ;
    
  if (req.headers.host !== vhost) {
    console.log('vhost mismatch')
    return false
  }
    
  var path = _.first(pathSegments(req))
  console.log(req.url, pathSegments(req))
  if (proxyPaths[path]) {
    req.headers.host = proxyPaths[path]
    req.url = '/' + _.rest(pathSegments(req)).join('/')
    proxy.proxyRequest(req, res, { host: proxyPaths[path], port: 80 })
  }
})

proxyServer.listen(12345)