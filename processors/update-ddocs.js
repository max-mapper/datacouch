// utility to take a couchapp and bulk push it to many databases
// depends on the by_date view in datacouch which returns a meta-doc that represents a real database
// usage: set DATACOUCH_ROOT then node update_ddocs.js

var request = require('request')
  , couchapp = require('couchapp')
  , deferred = require('deferred')
  , http = require('http')
  , path = require('path')
  , _ = require('underscore')
  ;

if(!process.env['DATACOUCH_ROOT']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT");

var couch = process.env['DATACOUCH_ROOT']
  , db = couch + "/datacouch"
  , h = {"Content-type": "application/json", "Accept": "application/json"}
  ;

function absolutePath(pathname) {
  if (pathname[0] === '/') return pathname
  return path.join(process.env.PWD, path.normalize(pathname));
}

function pushCouchapp(app, target) {
  var dfd = deferred();
  couchapp.createApp(require(absolutePath(app)), target, function (app) { app.push(function(resp) { dfd.resolve() }) })
  return dfd.promise();
}

function get(uri) {
  var dfd = deferred();
  request({uri: uri, headers: h}, function (err, resp, body) {
    dfd.resolve(JSON.parse(body).rows);
  })
  return dfd.promise();
}

get(db + "/_design/datacouch/_view/by_date").then(function(datasets) {
  _.each(datasets, function(dataset) {
    console.log(dataset)
    pushCouchapp("../recline.js", couch + "/" + dataset.id).then(function() {
      console.log('updated ' + dataset.id);
    });
  })
})