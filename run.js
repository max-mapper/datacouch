var logging = require('logref')

logging.stdout()
process.logging = logging

var t = require('./service')()

t.httpServer.listen(t.port, function () {
  console.log("running on " + t.port)
})