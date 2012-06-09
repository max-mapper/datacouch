var lump = require('../');
var fs = require('fs');

var records = JSON.parse(fs.readFileSync(__dirname + '/records.json'));
var lumps = lump(records, 5, [ 'rows', true, 'x' ])
console.dir(lumps);
