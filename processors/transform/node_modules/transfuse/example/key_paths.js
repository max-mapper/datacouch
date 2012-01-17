var transfuse = require('../');
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
