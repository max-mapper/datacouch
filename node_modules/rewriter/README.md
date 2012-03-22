serve apps with node point javascript! uses the unreleased streaming web framework codenamed tako

all you need is a folder (or existing http server) full of static assets and a little bit o' javascripts:

    var tako = require('tako')
      , http = require('http')
      , path = require('path')
      , Rewriter = require('rewriter')
      , rewrites = [ 
          { from:"/", to:'index.html' }
        ]
      ;
   
    var t = tako()
    
    new Rewriter(t, rewrites, { attachments: path.resolve(__dirname, 'attachments') })
    // you can also do { attachments: "http://myawesomestaticfileserver.com" }
    
    t.listen(function(handler) {
      return http.createServer(handler)
    }, 9999)

rewriter was built to work easily with couchdb! you can do things like serve couchapps from node and proxy to couch:

    var couch = "http://localhost:5984"
      , rewrites = [ 
          {from:"/", to:'index.html'}
        , {from:"/api/couch", to: couch + "/"}
        , {from:"/api/couch/*", to: couch + "/*"}
        , {from:"/api", to: couch + "/appdatabase"}
        , {from:"/api/*", to: couch + "/appdatabase/*"}
        , {from:"/db/:id", to: couch + "/:id/"}
        , {from:"/db/:id/*", to: couch + "/:id/*"}
        ]
      ;
      
    new Rewriter(t, rewrites)
    
you can specify an async middleware errback function that the proxied request will be run through either singularly or using a group

the callback is in the form `callback(err)` and must be called for the request to continue. call with no arguments to resume normally or with an error message as the first argument to `res.end()` the request with that message.

    var rewrites = [ 
          {from:"/awesome", to: couch + "/", before: function(req, res, cb) { console.log(req.connection.remoteAddress); cb() }}
        , {before: function(req, res, cb) { if (req.headers.referrer !== "awesome.com") cb('go away hotlinkers') }
          , rewrites: [
              {from:"/api/couch/*", to: couch + "/*"}
            , {from:"/api", to: couch + "/appdatabase"}
            , {from:"/api/*", to: couch + "/appdatabase/*"}
            , {from:"/db/:id", to: couch + "/:id/"}
            , {from:"/db/:id/*", to: couch + "/:id/*"}
            ]
          }
        ]
      ;

    new Rewriter(t, rewrites)

there is also a shorthand for specifying a `root` url that will be used in all absolute `to` rewrites (ones that begin with a forward slash e.g. `to: "/hello"`). conversely, all relative rewrites (no forward slash at the beginning e.g. `to: "hello.html"`) will be routed to the `attachments` directory

    var rewrites = [ 
        {from:"/api/applications/:dataset", to:"/_view/applications", query:{endkey:":dataset", startkey:":dataset", include_docs:"true", descending: "true"}}
      , {from:"/api/applications", to:"/_view/applications", query:{include_docs:"true", descending: "true"}}
      , {from:"/api/applications/user/:user", to:"/_view/applications_by_user", query:{endkey:":user", startkey:":user", include_docs:"true", descending: "true"}}
      , {from:"/api/datasets/:user", to:"/_view/by_user", query:{endkey: [":user",null], startkey:[":user",{}], include_docs:"true", descending: "true"}}
      , {from:"/api/datasets", to:"/_view/by_date", query:{include_docs:"true", descending: "true"}}
    ]
    
    new Rewriter(t, rewrites, {root: "http://localhost:5984/mydataset/_design/mydesigndocument"})

MIT License