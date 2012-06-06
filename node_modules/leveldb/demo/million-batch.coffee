assert  = require 'assert'
leveldb = require '../lib'

console.log 'Creating test database'
path = '/tmp/large.db'

batchSize = 100
totalSize = 1000000

leveldb.open path, create_if_missing: true, (err, db) ->
  assert.ifError err
  console.log 'Serializing and inserting 1,000,000 rows...'
  start = Date.now();
  i = 0

  callback = ->
    delta = Date.now() - start;
    console.log 'Completed in %d ms', delta
    console.log '%s inserts per second', Math.floor(totalSize * 1000 / delta)

  bench = ->
    console.log "i = #{i}" if i % 10000 == 0
    batch = new(leveldb.Batch)
    for j in [0...batchSize]
      key = "row#{i}"
      value = JSON.stringify
        index: i
        name: "Tim"
        age: 28
      batch.put key, value
      ++i

    db.write batch, (err) ->
      throw err if err
      if i < totalSize then bench() else callback()

  bench()
