// delete databases (and their backups) that don't have a corresponding document anymore
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

request({uri: couch + '/_all_dbs'}
  , function(e,r,b) {
    var databases = []
      , backups = []
      ;
    _(b).each(function(db) {
      if (db.substr(0,2) === "dc") {
        if ( (db.split('-').length > 0) && db.split('-')[1] !== "backup") {
          databases.push(db);
        }
      }
    })
    
    request({url: datasetsDB + '/_design/datacouch/_view/by_date'}, function(e,r,b) {
      var datasets = (_.map(b.rows, function(row) { return row.id }))
      var missing = _.difference(databases, datasets)
      _.each(missing, function(dataset) {
        request.del({uri: couch + '/' + dataset, json: true}, function(e,r,b) {
          console.log('deleted', dataset, b)
        })
        request.del({uri: couch + '/' + dataset + '-backup', json: true}, function(e,r,b) {
          console.log('deleted backup', dataset + '-backup', b)
        })
      })
    })
  })