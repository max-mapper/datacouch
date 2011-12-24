var transfuse = require('transfuse');
var sandbox = {};

var tr = transfuse();

process.stdin.pipe(tr);
tr.pipe(process.stdout);
process.stdin.resume();

module.exports = http.createServer(function (req, res) {
  var funcString = ""
  req.on('data', function(data) { funcString += data })
  req.on('end')
  
  tr.pipe
    request({uri: req.headers['x-callback'], method: "POST", body: {headers: headers, rows: rows}}, function(e,r,b) {
      if (e) console.log('upload error on ' + dataset + ': ' + e);
    });
    
})