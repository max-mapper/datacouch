var couch = process.env['DATACOUCH_NONADMIN_ROOT'];

var request = require('request').defaults({json: true}),
    csv = require('csv'),
    _ = require('underscore'),
    url = require('url'),
    http = require('http');

http.createServer(function (req, res) {
  var headers, dataset, chunkSize = 500, rows = [], segments = req.url.split('/');
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
    if (rows.length === chunkSize) {
      bulkUpload(rows)
      rows = []
    }
  })
  .on('end', function(count) {
    bulkUpload(rows, function(status, resp) {
      res.statusCode = status;
      res.end(JSON.stringify(count - 1));
    });
  })
  .on('error',function(error){
    console.log("csv error!", error.message);
  });
  
  function bulkUpload(docs, callback) {
    request({url: couch + '/' + dataset + '/_bulk_docs', method: "POST", body: {docs: docs}, headers: {cookie: req.headers.cookie}}, function(e,r,b) {
      if (e) console.log('upload error on ' + dataset + ': ' + e);
      if (callback) callback(r.statusCode,b)
    })
  }
  
}).listen(9878);
