// delete databases that don't have a corresponding document anymore
// usage: set DATACOUCH_ROOT then node cleanup-dbs.js

var request = require('request').defaults({json:true})
  , http = require('http')
  , path = require('path')
  , _ = require('underscore')
  ;

if(!process.env['DATACOUCH_ROOT']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT");

var couch = process.env['DATACOUCH_ROOT']
  , datasetsDB = couch + "/datacouch"
  ;
  
function isRegistered(db, callback) {
  request({uri: datasetsDB + '/' + db}
    , function(e,r,b) {
      if (r.statusCode > 299) callback(false)
      else callback(b)
    })
}

request({uri: couch + '/_all_dbs'}
  , function(e,r,b) {
    var datasets = []
      , backups = []
      ;
    _(b).each(function(db) {
      if ( (db.split('-').length > 0) && db.split('-')[1] === "backup") {
        
      } else if (db.substr(0,2) === "dc") {
        datasets.push(db);
      }
    })
    console.log(datasets);
  })