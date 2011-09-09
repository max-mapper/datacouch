/**  Copies all revisions of all documents to a separate backup database
  *  Usage: export DATACOUCH_DATABASE="http://admin:admin@yourcouch/datacouch" then node backup_documents.js
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
      var metadataURL = couch + "/datacouch/" + db.id;
      request({uri: metadataURL, headers: h}, function(err, resp, body) {
        var dbInfo = JSON.parse(body)
          , backupURL = couch + "/" + db.id + "-backup"
          , dbURL = couch + "/" + db.id
          ;
          
        function copyChanged() {
          request({uri: dbURL + "/_changes?since=" + (dbInfo.lastBackupSeq || "0"), headers: h}, function(err, resp, body) {
            var changes = JSON.parse(body).results;
            var pending = changes.length;
            _(changes).each(function(change) {
              var source = dbURL + "/" + change.id + "?attachments=true"
               , destination = backupURL + "/" + change.id + "-" + change.changes[0].rev
               ;
              request.get(source).pipe(request.put(destination, function(err, resp, body) {
                pending--;
                if(pending === 0 && change.seq > (dbInfo.lastBackupSeq || 0)) {
                  dbInfo.lastBackupSeq = change.seq;
                  request({uri: metadataURL, method: "PUT", headers: h, body: JSON.stringify(dbInfo)}, function(err, resp, body) {
                    console.log(metadataURL, body)
                    // TODO handle conflicts
                  })
                }
              }))
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