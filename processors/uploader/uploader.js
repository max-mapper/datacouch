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
    var chunk = count;
    if (chunk > 500) chunk = 500;
    bulkUpload(rows.slice(0, chunk), function(e,r,b) {
      res.writeHead(r.statusCode);
      res.end(JSON.stringify(b));
      if (count > chunk) {
        bulkUpload(rows.slice(chunk, rows.length), function(e,r,b) {
          if(e) console.log('upload error on ' + dataset + ': ' + e);
        })
      }
    })
  })
  .on('error',function(error){
    console.log("csv error!", error.message);
  });
  
  function bulkUpload(docs, callback) {
    request({url: couch + '/' + dataset + '/_bulk_docs', method: "POST", body: {docs: docs}, headers: {cookie: req.headers.cookie}}, callback)
  }
  
}).listen(9878, "localhost");
