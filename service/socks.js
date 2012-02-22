var request = require('request')
var _ = require('underscore')

module.exports = function (t) {

  t.sockets.on('connection', function (socket) {
    socket.on('save', save)
  })
  
  function save (doc) {
    console.log("save", doc)
    var err = validate(doc)
    if (err) return t.sockets.emit(doc._id, false, {error: err})
    request({method: 'PUT', uri: t.couchurl + 'datacouch/' + doc._id, json: doc}, function(err, resp, body) {
      if (err) console.error("couldn't write doc", err, body)
    })
  }
  
  function validate(doc) {
    if (!_.include(["pendingTransformation", "newDatabase"], doc.type)) return "invalid doc type"
  }

}