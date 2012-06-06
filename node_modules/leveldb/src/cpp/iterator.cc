#include <assert.h>

#include <leveldb/iterator.h>
#include <node.h>
#include <v8.h>

#include "helpers.h"
#include "iterator.h"

namespace node_leveldb {

Persistent<FunctionTemplate> JIterator::constructor;





JIterator::JIterator(leveldb::Iterator* it)
  : ObjectWrap()
  , it_(it)
  , status_(leveldb::Status())
  , key_(leveldb::Slice())
  , value_(leveldb::Slice())
  , busy_(false)
  , valid_(false)
  , callback_(Persistent<Function>())
  , keyHandle_(Persistent<Value>())
{
}

JIterator::~JIterator() {
  assert(it_ != NULL);
  assert(callback_.IsEmpty());
  assert(keyHandle_.IsEmpty());
  delete it_;
  it_ = NULL;
}






void JIterator::Initialize(Handle<Object> target) {
  HandleScope scope;

  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  constructor = Persistent<FunctionTemplate>::New(t);
  constructor->InstanceTemplate()->SetInternalFieldCount(1);
  constructor->SetClassName(String::NewSymbol("Iterator"));

  NODE_SET_PROTOTYPE_METHOD(constructor, "first", SeekToFirst);
  NODE_SET_PROTOTYPE_METHOD(constructor, "last", SeekToLast);
  NODE_SET_PROTOTYPE_METHOD(constructor, "seek", Seek);
  NODE_SET_PROTOTYPE_METHOD(constructor, "next", Next);
  NODE_SET_PROTOTYPE_METHOD(constructor, "prev", Prev);
}

Handle<Value> JIterator::New(const Arguments& args) {
  HandleScope scope;

  assert(args.Length() == 1);
  assert(args[0]->IsExternal());

  leveldb::Iterator* it =
    static_cast<leveldb::Iterator*>(External::Unwrap(args[0]));

  assert(it);

  JIterator* iterator = new JIterator(it);
  iterator->Wrap(args.This());

  return args.This();
}





Handle<Value> JIterator::Async(const uv_work_cb fn, const Local<Value>& callback) {
  assert(!busy_);
  assert(callback->IsFunction());

  Local<Function> cb = Local<Function>::Cast(callback);
  callback_ = Persistent<Function>::New(cb);
  assert(!callback_.IsEmpty());

  busy_ = true;
  Ref();

  return AsyncQueue(this, fn, AfterAsync);
}

void JIterator::AfterAsync(uv_work_t* req) {
  HandleScope scope;
  JIterator* self = static_cast<JIterator*>(req->data);

  assert(self->busy_);
  assert(!self->callback_.IsEmpty());

  Handle<Value> error = Null();
  Handle<Value> valid = self->valid_ ? True() : False();
  Handle<Value> key = Null();
  Handle<Value> value = Null();

  if (!self->status_.ok())
    error = Exception::Error(String::New(self->status_.ToString().c_str()));

  if (self->valid_) {
    if (!self->key_.empty()) key = ToBuffer(self->key_);
    if (!self->value_.empty()) value = ToBuffer(self->value_);
  }

  Persistent<Function> callback = self->callback_;

  self->callback_.Clear();
  self->keyHandle_.Dispose();
  self->keyHandle_.Clear();
  self->Unref();

  self->busy_ = false;

  TryCatch tryCatch;
  Handle<Value> args[] = { error, valid, key, value };
  callback->Call(Context::GetCurrent()->Global(), 4, args);
  if (tryCatch.HasCaught()) FatalException(tryCatch);

  callback.Dispose();
  delete req;
}





void JIterator::BeforeSeek() {
  status_ = leveldb::Status();
  valid_ = false;
  key_.clear();
  value_.clear();
}

void JIterator::AfterSeek() {
  status_ = it_->status();
  if (status_.ok() && (valid_ = it_->Valid())) {
    key_ = it_->key();
    value_ = it_->value();
  }
}





Handle<Value> JIterator::Seek(const uv_work_cb fn, const Arguments& args) {
  HandleScope scope;

  assert(args.Length() == 1);
  assert(args[0]->IsFunction());

  JIterator* self = ObjectWrap::Unwrap<JIterator>(args.This());
  return self->Async(fn, args[0]);
}





Handle<Value> JIterator::Seek(const Arguments& args) {
  HandleScope scope;

  assert(args.Length() == 2);
  assert(Buffer::HasInstance(args[0]));
  assert(args[1]->IsFunction());

  JIterator* self = ObjectWrap::Unwrap<JIterator>(args.This());
  self->key_ = ToSlice(args[0], self->keyHandle_);
  return self->Async(SeekAsync, args[1]);
}

void JIterator::SeekAsync(uv_work_t* req) {
  JIterator* self = static_cast<JIterator*>(req->data);
  const leveldb::Slice target = self->key_;
  self->BeforeSeek();
  self->it_->Seek(target);
  self->AfterSeek();
}





Handle<Value> JIterator::SeekToFirst(const Arguments& args) {
  return Seek(SeekToFirstAsync, args);
}

void JIterator::SeekToFirstAsync(uv_work_t* req) {
  JIterator* self = static_cast<JIterator*>(req->data);
  self->BeforeSeek();
  self->it_->SeekToFirst();
  self->AfterSeek();
}





Handle<Value> JIterator::SeekToLast(const Arguments& args) {
  return Seek(SeekToLastAsync, args);
}

void JIterator::SeekToLastAsync(uv_work_t* req) {
  JIterator* self = static_cast<JIterator*>(req->data);
  self->BeforeSeek();
  self->it_->SeekToLast();
  self->AfterSeek();
}





Handle<Value> JIterator::Next(const Arguments& args) {
  return Seek(NextAsync, args);
}

void JIterator::NextAsync(uv_work_t* req) {
  JIterator* self = static_cast<JIterator*>(req->data);
  assert(self->valid_);
  self->BeforeSeek();
  self->it_->Next();
  self->AfterSeek();
}





Handle<Value> JIterator::Prev(const Arguments& args) {
  return Seek(PrevAsync, args);
}

void JIterator::PrevAsync(uv_work_t* req) {
  JIterator* self = static_cast<JIterator*>(req->data);
  assert(self->valid_);
  self->BeforeSeek();
  self->it_->Prev();
  self->AfterSeek();
}

} // node_leveldb
