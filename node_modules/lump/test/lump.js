var test = require('tap').test;
var lump = require('../');
var fs = require('fs');
var JSONStream = require('JSONStream');

var records = JSON.parse(fs.readFileSync(__dirname + '/records.json'));
var values = [
    { min: 12, max: 27.2, count: 2 },
    { min: 27.2, max: 42.4, count: 1 },
    { min: 42.4, max: 57.6, count: 3 },
    { min: 57.6, max: 72.8, count: 4 },
    { min: 72.8, max: 88, count: 2 },
];

test('from an object', function (t) {
    var lumps = lump(records, 5, [ 'rows', true, 'x' ])
    t.same(round(lumps), values);
    t.end();
});

test('from a stream', function (t) {
    var rs = fs.createReadStream(__dirname + '/records.json')
    var parser = JSONStream.parse([ 'rows', /./, 'x' ]);
    rs.pipe(parser);
    var lumper = lump.stream(5);
    parser.pipe(lumper);
    lumper.on('end', function () {
        t.same(round(lumper.lumps()), values);
        t.end();
    });
});

function round (xs) {
    return xs.map(function (obj) {
        return Object.keys(obj).reduce(function (acc, key) {
            acc[key] = Math.round(obj[key] * 1e8) / 1e8;
            return acc;
        }, {});
    });
}
