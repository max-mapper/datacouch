pathway
=======

Follow key-paths through nested objects.

[![build status](https://secure.travis-ci.org/substack/node-pathway.png)](http://travis-ci.org/substack/node-pathway)

example
=======

``` js
var pathway = require('pathway');
var xs = [
    { x : { y : { z : 555 } } },
    { beep : 'boop' },
    { x : { y : { z : 444 } }, w : 4 },
    { x : { y : 'zzz' } },
    { x : { y : { z : 333 } } },
    { X : { y : { z : 222 } } }
];
var ys = pathway(xs, [ true, /x/i, 'y', 'z' ]);
console.dir(ys);
```

***

```
[ 555, 444, 333, 222 ]
```

methods
=======

``` js
var pathway = require('pathway')
```

pathway(obj, path)
------------------

Return an array of all the matching paths through the nested object `obj` that
match the key path route `path`.

Key paths determine how to proceed deeper into the object for each element.
Key paths may contain these kinds of elements:

* string, number - used as raw keys
* RegExp - match keys
* boolean - match all or no keys
* function - match keys with `f(key, value)`, return truthiness

Some types may select multiple matching results at a given node, in which case
all the matching nodes at that level will be followed forward into the result
until a later condition isn't satisfied. 

This behavior is heavily inspired by how
[JSONStream](https://github.com/dominictarr/JSONStream)'s `.parse()` function
works.

install
=======

With [npm](http://npmjs.org) do:

```
npm install pathway
```

notes
=====

This module was written high up in a tree at Mosswood Park.
