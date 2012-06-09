var pathway = require('../');

var xs = [
    [ 'a', 1, 'b' ],
    [ 'c', 2 ],
    [ 'd', 3, 'e', 4, 'f' ],
    [],
    [ 'g', 5, 'h' ],
];
function even (n) { return n % 2 === 0 }
function odd (n) { return n % 2 === 1 }
function doubleOdd (key, value) { return odd(key) && odd(value) }

var odds = pathway(xs, [ true, odd ]);
console.dir(odds); // [ 1, 2, 3, 4, 5 ]

var evens = pathway(xs, [ true, even ]);
console.dir(evens); // [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h' ]

var doubleOdds = pathway(xs, [ true, doubleOdd ]);
console.dir(doubleOdds); // [ 1, 3, 5 ]
