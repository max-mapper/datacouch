var _ = require('underscore')
  , async = require('async')  
  ;

exports.run = function(testObjects) {
  var tests = _.map(testObjects, function(test) {
    return function(done) {
      test.setup(function(ok) {
        if (ok) {
          async.series(test.requests, function(err, results) {
            test.asserts(err, results, done);
          });
        } else {
          throw new Error("setup failed on " + test.description);
        }
      })
    }
  })
  async.series(tests, function(err, results) {
    console.log("passed:", results);
  })
}