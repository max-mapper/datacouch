assert  = require 'assert'
leveldb = require '../lib'


describe 'snapshot', ->
  filename = "#{__dirname}/../tmp/snapshot-test-file"
  db = null
  snapshot = null

  key = "Hello"
  val = "World"

  beforeEach (done) ->
    leveldb.open filename, create_if_missing: true, (err, handle) ->
      db = handle
      done err

  beforeEach (done) ->
    db.put key, val, done

  beforeEach (done) ->
    db.get key, (err, value) ->
      assert.ifError err
      assert.equal val, value
      done()

  beforeEach (done) ->
    db.snapshot (err, snap) ->
      snapshot = snap
      done err

  afterEach (done) ->
    db = null
    snapshot = null
    leveldb.destroy filename, done

  it 'should get value', (done) ->
    db.put key, 'Goodbye', (err) ->
      assert.ifError err
      db.get key, (err, value) ->
        assert.ifError err
        assert.equal 'Goodbye', value
        snapshot.get key, (err, value) ->
          assert.ifError err
          assert.equal val, value
          done()

  it 'should not deleted value', (done) ->
    db.del key, (err) ->
      assert.ifError err
      db.get key, (err, value) ->
        assert.ifError err
        assert.ifError value
        snapshot.get key, (err, value) ->
          assert.ifError err
          assert.equal val, value
          done()
