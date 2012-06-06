assert  = require 'assert'
leveldb = require '../lib'




describe 'Batch', ->
  filename = "#{__dirname}/../tmp/batch-test-file"
  db = null

  hasPut = (done) -> (err) ->
    assert.ifError err
    i = 110
    db.forRange '110', '119', (err, key, val) ->
      assert.ifError err
      assert.equal "#{i}", key
      assert.equal "Goodbye #{i}", val
      done() if ++i >= 120

  hasDel = (done) -> (err) ->
    assert.ifError err
    db.forRange '180', '200', (err) -> assert.fail err
    done()

  hasBoth = hasPut

  hasNoop = (done) -> (err) ->
    assert.ifError err
    i = 110
    db.forRange (err, key, val) ->
      assert.ifError err
      assert.equal "#{i}", key
      assert.equal "Hello #{i}", val
      done() if ++i >= 190

  # populate fresh database
  beforeEach (done) ->
    leveldb.open filename, create_if_missing: true, error_if_exists: true, (err, handle) ->
      assert.ifError err
      db = handle

      i = 109
      next = (err) ->
        assert.ifError err
        return hasNoop(done) err if ++i >= 190
        db.put "#{i}", "Hello #{i}", next
      next()

  # close and destroy database
  afterEach (done) ->
    db = null
    leveldb.destroy filename, done

  describe 'new', ->
    b = null

    it 'should put()', (done) ->
      batch = new leveldb.Batch
      batch.put "#{i}", "Goodbye #{i}" for i in [100..119]
      db.write batch, hasPut done

    it 'should del()', (done) ->
      batch = new leveldb.Batch
      batch.del "#{i}" for i in [180..189]
      db.write batch, hasDel done

    it 'should put() del()', (done) ->
      b = batch = new leveldb.Batch
      batch.put "#{i}", "Goodbye #{i}" for i in [100..119]
      batch.del "#{i}" for i in [180..189]
      db.write batch, hasBoth done

    it 'should put() del() again', (done) ->
      db.write b, hasBoth done

    it 'should not put() del() after clear()', (done) ->
      b.clear()
      db.write b, hasNoop done

  describe 'db.batch()', ->
    b = null

    it 'should put()', (done) ->
      batch = db.batch()
      batch.put "#{i}", "Goodbye #{i}" for i in [100..119]
      batch.write hasPut done

    it 'should del()', (done) ->
      batch = db.batch()
      batch.del "#{i}" for i in [180..189]
      batch.write hasDel done

    it 'should put() del()', (done) ->
      b = batch = db.batch()
      batch.put "#{i}", "Goodbye #{i}" for i in [100..119]
      batch.del "#{i}" for i in [180..189]
      batch.write hasBoth done

    it 'should not put() del() again', (done) ->
      db.write b, hasNoop done
