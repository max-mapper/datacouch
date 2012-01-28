var request = require('request').defaults({json: true}),
    csv = require('csv'),
    _ = require('underscore');
    
module.exports = function (t) {
  t.route("/api/upload/*", function (req, res) {
    var headers, dataset, chunkSize = 500, rows = [], segments = req.url.split('/');
    if (segments.length > 0) {
      dataset = _.last(segments)
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({error: "you are probably missing the dataset id in the url"}));
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
      console.error("csv error!", error.message);
    });
  
    function bulkUpload(docs, callback) {
      request({url: t.couchurl + dataset + '/_bulk_docs', method: "POST", body: {docs: docs}, headers: {cookie: req.headers.cookie}}, function(e,r,b) {
        if (e) console.error('upload error on ' + dataset + ': ' + e);
        if (callback) callback(r.statusCode,b)
      })
    }
  })
}
