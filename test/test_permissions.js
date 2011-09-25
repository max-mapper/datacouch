var couch         = process.env['DATACOUCH_ROOT']
  , couchVhost    = process.env['DATACOUCH_VHOST']
  ;

var it = require('it-is')
  , _ = require('underscore')
  , request = require('request')
  , util = require('../processors/auth/couch_utils')
  ;

function waitUntilExists(url, callback) {
  request.head(url
    , function(e,r,b) {
        if(r.statusCode === 404) {
          setTimeout(function() {
            console.log("waiting for " + url + " to exist");
            waitUntilExists(url, callback);
          }, 50)
        } else {
          callback()
        }
      })
}

function verifyCreated(doc, url) {
  request.get({uri: url, json: true}
    , function(e,r,b) {
      it(404).equal(r.statusCode);
      request.post({uri: couch + '/datacouch', body: doc, json: true}
        , function(e,r,b) {
          doc._rev = b.rev;
          it(201).equal(r.statusCode);
          waitUntilExists(url, function() {
            request.del(couch + '/' + doc._id);
            doc._deleted = true;
            request.post({uri: couch + '/datacouch', body: doc, json: true});
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

