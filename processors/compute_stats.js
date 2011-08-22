/**  Computes and stores database metadatas
  *  Usage: change settings then "node compute_stats.js"
  *  Author: Max Ogden (@maxogden)
 **/

var request = require('request')
  , _ = require('underscore')
  , deferred = require('deferred')
  ;

function computeStats(couch, datasetsURL, callback) {
  var start_time = new Date();  
  request({uri: datasetsURL, headers: h}, function(err, resp, body) {
    _.each(JSON.parse(body).rows, function(db) {
      request({uri: couch + "/" + db.id, headers: h}, function(err, resp, body) {
        getHits(db.doc._id).then(function(hits) {
          var dbInfo = JSON.parse(body)
            , important = {hits: hits, doc_count: dbInfo.doc_count, disk_size: dbInfo.disk_size}
            , changed = false
            ;
          _.each(_.keys(important), function(prop) {
            if (db.doc[prop] !== important[prop]) {
              db.doc[prop] = important[prop];
              changed = true;
            }
          })
          if (changed) {
            db.doc.statsGenerated = new Date();
            request({uri: couch + "/datacouch", method: "POST", headers: h, body: JSON.stringify(db.doc)}, function(err, resp, body) {
              console.log("updated " + db.doc._id + " in " + (new Date() - start_time) + "ms");
            })
          }
        })
      })
    })
  })
}

function getHits(id) {
  var dfd = deferred();  
  var key = "[%22"+id+"%22,null]";
  var hitsURL = couch + "/datacouch-analytics/_design/analytics/_view/popular_datasets?group=true&startkey="+key+"&endkey="+key+"&limit=1";
  request({uri: hitsURL, headers: h}, function(err, resp, body) {
    var rows = JSON.parse(body).rows;
    if (rows.length > 0) {
      dfd.resolve(rows[0].value);
    } else {
      dfd.resolve(0);
    }
  })
  return dfd.promise();
}

var couch = process.argv[2]
  , datasets = couch + "/" + "datacouch/_design/datacouch/_view/by_user?include_docs=true"
  , h = {"Content-type": "application/json", "Accept": "application/json"}
  ;

function loop() {
  computeStats(couch, datasets);
  setTimeout(loop, 10000);
}

loop()