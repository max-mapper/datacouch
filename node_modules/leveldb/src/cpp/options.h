#ifndef NODE_LEVELDB_OPTIONS_H_
#define NODE_LEVELDB_OPTIONS_H_

#include <assert.h>

#include <leveldb/comparator.h>
#include <leveldb/options.h>
#include <node.h>
#include <v8.h>

using namespace node;
using namespace v8;

namespace node_leveldb {

static void UnpackOptions(
  Handle<Value> val, leveldb::Options& options,
  Persistent<Value>* comp = NULL)
{
  HandleScope scope;
  if (!val->IsObject()) return;
  Local<Object> obj = val->ToObject();

  static const Persistent<String> kCreateIfMissing = NODE_PSYMBOL("create_if_missing");
  static const Persistent<String> kErrorIfExists = NODE_PSYMBOL("error_if_exists");
  static const Persistent<String> kParanoidChecks = NODE_PSYMBOL("paranoid_checks");
  static const Persistent<String> kWriteBufferSize = NODE_PSYMBOL("write_buffer_size");
  static const Persistent<String> kMaxOpenFiles = NODE_PSYMBOL("max_open_files");
  static const Persistent<String> kBlockSize = NODE_PSYMBOL("block_size");
  static const Persistent<String> kBlockRestartInterval = NODE_PSYMBOL("block_restart_interval");
  static const Persistent<String> kCompression = NODE_PSYMBOL("compression");
  static const Persistent<String> kComparator = NODE_PSYMBOL("comparator");
  /*
  static const Persistent<String> kInfoLog = NODE_PSYMBOL("info_log");
  */

  if (obj->Has(kCreateIfMissing))
    options.create_if_missing = obj->Get(kCreateIfMissing)->BooleanValue();

  if (obj->Has(kErrorIfExists))
    options.error_if_exists = obj->Get(kErrorIfExists)->BooleanValue();

  if (obj->Has(kParanoidChecks))
    options.paranoid_checks = obj->Get(kParanoidChecks)->BooleanValue();

  if (obj->Has(kWriteBufferSize))
    options.write_buffer_size = obj->Get(kWriteBufferSize)->Int32Value();

  if (obj->Has(kMaxOpenFiles))
    options.max_open_files = obj->Get(kMaxOpenFiles)->Int32Value();

  if (obj->Has(kBlockSize))
    options.block_size = obj->Get(kBlockSize)->Int32Value();

  if (obj->Has(kBlockRestartInterval))
    options.block_restart_interval = obj->Get(kBlockRestartInterval)->Int32Value();

  if (obj->Has(kCompression)) {
    options.compression = obj->Get(kBlockRestartInterval)->BooleanValue()
                        ? leveldb::kSnappyCompression : leveldb::kNoCompression;
  }

  if (comp && obj->Has(kComparator)) {
    Local<Value> ext = obj->Get(kComparator);
    if (ext->IsExternal()) {
      options.comparator =
        static_cast<leveldb::Comparator*>(External::Unwrap(ext));
      *comp = Persistent<Value>::New(ext);
    }
  }

  /*
  if (obj->Has(kInfoLog))
    options.info_log = NULL;
  */
}

static void UnpackReadOptions(Handle<Value> val, leveldb::ReadOptions& options) {
  HandleScope scope;
  if (!val->IsObject()) return;
  Local<Object> obj = val->ToObject();

  static const Persistent<String> kSnapshot = NODE_PSYMBOL("snapshot");
  static const Persistent<String> kVerifyChecksums = NODE_PSYMBOL("verify_checksums");
  static const Persistent<String> kFillCache = NODE_PSYMBOL("fill_cache");

  if (obj->Has(kSnapshot)) {
    Local<Value> ext = obj->Get(kSnapshot);
    if (ext->IsExternal()) {
      options.snapshot =
        static_cast<leveldb::Snapshot*>(External::Unwrap(ext));
    }
  }

  if (obj->Has(kVerifyChecksums))
    options.verify_checksums = obj->Get(kVerifyChecksums)->BooleanValue();

  if (obj->Has(kFillCache))
    options.fill_cache = obj->Get(kFillCache)->BooleanValue();

}

static void UnpackWriteOptions(Handle<Value> val, leveldb::WriteOptions& options) {
  if (!val->IsObject()) return;
  Local<Object> obj = val->ToObject();

  static const Persistent<String> kSync = NODE_PSYMBOL("sync");

  if (obj->Has(kSync))
    options.sync = obj->Get(kSync)->BooleanValue();

}

} // namespace node_leveldb

#endif // NODE_LEVELDB_OPTIONS_H_
