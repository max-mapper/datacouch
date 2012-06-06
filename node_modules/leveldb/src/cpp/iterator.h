#ifndef NODE_LEVELDB_ITERATOR_H_
#define NODE_LEVELDB_ITERATOR_H_

#include <leveldb/iterator.h>
#include <node.h>
#include <v8.h>

using namespace v8;
using namespace node;

namespace node_leveldb {

class JHandle;

class JIterator : ObjectWrap {
 public:
  static Persistent<FunctionTemplate> constructor;
  static void Initialize(Handle<Object> target);

 private:
  friend class JHandle;

  static Handle<Value> New(const Arguments& args);

  static Handle<Value> Seek(const Arguments& args);
  static Handle<Value> SeekToFirst(const Arguments& args);
  static Handle<Value> SeekToLast(const Arguments& args);
  static Handle<Value> Next(const Arguments& args);
  static Handle<Value> Prev(const Arguments& args);

  static void SeekToFirstAsync(uv_work_t* req);
  static void SeekToLastAsync(uv_work_t* req);
  static void SeekAsync(uv_work_t* req);
  static void NextAsync(uv_work_t* req);
  static void PrevAsync(uv_work_t* req);

  static Handle<Value> Seek(const uv_work_cb fn, const Arguments& args);

  Handle<Value> Async(const uv_work_cb fn, const Local<Value>& callback);
  static void AfterAsync(uv_work_t* req);

  void BeforeSeek();
  void AfterSeek();

  // No instance creation outside of Handle
  JIterator(leveldb::Iterator* it);

  // No copying allowed
  JIterator(const JIterator&);
  void operator=(const JIterator&);

  virtual ~JIterator();

  leveldb::Iterator* it_;
  leveldb::Status status_;
  leveldb::Slice key_;
  leveldb::Slice value_;

  bool busy_;
  bool valid_;

  Persistent<Function> callback_;
  Persistent<Value> keyHandle_;
};

} // node_leveldb

#endif // NODE_LEVELDB_ITERATOR_H_
