/**
 * integration tests for datacouch. most test that the async _changes daemons are
 * doing their jobs correctly
 * run via 'node test_permissions.js'. no output means everything passed!
 */

// setup & test helpers

var couch         = process.env['DATACOUCH_ROOT']
  , couchVhost    = process.env['DATACOUCH_VHOST']
  ;
 
var it = require('it-is')
  , _ = require('underscore')
  , request = require('request')
  , async = require('async')
  , util = require('../processors/auth/couch_utils')
  ;
 
var databaseDoc = {
  _id: "dc234oiu23bh4ou2b3o4i2",
  name: "shire craigslist scraped apartments",
  description: "potential real estate investment opportunities in the shire",
  type: "database",
  user: "bilbobaggins",
  createdAt: new Date()
}

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
          waitUntilExists(url, callback)
        })
    })
}

var tests = [
  function newDatasetForUser(done) {
    // should make a couch database with id equal to the metadata doc id
    verifyCreated(databaseDoc, couch + '/' + databaseDoc._id, function(ok) {
      // cleanup
      async.parallel({
          db: function(cb) { request.del({uri: couch + '/' + databaseDoc._id, json: true}, cb) }
        , doc: function(cb) {
            request.post({uri: couch + '/datacouch', body: _.extend({}, databaseDoc, {_deleted: true}), json: true}, cb)
          }
        }
        , function(err, results) {
          it(ok).equal(true);
          it(results.db[1].ok).equal(true);
          it(results.doc[1].ok).equal(true);
          delete databaseDoc._rev;
          done(null, "create");
       }
      )
    })
  },
  function forkDatasetForUser(done) {
    // make empty database
    request.put({uri: couch + '/dcpizzataco', json: true}
      , function(e,r,b) {
        // put a doc in the database
        request.post({uri: couch + '/dcpizzataco', body: {_id: "cat_barrels"}, json: true}
          , function(e,r,b) {
            var forkedDataset = _.extend({}, databaseDoc, {
              forkedFrom: "dcpizzataco",
              forkedFromUser: "misterwendel"
            })
            // should copy dcpizzataco with all the docs into the new database
            verifyCreated(forkedDataset, couch + '/' + forkedDataset._id, function(ok) {
              waitUntilExists(couch + '/' + forkedDataset._id + '/cat_barrels', function(created) {
                it(created).equal(true);
                // cleanup
                async.parallel({
                    db: function(cb) { request.del({uri: couch + '/' + 'dcpizzataco', json: true}, cb) }
                  , forkedDB: function(cb) { request.del({uri: couch + '/' + forkedDataset._id, json: true}, cb) }
                  , doc: function(cb) {
                      request.post({uri: couch + '/datacouch', body: _.extend({}, forkedDataset, {_deleted: true}), json: true}, cb)
                    }
                  }
                  , function(err, results) {
                    it(ok).equal(true);
                    it(results.db[1].ok).equal(true);
                    it(results.forkedDB[1].ok).equal(true);
                    it(results.doc[1].ok).equal(true);
                    done(null, "fork");
                  }
                )
              })
            })
        })
    })
  }
]

async.series(tests
  , function(err, results) {
    console.log("done:", results);
  })