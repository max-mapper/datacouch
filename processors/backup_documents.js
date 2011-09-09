/**  Copies all revisions of all documents to a separate backup database
  *  Usage: export DATACOUCH_DATABASE="http://admin:admin@yourcouch/datacouch" then spawn as child process
  *  Author: Max Ogden (@maxogden)
 **/
 
if(!process.env['DATACOUCH_ROOT']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT");

var follow = require('follow')
  , request = require('request')
  , deferred = require('deferred')
  , http = require('http')
  , path = require('path')
  , url = require('url')
  , _ = require('underscore')
  ;

var configURL = url.parse(process.env['DATACOUCH_ROOT'])
  , couch = configURL.protocol + "//" + configURL.host
  , datasets = couch + "/datacouch/_design/datacouch/_view/by_user?include_docs=true"
  , h = {"Content-type": "application/json", "Accept": "application/json"}
  ;

function backupDatabases(couch, datasetsDB) {
  var start_time = new Date();  
  request({uri: datasetsDB, headers: h, include_docs: true}, function(err, resp, body) {
    _.each(JSON.parse(body).rows, function(db) {
      request({uri: couch + "/datacouch/" + db.id, headers: h}, function(err, resp, body) {
        var dbInfo = JSON.parse(body)
          , backupURL = couch + "/" + db.id + "-backup"
          , dbURL = couch + "/" + db.id
          ;
        function copyChanged() {
          request({uri: dbURL + "/_changes?since=" + (dbInfo.lastSeq || "0"), headers: h}, function(err, resp, body) {
            var changes = JSON.parse(body).results;
            _(changes).each(function(change) {
              request.get(dbURL + "/" + change.id + "?attachments=true").pipe(request.put(backupURL + "/" + change.id + "-" + change.changes[0].rev))
            })
          })
        }
        
        checkExistenceOf(backupURL).then(function(status) {
          if(status === 404) {
            createDB(backupURL).then(copyChanged)
          } else {
            copyChanged()
          }
        })
      })
    })
  })
}

function loop() {
  backupDatabases(couch, datasets);
  // setTimeout(loop, 10000);
}

function checkExistenceOf(url) {
  var dfd = deferred();
  request({uri: url, method: "HEAD", headers: h}, function(err, resp, body) {
    dfd.resolve(resp.statusCode);
  })
  return dfd.promise();
}

function createDB(url) {
  var dfd = deferred();
  request({uri: url, method: "PUT", headers: h}, function (err, resp, body) {
    if (err) throw new Error('ahh!! ' + err);
    try {
      var response = JSON.parse(body);
    } catch(e) {
      var response = {"ok": true};
    }
    if (!response.ok) throw new Error(url + " - " + body);
    dfd.resolve(resp.statusCode);
  })
  return dfd.promise();
}


loop()