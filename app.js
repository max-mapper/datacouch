var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc =
  { _id:'_design/datacouch'
  , rewrites :
    [ {from:"/", to:'pages/index.html'}
    , {from:"/edit", to:"pages/recline.html"}
    , {from:"/edit/*", to:"pages/recline.html"}
    // , {from:"/fakelogin", to:"../../../_twitter/auth/fakelogin"} // only enable when testing offline
    , {from:"/proxy", to:"../../../_smalldata/"}
    , {from:"/proxy/*", to:"../../../_smalldata/*"}
    , {from:"/socket.io", to:"../../../_smalldata/wiki/socket.io"}
    , {from:"/socket.io/*", to:"../../../_smalldata/wiki/socket.io/*"}
    , {from:"/login", to:"../../../_smalldata/twitter/auth/twitter"}
    , {from:"/login/callback", to:"../../../_smalldata/twitter/auth/twitter/callback"}
    , {from:"/logout", to:"../../../_smalldata/twitter/logout"}
    , {from:"/api/token", to:"../../../_smalldata/twitter/auth/token"}
    , {from:"/api/upload/*", to:"../../../_smalldata/upload/*"}
    , {from:"/api/applications/:dataset", to:"_view/applications", query:{endkey:":dataset", startkey:":dataset", include_docs:"true", descending: "true"}}
    , {from:"/api/applications", to:"_view/applications", query:{include_docs:"true", descending: "true"}}
    , {from:"/api/applications/user/:user", to:"_view/applications_by_user", query:{endkey:":user", startkey:":user", include_docs:"true", descending: "true"}}
    , {from:"/api/datasets/:user", to:"_view/by_user", query:{endkey: [":user",null], startkey:[":user",{}], include_docs:"true", descending: "true"}}
    , {from:"/api/datasets", to:"_view/by_date", query:{include_docs:"true", descending: "true"}}
    , {from:"/api/forks/:id", to:"_view/forks", query:{endkey:":id", startkey:":id", include_docs:"true", descending: "true"}}
    , {from:"/api/forks", to:"_view/forks", query:{include_docs:"true", descending: "true"}}
    , {from:"/api/profile/all", to:"../../../datacouch-users/_design/users/_list/all/users"}
    , {from:"/api/trending", to:"_view/popular", query:{include_docs: "true", descending: "true", limit: "10"}}
    , {from:"/api/templates", to:"_view/templates", query:{include_docs: "true"}}
    , {from:"/api/users/search/:user", to:"../../../datacouch-users/_design/users/_view/users", query:{startkey:":user", endkey:":user", include_docs: "true"}}
    , {from:"/api/users", to:'../../../datacouch-users/'}
    , {from:"/api/users/*", to:'../../../datacouch-users/*'}
    , {from:"/api/couch", to:"../../../"}
    , {from:"/api/couch/*", to:"../../../*"}
    , {from:"/api/epsg/:code", to:"../../../epsg/:code"}
    , {from:"/api", to:"../../"}
    , {from:"/api/*", to:"../../*"}
    , {from:"/analytics.gif", to:"../../../_analytics/spacer.gif"}
    , {from:"/db/:id/csv", to:'../../../:id/_design/recline/_list/csv/all'}
    , {from:"/db/:id/json", to:'../../../:id/_design/recline/_list/bulkDocs/all'}
    , {from:"/db/:id/headers", to:'../../../:id/_design/recline/_list/array/headers', query: {group: "true"}}
    , {from:"/db/:id/rows", to:'../../../:id/_design/recline/_view/all'}
    , {from:"/db/:id", to:"../../../:id/"}
    , {from:"/db/:id/*", to:"../../../:id/*"}
    , {from:"/:user", to:"pages/index.html"}
    , {from:"/*", to:'*'}
    ]
  }
  ;

