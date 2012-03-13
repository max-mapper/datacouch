var request = require('request').defaults({json: true})
  , qs = require('querystring')
  , filed = require('filed')
  , path = require('path')
  , url = require('url')
  , Rewriter = require('rewriter')
  , _ = require('underscore')
  ;

module.exports = function (t) {
  var couch = t.couchurl

  function validateUpdate(req, res, cb) {
    // allow all reading operations
    if (_.include(["GET", "HEAD", "OPTIONS", "COPY"], req.method)) return cb()
    
    // validate all writes
    if (!req.route.params.id) return cb()
    request(couch + 'datacouch/' + req.route.params.id, function(err, resp, doc) {
      if (!req.user) return cb('not logged in')
      if (err) return cb(err)
      if (doc.user !== req.user.twitter.token.screen_name) return cb('you cannot change other users datasets')
      return cb()
    })
  }
  
  var rewrites = [
      { from:"/", to:'pages/index.html'}
    , { from:"/edit", to:"pages/recline.html"}
    , { from:"/edit/*", to:"pages/recline.html"}
    , { from:"/loggedin", to: 'pages/loggedin.html'}
    //, { from:"/api/token", to: } TODO http basic auth tokens
    , { from:"/api/applications/:dataset", to:"_view/applications", query:{endkey:":dataset", startkey:":dataset", include_docs:"true", descending: "true"}}
    , { from:"/api/applications", to:"_view/applications", query:{include_docs:"true", descending: "true"}}
    , { from:"/api/applications/user/:user", to:"_view/applications_by_user", query:{endkey:":user", startkey:":user", include_docs:"true", descending: "true"}}
    , { from:"/api/datasets/:user", to:"_view/by_user", query:{endkey: [":user",null], startkey:[":user",{}], include_docs:"true", descending: "true"}}
    , { from:"/api/datasets", to:"_view/by_date", query:{include_docs:"true", descending: "true"}}
    , { from:"/api/forks/:id", to:"_view/forks", query:{endkey:":id", startkey:":id", include_docs:"true", descending: "true"}}
    , { from:"/api/forks", to:"_view/forks", query:{include_docs:"true", descending: "true"}}
    , { from:"/api/profile/all", to: couch + "datacouch-users/_design/users/_list/all/users"}
    , { from:"/api/trending", to:"_view/popular", query:{include_docs: "true", descending: "true", limit: "10"}}
    , { from:"/api/templates", to:"_view/templates", query:{include_docs: "true"}}
    , { from:"/api/users/search/:user", to: couch + "datacouch-users/_design/users/_view/users", query:{startkey:":user", endkey:":user", include_docs: "true"}}
    , { from:"/analytics.gif", to: couch + "_analytics/spacer.gif"}
    , { from:"/db/:id/csv", to: couch + ':id/_design/recline/_list/csv/all'}
    , { from:"/db/:id/json", to: couch + ':id/_design/recline/_list/bulkDocs/all'}
    , { from:"/db/:id/headers", to: couch + ':id/_design/recline/_list/array/headers', query: {group: "true"}}
    , { from:"/db/:id/rows", to: couch + ':id/_design/recline/_view/all'}
    , { before: validateUpdate
      , rewrites: [
          { from:"/api/epsg/:code", to: couch + "epsg/:code"}
        , { from:"/api/users", to: couch + 'datacouch-users/'}
        , { from:"/api/users/*", to: couch + 'datacouch-users/*'}
        , { from:"/api/couch", to: couch + ""}
        , { from:"/api/couch/*", to: couch + "*"}
        , { from:"/api", to: couch + 'datacouch'}
        , { from:"/api/*", to: couch + 'datacouch/*'}
        , {from:"/db/:id", to: couch + ":id/"}
        , {from:"/db/:id/*", to: couch + ":id/*"}
        ]
      }
    , { from:"/:user", to:"pages/index.html"}
    , { from:"/*", to:"*"}
  ]
  var ddoc = couch + "datacouch/_design/datacouch/"
  new Rewriter(t, rewrites, {ddoc: ddoc, attachments: path.resolve(__dirname, '..', 'attachments')})
}
