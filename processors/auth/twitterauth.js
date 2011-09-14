var couch         = process.env['DATACOUCH_ROOT']
  , couchVhost    = process.env['DATACOUCH_VHOST']
  , twitterKey    = process.env['DATACOUCH_TWITTER_KEY']
  , twitterSecret = process.env['DATACOUCH_TWITTER_SECRET']
  , oauth   = require('oauth')
  , request = require('request')
  , url     = require('url')
  , fs      = require('fs')
  , _       = require('underscore')
  , h       = {"Content-type": "application/json", "Accept": "application/json"}
  ;

module.exports = function(app, errorHandler) {
  var callback_url = "http://" + couchVhost + "/login/callback";
  function consumer() {
    return new oauth.OAuth(
        "https://twitter.com/oauth/request_token"
      , "https://twitter.com/oauth/access_token"
      , twitterKey
      , twitterSecret
      , "1.0A"
      , callback_url
      , "HMAC-SHA1");
  }

  app.get('/auth/twitter', function(req, res) {
    consumer().getOAuthRequestToken(
      function(error, oauth_token, oauth_token_secret, results) {
      if (error) {
        return errorHandler({ errors: "Error getting OAuth request token. Please try again"});
      } else {
        req.session.oauth_request_token = oauth_token;
        req.session.oauth_request_token_secret = oauth_token_secret;
        res.redirect( "https://twitter.com/oauth/authorize?oauth_token=" + 
          req.session.oauth_request_token);
      }
    });
  });

  app.get('/auth/twitter/callback', function(req, res) {
    consumer().getOAuthAccessToken( req.session.oauth_request_token
        , req.session.oauth_request_token_secret
        , req.query.oauth_verifier
        , function(error, oauth_access_token, oauth_access_token_secret, results) {
          if (error) {
            return errorHandler({errors: "You choose not to login via twitter by not authorizing our app. Please try again."});
          } else {
            req.session.oauth_access_token = oauth_access_token;
            req.session.oauth_access_token_secret = oauth_access_token_secret;
            consumer().get( "http://twitter.com/account/verify_credentials.json"
              , req.session.oauth_access_token
              , req.session.oauth_access_token_secret
              , function (error, data, response) {
                if (error) {
                  return errorHandler({ errors: "Error connecting to twitter. Please try again"});
                } else {
                  logUserIn(JSON.parse(data), function(userData) {
                    res.redirect('/#/loggedin')
                  })
                }
            });
      }
    });
  });

  // for testing when offline. you shouldnt expose this url in production
  app.get('/auth/fakelogin', function(req, res) {
    var data = JSON.parse(fs.readFileSync('./mock_response.json'));
    _.extend(data
      , { oauth_token: "12241752-yoapezX7E23joij24oijoim999TW33d6N8"
        , oauth_secret: "y4234joijoh2oijhZCEHMqg"
    })
    logUserIn(data, function(userData) {
      res.redirect('/')
    })
  })
  
  function logUserIn(userData, callback) {
    _.extend(userData, {
         _id: "org.couchdb.user:" + userData.screen_name
      , type: "user"
      , roles: []
      , name: userData.screen_name
    })
    getUser(userData._id, function(doc) {
      if(doc) {
        callback(doc)
      } else {
        saveUser(userData
          , function(response) {
              _.extend(userData, { 
                _id: response.id,
                _rev: response.rev
              })
              callback(userData);
        })
      }
    })
  }
  
  function getUser(id, callback) {
    request.get({uri: couch + '/_users/' + id, json: true}
      , function(e,r,b) { 
        if (r.statusCode === 404) callback(false) 
        else callback(b)
      }
    )
  }
  
  function saveUser(data, callback) {
    request.put({uri: couch + '/_users/' + data._id, body: data, json: true}
      , function(e,r,b) { callback(b) }
    )
  }  
   
};