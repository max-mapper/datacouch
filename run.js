var logging = require('logref')
logging.stdout()
process.logging = logging

var service = require('./service')() // we can pass debug/production options to this later
  , url = require('url')
  ;

var t = service.createServer()
t.listen(function () {
  console.log('running on ' + t.port)
})
