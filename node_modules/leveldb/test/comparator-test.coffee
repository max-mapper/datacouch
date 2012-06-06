assert  = require 'assert'
leveldb = require '../lib'




describe 'PartitionedBitwiseComparator', ->
  filename = "#{__dirname}/../tmp/comparator-test-file"
  comparator = null
  db = null

  # populate fresh database
  beforeEach (done) ->
    options =
      create_if_missing: true
      error_if_exists: true
      comparator: comparator

    leveldb.open filename, options, (err, handle) ->
      assert.ifError err
      db = handle
      batch = db.batch()
      batch.put "#{i}", "xyzzy" for i in [100..999]
      batch.write done

  # close and destroy database
  afterEach (done) ->
    db = null
    leveldb.destroy filename, done

  itShouldBehave = ->
    it 'should have keys in order', (done) ->
      i = 1 # 1 - 9
      j = 9 # 9 - 0
      k = 0 # 0 - 9
      db.forRange (err, key) ->
        assert.ifError err
        assert.equal key[0], i
        assert.equal key[1], j
        assert.equal key[2], k
        if i is 9 and j is 0 and k is 9
          done()
        else
          if ++k > 9
            k = 0
            if --j < 0
              ++i
              j = 9

  describe 'with flattened args', ->

    before ->
      comparator = leveldb.partitionedBitwiseComparator [1, false], [1, true], [0, false]

    itShouldBehave()


  describe 'with array arg', ->

    before ->
      comparator = leveldb.partitionedBitwiseComparator [
        [1, false]
        [1, true]
        [0, false]
      ]

    itShouldBehave()
