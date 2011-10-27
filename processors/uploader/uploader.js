var couch = process.env['DATACOUCH_NONADMIN_ROOT'];

var request = require('request').defaults({json: true}),
    csv = require('csv'),
    _ = require('underscore'),
    url = require('url'),
    http = require('http');

http.createServer(function (req, res) {
  var headers, dataset, rows = [], segments = req.url.split('/');
  if (segments.length > 0) {
    dataset = segments[1];
  } else {
    res.writeHead(404);
    res.end("you are probably missing the dataset id in the url");
    return;
  }
  
  csv()
  .fromStream(req)
  .on('data',function(data, index) {
    if (!headers) {
      headers = data;
      return;
    }
    var row = {}
    _(_.zip(headers, data)).each(function(tuple) {
      row[_.first(tuple)] = _.last(tuple)
    })
    rows.push(row);
  })
  .on('end',function(count) {
    bulkUpload(rows.slice(0, 50), function(e,r,b) {
      res.writeHead(r.statusCode);
      res.end(JSON.stringify(b));
      bulkUpload(rows.slice(50, rows.length), function(e,r,b) {
        console.log("saved " + b.length + 50)
      })      
    })
  })
  .on('error',function(error){
    console.log("csv error!", error.message);
  });
  
  function bulkUpload(docs, callback) {
    request({url: couch + '/' + dataset + '/_bulk_docs', method: "POST", body: {docs: docs}, headers: {cookie: req.headers.cookie}}, callback)
  }
  
}).listen(9878, "localhost");
