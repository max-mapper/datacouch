var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc =
  { _id:'_design/datacouch'
  , rewrites :
    [ {from:"/", to:'pages/index.html'}
    , {from:"/edit/*", to:"pages/recline.html"}
    , {from:"/api/datasets/:user", to:"_view/by_user", query:{endkey: [":user",null], startkey:[":user",{}], include_docs:"true", descending: "true"}}
    , {from:"/api/datasets", to:"_view/by_date", query:{include_docs:"true", descending: "true"}}
    , {from:"/api/profile/all", to:"../../../datacouch-users/_design/users/_list/all/users"}
    , {from:"/api/trending", to:"_view/trending", query:{group: "true"}}
    , {from:"/api/users/search/:user", to:"../../../datacouch-users/_design/users/_view/users", query:{startkey:":user", endkey:":user", include_docs: "true"}}
    , {from:"/api/users/by_email/:user", to:"../../../datacouch-users/_design/users/_view/by_email", query:{startkey:":user", endkey:":user", include_docs: "true"}}
    , {from:"/api/users", to:'../../../datacouch-users/'}
    , {from:"/api/users/*", to:'../../../datacouch-users/*'}
    , {from:"/api/couch", to:"../../../"}
    , {from:"/api/couch/*", to:"../../../*"}
    , {from:"/api", to:"../../"}
    , {from:"/api/*", to:"../../*"}
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

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  }
};

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
  trending: {
    map: function(doc) {
      if(doc.type === "database" && doc.forkedFrom){
        log(doc._id + '____' + doc.forkedFrom);
        
        emit(doc.forkedFrom, 1);
      }
    },
    reduce: '_sum'
  }
};

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

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (userCtx.roles.indexOf('_admin') > -1) return;
  if ( (newDoc.type !== "database") || (newDoc.couch_user !== userCtx.name) ) throw({forbidden : "You can't create datasets for other users."});
};

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;