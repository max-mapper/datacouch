#include <assert.h>
#include <limits.h>
#include <stdlib.h>

#include <algorithm>
#include <sstream>
#include <vector>

#include <leveldb/db.h>
#include <node.h>
#include <node_buffer.h>
#include <v8.h>

#include "batch.h"
#include "handle.h"
#include "helpers.h"
#include "iterator.h"
#include "options.h"

using namespace node;
using namespace v8;

namespace node_leveldb {

Persistent<FunctionTemplate> JHandle::constructor;

static inline Handle<Value> Error(const leveldb::Status& status) {
  if (status.IsNotFound()) {
    return Undefined();
  } else {
    return ThrowError(status.ToString().c_str());
  }
}





JHandle::JHandle(leveldb::DB* db)
  : ObjectWrap()
  , db_(db)
{
}

JHandle::~JHandle() {
  assert(db_ != NULL);
  delete db_;
  db_ = NULL;
  comparator_.Dispose();
};





/**

    Async support

 */

class JHandle::OpAsync {
 public:
  OpAsync(const Handle<Value>& callback)
    : status_(leveldb::Status())
  {
    assert(callback->IsFunction());
    Handle<Function> cb = Handle<Function>::Cast(callback);
    callback_ = Persistent<Function>::New(cb);
  }

  virtual ~OpAsync() {
    callback_.Dispose();
  }

  template <class T> static Handle<Value> AsyncEnqueue(T* op) {
    return AsyncQueue(op, AsyncWorker<T>, AsyncCallback<T>);
  }

  template <class T> static void AsyncWorker(uv_work_t* req) {
    T* op = static_cast<T*>(req->data);
    op->Run();
  }

  template <class T> static void AsyncCallback(uv_work_t* req) {
    HandleScope scope;
    T* op = static_cast<T*>(req->data);
    assert(!op->callback_.IsEmpty());

    Handle<Value> error = Null();
    Handle<Value> result = Null();

    op->Result(error, result);

    if (error.IsEmpty() && result.IsEmpty() && !op->status_.ok())
      error = Exception::Error(String::New(op->status_.ToString().c_str()));

    Handle<Value> args[] = { error, result };

    TryCatch tryCatch;
    op->callback_->Call(Context::GetCurrent()->Global(), 2, args);
    if (tryCatch.HasCaught()) FatalException(tryCatch);

    delete op;
    delete req;
  }
  leveldb::Status status_;
  Persistent<Function> callback_;
};





/**

    Open, destroy or repair

 */

class JHandle::OpenAsync : public OpAsync {
 public:
  OpenAsync(const Handle<Value>& callback) : OpAsync(callback) {}
  virtual ~OpenAsync() { comparator_.Dispose(); }

  template <class T> static Handle<Value> Hook(const Arguments& args) {
    HandleScope scope;

    if (args.Length() != 3 || !args[0]->IsString() || !args[2]->IsFunction())
      return ThrowTypeError("Invalid arguments");

    T* op = new T(args[2]);

    // Required name
    op->name_ = *String::Utf8Value(args[0]);

    // Optional options
    UnpackOptions(args[1], op->options_, &op->comparator_);

    return AsyncEnqueue<T>(op);
  }

  void Run() {
    status_ = leveldb::DB::Open(options_, name_, &db_);
  }

  void Result(Handle<Value>& error, Handle<Value>& result) {
    if (status_.ok()) {
      Handle<Value> args[] = { External::New(db_), Undefined() };
      if (!comparator_.IsEmpty()) args[1] = comparator_;
      result = JHandle::constructor->GetFunction()->NewInstance(2, args);
    }
  }

  std::string name_;

  leveldb::Options options_;
  leveldb::DB* db_;

