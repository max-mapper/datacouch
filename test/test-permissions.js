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
    setup: [
      function(next) {
        data.newDoc = _.extend({_id: "new_dataset_test"}, data.sampleDoc);
        next(false);
      },
      function(next) {
        util.createDoc(couch + '/datacouch/new_dataset_test', data.newDoc, function(doc) {
          data.newDoc = doc;
          next(false);
        });
      }
    ],
    requests: {
      created: function(cb) { util.waitForStatusCode(couch + '/' + data.newDoc._id, 200, cb) }
    },
    asserts: function(err, results, done) {
      it(results.created.statusCode).equal(200);
      done(null, "create");
    },
    cleanup: [
      function(next) { request.del({uri: couch + '/' + data.newDoc._id, json: true}, next) }
    , function(next) {
        request.post({uri: couch + '/datacouch', body: _.extend({}, data.newDoc, {_deleted: true}), json: true}, next)
      }
    ]
  },
  {
    description: "fork dataset between users",
    setup: [
      function(next) {
        data.forkedDoc = _.extend({}, data.sampleDoc, {
          _id: "forked_dataset_test",
          forkedFrom: "dcpizzataco",
          forkedFromUser: "misterwendel"
        })
        next(false)
      }
    , function(next) { request.put({uri: couch + '/dcpizzataco', json: true}, next) }
    , function(next) { request.post({uri: couch + '/dcpizzataco', body: {_id: "cat_barrels"}, json: true}, next) }
    , function(next) {
        util.createDoc(couch + '/datacouch/forked_dataset_test', data.forkedDoc, function(doc) {
          data.forkedDoc = doc;
          next(false);
        })
      }
    ],
    requests: {
      created: function(cb) { util.waitForStatusCode(couch + '/' + data.forkedDoc._id + '/cat_barrels', 200, cb) }
    },
    asserts: function(err, results, done) {
      it(results.created.statusCode).equal(200);
      done(null, "fork");
    },
    cleanup: [
      function(next) { request.del({uri: couch + '/' + 'dcpizzataco', json: true}, next) }
    , function(next) { request.del({uri: couch + '/' + data.forkedDoc._id, json: true}, next) }
    , function(next) {
        request.post({uri: couch + '/datacouch', body: _.extend({}, data.forkedDoc, {_deleted: true}), json: true}, next)
      }
    ]
  },
  {
    description: "delete a dataset",
    setup: [
      function(next) {
        // should make a couch database with id equal to the metadata doc id
        data.deleteDoc = _.extend({_id: "delete_dataset_test"}, data.sampleDoc);
        next(false);
      },
      function(next) {
        util.createDoc(couch + '/datacouch/delete_dataset_test', data.deleteDoc, function(doc) {
          data.deleteDoc = doc;
          next(false);
        });
      },
      function(next) { util.waitForStatusCode(couch + '/' + data.deleteDoc._id, 200, next) },
      function(next) {
        request.post({uri: couch + '/datacouch', body: _.extend({}, data.deleteDoc, {_deleted: true}), json: true}, next)
      }
    ],
    requests: {
      deleted: function(cb) { util.waitForStatusCode(couch + '/' + data.deleteDoc._id, 404, cb) }
    },
    asserts: function(err, results, done) {
      it(results.deleted.statusCode).equal(404);
      done(null, "delete");
    },
    cleanup: [
      function(next) { request.del({uri: couch + '/' + data.deleteDoc._id, json: true}, next) }
    ]
  }
])