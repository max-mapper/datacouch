var request = require('request').defaults({json: true}),
  transfuse = require('transfuse'),
  JSONStream = require('JSONStream'),
  url = require('url'),
  _ = require('underscore'),
  follow = require('follow'),
  txn = require('txn')

module.exports = function (t) {

  var configURL = url.parse(t.couchurl + "datacouch")
    , couch = configURL.protocol + "//" + configURL.host
    , db = couch + configURL.pathname
    ;

  follow({db: db, include_docs: true, filter: "datacouch/by_value", query_params: {k: "type", v: "pendingTransformation"}}, function(error, change) {
    if (error) return console.error(error)
    txn({"uri": db + '/' + change.id}, transform, function(error, newData) {
      if (error) return console.error('transformation error on ' + change.id, err)
      return console.log('transformation success on ', + newData.dataset)
      throw error // Unknown error
    })
  })

  function transform(doc, txncb) {
    var down = request({url: couch + "/" + doc.dataset + '/_all_docs?include_docs=true'}),
      up = request({url: couch + '/' + doc.dataset + '/_bulk_docs', method: "POST"}),
      tr = transfuse(['rows', /./, 'doc'], doc.transform, JSONStream.stringify("{\"docs\":[\n", "\n,\n", "\n]}\n"));
    down.pipe(tr)
    tr.pipe(up)
    up.on('error', txncb)
    up.on('end', function() {
      doc.type = "transformation"
      doc.finishedAt = new Date()
      txncb()
    })
  }

}