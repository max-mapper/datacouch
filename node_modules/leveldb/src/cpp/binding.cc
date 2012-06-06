#include <node.h>

#include "batch.h"
#include "comparator.h"
#include "handle.h"
#include "iterator.h"

namespace node_leveldb {

extern "C" {

static void init(Handle<Object> target) {
  JHandle::Initialize(target);
  JBatch::Initialize(target);
  JIterator::Initialize(target);
  PartitionedBitwiseComparator::Initialize(target);
}

NODE_MODULE(leveldb, init);

} // extern

} // namespace node_leveldb
