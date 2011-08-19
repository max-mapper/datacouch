/**  Creates databases for users
  *  Usage: change settings then "node provision_databases.js"
  *  Author: Max Ogden (@maxogden)
 **/

var follow = require('follow')
  , request = require('request')
  , deferred = require('deferred')
  , http = require('http')
  ;

var couch = "http://admin:admin@localhost:5984"
  , db = couch + "/datacouch"
  , h = {"Content-type": "application/json", "Accept": "application/json"}
  ;

follow({db:db, include_docs:true}, function(error, change) {
  if (error || change.deleted || !("doc" in change)) return;
  if (!("type" in change.doc)) return;
  if (change.doc.type !== "database") return;
  
  var doc = change.doc
    , dbName = doc._id
    , dbPath = couch + "/" + dbName
    ;

  checkForDB(dbPath).then(function(status) {
    if(status === 404) {
      console.log('creating ' + dbName);
      var start_time = new Date();
      createDB(dbPath).then(function(response) {
        function done() { console.log("created " + dbName + " in " + (new Date() - start_time) + "ms") }
        if (doc.forkedFrom) {
          replicate(doc.forkedFrom, dbName).then(done);
        } else {
          replicate("apps", dbName, "_design/recline").then(done);
        }
        setAdmin(dbName, doc.user); 
      })
    }
  })
})

function replicate(source, target, ddoc) {
  var dfd = deferred();
  var reqData = {"source": source,"target": target};
  if (ddoc) reqData["doc_ids"] = [ddoc];
  request({uri: couch + "/_replicate", method: "POST", headers: h, body: JSON.stringify(reqData)}, function (err, resp, body) {
    if (err) throw new Error('ahh!! ' + err);
    var response = JSON.parse(body);
    if (response.doc_write_failures > 0) throw new Error('error creating: ' + body);
    dfd.resolve(response);
  })
  return dfd.promise();
}

function checkForDB(url) {
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

function setAdmin(dbName, username) {
  var dfd = deferred();
  var data = {"admins":{"names":[username],"roles":[]},"members":{"names":[],"roles":[]}};
  request({uri: couch + "/" + dbName + "/_security", method: "PUT", headers: h, body: JSON.stringify(data)}, function (err, resp, body) {
    if (err) throw new Error('ahh!! ' + err);
    var response = JSON.parse(body);
    if (!response.ok) throw new Error('error setting admin: ' + body);
    dfd.resolve(response);
  })
  return dfd.promise(); 
}