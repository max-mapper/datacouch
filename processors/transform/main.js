var request = require('request').defaults({json: true}),
  transfuse = require('transfuse'),
  JSONStream = require('JSONStream'),
  url = require('url'),
  http = require('http');

var couch = process.env['DATACOUCH_NONADMIN_ROOT'];

http.createServer(function (req, resp) {
  var json = ""
  req
    .on('data',function(data) { json += data })
    .on('end', function() {
      json = JSON.parse(json)
      transform(json.dataset, json.transform, req, resp)
    })
    .on('error',function(error){
      resp.end("request error! " + error);
    });
}).listen(9999);


function transform(dataset, funcString, req, resp) {
  var down = request({url: couch + "/" + dataset + '/_all_docs?include_docs=true'}),
    up = request({url: couch + '/' + dataset + '/_bulk_docs', method: "POST", headers: req.headers.cookie}),
    tr = transfuse(['rows', /./, 'doc'], funcString, JSONStream.stringify("{\"docs\":[\n", "\n,\n", "\n]}\n"));
  down.pipe(tr)
  tr.pipe(up)
  up.on('end', function() {
    resp.end('all done')
  })
}