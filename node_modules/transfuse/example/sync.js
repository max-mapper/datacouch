var transfuse = require('../');

var tr = transfuse(function (doc) {
    return { x : doc.a || doc.b };
});

process.stdin.pipe(tr);
tr.pipe(process.stdout);
process.stdin.resume();
