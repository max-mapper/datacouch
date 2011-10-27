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
    request({url: couch + '/' + dataset + '/_bulk_docs', method: "POST", body: {docs: rows}, headers: {cookie: req.headers.cookie}}
      , function(e,r,b) {
        res.writeHead(r.statusCode);
        res.end(JSON.stringify(b));
      })
  })
  .on('error',function(error){
    console.log("csv error!", error.message);
  });
  
}).listen(9878, "localhost");
