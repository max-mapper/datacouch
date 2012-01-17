/**  Runs database functional transformations
  *  Setup environment variables (see datacouch readme for more info):
  *    export DATACOUCH_ROOT="http://admin:pass@localhost:5984"
  *  then "node main.js"
  *  Author: Max Ogden (@maxogden)
 **/

if(!process.env['DATACOUCH_ROOT']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT");

var request = require('request').defaults({json: true}),
  transfuse = require('transfuse'),
  JSONStream = require('JSONStream'),
  url = require('url'),
  _ = require('underscore'),
  follow = require('follow');

// for nodejitsu -- they require a running server
require('http').createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('transformer is up\n');
}).listen(1337);

var configURL = url.parse(process.env['DATACOUCH_ROOT'] + "/datacouch")
  , couch = configURL.protocol + "//" + configURL.host
  , db = couch + configURL.pathname
  ;

follow({db: db, include_docs: true, filter: "datacouch/by_value", query_params: {k: "type", v: "transformation"}}, function(error, change) {
  if (error || !("doc" in change)) return;
  if (change.doc.finishedAt) return;
  var doc = change.doc
    , dbName = doc._id
    , dbPath = couch + "/" + dbName
    ;
  transform(doc.dataset, doc.transform, function(err, done) {
    if(err) console.log('transformation error on ' + doc.dataset, err)
    request.post({url: db, body: _.extend({}, doc, {finishedAt: new Date()})}, function(e,r,b) {
      console.log('transformed ' + doc.dataset)
    })
  })
})

function transform(dataset, funcString, callback) {
  var down = request({url: couch + "/" + dataset + '/_all_docs?include_docs=true'}),
    up = request({url: couch + '/' + dataset + '/_bulk_docs', method: "POST"}),
    tr = transfuse(['rows', /./, 'doc'], funcString, JSONStream.stringify("{\"docs\":[\n", "\n,\n", "\n]}\n"));
  down.pipe(tr)
  tr.pipe(up)
  up.on('error', callback)
  up.on('end', function() {
    callback(false, 'all done')
  })
}