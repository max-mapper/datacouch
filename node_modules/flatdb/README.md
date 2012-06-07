node-flatdb
===========
FlatDB it's a database based on JSON files, it's intended to help save 
and load informations from systems and processes that don't require 
hight data volume or read/write extreme performance.

#### Example
You have a server that need to load the configurations but need to change 
it programatically some times, you won't install a whole database engine 
for such a simple thing...

#### Installation
To install FlatDB you just need to use npm `npm install flatdb`

#### Usage

Require the db an initialize it:

    var flatdb = require('flatdb');
    var db = new flatdb('./database'); //use any existing folder as db

    //db will emit the event 'connect' when everything is ready to go
    db.on('connect', function(){

        doc = {
            "hostname" : "localhost",
            "port" : 8001,
            "user" : "myuser",
            "date" : new Date().getTime()
        }

        //insert some information in the database
        db.save(doc, function(err){
            if(err) throw err;
            console.log('Finished insering information.');

            //find some information on the database
            db.find({"user" : "myuser"}, function(err, docs){
                if(err) throw err;
                console.log("We found: ", docs);

                //now let's update every document that have the hostname
                //"localhost" to use the port 1337
                db.update({"hostname" : "localhost"}, {"port" : 1337}, function(err){
                    console.log('Finished updating...');

                    //let's delete every document that have the key "user"
                    //with the valye "myuser"
                    db.delete({"user" : "myuser"}, function(err){
                        if(err) throw err;
                        console.log('Finished deleting...');
                    });
                });
            });
        });
    });

For handling startup error, FlatDB emits a `error` event, so you can catch it like:

    var flatdb = require('flatdb');
    var db = new flatdb('./nonexistent/path'); //force error

    //db will emit the event 'connect' when everything is ready to go
    db.on('connect', function(){
        console.log('This message should not appear...')
    });

    //catch startup error here
    db.on('error', function(err){
        console.log('Oops:', err);
    });


#### TODO

 * Write tests
 * Expand features
 * Write documentation
 * ...

#### License

The MIT License (MIT)
Copyright (c) 2012 Cranic Tecnologia e Informática LTDA

Permission is hereby granted, free of charge, to any person obtaining a 
copy of this software and associated documentation files (the "Software"), 
to deal in the Software without restriction, including without limitation 
the rights to use, copy, modify, merge, publish, distribute, sublicense, 
and/or sell copies of the Software, and to permit persons to whom the 
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included 
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE

