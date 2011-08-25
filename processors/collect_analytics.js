/**  Logs couchapp pageviews via a transparent image tracking thingy
  *  Usage: export DATACOUCH_ANALYTICS="http://admin:admin@yourcouch/datacouch-analytics"  then "node collect_analytics.js"
  *  Author: Max Ogden (@maxogden)
 **/

if(!process.env['DATACOUCH_ANALYTICS']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ANALYTICS");

var http = require('http')
  , request = require('request')
  , crypto = require('crypto')
  ;

var opts = {
  host: "0.0.0.0",
  couch: process.env['DATACOUCH_ANALYTICS'],
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
    
    if (!req.headers.referer) return;
    writeStats(req.connection.remoteAddress, req.headers);

  }).listen(opts.ping_port, opts.host);
  console.log('Ping server running at http://' + opts.host + ':' + opts.ping_port);
};

function getDay() {
  var currentTime = new Date()
    , month = currentTime.getMonth() + 1
    , day = currentTime.getDate()
    , year = currentTime.getFullYear()
    ;
  return month + "/" + day + "/" + year;
}

function writeStats(ip, headers) {
  var stats = {
    day: getDay(),
    page: headers.referer
  };
  
  var id = crypto.createHash('md5').update(ip + JSON.stringify(stats)).digest("hex");

  request({
    method: 'HEAD',
    headers: {'Content-Type': 'application/json'},
    uri: opts.couch + "/" + id,
  }, function(err, resp, body) {
    if (resp.statusCode === 404) {
      request({
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        uri: opts.couch + "/" + id,
        body: JSON.stringify(stats)
      }, function(err, resp, body) {
        console.log(body);
      });
    }
  });

}

init();