  Persistent<Value> comparator_;
};





/**

    Destroy

 */

class JHandle::DestroyAsync : public OpenAsync {
 public:
  DestroyAsync(const Handle<Value>& callback) : OpenAsync(callback) {}
  void Run() { status_ = leveldb::DestroyDB(name_, options_); }
  void Result(Handle<Value>& error, Handle<Value>& result) {}
};





/**

    Repair

 */

class JHandle::RepairAsync : public OpenAsync {
 public:
  RepairAsync(const Handle<Value>& callback) : OpenAsync(callback) {}
  void Run() { status_ = leveldb::RepairDB(name_, options_); }
  void Result(Handle<Value>& error, Handle<Value>& result) {}
};





/**

    Read

 */

class JHandle::ReadAsync : public OpAsync {
 public:
  ReadAsync(const Handle<Value>& callback) : OpAsync(callback) {}
  virtual ~ReadAsync() { keyHandle_.Dispose(); }

  static Handle<Value> Hook(const Arguments& args) {
    HandleScope scope;

    if (args.Length() != 3 || !Buffer::HasInstance(args[0]) ||
        !args[2]->IsFunction())
      return ThrowTypeError("Invalid arguments");

    ReadAsync* op = new ReadAsync(args[2]);

    // Required self
    op->self_ = ObjectWrap::Unwrap<JHandle>(args.This());

    // Required key
    op->key_ = ToSlice(args[0], op->keyHandle_);

    // Optional options
    UnpackReadOptions(args[1], op->options_);

    return AsyncEnqueue<ReadAsync>(op);
  }

  void Run() {
    result_ = new std::string;
    status_ = self_->db_->Get(options_, key_, result_);
  }

  void Result(Handle<Value>& error, Handle<Value>& result) {
    if (status_.IsNotFound()) {
      result = Null();
    } else if (status_.ok()) {
      result = ToBuffer(result_);
    }
  }

  JHandle* self_;

  leveldb::ReadOptions options_;
  leveldb::Slice key_;

  std::string* result_;

  Persistent<Value> keyHandle_;
};





/**

    Write

 */

class JHandle::WriteAsync : public OpAsync {
 public:
  WriteAsync(const Handle<Value>& callback) : OpAsync(callback) {}
  virtual ~WriteAsync() { batchHandle_.Dispose(); }

  static Handle<Value> Hook(const Arguments& args) {
    HandleScope scope;

    if (args.Length() != 3 || !JBatch::HasInstance(args[0]) ||
        !args[2]->IsFunction())
      return ThrowTypeError("Invalid arguments");

    WriteAsync* op = new WriteAsync(args[2]);

    // Required self
    op->self_ = ObjectWrap::Unwrap<JHandle>(args.This());

    // Required batch
    op->batch_ = &ObjectWrap::Unwrap<JBatch>(args[0]->ToObject())->wb_;
    op->batchHandle_ = Persistent<Value>::New(args[0]);

    // Optional options
    UnpackWriteOptions(args[1], op->options_);

    return AsyncEnqueue<WriteAsync>(op);
  }

  void Run() {
    status_ = self_->db_->Write(options_, batch_);
  }

  void Result(Handle<Value>& error, Handle<Value>& result) {
  }

  JHandle* self_;

  leveldb::WriteBatch* batch_;
  leveldb::WriteOptions options_;

  Persistent<Value> batchHandle_;
};





/**

    Iterator

 */

class JHandle::GetIteratorAsync : public OpAsync {
 public:
  GetIteratorAsync(const Handle<Value>& callback) : OpAsync(callback) {}

  static Handle<Value> Hook(const Arguments& args) {
    HandleScope scope;

    if (args.Length() != 2 || !args[1]->IsFunction())
      return ThrowTypeError("Invalid arguments");

    GetIteratorAsync* op = new GetIteratorAsync(args[1]);

    // Required self
    op->self_ = ObjectWrap::Unwrap<JHandle>(args.This());

    // Optional options
    UnpackReadOptions(args[0], op->options_);

    return AsyncEnqueue<GetIteratorAsync>(op);
  }

  void Run() {
    it_ = self_->db_->NewIterator(options_);
  }

