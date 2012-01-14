var transfuse = require('../');
var test = require('tap').test;
var Stream = require('stream').Stream;
var chunky = require('chunky');

test('sync', function (t) {
    var pending = 20;
    t.plan(pending * 2);
    
    function sync (doc) {
        return { x : (doc.a || doc.b) + doc.c };
    }
    
    check(t, sync, function end () {
        if (--pending === 0) t.end()
        else check(t, sync, end)
    });
});

test('string sync', function (t) {
    var pending = 20;
    t.plan(pending * 2);
    
    var sync = 'function (doc) {'
        + 'return { x : (doc.a || doc.b) + doc.c }'
        + '}'
    ;
    
    check(t, sync, function end () {
        if (--pending === 0) t.end()
        else check(t, sync, end)
    });
});

test('async', function (t) {
    var pending = 20;
    t.plan(pending * 2);
    
    function async (doc, map) {
        setTimeout(function () {
            map({ x : (doc.a || doc.b) + doc.c });
        }, Math.floor(Math.random() * 10 + 1));
    }
    
    check(t, async, function end () {
        if (--pending === 0) t.end()
        else check(t, async, end)
    });
});

function check (t, fn, end) {
    var tr = transfuse(fn);
    
    var stream = {
        in : new Stream,
        out : new Stream,
    };
    stream.in.readable = true;
    stream.out.writable = true;
    
    var data = [];
    stream.out.write = function (buf) {
        data.push(buf.toString());
    };
    stream.out.end = function () {
        t.equal(data.length, 4);
        t.deepEqual(
            JSON.parse(data.join('')).sort(function (a, b) {
                return a.x - b.x;
            }), 
            [ { x : 102 }, { x : 6 }, { x : 0 } ].sort(function (a, b) {
                return a.x - b.x;
            })
        );
        end();
    };
    
    stream.in.pipe(tr);
    tr.pipe(stream.out);
    
    var buffers = chunky(JSON.stringify([
        { a : 2, c : 100 },
        { b : 5, c : 1 },
        { a : 5, b : 10, c : -5 },
    ]));
    
    var iv = setInterval(function () {
        var buf = buffers.shift();
        stream.in.emit('data', buf);
        
        if (buffers.length === 0) {
            clearInterval(iv);
            stream.in.emit('end');
        }
    }, 10);
}
