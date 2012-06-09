var pathway = require('../');
var test = require('tap').test;

test('use a function to determine keys', function (t) {
    var xs = [
        [ 'a', 1, 'b' ],
        [ 'c', 2 ],
        [ 'd', 3, 'e', 4, 'f' ],
        [],
        [ 'g', 5, 'h' ],
    ];
    function True () { return true }
    function even (n) { return n % 2 === 0 }
    function odd (n) { return n % 2 === 1 }
    function doubleOdd (key, value) { return odd(key) && odd(value) }
    
    var odds = pathway(xs, [ True, odd ]);
    t.same(odds, [ 1, 2, 3, 4, 5 ]);
    
    var evens = pathway(xs, [ True, even ]);
    t.same(evens, [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h' ]);
    
    var doubleOdds = pathway(xs, [ True, doubleOdd ]);
    t.same(doubleOdds, [ 1, 3, 5 ]);
    
    t.end();
});
