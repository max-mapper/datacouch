#include <algorithm>
#include <vector>
#include <sstream>

#include <leveldb/comparator.h>
#include <leveldb/slice.h>
#include <node.h>
#include <v8.h>

#include "comparator.h"
#include "helpers.h"

using namespace std;

namespace node_leveldb {

PartitionedBitwiseComparator::PartitionedBitwiseComparator(
  const vector< pair<uint32_t, bool> >& partitions)
  : partitions_(partitions)
{
  stringstream name("node_leveldb.PartitionedBitwiseComparator(",
                    stringstream::out | stringstream::app);
  name << partitions.size();

  // encode name with partition configuration
  vector< pair<uint32_t, bool> >::const_iterator it;
  for (it = partitions.begin(); it < partitions.end(); ++it) {
    name << "," << it->first << ":" << static_cast<int>(it->second);
  }

  name << ")";
  name_ = name.str();
}

const char* PartitionedBitwiseComparator::Name() const {
  return name_.c_str();
}

int PartitionedBitwiseComparator::Compare(
  const leveldb::Slice& a, const leveldb::Slice& b) const
{
  size_t start = 0;
  size_t rem = min(a.size(), b.size());

  bool reverse = false;

  vector< pair<uint32_t, bool> >::const_iterator it = partitions_.begin();
  for (it = partitions_.begin(); it < partitions_.end(); ++it) {
    size_t len = it->first;
    reverse = it->second;

    if (len <= 0 || len >= rem) break;

    // slice this partition
    leveldb::Slice as = leveldb::Slice(a.data() + start, len);
    leveldb::Slice bs = leveldb::Slice(b.data() + start, len);

    // compare partition
    int comp = as.compare(bs);
    if (comp != 0) return reverse ? -comp : comp;

    start += len;
    rem -= len;
  }

  leveldb::Slice as = leveldb::Slice(a.data() + start, a.size() - start);
  leveldb::Slice bs = leveldb::Slice(b.data() + start, b.size() - start);

  // compare end
  int comp = as.compare(bs);
  return reverse ? -comp : comp;
}

void PartitionedBitwiseComparator::FindShortestSeparator(
  string* start, const leveldb::Slice& limit) const
{
  // Find length of common prefix
  size_t end = min(start->size(), limit.size());
  size_t idx = 0;
  while (idx < end && (*start)[idx] == limit[idx]) idx++;

  // Do not shorten if one string is a prefix of the other
  if (idx >= end) return;

  // find sort direction
  uint32_t next = 0;
  bool reverse = false;
  vector< pair<uint32_t, bool> >::const_iterator it = partitions_.begin();
  for (; next <= idx && it < partitions_.end(); ++it) {
    next += it->first;
    reverse = it->second;
  }

  uint8_t byte = static_cast<uint8_t>((*start)[idx]);

  if (reverse) {
    if (byte > static_cast<uint8_t>(0x00) &&
        byte - 1 > static_cast<uint8_t>(limit[idx]))
    {
      (*start)[idx]--;
      start->resize(idx + 1);
      assert(Compare(*start, limit) < 0);
    }
  } else {
    if (byte < static_cast<uint8_t>(0xff) &&
        byte + 1 < static_cast<uint8_t>(limit[idx]))
    {
      (*start)[idx]++;
      start->resize(idx + 1);
      assert(Compare(*start, limit) < 0);
    }
  }
}

void PartitionedBitwiseComparator::FindShortSuccessor(string* key) const {
  // Find first character that can be incremented
  size_t n = key->size();

  // find sort direction for diff_index
  vector< pair<uint32_t, bool> >::const_iterator it = partitions_.begin();
  size_t next = 0;
  bool reverse = false;

  for (size_t i = 0; i < n; ++i) {

    // find sort direction for diff_index
    while (next <= i && it < partitions_.end()) {
      next += it->first;
      reverse = it->second;
      ++it;
    }

    const uint8_t byte = (*key)[i];
    if (reverse) {
      if (byte != static_cast<uint8_t>(0x00)) {
        (*key)[i] = byte - 1;
        key->resize(i + 1);
        return;
      }
    } else {
      if (byte != static_cast<uint8_t>(0xff)) {
        (*key)[i] = byte + 1;
        key->resize(i + 1);
        return;
      }
    }
  }
}

void PartitionedBitwiseComparator::Initialize(Handle<Object> target) {
  HandleScope scope;
  NODE_SET_METHOD(target, "createPartitionedBitwiseComparator", Create);
}

static void UnrefComparator(Persistent<Value> object, void* parameter) {
  assert(object->IsExternal());
  assert(External::Unwrap(object) == parameter);
  leveldb::Comparator* comparator = static_cast<leveldb::Comparator*>(parameter);
  delete comparator;
  object.Dispose();
}

Handle<Value> PartitionedBitwiseComparator::Create(const Arguments& args) {
  HandleScope scope;

  if (args.Length() != 1 || !args[0]->IsArray())
    return ThrowTypeError("Invalid arguments");

  Local<Array> array = Array::Cast(*args[0]);
  uint32_t len = array->Length();

  if (len % 2 != 0)
    return ThrowTypeError("Invalid arguments");

  vector< pair<uint32_t, bool> > partitions;

  for (uint32_t i = 0; i < len; i += 2) {
    if (array->Has(i) && array->Has(i + 1)) {
      Local<Value> boundValue = array->Get(i);
      Local<Value> reverseValue = array->Get(i + 1);

      if (!boundValue->IsUint32() || !reverseValue->IsBoolean())
        return ThrowTypeError("Invalid arguments");

      uint32_t bound = boundValue->Uint32Value();
      bool reverse = reverseValue->BooleanValue();

      partitions.push_back(pair<uint32_t, bool>(bound, reverse));
    }
  }

  PartitionedBitwiseComparator* comparator =
    new PartitionedBitwiseComparator(partitions);

  Local<External> result = External::New(comparator);
  Persistent<Value> weak = Persistent<Value>::New(result);
  weak.MakeWeak(comparator, &UnrefComparator);

  return result;
}

} // namespace node_leveldb
