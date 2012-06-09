var pathway = require('../');
var test = require('tap').test;

test('boolean elements in paths', function (t) {
    var xs = [
        { x : { y : { z : 555 } } },
        { beep : 'boop' },
        { x : { y : { z : 444 } }, w : 4 },
        { x : { y : 'zzz' } },
        { x : { y : { z : 333 } } },
        { X : { y : { z : 222 } } }
    ];
    var ys = pathway(xs, [ true, /x/i, 'y', 'z' ]);
    t.same(ys, [ 555, 444, 333, 222 ]);
    
    var empty = pathway(xs, [ true, /x/i, false, 'z' ]);
    t.same(empty, []);
    
    t.end();
});
