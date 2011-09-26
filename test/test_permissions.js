var couch         = process.env['DATACOUCH_ROOT']
  , couchVhost    = process.env['DATACOUCH_VHOST']
  ;

var it = require('it-is')
  , _ = require('underscore')
  , request = require('request')
  , async = require('async')
  , util = require('../processors/auth/couch_utils')
  ;

function waitUntilExists(url, callback) {
  var start = new Date();
  (function headRequest() {
    request.head(url
      , function(e,r,b) {
        if( (new Date() - start) > 5000 ) callback(false)
        if(r.statusCode === 404) {
          setTimeout(function() {
            headRequest(url);
          }, 100)
        } else {
          callback(true)
        }
      })
  }())
}

function verifyCreated(doc, url, callback) {
  request.get({uri: url, json: true}
    , function(e,r,b) {
      it(404).equal(r.statusCode);
      request.post({uri: couch + '/datacouch', body: doc, json: true}
        , function(e,r,b) {
          doc._rev = b.rev;
          it(201).equal(r.statusCode);
          waitUntilExists(url, function(ok) {
            doc._deleted = true;
            async.parallel({
                db: function(cb) { request.del({uri: couch + '/' + doc._id, json: true}, cb) }
              , doc: function(cb) { request.post({uri: couch + '/datacouch', body: doc, json: true}, cb) }
              }
              , function(err, results) {
                it(ok).equal(true);
                it(results.db[1].ok).equal(true);
                it(results.doc[1].ok).equal(true);
             }
            )
          })
        })
    })

}

// create dataset for user

var databaseDoc = {
  _id: "dc234oiu23bh4ou2b3o4i2",
  name: "shire craigslist scraped apartments",
  description: "potential real estate investment opportunities in the shire",
  type: "database",
  user: "bilbobaggins",
  createdAt: new Date()
}

verifyCreated(databaseDoc, couch + '/' + databaseDoc._id)

