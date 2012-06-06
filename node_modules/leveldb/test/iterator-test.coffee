assert  = require 'assert'
leveldb = require '../lib'




describe 'Iterator', ->
  filename = "#{__dirname}/../tmp/iterator-test-file"
  db = null
  iterator = null

  beforeEach (done) ->
    leveldb.open filename, create_if_missing: true, error_if_exists: true, (err, handle) ->
      db = handle
      done err

  beforeEach (done) ->
    batch = db.batch()
    batch.put "#{i}", "Hello #{i}" for i in [100..200]
    batch.write done

  beforeEach (done) ->
    i = 100
    (next = ->
      db.get "#{i}", (err, val) ->
        assert.ifError err
        assert.equal "Hello #{i}", val
        if ++i >= 201 then done() else next()
    )()

  beforeEach (done) ->
    db.iterator (err, iter) ->
      iterator = iter
      done err

  afterEach (done) ->
    db = null
    iterator = null
    leveldb.destroy filename, done

  it 'should get values', (done) ->
    iterator.first (err) ->
      assert.ifError err
      i = 100
      next = (err) ->
        assert.ifError err
        iterator.current (err, key, val) ->
          assert.ifError err
          expectKey = "#{i}"
          expectVal = "Hello #{i}"
          assert.equal expectKey, key
          assert.equal expectVal, val
          iterator.key (err, key) ->
            assert.ifError err
            assert.equal expectKey, key
            iterator.value (err, val) ->
              assert.ifError err
              assert.equal expectVal, val
              iterator.next if ++i <= 200 then next else done
      next()

  it 'should not get invalid key', (done) ->
    iterator.seek '201', (err) ->
      assert.ifError err
      assert.ifError iterator.valid()
      iterator.current (err, key, val) ->
        assert.ifError key
        assert.ifError val
        done err

  it 'should get values in reverse', (done) ->
    iterator.last (err) ->
      i = 200
      next = (err) ->
        assert.ifError err
        iterator.current (err, key, val) ->
          assert.ifError err
          expectKey = "#{i}"
          expectVal = "Hello #{i}"
          assert.equal expectKey, key
          assert.equal expectVal, val
          iterator.key (err, key) ->
            assert.ifError err
            assert.equal expectKey, key
            iterator.value (err, val) ->
              assert.ifError err
              assert.equal expectVal, val
              iterator.prev if --i >= 100 then next else done
      next()

  itShouldBehaveLikeForRange = ->

    it 'should iterate over all keys', (done) ->
      i = 100
      iterator.forRange (err, key, val) ->
        assert.ifError
        assert.equal "#{i}", key
        assert.equal "Hello #{i}", val
        done() if ++i > 200

    it 'should iterate from start key', (done) ->
      i = 110
      iterator.forRange '110', (err, key, val) ->
        assert.ifError
        assert.equal "#{i}", key
        assert.equal "Hello #{i}", val
        done() if ++i > 200

    it 'should iterate until limit key', (done) ->
      i = 100
      iterator.forRange null, '190', (err, key, val) ->
        assert.ifError
        assert.equal "#{i}", key
        assert.equal "Hello #{i}", val
        done() if ++i > 190

    it 'should iterate over range', (done) ->
      i = 110
      iterator.forRange '110', '190', (err, key, val) ->
        assert.ifError
        assert.equal "#{i}", key
        assert.equal "Hello #{i}", val
        done() if ++i > 190

  describe 'forRange()', ->
    itShouldBehaveLikeForRange()

  describe 'db.forRange()', ->
    beforeEach -> iterator = db
    itShouldBehaveLikeForRange()
