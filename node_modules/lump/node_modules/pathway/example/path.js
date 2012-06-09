var pathway = require('../');
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