  void Result(Handle<Value>& error, Handle<Value>& result) {
    if (status_.ok()) {
      Local<Value> args[] = { External::New(it_) };
      Local<Object> instance = JIterator::constructor->GetFunction()->NewInstance(1, args);

      // Keep a weak reference
      Persistent<Object> weak = Persistent<Object>::New(instance);
      weak.MakeWeak(self_, &UnrefIterator);

      self_->Ref();

      result = instance;
    }
  }

  static void UnrefIterator(Persistent<Value> object, void* parameter) {
    JHandle* self = static_cast<JHandle*>(parameter);
    assert(self);
    self->Unref();
    object.Dispose();
  }

  JHandle* self_;

  leveldb::ReadOptions options_;
  leveldb::Iterator* it_;
};





/**

    Snapshot

 */

class JHandle::GetSnapshotAsync : public OpAsync {
 public:
  GetSnapshotAsync(const Handle<Value>& callback) : OpAsync(callback) {}

  static Handle<Value> Hook(const Arguments& args) {
    HandleScope scope;

    if (args.Length() != 1 || !args[0]->IsFunction())
      return ThrowTypeError("Invalid arguments");

    GetSnapshotAsync* op = new GetSnapshotAsync(args[0]);

    // Required self
    op->self_ = ObjectWrap::Unwrap<JHandle>(args.This());

    return AsyncEnqueue<GetSnapshotAsync>(op);
  }

  void Run() {
    snapshot_ = const_cast<leveldb::Snapshot*>(self_->db_->GetSnapshot());
  }

  void Result(Handle<Value>& error, Handle<Value>& result) {
    if (status_.ok()) {
      Local<Value> instance = External::New(static_cast<void*>(snapshot_));

      Persistent<Value> weak = Persistent<Value>::New(instance);
      weak.MakeWeak(self_, &UnrefSnapshot);

      self_->Ref();

      result = instance;
    }
  }

  static void UnrefSnapshot(Persistent<Value> object, void* parameter) {
    assert(object->IsExternal());

    JHandle* self = static_cast<JHandle*>(parameter);
    const leveldb::Snapshot* snapshot =
      static_cast<leveldb::Snapshot*>(External::Unwrap(object));

    assert(self);
    assert(snapshot);

    self->db_->ReleaseSnapshot(snapshot);
    self->Unref();

    object.Dispose();
  }

  JHandle* self_;
  leveldb::Snapshot* snapshot_;
};





/**

    Property

 */

class JHandle::GetPropertyAsync : public OpAsync {
 public:
  GetPropertyAsync(const Handle<Value>& callback) : OpAsync(callback) {}

  static Handle<Value> Hook(const Arguments& args) {
    HandleScope scope;

    if (args.Length() != 2 || !args[0]->IsString() || !args[1]->IsFunction())
      return ThrowTypeError("Invalid arguments");

    GetPropertyAsync* op = new GetPropertyAsync(args[1]);

    // Required self
    op->self_ = ObjectWrap::Unwrap<JHandle>(args.This());

    // Required property name
    op->name_ = *String::Utf8Value(args[0]);

    return AsyncEnqueue<GetPropertyAsync>(op);
  }

  void Run() {
    hasProperty_ = self_->db_->GetProperty(name_, &value_);
  }

  void Result(Handle<Value>& error, Handle<Value>& result) {
    if (hasProperty_) result = String::New(value_.c_str());
  }

  JHandle* self_;

  std::string name_;
  std::string value_;

  bool hasProperty_;
};





/**

    Approximate sizes

 */

class JHandle::GetApproximateSizesAsync : public OpAsync {
 public:
  GetApproximateSizesAsync(const Handle<Value>& callback) : OpAsync(callback) {}
  virtual ~GetApproximateSizesAsync() {
    std::vector< Persistent<Value> >::iterator it;
    for (it = handles_.begin(); it < handles_.end(); ++it) it->Dispose();
    if (sizes_) delete[] sizes_;
  }

