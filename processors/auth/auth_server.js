/**  Simple express server that handles twitter logins + stuff
  *  Setup environment variables (see datacouch readme for more info):
  *    export DATACOUCH_ROOT="http://admin:pass@localhost:5984"
  *    export DATACOUCH_VHOST="couchdb.dev:5984"
  *    export DATACOUCH_TWITTER_KEY="key from https://dev.twitter.com/ here"
  *    export DATACOUCH_TWITTER_SECRET="secret from https://dev.twitter.com/ here"
  *  then "node auth_server.js"
  *  Author: Max Ogden (@maxogden)
 **/

var express = require('express')
  , useTwitterAuth = require('./twitterauth.js')
  ;

var app = express.createServer();

app.configure(function() {
  app.use(express.cookieParser());
  app.use(express.session({secret: "90ndsj9dfdsf"}));
})

useTwitterAuth(app, function(error) {
  console.log(error)
});

app.listen(9870);
