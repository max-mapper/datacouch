/**  Copies all revisions of all documents to a separate backup database
  *  Setup environment variables (see datacouch readme for more info):
  *    export DATACOUCH_ROOT="http://admin:pass@localhost:5984"
  *    export DATACOUCH_VHOST="couchdb.dev:5984"
  *  then "node backup_documents.js"
  *  Author: Max Ogden (@maxogden)
 **/
 
if(!process.env['DATACOUCH_ROOT']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT");

var follow = require('follow')
  , request = require('request')
  , deferred = require('deferred')
  , couchapp = require('couchapp')
  , http = require('http')
  , path = require('path')
  , url = require('url')
  , _ = require('underscore')
  ;

var configURL = url.parse(process.env['DATACOUCH_ROOT'])
  , couch = configURL.protocol + "//" + configURL.host
  , datasetsDB = couch + "/datacouch/_design/datacouch/_view/by_user?include_docs=true"
  , h = {"Content-type": "application/json", "Accept": "application/json"}
  ;

function backupDatabases() {
  request({uri: datasetsDB, headers: h, include_docs: true}, function(err, resp, body) {
    var dbs = JSON.parse(body).rows
      , pendingBackups = dbs.length
      ;
    _.each(dbs, function(db) {
      var metadataURL = couch + "/datacouch/" + db.id;
      request({uri: metadataURL, headers: h}, function(err, resp, body) {
        var dbInfo = JSON.parse(body)
          , backupURL = couch + "/" + db.id + "-backup"
          , dbURL = couch + "/" + db.id
          ;
        function copyChanged() {
          request({uri: dbURL + "/_changes?since=" + (dbInfo.lastBackupSeq || "0"), headers: h}, function(err, resp, body) {
            var changes = JSON.parse(body).results;
            var pendingDocs = changes.length;
            if(pendingDocs === 0) {
              pendingBackups--;
              if(pendingBackups === 0) setTimeout(backupDatabases, 5000);
            }
            _(changes).each(function(change) {
              var source = dbURL + "/" + change.id + "?attachments=true"
               , destination = backupURL + "/" + change.id + "-" + change.changes[0].rev
               ;
              request.get(source).pipe(request.put(destination, function(err, resp, body) {
                pendingDocs--;
                if(pendingDocs === 0 && change.seq > (dbInfo.lastBackupSeq || 0)) {
                  dbInfo.lastBackupSeq = change.seq;
                  request({uri: metadataURL, method: "PUT", headers: h, body: JSON.stringify(dbInfo)}, function(err, resp, body) {
                    // TODO handle conflicts
                    pendingBackups--;
                    if(pendingBackups === 0) setTimeout(backupDatabases, 5000);                    
                  })
                }
              }))
            })
          })
        }
        checkExistenceOf(backupURL).then(function(status) {
          if(status === 404) {
            createDB(backupURL).then(function(resp) {
              pushCouchapp("../../backup.js", backupURL).then(copyChanged);
            })
          } else {
            copyChanged()
          }
        })
      })
    })
  })
}

function pushCouchapp(app, target) {
  var dfd = deferred();
  var capp = require(absolutePath(app))
  couchapp.createApp(capp, target, function (app) { app.push(function(resp) { dfd.resolve() }) })
  return dfd.promise();
}

function absolutePath(pathname) {
  if (pathname[0] === '/') return pathname
  return path.join(process.env.PWD, path.normalize(pathname));
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

backupDatabases();