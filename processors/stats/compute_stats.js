/**  Computes and stores database metadatas
  *  Setup environment variables (see datacouch readme for more info):
  *    export DATACOUCH_ROOT="http://admin:pass@localhost:5984"
  *    export DATACOUCH_VHOST="couchdb.dev:5984"
  *  then "node compute_stats.js"
  *  Author: Max Ogden (@maxogden)
 **/

if(!process.env['DATACOUCH_ROOT']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT");

var request = require('request').defaults({json: true})
  , async = require('async')
  , _ = require('underscore')
  ;
 
// for nodejitsu -- they require a running server
require('http').createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('datacouch stats thingy is up\n');
}).listen(1337);

function getAllDatasets(callback) {
  request({url: datasetsURL}, function(err, resp, data) {
    if (err || data.error) callback(data)
    else callback(false, data.rows)
  })
}

function getAllDocs(db, callback) {
  request({url: couch + "/" + db.id + '/_all_docs?startkey=%22_design/%22&endkey=%22_design0%22'}, function(err, resp, data) {
    if (err) callback(err)
    else callback(false, data)
  })
}

function getDbInfo(db, callback) {
  request({url: couch + "/" + db.id}, function(err, resp, data) {
    if (err) callback(err, data)
    else callback(false, data)
  })
}

function updateDoc(doc, callback) {
  doc.statsGenerated = new Date();
  request.post({uri: couch + '/datacouch', body: doc}, function(err, resp, data) {
    if(err || data.error) callback(data)
    else callback(false, data)
  })
}

function computeStats(couch, datasetsURL, callback) {
  getAllDatasets(function(err, datasets) {
    if (err) return callback(err)
    _.each(datasets, function(db) {
      q.push(db, function (err) {
        if(err) callback(err)
      })
    })
  })
}

var couch = process.env['DATACOUCH_ROOT']
  , datasetsURL = couch + "/" + "datacouch/_design/datacouch/_view/by_user?include_docs=true"
  ;
  
var q = async.queue(function (db, callback) {
  getDbInfo(db, function(err, dbInfo) {         
    getAllDocs(db, function(err, docs) {
      var ddocCount = docs.rows.length
        , docCount = dbInfo.doc_count
        , important = {disk_size: dbInfo.disk_size}
        , changed = false;

      important.doc_count = docCount - ddocCount;
      if ( (docCount - ddocCount) < 0 ) important.doc_count = 0;

      _.each(_.keys(important), function(prop) {
        if (db.doc[prop] !== important[prop]) {
          db.doc[prop] = important[prop];
          changed = true;
        }
      })

      if (changed) updateDoc(db.doc, callback)
      else callback()
    })
  })
}, 20);

var startTime = new Date()

q.drain = function() {
  console.log('last run took ' + (new Date() - startTime) + "ms")
  setTimeout(function() {
    startTime = new Date()
    computeStats(couch, datasetsURL, done)
  }, 60000)
}

function done(err) {
  if(err) console.error(err)
}

computeStats(couch, datasetsURL, done);