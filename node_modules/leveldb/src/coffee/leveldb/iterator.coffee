binding = require '../leveldb.node'

###

    An iterator allows sequential and random access to the database.

    Usage:

        var leveldb = require('leveldb');

        leveldb.open('/tmp/test.db', function(err, db) {
          db.iterator(function(err, it) {

            // iterator is initially invalid
            it.first(function(err) {

              // get a key
              it.get('foobar', function(err, val) {

                console.log(val);

              });
            });
          });
        });

###

exports.Iterator = class Iterator

  toBuffer = (val) ->
    new Buffer val unless Buffer.isBuffer val

  toValue = (val, options) ->
    unless val
      null
    else unless options?.as_buffer
      val.toString 'utf8'
    else
      val

  _wrapSeek: (callback, validate) =>
    @_lock()

    throw new Error 'Illegal state' if validate and not @_valid
    throw new Error 'Missing callback' unless callback

    (err, valid, key, val) =>
      @_unlock()
      @_valid = valid
      @_key = key
      @_val = val
      callback err if callback

  _lock: ->
    throw new Error 'Concurrent operations not supported' if @_busy
    @_busy = true

  _unlock: ->
    throw new Error 'Not locked' unless @_busy
    @_busy = false

  _getKey: (options) ->
    toValue @_key, options

  _getVal: (options) ->
    toValue @_val, options


  ###

      Constructor.

      @param {Native} self The underlying iterator object.

  ###

  constructor: (@self) ->
    @_busy = @_valid = false
    @_key = @_val = null


  ###

      Apply a callback over a range.

      The iterator will be positioned at the given key or the first key if
      not given, then the callback will be applied on each record moving
      forward until the iterator is positioned at the limit key or at an
      invalid key. Stops on first error.

      @param {String|Buffer} [startKey] Optional start key (inclusive) from
        which to begin applying the callback. If not given, defaults to the
        first key.
      @param {String|Buffer} [limitKey] Optional limit key (inclusive) at
        which to end applying the callback.
      @param {Object} [options] Optional options.
        @param {Boolean} [options.as_buffer=false] If true, data will be
          returned as a `Buffer`.
      @param {Function} callback The callback to apply to the range.
        @param {Error} error The error value on error, null otherwise.
        @param {String|Buffer} key The key.
        @param {String|Buffer} value The value.

  ###

  forRange: ->

    args = Array.prototype.slice.call arguments

    # required callback
    callback = args.pop()
    throw new Error 'Missing callback' unless callback

    # optional options
    options = args[args.length - 1]
    if typeof options is 'object' and not Buffer.isBuffer options
      args.pop()
    else
      options = {}

    # optional keys
    [ startKey, limitKey ] = args

    # for comparing end key
    limit = limitKey.toString 'binary' if limitKey

    # loop function
    next = (err) =>
      return callback err if err
      if @_valid
        callback null, @_getKey(options), @_getVal(options)
        if not limit or limit isnt @_key.toString 'binary'
          @next next

    # start loop
    if startKey
      @seek startKey, next
    else
      @first next


  ###

      True if the iterator is positioned at a valid key.

  ###

  valid: -> @_valid


  ###

      Position the iterator at a key.

      @param {String} key The key at which to position the iterator.
      @param {Function} [callback] Optional callback.
        @param {Error} error The error value on error, null otherwise.

  ###

  seek: (key, callback) ->
    @self.seek toBuffer(key), @_wrapSeek callback


  ###

      Position the iterator at the first key.

      @param {Function} [callback] Optional callback.
        @param {Error} error The error value on error, null otherwise.

  ###

  first: (callback) ->
    @self.first @_wrapSeek callback


  ###

      Position the iterator at the last key.

      @param {Function} [callback] Optional callback.
        @param {Error} error The error value on error, null otherwise.

  ###

  last: (callback) ->
    @self.last @_wrapSeek callback


  ###

      Advance the iterator to the next key.

      @param {Function} [callback] Optional callback.
        @param {Error} error The error value on error, null otherwise.

  ###

  next: (callback) ->
    @self.next @_wrapSeek callback, true


  ###

      Advance the iterator to the previous key.

      @param {Function} [callback] Optional callback.
        @param {Error} error The error value on error, null otherwise.

  ###

  prev: (callback) ->
    @self.prev @_wrapSeek callback, true


  ###

      Get the key at the current iterator position.

      @param {Object} [options] Optional options.
        @param {Boolean} [options.as_buffer=false] If true, data will be
          returned as a `Buffer`.
      @param {Function} callback The callback function.
        @param {Error} error The error value on error, null otherwise.
        @param {String|Buffer} key The key if successful.

  ###

  key: (options, callback) ->

    # optional options
    if typeof options is 'function'
      callback = options
      options = null

    key = @_getKey options
    callback? null, key
    key


  ###

      Get the value at the current iterator position.

      @param {Object} [options] Optional options.
        @param {Boolean} [options.as_buffer=false] If true, data will be
          returned as a `Buffer`.
      @param {Function} callback The callback function.
        @param {Error} error The error value on error, null otherwise.
        @param {String|Buffer} value The value if successful.

  ###

  value: (options, callback) ->

    # optional options
    if typeof options is 'function'
      callback = options
      options = null

    val = @_getVal options
    callback? null, val
    val


  ###

      Get the key and value at the current iterator position.

      @param {Object} [options] Optional options.
        @param {Boolean} [options.as_buffer=false] If true, data will be
          returned as a `Buffer`.
      @param {Function} callback The callback function.
        @param {Error} error The error value on error, null otherwise.
        @param {String|Buffer} key The key if successful.
        @param {String|Buffer} value The value if successful.

  ###

  current: (options, callback) ->

    # optional options
    if typeof options is 'function'
      callback = options
      options = null

    key = @_getKey options
    val = @_getVal options
    callback? null, key, val
    [key, val]
