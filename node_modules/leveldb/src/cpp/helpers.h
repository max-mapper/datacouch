#ifndef NODE_LEVELDB_HELPERS_H_
#define NODE_LEVELDB_HELPERS_H_

#include <string>
#include <vector>

#include <v8.h>
#include <node.h>
#include <node_buffer.h>

#include "leveldb/db.h"
#include "leveldb/slice.h"
#include "node_async_shim.h"

using namespace node;
using namespace v8;

namespace node_leveldb {

static inline Handle<Value> AsyncQueue(
  void* data, const uv_work_cb async, const uv_after_work_cb after)
{
  uv_work_t* req = new uv_work_t;
  req->data = data;
  uv_queue_work(uv_default_loop(), req, async, after);
  return Undefined();
}

static inline Handle<Value> ThrowTypeError(const char* err) {
  return ThrowException(Exception::TypeError(String::New(err)));
}

static inline Handle<Value> ThrowError(const char* err) {
  return ThrowException(Exception::Error(String::New(err)));
}

static inline leveldb::Slice ToSlice(const Handle<Value>& value) {
  if (Buffer::HasInstance(value)) {
    Local<Object> obj = value->ToObject();
    return leveldb::Slice(Buffer::Data(obj), Buffer::Length(obj));
  } else {
    return leveldb::Slice();
  }
}

static inline leveldb::Slice ToSlice(
  Handle<Value> value, std::vector< Persistent<Value> >& buffers)
{
  if (Buffer::HasInstance(value)) {
    buffers.push_back(Persistent<Value>::New(value));
    return ToSlice(value);
  } else {
    return leveldb::Slice();
  }
}

static inline leveldb::Slice ToSlice(const Handle<Value>& value,
                                     Persistent<Value>& buf)
{
  if (Buffer::HasInstance(value)) {
    buf = Persistent<Value>::New(value);
    return ToSlice(value);
  } else {
    return leveldb::Slice();
  }
}

static void FreeString(char* data, void* hint) {
  std::string* str = static_cast<std::string*>(hint);
  delete str;
}

static void FreeNoop(char* data, void* hint) {}

static inline Handle<Value> ToBuffer(std::string* val) {
  Buffer* buf = Buffer::New(const_cast<char*>(val->data()),
                            val->size(), FreeString, val);
  return buf->handle_;
}

static inline Handle<Value> ToBuffer(const leveldb::Slice& val) {
  Buffer* buf = Buffer::New(const_cast<char*>(val.data()), val.size(),
                            FreeNoop, NULL);
  return buf->handle_;
}

static inline Local<Function> GetCallback(const Arguments& args) {
  int idx = args.Length() - 1;
  if (args[idx]->IsFunction()) return Local<Function>::Cast(args[idx]);
  return Local<Function>();
}

} // node_leveldb

#endif // NODE_LEVELDB_HELPERS_H_
