var request = require('request').defaults({json: true}),
  transfuse = require('transfuse'),
  JSONStream = require('JSONStream'),
  url = require('url'),
  _ = require('underscore'),
  follow = require('follow'),
  txn = require('txn')

module.exports = function (t) {
   var couch = t.couchurl
    , db = t.couchurl + "datacouch"
    ;
    
  follow({db: db, include_docs: true, filter: "datacouch/by_value", query_params: {k: "type", v: "pendingTransformation"}}, function(error, change) {
    if (error) return console.error(error)
    txn({"uri": db + '/' + change.id, "timeout": 120000}, transform, function(err, newData) {
      if (err) {
        t.sockets.emit(newData._id, err)
        return console.error('transformation error on ' + change.id, err)
      }
      t.sockets.emit(newData._id, false, newData)
      return console.log('transformation success on ' + newData.dataset)
    })
  })
  
  function getDBInfo(db, callback) {
    request({url: t.couchurl + db}, callback)
  }

  function transform(doc, txncb) {
    getDBInfo(doc.dataset, function(err, resp, dbInfo) {
      if (err) return txncb(err)
      var down = request({url: t.couchurl + doc.dataset + '/_all_docs?include_docs=true'}),
        up = request({url: t.couchurl + doc.dataset + '/_bulk_docs', method: "POST"}),
        tr = transfuse(['rows', /./, 'doc'], doc.transform, JSONStream.stringify("{\"docs\":[\n", "\n,\n", "\n]}\n"));
      down.pipe(tr)
      tr.pipe(up)
      var count = 0
      tr.on('data', function(chunk) {
        count++
        var progress = (count/dbInfo.doc_count)*100
        if ((count % 500) === 0) {
          console.log(progress)
          t.sockets.emit(doc._id, false, {progress: progress})
        }
      })
      up.on('error', txncb)
      up.on('end', function() {
        doc.type = "transformation"
        doc.finishedAt = new Date()
        txncb()
      })
    })
  }
}