binding = require '../leveldb.node'

noop = ->

###

    A batch holds a sequence of put/delete operations to atomically write to
    the database.

    Usage:

        var leveldb = require('leveldb');

        var db, db2, batch, batch2 = new leveldb.Batch, writes = 2;

        leveldb.open('/tmp/test.db', onOpen);

        function onOpen(err, handle) {
          db = handle;
          batch = db.batch();
          batch
            .put('foo', 'bar')
            .del('baz')
            .put('pass', 'xyzzy')
            .write(afterWrite);
        }

        function afterWrite(err) {
          leveldb.open('/tmp/test2.db', onOpen2);
        }

        function onOpen2(err, handle) {
          db2 = handle;
          batch2
            .put('foo', 'coconut')
            .del('pass');

          db.write(batch2, afterWrite2);
          db2.write(batch2, afterWrite2);
        }

        function afterWrite2(err) {
          writes -= 1;
          if (writes <= 0) {
            // batch2 has not been cleared to allow for reuse.
            batch2.clear();

            // works because the batch is cleared after committing when using
            // batch.commit()
            batch
              .put('hello', 'world')
              .put('goodbye', 'world');

            db.write(batch);
            db2.write(batch);
          }
        }

###

exports.Batch = class Batch

  ###

      Constructor.

      @param {leveldb.Handle} [handle] Pass a database handle to use with
        `batch.write()` or `batch.writeSync()`.

  ###

  constructor: (@handle) ->
    @self = new binding.Batch
    @readLock_ = 0


  ###

      Add a put operation to the batch.

      @param {String|Buffer} key The key to put.
      @param {String|Buffer} val The value to put.

  ###

  put: (key, val) ->
    throw 'Read locked' if @readLock_ > 0

    # to buffer if string
    key = new Buffer key unless Buffer.isBuffer key
    val = new Buffer val unless Buffer.isBuffer val

    # call native binding
    @self.put key, val
    @


  ###

      Add a delete operation to the batch.

      @param {String|Buffer} key The key to delete.

  ###

  del: (key) ->
    throw 'Read locked' if @readLock_ > 0

    # to buffer if string
    key = new Buffer key unless Buffer.isBuffer key

    # call native binding
    @self.del key
    @


  ###

      Commit the batch operations to disk.
      See `Handle.write()`.

  ###

  write: (options, callback) ->

    # require handle
    throw new Error 'No handle' unless @handle

    # read lock
    ++@readLock_

    # optional options
    if typeof options is 'function'
      callback = options
      options = null

    # optional callback
    callback or= noop

    # call native method
    @handle.write @self, options, (err) =>

      # read unlock
      --@readLock_

      # clear batch
      @self.clear() unless err

      # call callback
      callback err

    # no chaining while buffer is in use async


  ###

      Reset this batch instance by removing all pending operations.

  ###

  clear: ->
    throw 'Read locked' if @readLock_ > 0
    @self.clear()
    @
