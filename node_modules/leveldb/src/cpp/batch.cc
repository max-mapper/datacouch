#include <vector>

#include <leveldb/write_batch.h>
#include <node.h>
#include <node_buffer.h>
#include <v8.h>

#include "batch.h"
#include "helpers.h"

namespace node_leveldb {

Persistent<FunctionTemplate> JBatch::constructor;

JBatch::JBatch() : ObjectWrap() {
}

JBatch::~JBatch() {
  Clear();
}

void JBatch::Clear() {
  std::vector< Persistent<Value> >::iterator it;
  for (it = buffers_.begin(); it < buffers_.end(); ++it) it->Dispose();
  buffers_.clear();
  wb_.Clear();
}

void JBatch::Initialize(Handle<Object> target) {
  HandleScope scope;

  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  constructor = Persistent<FunctionTemplate>::New(t);
  constructor->InstanceTemplate()->SetInternalFieldCount(1);
  constructor->SetClassName(String::NewSymbol("Batch"));

  NODE_SET_PROTOTYPE_METHOD(constructor, "put", Put);
  NODE_SET_PROTOTYPE_METHOD(constructor, "del", Del);
  NODE_SET_PROTOTYPE_METHOD(constructor, "clear", Clear);

  target->Set(String::NewSymbol("Batch"), constructor->GetFunction());
}

Handle<Value> JBatch::New(const Arguments& args) {
  HandleScope scope;

  JBatch* writeBatch = new JBatch();
  writeBatch->Wrap(args.This());

  return Undefined();
}

Handle<Value> JBatch::Put(const Arguments& args) {
  HandleScope scope;

  if (args.Length() != 2 ||
      !Buffer::HasInstance(args[0]) || !Buffer::HasInstance(args[1]))
    return ThrowTypeError("Invalid arguments");

  JBatch* self = ObjectWrap::Unwrap<JBatch>(args.This());

  leveldb::Slice key = ToSlice(args[0], self->buffers_);
  leveldb::Slice val = ToSlice(args[1], self->buffers_);

  self->wb_.Put(key, val);

  return Undefined();
}

Handle<Value> JBatch::Del(const Arguments& args) {
  HandleScope scope;

  if (args.Length() != 1 || !Buffer::HasInstance(args[0]))
    return ThrowTypeError("Invalid arguments");

  JBatch* self = ObjectWrap::Unwrap<JBatch>(args.This());

  leveldb::Slice key = ToSlice(args[0], self->buffers_);
  self->wb_.Delete(key);

  return Undefined();
}

Handle<Value> JBatch::Clear(const Arguments& args) {
  HandleScope scope;

  JBatch* self = ObjectWrap::Unwrap<JBatch>(args.This());

  self->Clear();

  return Undefined();
}

} // namespace node_leveldb