ddoc.views = {
  /**
   * A simple map function mocking _all, but allows usage with lists etc.
   */
  all: {
    map: function(doc) {
      emit(doc._id, doc);
    }
  },
  headers: {
    map: function(doc) {
      var keys = [];
      for (var key in doc) {
        emit(key, 1);        
      }
    },
    reduce: "_sum"
  },
  by_user: {
    map: function(doc) {
      if(doc.type === "database") emit([doc.user, doc.createdAt] , doc.name);
    }
  },
  by_date: {
    map: function(doc) {
      if(doc.type === "database") emit(doc.createdAt, doc.name);
    }
  },
  popular: {
    map: function(doc) {
      if(doc.hits) emit(doc.hits);
    }
  },
  templates: {
    map: function(doc) {
      if(doc.type === "template") emit(doc.name);
    }
  },
  applications: {
    map: function(doc) {
      if(doc.type === "app" && doc.url) emit(doc.dataset);
    }
  },
  applications_by_user: {
    map: function(doc) {
      if(doc.type === "app" && doc.url) emit(doc.user);
    }
  },
  forks: {
    map: function(doc) {
      if(doc.forkedFrom) emit(doc.forkedFrom);
    }
  }
};

ddoc.filters = {
  by_value: function(doc, req) {
    if (!req.query.k || !req.query.v || !doc[req.query.k]) return false;
    return doc[req.query.k] === req.query.v;
  }
}

ddoc.lists = {
  /**
   * Generates a CSV from all the rows in the view.
   *
   * Takes in a url encoded array of headers as an argument. You can
   * generate this by querying /_list/urlencode/headers. Pass it in
   * as the headers get parameter, e.g.: ?headers=%5B%22_id%22%2C%22_rev%5D
   *
   * @author Max Ogden
   */
  csv: function(head, req) {  
    if ('headers' in req.query) {
      var headers = JSON.parse(unescape(req.query.headers));

      var row, sep = '\n', headerSent = false, startedOutput = false;

      start({"headers":{"Content-Type" : "text/csv; charset=utf-8"}});
      send('"' + headers.join('","') + '"\n');
      while (row = getRow()) {
        for (var header in headers) {
          if (row.value[headers[header]]) {
            if (startedOutput) send(",");
            var value = row.value[headers[header]];
            if (typeof(value) == "object") value = JSON.stringify(value);
            if (typeof(value) == "string") value = value.replace(/\"/g, '""');
            send("\"" + value + "\"");
          } else {
            if (startedOutput) send(",");
          } 
          startedOutput = true;
        }
        startedOutput = false;
        send('\n');
      }
    } else {
      send("You must pass in the urlencoded headers you wish to build the CSV from. Query /_list/urlencode/headers?group=true");
    }
  },
  /**
   * Returns an array of the view keys 
   *
   * @author Max Ogden
   */
  array: function(head, req) {
    start({"headers":{"Content-Type" : "application/json; charset=utf-8"}});
    if ('callback' in req.query) send(req.query['callback'] + "(");

    var headers = [];
    while (row = getRow()) {
      headers.push(row.key);
    }
    send(JSON.stringify(headers));

    if ('callback' in req.query) send(")");
  },
  /**
   * A list function that outputs the same format that you use to post into the _bulk_docs API
   *
   * @author Max Ogden
   */
  bulkDocs: function(head, req) {
      var row, out, sep = '\n';

      start({"headers":{"Content-Type" : "application/json"}});

      if ('callback' in req.query) send(req.query['callback'] + "(");

      send('{"docs":[');
      while (row = getRow()) {
          out = JSON.stringify(row.value);
          send(sep + out);
          sep = ',\n';
      }
      send("\n]}");
      if ('callback' in req.query) send(")");
  }
}

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx, securityObj) {
  if (userCtx.roles.indexOf('_admin') > -1) return;
  if (["app", "database", "template"].indexOf(newDoc.type) === -1) throw({forbidden : "Invalid doc type"});
  if ( !userCtx.name ) throw({forbidden : "You have to sign in to do that."});
  if ( (newDoc.user !== userCtx.name) ) throw({forbidden : "You can't create datasets or apps for other users."});
  if( newDoc.forkedFromUser && ( newDoc.forkedFromUser === userCtx.name )) throw({forbidden : "You can't fork your own datasets."});
  if( newDoc.type === "transformation" && ( newDoc.user !== userCtx.name )) throw({forbidden : "You can't transform other users datasets."});
};

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;