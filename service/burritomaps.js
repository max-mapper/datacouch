var tako = require('tako')
var stoopid = require('stoopid')
var request = require('request').defaults({json: true})
var Rewriter = require('rewriter')
var follow = require('follow')

module.exports = function (router, t) {
  follow({db: t.couchurl+ 'datacouch', include_docs: true, filter: "datacouch/by_value", query_params: {k: "type", v: "app"}}, function(err, change) {
    if (err) return console.error(err)
    var ddoc = t.couchurl + change.doc.dataset + '/_design/' + change.doc.ddoc
    request(ddoc, function(err, resp, app) {
      function bootApp(app) {
        var burritomap = tako({logger:stoopid.logger(change.doc._id), socketio:false})
        new Rewriter(burritomap, app.rewrites, {ddoc: ddoc, attachments: ddoc})
        console.log(change.doc._id + "." + t.appsurl)
        router.host(change.doc._id + "." + t.appsurl, burritomap)
        t.sockets.emit(change.doc._id, {ok: true, url: change.doc._id + "." + t.appsurl})
      }
      if (err) return console.error(err)
      if (resp.statusCode === 404) {
        return copyCouchapp(change.doc.ddoc, t.couchurl + change.doc.dataset, function(err, resp) {
          if (err) return console.error(err)
          request(ddoc, function(err, resp, app) {
            if (err) return console.error(err)
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