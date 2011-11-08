/**  Creates databases for users
  *  Setup environment variables (see datacouch readme for more info):
  *    export DATACOUCH_ROOT="http://admin:pass@localhost:5984"
  *    export DATACOUCH_VHOST="couchdb.dev:5984"
  *  then "node provision_databases.js"
  *  Author: Max Ogden (@maxogden)
 **/

if(!process.env['DATACOUCH_ROOT'] || !process.env['DATACOUCH_VHOST']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT and $DATACOUCH_VHOST");

var follow = require('follow')
  , request = require('request').defaults({json: true})
  , couchapp = require('couchapp')
  , deferred = require('deferred')
  , http = require('http')
  , path = require('path')
  , url = require('url')
  , _ = require('underscore')
  ;

var configURL = url.parse(process.env['DATACOUCH_ROOT'] + "/datacouch")
  , vhostDomain = process.env['DATACOUCH_VHOST']
  , couch = configURL.protocol + "//" + configURL.host
  , db = couch + configURL.pathname
  ;

follow({db: db, include_docs: true, filter: "datacouch/by_value", query_params: {k: "type", v: "database"}}, function(error, change) {
  if (error || !("doc" in change)) return;
  var doc = change.doc
    , dbName = doc._id
    , dbPath = couch + "/" + dbName
    ;
  checkExistenceOf(dbPath).then(function(status) {
    if( (status === 404) && (!change.deleted) ) {
      console.log('creating ' + dbName);
      var start_time = new Date();
      createDB(dbPath).then(function(response) {
        function done() { console.log("created " + dbName + " in " + (new Date() - start_time) + "ms") }
        if (doc.forkedFrom) {
          // TODO prevent user from forking the same dataset twice
          replicate(doc.forkedFrom, dbName).then(done);
        } else {
          pushCouchapp("recline", dbPath).then(done);
        }
        setAdmin(dbName, doc.user); 
      })
    }
  })
})

follow({db: db, include_docs: true, filter: "datacouch/by_value", query_params: {k: "type", v: "app"}}, function(error, change) {
  if (error || change.deleted || !("doc" in change)) return;
  var start_time = new Date()
    , dbPath = couch + '/' + change.doc.dataset
    ;
  checkExistenceOf(dbPath + "/_design/" + change.doc.ddoc).then(function(status) {
    var appURL = change.doc._id + "." + vhostDomain;
    if (status === 404) {
      replicate("apps", dbPath, "_design/" + change.doc.ddoc).then(function(resp) {
        registerApp(appURL, change.doc, db, function(resp) {
          console.log("installed " + doc.ddoc + " app into " + db + " in " + (new Date() - start_time) + "ms");
        })
      });
    } else if (!change.doc.url) {
      registerApp(appURL, change.doc, db, function(resp) {
        console.log("updated " + change.doc.ddoc + " app into " + db + " in " + (new Date() - start_time) + "ms");
      })
    }
  })
})

function registerApp(appURL, doc, db, callback) {
  addVhost(appURL, "/" + doc.dataset + "/_design/" + doc.ddoc + "/_rewrite").then(function() {
    request.post({url: db, body: _.extend({}, doc, {url: appURL})}, function(e,r,b) {
      if (callback) callback(b)
    })
  });
}

function absolutePath(pathname) {
  if (pathname[0] === '/') return pathname
  return path.join(process.env.PWD, path.normalize(pathname));
}

function pushCouchapp(app, target) {
  var dfd = deferred()
    , source = couch + '/apps/_design/' + app + "?attachments=true"
    , destination = target + '/_design/' + app + "?new_edits=false"
    , headers = {'accept':"multipart/related,application/json"}
    ;
  request.get({url: source, headers: headers}).pipe(request.put(destination, function(err, resp, body) { 
    dfd.resolve(body);
  }));
  return dfd.promise();
}

function replicate(source, target, ddoc) {
  var dfd = deferred();
  var reqData = {"source": source,"target": target, "create_target": true};
  if (ddoc) reqData["doc_ids"] = [ddoc];
  request({uri: couch + "/_replicate", method: "POST", body: reqData}, function (err, resp, body) {
    if (err) throw new Error('ahh!! ' + err);
    if (body.doc_write_failures > 0) throw new Error('error creating: ' + body);
    dfd.resolve(body);
  })
  return dfd.promise();
}

function checkExistenceOf(url) {
  var dfd = deferred();
  request({uri: url, method: "HEAD", json: false}, function(err, resp, body) {
    dfd.resolve(resp.statusCode);
  })
  return dfd.promise();
}

function createDB(url) {
  var dfd = deferred();
  request({uri: url, method: "PUT"}, function (err, resp, body) {
    if (err) throw new Error('ahh!! ' + err);
    var response = body;
    if (!response) response = {"ok": true};
    if (!response.ok) throw new Error(url + " - " + body);
    dfd.resolve(resp.statusCode);
  })
  return dfd.promise();
}

function addVhost(url, couchapp) {
  var dfd = deferred();
  request({uri: couch + "/_config/vhosts/" + encodeURIComponent(url), method: "PUT", body: JSON.stringify(couchapp), json: false}, function (err, resp, body) {
    console.log(body)
    if (err) throw new Error('ahh!! ' + err);
    dfd.resolve(body);
  })
  return dfd.promise(); 
}

function setAdmin(dbName, username) {
  var dfd = deferred();
  var data = {"admins":{"names":[username],"roles":[]},"members":{"names":[],"roles":[]}};
  request({uri: couch + "/" + dbName + "/_security", method: "PUT", body: data}, function (err, resp, body) {
    if (err) throw new Error('ahh!! ' + err);
    if (!body.ok) throw new Error('error setting admin: ' + body);
    dfd.resolve(body);
  })
  return dfd.promise(); 
}