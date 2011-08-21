var http = require('http');
var request = require('request');

var opts = {
  host: "0.0.0.0",
  couch: process.argv[2],
  ping_port: 9876,
  couch_port: 5984
};

var spacer = "R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

var headers404 = {
    "Content-Type": "text/html",
    "Content-Length": "0"
};

var pingHeaders = {
    "Cache-Control": "private, no-store, no-cache, proxy-revalidate",
    "Content-Type": "image/gif",
    "Content-Disposition": "inline",
    "Content-Length": 43
};

function init() {
  startPingHost();
}

function startPingHost() {
  http.createServer(function (req, res) {

    if (req.url !== '/spacer.gif') {
      res.writeHead(404, headers404);
      res.end();
      return false;
    }

    var buf = new Buffer(43);
    buf.write(spacer, "base64");

    res.writeHead(200, pingHeaders);
    res.write(buf);
    res.end();

    writeStats(req.connection.remoteAddress, req.headers);

  }).listen(opts.ping_port, opts.host);
  console.log('Ping server running at http://' + opts.host + ':' + opts.ping_port);
};

function writeStats(ip, headers) {

  var stats = {
    date: JSON.stringify(new Date()),
    ip: ip,
    page: headers.referer
  };

  request({
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    uri: opts.couch,
    body: JSON.stringify(stats)
  }, function(err, resp, body) {
    console.log(body);
  });
}

init();