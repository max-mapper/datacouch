#ifndef NODE_LEVELDB_COMPARATOR_H_
#define NODE_LEVELDB_COMPARATOR_H_

#include <utility>
#include <vector>

#include <leveldb/comparator.h>
#include <leveldb/slice.h>
#include <node.h>
#include <v8.h>

using namespace v8;
using namespace node;

namespace node_leveldb {

/**

    Partitioned bitwise comparator allows keys to be ordered in reverse by
    partition.

    For example, the key abc123 could be bitwise ordered in normal order for
    bytes 1-3 (abc) and in reverse for bytes 4-6 (123).

 */

class PartitionedBitwiseComparator : leveldb::Comparator {
 public:
  static void Initialize(Handle<Object> target);
  static Handle<Value> Create(const Arguments& args);

  virtual const char* Name() const;
  virtual int Compare(const leveldb::Slice& a, const leveldb::Slice& b) const;
  virtual void FindShortestSeparator(std::string* start, const leveldb::Slice& limit) const;
  virtual void FindShortSuccessor(std::string* key) const;

 private:
  PartitionedBitwiseComparator(const std::vector< std::pair<uint32_t, bool> >& partitions);

  std::string name_;
  const std::vector< std::pair<uint32_t, bool> > partitions_;
};

} // node_leveldb

#endif // NODE_LEVELDB_COMPARATOR_H_
