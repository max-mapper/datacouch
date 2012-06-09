var pathway = require('../');
var test = require('tap').test;

test('object to array to object', function (t) {
    var obj = { rows : [ { x: 52 }, { x: 41 }, { y: 12 }, { x: 50 } ] };
    var xs = pathway(obj, [ 'rows', true, 'x' ]);
    t.same(xs, [ 52, 41, 50 ]);
    t.end();
});
