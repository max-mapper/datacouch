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

transforming at key paths
-------------------------

``` js
var transfuse = require('transfuse');
var tr = transfuse(['rows', /./, 'c'], function (doc, map) {
    doc.pizza = "tacos"
    map(doc);
});
tr.pipe(process.stdout);

var stream = new(require('net').Stream);
stream.pipe(tr);

stream.emit('data', JSON.stringify({
    rows : [
        { a : 3, c : {} },
        { a : 4, c : { cats : 'dogs' } },
        { a : 2, c : { beep : 'boop' } },
    ],
    bling : 'blong',
}));
stream.emit('end');
```

methods
=======

var transfuse = require('transfuse');

transfuse(keyPath=[/./], fn)
----------------------

Return a readable/writable stream transforming an incoming JSON stream of "data"
events into an outgoing stream of "data" events with `fn`.

If `fn.length === 1` use `transfuse.sync`. Otherwise use `transfuse.async`.

If `fn` is a string then it should contain a function body which will be run
with `vm.runInNewContext`.

The optional `keyPath` argument can be used to transform a specific nested
section of the document.
See [JSONStream](https://github.com/dominictarr/JSONStream) for how key path
Arrays work.

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
