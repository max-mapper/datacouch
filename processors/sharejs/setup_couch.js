if(!process.env['DATACOUCH_ROOT']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT");

var couch = require('url').parse(process.env['DATACOUCH_ROOT']);

var request = require('request')
  , _ = require('underscore')
  , ddoc = { 
      _id: '_design/sharejs'
    , views: {
        operations: {
            map: "function(doc) { if (doc.docName) emit([doc.docName, doc.v]) }"
        }
      }
    }
  , options = {
      port: couch.port
    , hostname: couch.protocol + "//" + (couch.auth ? couch.auth + "@" : "") + couch.hostname
    , db: "ot"
  }
  , db = options.hostname + ":" + options.port + '/' + options.db
  ;


function ensureResourceExists(url, data, callback) {
  request.head(url, function(err, resp) {
    if (resp.statusCode === 404) {
      request.put({url: url, json: true, body: data}, function(err, resp, body) {
        if (body.ok) callback(body.ok)
        else callback(false, "CouchDB error: " + JSON.stringify(body))
      })
    } else {
      callback(true);
    }
  });
}

ensureResourceExists(db, {}, function(ok, err) {
  if(err) throw new Error(err);
  ensureResourceExists(db + '/' + ddoc._id, ddoc
    , function(ok, err) {
      if(err) throw new Error(err);
      console.log('CouchDB has been setup for real time editing!');
    })
})