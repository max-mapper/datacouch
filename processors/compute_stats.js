/**  Computes and stores database metadatas
  *  Usage: change settings then "node compute_stats.js"
  *  Author: Max Ogden (@maxogden)
 **/

var request = require('request')
  , _ = require('underscore')
  ;

var couch = "http://admin:admin@localhost:5984"
  , datasets = couch + "/datacouch/_design/datacouch/_view/by_user?include_docs=true"
  , h = {"Content-type": "application/json", "Accept": "application/json"}
  ;

request({uri: datasets, headers: h}, function(err, resp, body) {
  _.each(JSON.parse(body).rows, function(db) {
    request({uri: couch + "/" + db.id, headers: h}, function(err, resp, body) {
      var dbInfo = JSON.parse(body)
        , important = {doc_count: dbInfo.doc_count, data_size: dbInfo.data_size}
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
          console.log(body)
        })
      }
    })
  })
})