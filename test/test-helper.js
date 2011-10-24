var _ = require('underscore')
  , async = require('async')  
  ;

exports.run = function(testObjects) {
  var tests = _.map(testObjects, function(test) {
    return function(done) {
      async.series(test.setup, function(err, results) {
        if(err) throw new Error("setup error: " + err);
        async.series(test.requests, function(err, results) {
          async.series(test.cleanup, function(e, r) {
            if(e) throw new Error("cleanup error: " + r);
            test.asserts(err, results, done);
          })
        });
      })
    }
  })
  async.series(tests, function(err, results) {
    console.log("passed:", results);
  })
}