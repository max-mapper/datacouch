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

app.listen(3000);
