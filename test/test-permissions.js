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
  , util = require('../processors/auth/couch_utils')
  , asyncTester = require('./test-helper')
  ;

var data = {
  sampleDoc: {
    name: "shire craigslist scraped apartments",
    description: "potential real estate investment opportunities in the shire",
    type: "database",
    user: "bilbobaggins",
    createdAt: new Date()
  }
}

asyncTester.run([
  {
    description: "create new dataset for user",
    setup: function(callback) {
      // should make a couch database with id equal to the metadata doc id
      data.newDoc = _.extend({_id: "new_dataset_test"}, data.sampleDoc);
      util.createDoc(couch + '/datacouch/new_dataset_test', data.newDoc, function(doc) {
        data.newDoc = doc;
        callback(true);
      });
    },
    requests: {
      created: function(cb) { util.waitUntilExists(couch + '/' + data.newDoc._id, cb) }
    , db: function(cb) { request.del({uri: couch + '/' + data.newDoc._id, json: true}, cb) }
    , doc: function(cb) {
        request.post({uri: couch + '/datacouch', body: _.extend({}, data.newDoc, {_deleted: true}), json: true}, cb)
      }
    },
    asserts: function(err, results, done) {
      it(results.db[1].ok).equal(true);
      it(results.doc[1].ok).equal(true);
      delete data.newDoc;
      done(null, "create");
    }
  },
  {
    description: "fork dataset between users",
    setup: function(callback) {
      data.forkedDoc = _.extend({}, data.sampleDoc, {
        _id: "forked_dataset_test",
        forkedFrom: "dcpizzataco",
        forkedFromUser: "misterwendel"
      })
      // make empty database
      request.put({uri: couch + '/dcpizzataco', json: true}, function(e,r,b) {
        // put a doc in the database
        request.post({uri: couch + '/dcpizzataco', body: {_id: "cat_barrels"}, json: true}, function(e,r,b) {
          // should copy dcpizzataco with all the docs into the new database
          util.createDoc(couch + '/datacouch/forked_dataset_test', data.forkedDoc, function(doc) {
            data.forkedDoc = doc;
            callback(true);
          });
        })
      })
    },
    requests: {
      created: function(cb) { util.waitUntilExists(couch + '/' + data.forkedDoc._id + '/cat_barrels', cb) }
    , db: function(cb) { request.del({uri: couch + '/' + 'dcpizzataco', json: true}, cb) }
    , forkedDB: function(cb) { request.del({uri: couch + '/' + data.forkedDoc._id, json: true}, cb) }
    , doc: function(cb) {
        request.post({uri: couch + '/datacouch', body: _.extend({}, data.forkedDoc, {_deleted: true}), json: true}, cb)
      }
    },
    asserts: function(err, results, done) {
      it(results.db[1].ok).equal(true);
      it(results.forkedDB[1].ok).equal(true);
      it(results.doc[1].ok).equal(true);
      delete data.forkedDoc;
      done(null, "fork");
    }
  }
])