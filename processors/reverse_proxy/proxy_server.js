var http = require('http'),
    httpProxy = require('http-proxy');

var options = {
  router: {
    'datacouch.com/twitter': 'dcauth.nodejitsu.com',
    'dev.datacouch.com/twitter': '127.0.0.1:9870',
    'datacouch.com/wiki': 'dcsharejs.nodejitsu.com',
    'dev.datacouch.com/wiki': '127.0.0.1:9872',
    'datacouch.com/upload': 'dcuploader.nodejitsu.com',
    'dev.datacouch.com/upload': '127.0.0.1:9878'
  }
};

var proxyServer = httpProxy.createServer(options);
proxyServer.listen(12345);