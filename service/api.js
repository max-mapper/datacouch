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
  
  var ddoc = couch + "datacouch/_design/datacouch/"
  
  var rewrites = [
      { from:"/", to:'pages/index.html'}
    , { from:"/edit", to:"pages/recline.html"}
    , { from:"/edit/*", to:"pages/recline.html"}
    , { from:"/loggedin", to: 'pages/loggedin.html'}
    //, { from:"/api/token", to: } TODO http basic auth tokens
    , { from:"/api/applications/:dataset", to: ddoc + "_view/applications", query:{endkey:":dataset", startkey:":dataset", include_docs:"true", descending: "true"}}
    , { from:"/api/applications", to: ddoc + "_view/applications", query:{include_docs:"true", descending: "true"}}
    , { from:"/api/applications/user/:user", to: ddoc + "_view/applications_by_user", query:{endkey:":user", startkey:":user", include_docs:"true", descending: "true"}}
    , { from:"/api/datasets/:user", to: ddoc + "_view/by_user", query:{endkey: [":user",null], startkey:[":user",{}], include_docs:"true", descending: "true"}}
    , { from:"/api/datasets", to: ddoc + "_view/by_date", query:{include_docs:"true", descending: "true"}}
    , { from:"/api/forks/:id", to: ddoc + "_view/forks", query:{endkey:":id", startkey:":id", include_docs:"true", descending: "true"}}
    , { from:"/api/forks", to: ddoc + "_view/forks", query:{include_docs:"true", descending: "true"}}
    , { from:"/api/profile/all", to:"/datacouch-users/_design/users/_list/all/users"}
    , { from:"/api/trending", to: ddoc + "_view/popular", query:{include_docs: "true", descending: "true", limit: "10"}}
    , { from:"/api/templates", to:"/datacouch-apps/_all_docs", query:{include_docs:"true", startkey: "_design/", endkey: "_design0"}}
    , { from:"/api/templates/*", to:"/datacouch-apps/*",}
    , { from:"/api/users/search/:user", to:"/datacouch-users/_design/users/_view/users", query:{startkey:":user", endkey:":user", include_docs: "true"}}
    , { from:"/db/:id/csv", to:'/:id/_design/recline/_list/csv/all'}
    , { from:"/db/:id/json", to:'/:id/_design/recline/_list/bulkDocs/all'}
    , { from:"/db/:id/headers", to:'/:id/_design/recline/_list/array/headers', query: {group: "true"}}
    , { from:"/db/:id/rows", to:'/:id/_design/recline/_view/all'}
    , { before: validateUpdate
      , rewrites: [
          { from:"/api/epsg/:code", to:"/epsg/:code"}
        , { from:"/api/users", to:'/datacouch-users/'}
        , { from:"/api/users/*", to:'/datacouch-users/*'}
        , { from:"/api/couch", to:"/"}
        , { from:"/api/couch/*", to:"/*"}
        , { from:"/api", to:'/datacouch'}
        , { from:"/api/*", to:'/datacouch/*'}
        , {from:"/db/:id", to:"/:id/"}
        , {from:"/db/:id/*", to:"/:id/*"}
        ]
      }
    , { from:"/:user", to:"pages/index.html"}
    , { from:"/*", to:"*"}
  ]
  new Rewriter(t, rewrites, {verbose: true, root: couch, attachments: path.resolve(__dirname, '..', 'attachments')})
}
