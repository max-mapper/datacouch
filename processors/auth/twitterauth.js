var couch         = process.env['DATACOUCH_ROOT']
  , couchVhost    = process.env['DATACOUCH_TWITTER_VHOST']
  , twitterKey    = process.env['DATACOUCH_TWITTER_KEY']
  , twitterSecret = process.env['DATACOUCH_TWITTER_SECRET']
  , oauth   = require('oauth')
  , request = require('request')
  , url     = require('url')
  , fs      = require('fs')
  , _       = require('underscore')
  , h       = {"Content-type": "application/json", "Accept": "application/json"}
  , util  = require('./couch_utils')
  ;

module.exports = function(app, errorHandler) {
  
  function consumer() {
    return new oauth.OAuth(
        "https://twitter.com/oauth/request_token"
      , "https://twitter.com/oauth/access_token"
      , twitterKey
      , twitterSecret
      , "1.0A"
      , "http://" + couchVhost + "/login/callback"
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
                  util.logUserIn(util.couchUserDoc(JSON.parse(data)), function(userDoc, cookie) {
                    res.header('Set-Cookie', cookie)
                    res.redirect('/#/loggedin!')
                  })
                }
            });
      }
    });
  });

  // for testing when offline. you shouldnt expose this url in production
  app.get('/auth/fakelogin', function(req, res) {
    var data = JSON.parse(fs.readFileSync('./mock_response.json'));
    _.extend(util.couchUserDoc(data)
      , { oauth_token: "12241752-yoapezX7E23joij24oijoim999TW33d6N8"
        , oauth_secret: "y4234joijoh2oijhZCEHMqg"
    })
    util.logUserIn(data, function(userDoc, cookie) {
      // todo figure out better way to merge set-cookie in express
      var authCookie = cookie[0].split(';')[0].split('=');
      res.cookie(authCookie[0], authCookie[1])
      res.redirect('/#/loggedin!')
    })
  })
  
  app.get('/auth/token', function(req, res) {
    request({uri: "http://" + couchVhost + '/api/couch/_session', headers: {cookie: "AuthSession=" + req.cookies['authsession']} }
      , function(e,r,b) {
        var user = JSON.parse(b).userCtx.name
        if(user) {
          util.getDoc(couch + '_users/org.couchdb.user:' + user
            , function(doc) {
              res.header('Content-Type', 'application/json');
              res.end(JSON.stringify({token: doc.couch_token}));
          })
        } else {
          res.writeHead(401);
          res.end('Unauthorized');
        }
      })
  })
   
};