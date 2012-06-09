var Stream = require('stream');
var util = require('util');
var pathway = require('pathway');

exports = module.exports = function (opts, size, path) {
    if (size === undefined) {
        // everything in opts
    }
    else if (Array.isArray(size)) {
        opts = { data : opts, path : size };
    }
    else {
        opts = { data : opts, size : size, path : path };
    }
    
    var data = opts.path ? pathway(opts.data, opts.path) : opts.data;
    return computeLumps(data, opts.size);
};

exports.stream = function (opts) {
    return new Lump(opts);
};

function Lump (opts, path) {
    if (!opts) opts = {};
    if (typeof opts === 'number') opts = { size : opts };
    if (!opts.size) throw new Error('required parameter "size" not given');
    
    this.writable = true;
    this.size = opts.size;
    this.path = path || opts.path || [];
    this.data = [];
}

util.inherits(Lump, Stream);

Lump.prototype.lumps = function () {
    return computeLumps(this.data, this.size);
};

Lump.prototype.write = function (obj) {
    var self = this;
    var xs = pathway(obj, self.path);
    self.data.push.apply(self.data, xs);
};

Lump.prototype.end = function () {
    this.emit('end');
};

function computeLumps (data, size) {
    var min = Math.min.apply(null, data);
    var max = Math.max.apply(null, data);
    var step = (max - min) / size;
    
    var lumps = [];
    var sorted = data.sort();
    var ix = 0;
    
    for (var x = min; x < max; x += step) {
        var lump = { min : x, max : x + step, count : 0 };
        for (; sorted[ix] < x + step; ix++) {
            lump.count ++;
        }
        lumps.push(lump);
    }
    return lumps;
}
