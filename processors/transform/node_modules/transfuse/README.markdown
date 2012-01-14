transfuse
=========

Streaming JSON transformer.

examples
========

synchronous transform
---------------------

``` js
var transfuse = require('transfuse');

var tr = transfuse(function (doc) {
    return { x : doc.a || doc.b };
});

process.stdin.pipe(tr);
tr.pipe(process.stdout);
process.stdin.resume();
```

output:

```
$ echo '[{"a":3},{"b":5},{"a":10,"b":3},{"b":55,"c":6}]' | node example/sync.js 
[
{"x":3}
,
{"x":5}
,
{"x":10}
,
{"x":55}
]
```

asynchronous transform
----------------------

``` js
var transfuse = require('transfuse');

var tr = transfuse(function (doc, map) {
    map({ x : doc.a || doc.b });
});

process.stdin.pipe(tr);
tr.pipe(process.stdout);
process.stdin.resume();
```

output:

```
$ echo '[{"a":3},{"b":5},{"a":10,"b":3},{"b":55,"c":6}]' | node example/async.js 
[
{"x":3}
,
{"x":5}
,
{"x":10}
,
{"x":55}
]
```

custom parsing and stringification
----------------------------------

see [JSONStream](https://github.com/dominictarr/JSONStream) for more details

transfuse(['rows', /./, 'doc'], function(doc, map) {
  doc.pizza = "tacos"
  map(doc)
}, JSONStream.stringify("{\"docs\":[\n", "\n,\n", "\n]}\n"));

methods
=======

var transfuse = require('transfuse');

transfuse(fn)
-------------

Return a readable/writable stream transforming an incoming JSON stream of "data"
events into an outgoing stream of "data" events with `fn`.

If `fn.length === 1` use `transfuse.sync`. Otherwise use `transfuse.async`.

If `fn` is a string then it should contain a function body which will be run
with `vm.runInNewContext`.

transfuse.sync(fn)
------------------

Return a readable/writable stream to transform using `fn(doc)`, which should
return the new document to insert.

transfuse.async(fn)
-------------------

Return a readable/writable stream to transform using `fn(doc, map)`, which should
call `map` with the new document value.

The order of the resulting collection will depend on the order in which the
`map(doc)` functions fired.

install
=======

With [npm](http://npmjs.org) do:

    npm install transfuse

license
=======

MIT/X11
