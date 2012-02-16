var request = require('request')

module.exports = function (t) {

  t.sockets.on('connection', function (socket) {
    socket.on('createDataset', createDataset)
  })
  
  function createDataset(data) {
    request({method: 'PUT', uri: t.couchurl + 'datacouch/' + data._id, json: data}, function(err, resp, body) {
      if (err) console.error("couldn't write doc", err, body)
    })
  }
  
}