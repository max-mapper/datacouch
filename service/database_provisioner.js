var follow = require('follow')
  , txn = require("txn")
  , request = require('request').defaults({json: true})
  , couchapp = require('couchapp')
  , http = require('http')
  , path = require('path')
  , url = require('url')
  , _ = require('underscore')
  ;

module.exports = function (t) {

  var couch = t.couchurl
    , db = t.couchurl + "datacouch"
    ;
  follow({db: db, filter: "datacouch/by_value", query_params: {k: "type", v: "newDatabase"}}, function(error, change) {
    if (error) return console.error(error)
    provision(db + '/' + change.id, function(err, newData) {
      if (err) return t.sockets.emit(newData._id, err)
      t.sockets.emit(newData._id, false, newData)
    })
  })
    
  function provision(docURL, cb) {
    txn({"uri":docURL}, processDatabase, function(error, newData) {
      if (error) return cb(error)
      return cb(false, newData)
      throw error; // Unknown error
    })
  }
  
  function processDatabase(doc, txncb) {
    var dbName = doc._id
     , dbPath = couch + dbName
     , startTime = new Date()
     ;
     
     function done(err) { 
       if (err) return txncb(err)
       console.log("provisioned " + dbName + " in " + (new Date() - startTime) + "ms")
       doc.type = "database"
       return txncb()
     }
     
     checkExistenceOf(dbPath, function(err, status) {
       if (status !== 404) return done()
       console.log('creating ' + dbName)
       createDB(dbPath, function(err, response) {
         // TODO prevent user from forking the same dataset twice
         if (doc.forkedFrom) replicate(doc.forkedFrom, dbName, done)
         else pushCouchapp("recline", dbPath, done)
       })
     
     })
  }
  
  function registerApp(appURL, doc, db, callback) {
    // addVhost(appURL, "/" + doc.dataset + "/_design/" + doc.ddoc + "/_rewrite").then(function() {
      request.post({url: db, body: _.extend({}, doc, {url: appURL})}, function(e,r,b) {
        if (callback) return callback(b)
      })
    // });
  }

  function absolutePath(pathname) {
    if (pathname[0] === '/') return pathname
    return path.join(process.env.PWD, path.normalize(pathname));
  }

  function pushCouchapp(app, target, cb) {
    var source = couch + 'datacouch-apps/_design/' + app + "?attachments=true"
      , destination = target + '/_design/' + app + "?new_edits=false"
      , headers = {'accept':"multipart/related,application/json"}
      , down = request.get({url: source, headers: headers})
      , up = request.put(destination, function(err, resp, body) { 
          if(err) return cb(err)
          return cb(false, body)
        })
    down.pipe(up)
  }

  function replicate(source, target, ddoc, cb) {
    var reqData = {"source": source,"target": target, "create_target": true};
    if (ddoc) reqData["doc_ids"] = [ddoc];
    request({uri: couch + "_replicate", method: "POST", body: reqData}, function (err, resp, body) {
      if (err) return cb(new Error('ahh!! ' + err))
      if (body.doc_write_failures > 0) return cb(new Error('error creating: ' + body))
      return cb(false, body)
    })
  }

  function checkExistenceOf(url, cb) {
    request({uri: url, method: "HEAD", json: false}, function(err, resp, body) {
      if(err) return cb(err)
      return cb(false, resp.statusCode);
    })
  }

  function createDB(url, cb) {
    request({uri: url, method: "PUT"}, function (err, resp, response) {
      if (err) return cb(new Error('ahh!! ' + err))
      if (!response) response = {"ok": true}      
      if (!response.ok) return cb(new Error(url + " - " + response))
      makePrivate(url, function(err) {
        if (err) return cb(err)
        return cb(false, resp.statusCode)
      })
    })
  }

  function addVhost(url, couchapp, cb) {
    request({uri: couch + "_config/vhosts/" + encodeURIComponent(url), method: "PUT", body: JSON.stringify(couchapp), json: false}, function (err, resp, body) {
      if (err) return cb(new Error('ahh!! ' + err))
      return cb(false, body)
    })
  }

  function makePrivate(dbURL, cb) {
    var permissions = {"admins":{"names":[],"roles":[]},"members":{"names":[],"roles":["_admin"]}};
    request({uri: dbURL + "/_security", method: "PUT", body: permissions}, function (err, resp, body) {
      if (err) return cb(new Error('ahh!! ' + err))
      if (!body.ok) return cb(new Error('error setting admin: ' + body))
      return cb(false, body);
    })
  }
  
}