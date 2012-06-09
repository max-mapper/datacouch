var lump = require('../');
var fs = require('fs');
var JSONStream = require('JSONStream');

var rs = fs.createReadStream(__dirname + '/records.json')
var parser = JSONStream.parse([ 'rows', /./, 'x' ]);
rs.pipe(parser);

var lumper = lump.stream(5);
parser.pipe(lumper);
lumper.on('end', function () {
    var x = lumper.lumps();
    console.dir(x);
});
