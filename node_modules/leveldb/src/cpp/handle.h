#ifndef NODE_LEVELDB_HANDLE_H_
#define NODE_LEVELDB_HANDLE_H_

#include <assert.h>

#include <vector>
#include <string>

#include <leveldb/db.h>
#include <node.h>
#include <v8.h>

#include "batch.h"
#include "iterator.h"
#include "node_async_shim.h"

using namespace node;
using namespace v8;

namespace node_leveldb {

class JHandle : public ObjectWrap {
 public:
  static Persistent<FunctionTemplate> constructor;
  static void Initialize(Handle<Object> target);
  static inline bool HasInstance(Handle<Value> value) {
    return value->IsObject() && constructor->HasInstance(value->ToObject());
  }

 private:
  // No instance creation outside of Handle
  JHandle(leveldb::DB* db);

  // No copying allowed
  JHandle(const JHandle&);
  void operator=(const JHandle&);

  virtual ~JHandle();

  static Handle<Value> New(const Arguments& args);

  class OpAsync;
  class OpenAsync;
  class DestroyAsync;
  class RepairAsync;
  class ReadAsync;
  class WriteAsync;
  class GetIteratorAsync;
  class GetSnapshotAsync;
  class GetPropertyAsync;
  class GetApproximateSizesAsync;

  leveldb::DB* db_;
  Persistent<Value> comparator_;
};

} // namespace node_leveldb

#endif // NODE_LEVELDB_HANDLE_H_