  static Handle<Value> Hook(const Arguments& args) {
    HandleScope scope;

    if (args.Length() != 2 || !args[0]->IsArray() || !args[1]->IsFunction())
      return ThrowTypeError("Invalid arguments");

    GetApproximateSizesAsync* op = new GetApproximateSizesAsync(args[1]);

    // Required self
    op->self_ = ObjectWrap::Unwrap<JHandle>(args.This());

    // Required sizes
    Local<Array> array(Array::Cast(*args[0]));

    int len = array->Length();
    if (len % 2 != 0)
      return ThrowTypeError("Invalid arguments");

    for (int i = 0; i < len; i += 2) {
      if (array->Has(i) && array->Has(i + 1)) {
        Local<Value> lStart = array->Get(i);
        Local<Value> lLimit = array->Get(i + 1);

        leveldb::Slice start = ToSlice(lStart, op->handles_);
        leveldb::Slice limit = ToSlice(lLimit, op->handles_);

        op->ranges_.push_back(leveldb::Range(start, limit));
      }
    }

    return AsyncEnqueue<GetApproximateSizesAsync>(op);
  }

  void Run() {
    int len = ranges_.size();
    sizes_ = new uint64_t[len];
    self_->db_->GetApproximateSizes(&ranges_[0], len, sizes_);
  }

  void Result(Handle<Value>& error, Handle<Value>& result) {
    int len = ranges_.size();

    Handle<Array> array = Array::New(len);

    for (int i = 0; i < len; ++i) {
      uint64_t size = sizes_[i];
      if (size < INT_MAX) {
        array->Set(i, Integer::New(static_cast<uint32_t>(size)));
      } else {
        array->Set(i, Number::New(static_cast<double>(size)));
      }
    }

    result = array;
  }

  JHandle* self_;

  std::vector<leveldb::Range> ranges_;
  std::vector< Persistent<Value> > handles_;

  uint64_t* sizes_;
};





void JHandle::Initialize(Handle<Object> target) {
  HandleScope scope;

  Local<FunctionTemplate> t = FunctionTemplate::New(New);
  constructor = Persistent<FunctionTemplate>::New(t);
  constructor->InstanceTemplate()->SetInternalFieldCount(1);
  constructor->SetClassName(String::NewSymbol("Handle"));

  // Instance methods
  NODE_SET_PROTOTYPE_METHOD(constructor, "get", ReadAsync::Hook);
  NODE_SET_PROTOTYPE_METHOD(constructor, "write", WriteAsync::Hook);
  NODE_SET_PROTOTYPE_METHOD(constructor, "iterator", GetIteratorAsync::Hook);
  NODE_SET_PROTOTYPE_METHOD(constructor, "snapshot", GetSnapshotAsync::Hook);
  NODE_SET_PROTOTYPE_METHOD(constructor, "property", GetPropertyAsync::Hook);
  NODE_SET_PROTOTYPE_METHOD(constructor, "approximateSizes", GetApproximateSizesAsync::Hook);

  // Static methods
  NODE_SET_METHOD(target, "open", OpenAsync::Hook<OpenAsync>);
  NODE_SET_METHOD(target, "destroy", OpenAsync::Hook<DestroyAsync>);
  NODE_SET_METHOD(target, "repair", OpenAsync::Hook<RepairAsync>);

  // Set version
  target->Set(String::New("majorVersion"),
              Integer::New(leveldb::kMajorVersion),
              static_cast<PropertyAttribute>(ReadOnly|DontDelete));
  target->Set(String::New("minorVersion"),
              Integer::New(leveldb::kMinorVersion),
              static_cast<PropertyAttribute>(ReadOnly|DontDelete));
}

Handle<Value> JHandle::New(const Arguments& args) {
  HandleScope scope;

  assert(args.Length() == 2);
  assert(args[0]->IsExternal());

  leveldb::DB* db = (leveldb::DB*)External::Unwrap(args[0]);
  JHandle* self = new JHandle(db);

  if (args[1]->IsExternal())
    self->comparator_ = Persistent<Value>::New(args[1]);

  self->Wrap(args.This());

  return args.This();
}

} // namespace node_leveldb
