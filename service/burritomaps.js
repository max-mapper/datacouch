var tako = require('tako')
var stoopid = require('stoopid')
var request = require('request').defaults({json: true})
var Rewriter = require('rewriter')
var follow = require('follow')
var _ = require('underscore')

module.exports = function (router, t) {
  
  t.route("/burritomaps", function(req, resp) {
    resp.end(JSON.stringify(Object.keys(router.hosts)))
  })
  
  follow({db: t.couchurl+ 'datacouch', include_docs: true, filter: "datacouch/by_value", query_params: {k: "type", v: "app"}}, function(err, change) {
    if (err) return console.error("follow error", t.couchurl+ 'datacouch',  err)
    if (change.doc.deleted) return
    var ddoc = t.couchurl + change.doc.dataset + '/_design/' + change.doc.ddoc
    request(ddoc, function(err, resp, app) {
      function bootApp(app) {
        var burritomap = tako({logger:stoopid.logger(change.doc._id), socketio:false})
        new Rewriter(burritomap, app.rewrites, {root: ddoc, attachments: ddoc})
        console.log(change.doc._id + "." + t.appsurl)
        router.host(change.doc._id + "." + t.appsurl, burritomap)
        t.sockets.emit(change.doc._id, {ok: true, url: change.doc._id + "." + t.appsurl})
      }
      if (err) return console.error("request error", err)
      if (resp.statusCode === 404) {
        return copyCouchapp(change.doc.ddoc, t.couchurl + change.doc.dataset, function(err, resp) {
          if (err) return console.error("copy error", err)
          request(ddoc, function(err, resp, app) {
            if (err) return console.error("post copy error", err)
            return bootApp(app)
          })
        })
      }
      return bootApp(app)
    })
  })
  
  function copyCouchapp(app, target, cb) {
    var source = t.couchurl + 'datacouch-apps/_design/' + app + "?attachments=true"
      , destination = target + '/_design/' + app + "?new_edits=false"
      , headers = {'accept':"multipart/related,application/json"}
      , down = request.get({url: source, headers: headers})
      , up = request.put(destination, function(err, resp, body) { 
          if(err) return cb(err)
          return cb(false, body)
        })
    down.pipe(up)
  }
}