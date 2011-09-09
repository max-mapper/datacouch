if(!process.env['DATACOUCH_ROOT']) throw ("OMGZ YOU HAVE TO SET $DATACOUCH_ROOT");

var everyauth = require('everyauth')
  , connect = require('connect')
  , request = require('request')
  , url = require('url')
  , _ = require('underscore')
  , h = {"Content-type": "application/json", "Accept": "application/json"}
  , couch = process.env['DATACOUCH_ROOT']
  , couchVhost = process.env['DATACOUCH_VHOST']
  ;

everyauth.twitter
  .consumerKey('N6mCSAy3tQA9cQOV0TUCSw')
  .consumerSecret('INm2oSVRZaWNUiBX3vUtK4eOVBiWh657wHpGTUssIg')
  .findOrCreateUser( function (session, accessToken, accessTokenSecret, userData) {
    var promise = this.Promise()
    , userDoc = _.extend({}, userData, {accessToken: accessToken, accessTokenSecret: accessTokenSecret})
    , docURL = couch + "/datacouch-auth/twitter-" + userDoc.id
    ;
    request({uri: docURL, method: "PUT", headers: h, body: JSON.stringify(userDoc)}, function(err, resp, body) { 
      promise.fulfill(body);
    })
    
    return promise;
  })
  .redirectPath("http://" + couchVhost + "/#loggedIn");

everyauth.everymodule.handleLogout( function (req, res) {
  req.logout();
  res.writeHead(303, { 'Location': "http://" + couchVhost + "/#loggedOut" });
  res.end();
});

var routes = function (app) {
  // Define your routes here
};

connect(
    connect.bodyParser()
  , connect.cookieParser()
  , connect.session({secret: 'i2j3o4inoib23ioIJDOWI'})
  , everyauth.middleware()
  , connect.router(routes)
).listen(3000);