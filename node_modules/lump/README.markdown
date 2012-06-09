lump
====

Count records in `n` contiguous buckets of equal size.

[![build status](https://secure.travis-ci.org/substack/node-lump.png)](http://travis-ci.org/substack/node-lump)

example
=======

Given this `records.json` data:

``` js
{"rows":[
  {"x":52},
  {"x":41},
  {"x":12},
  {"x":46},
  {"x":65},
  {"x":73},
  {"x":88},
  {"x":66},
  {"x":22},
  {"x":44},
  {"x":60},
  {"x":59},
  {"x":81}
]}
```

lump
----

Pick off the x values and count them by bucket:

``` js
var lump = require('lump');
var fs = require('fs');

var records = JSON.parse(fs.readFileSync(__dirname + '/records.json'));
var lumps = lump(records, 5, [ 'rows', true, 'x' ])
console.dir(lumps);
```

***

```
[ { min: 12, max: 27.2, count: 2 },
  { min: 27.2, max: 42.4, count: 1 },
  { min: 42.4, max: 57.599999999999994, count: 3 },
  { min: 57.599999999999994, max: 72.8, count: 4 },
  { min: 72.8, max: 88, count: 2 } ]
```

stream
------

Or do the same thing with a stream:

``` js
var lump = require('lump');
var fs = require('fs');
var JSONStream = require('JSONStream');

var rs = fs.createReadStream(__dirname + '/records.json')
var parser = JSONStream.parse([ 'rows', /./, 'x' ]);
rs.pipe(parser);

var lumper = lump.stream(5);
parser.pipe(lumper);
lumper.on('end', function () {
    var x = lumper.lumps();
    console.dir(x);
});
```

***

```
[ { min: 12, max: 27.2, count: 2 },
  { min: 27.2, max: 42.4, count: 1 },
  { min: 42.4, max: 57.599999999999994, count: 3 },
  { min: 57.599999999999994, max: 72.8, count: 4 },
  { min: 72.8, max: 88, count: 2 } ]
```

methods
=======

``` js
var lump = require('lump')
```

lump(data, size, path)
----------------------

Return an array of buckets counting the number of values from `data` that fall
within each bucket range.

Buckets are just objects with `min`, `max`, and `count` keys.

If the values to bucket are nested inside of `data`, specify the optional `path`
parameter to read data at a
[pathway key path](https://github.com/substack/node-pathway).

lump(opts)
----------

Alternative form that calls `lump(opts.data, opts.size, opts.path)`.

lump.stream(opts)
-----------------

Return a writable stream that you `write()` data objects too. If the values
needed for lumping are nested inside the objects written, use `opts.path` to
specify the [pathway key path](https://github.com/substack/node-pathway) to the
values.

The call must have an `opts.size` to specify how many buckets to split the
results among. If `opts` is a number, it will be treated as the `opts.size`.

install
=======

With [npm](http://npmjs.org) do:

```
npm install lump
```

license
=======

MIT
