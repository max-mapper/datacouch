var couch         = process.env['DATACOUCH_ROOT']
  , couchVhost    = process.env['DATACOUCH_VHOST']
  , twitterKey    = process.env['DATACOUCH_TWITTER_KEY']
  , twitterSecret = process.env['DATACOUCH_TWITTER_SECRET']
  , oauth   = require('oauth')
  , crypto  = require('crypto')
  , request = require('request')
  , url     = require('url')
  , fs      = require('fs')
  , qs      = require('querystring')
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
                  logUserIn(couchUserDoc(JSON.parse(data)), function(userDoc, cookie) {
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
    _.extend(couchUserDoc(data)
      , { oauth_token: "12241752-yoapezX7E23joij24oijoim999TW33d6N8"
        , oauth_secret: "y4234joijoh2oijhZCEHMqg"
    })
    logUserIn(data, function(userDoc, cookie) {
      // todo figure out better way to merge set-cookie in express
      var authCookie = cookie[0].split(';')[0].split('=');
      res.cookie(authCookie[0], authCookie[1])
      res.redirect('/#/loggedin!')
    })
  })
  
  function couchUserDoc(userData) {
    var salt = "woo"
      , password = "hoo"
      ;
    return _.extend(userData, {
         _id: "org.couchdb.user:" + userData.screen_name
      , type: "user"
      , roles: []
      , name: userData.screen_name
      , salt: salt
      , password_sha: crypto.createHash("sha1").update(password + salt).digest('hex')
      , couch_token: password
    })
  }
  
  function couchProfile(userData) {
    return {
         _id: userData.screen_name
      , avatar: userData.profile_image_url
    }
  }
  
  function logUserIn(userData, callback) {
    var userDocURL = couch + '/_users/org.couchdb.user:' + userData.screen_name;
    getOrCreate(userDocURL, userData, function(userDoc) {
      request.post({
          uri: couch + '/_session'
        , headers: {"content-type": "application/x-www-form-urlencoded"}
        , body: qs.encode({name: userDoc.name, password: userDoc.couch_token})
      }
      , function(e,r,b) {
        getOrCreate(couch + '/datacouch-users/' + userDoc.screen_name, couchProfile(userDoc)
          , function(profile) {
            callback(userDoc, r.headers['set-cookie']);
          });
      })
    })
  }

  function getOrCreate(url, userData, callback) {    
    getDoc(url, function(doc) {
      if(doc) {
        callback(doc)
      } else {
        createDoc(url, userData
          , function(doc) {
              callback(doc);
        })
      }
    })
  }

  function getDoc(url, callback) {
    request.get({uri: url, json: true}
      , function(e,r,b) { 
        if (r.statusCode === 404) callback(false) 
        else callback(b)
      }
    )
  }
  
  function createDoc(url, userData, callback) {
    request.put({uri: url, body: userData, json: true}
      , function(e,r,b) { 
        _.extend(userData
          , { _id: r.id
            , _rev: r.rev
        })
        callback(userData)
      }
    )
  }  
   
};