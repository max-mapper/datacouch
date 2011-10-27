/**  Computes and stores database metadatas
  *  Setup environment variables (see datacouch readme for more info):
  *    export DATACOUCH_ROOT="http://admin:pass@localhost:5984"
  *    export DATACOUCH_VHOST="couchdb.dev:5984"
  *  then "node compute_stats.js"
  *  Author: Max Ogden (@maxogden)
 **/

 if(!process.env['DATACOUCH_ROOT']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT");

var request = require('request').defaults({json: true})
  , _ = require('underscore')
  , deferred = require('deferred')
  ;

function computeStats(couch, datasetsURL, callback) {
  var start_time = new Date();  
  request({url: datasetsURL}, function(err, resp, data) {
    _.each(data.rows, function(db) {
      request({url: couch + "/" + db.id}, function(err, resp, data) {
        if (err) console.log('dataset info err', err)
        var dbInfo = data;
        // getHits(db.doc._id).then(function(hits) {
          request({url: couch + "/" + db.id + '/_all_docs?startkey=%22_design/%22&endkey=%22_design0%22'}, function(err, resp, data) {
            if (err) {
              console.log(err, resp, data);
              return;
            } else {
              var ddocCount = data.rows.length
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

              if (changed) {
                db.doc.statsGenerated = new Date();
                request.post({uri: couch + '/datacouch', body: db.doc}, function(err, resp, data) {
                  console.log("updated stats on " + db.doc._id + " in " + (new Date() - start_time) + "ms");
                })
              }
            }
          })
        // })
      })
    })
  })
}

function getHits(id) {
  var dfd = deferred();  
  var key = "[%22"+id+"%22,null]";
  var hitsURL = couch + "/datacouch-analytics/_design/analytics/_view/popular_datasets?group=true&startkey="+key+"&endkey="+key+"&limit=1";
  request({url: hitsURL}, function(err, resp, data) {
    if(err) throw new Error(err);
    var rows = data.rows;
    if (rows.length > 0) {
      dfd.resolve(rows[0].value);
    } else {
      dfd.resolve(0);
    }
  })
  return dfd.promise();
}

var couch = process.env['DATACOUCH_ROOT']
  , datasets = couch + "/" + "datacouch/_design/datacouch/_view/by_user?include_docs=true"
  ;

function loop() {
  computeStats(couch, datasets);
  setTimeout(loop, 10000);
}

loop()