leveldb = exports = module.exports = require './leveldb/handle'
binding = require './leveldb.node'

leveldb.version = '0.6.2'
leveldb.bindingVersion = "#{binding.majorVersion}.#{binding.minorVersion}"

leveldb.Batch = require('./leveldb/batch').Batch


###

    Create a partitioned bitwise comparator for use with opening a database.

    @param {Array} partitions Partition configuration data.
      @param {Array} partitions[] Slice configuration.
        @param {Integer} partitions[][0] Number of bytes in this slice. Use
          zero to set the sorting direction for all bytes from the current
          offset until the next slice or the end of the key.
        @param {Boolean} partitions[][1] If true, use reverse bitwise
          sorting until the next slice or the end of the key.

###

leveldb.partitionedBitwiseComparator = ->

  # variable args
  args = Array.prototype.slice.call arguments

  # ([7, true], [8, false]) or ([[7, true], [8, false]])
  args = if Array.isArray args[0][0] then args[0] else args

  # flatten bounds
  bounds = []
  for [ limit, reverse ] in args
    bounds.push parseInt limit
    bounds.push !!reverse

  binding.createPartitionedBitwiseComparator bounds
