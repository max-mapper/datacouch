if(!process.env['DATACOUCH_ROOT']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT");

var connect = require('connect'),
  sys = require('sys'),
  sharejs = require('share').server
  ;

var couch = require('url').parse(process.env['DATACOUCH_ROOT']);

var server = connect(connect.logger());

options = {
  port: 9872,
  db: {
    type: 'couchdb',
    hostname: couch.protocol + "//" + (couch.auth ? couch.auth + "@" : "") + couch.hostname,
    port: couch.port
  },
  staticpath: '/share',
  rest: {},
  socketio: {
    // couchdb can't proxy websockets so disable them for now
    'transports': ['xhr-polling', 'flashsocket']
  }
};

sharejs.attach(server, options);
server.listen(options.port);