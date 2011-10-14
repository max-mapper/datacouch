var http = require('http'),
    httpProxy = require('http-proxy');

var options = {
  router: {
    'datacouch.com/twitter': '127.0.0.1:9870',
    'dev.datacouch.com/twitter': '127.0.0.1:9870',
    'datacouch.com/wiki': '127.0.0.1:9872',
    'dev.datacouch.com/wiki': '127.0.0.1:9872'
  }
};

var proxyServer = httpProxy.createServer(options);
proxyServer.listen(12345);