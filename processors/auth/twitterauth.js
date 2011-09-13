var couch         = process.env['DATACOUCH_ROOT']
  , couchVhost    = process.env['DATACOUCH_VHOST']
  , twitterKey    = process.env['DATACOUCH_TWITTER_KEY']
  , twitterSecret = process.env['DATACOUCH_TWITTER_SECRET']
  , oauth   = require('oauth')
  , request = require('request')
  , url     = require('url')
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
                  console.log(data, response)
                  res.redirect('/');
                }
            });
      }
    });
  });
  
  // function get_user(session, twitter_user, callback) {
  //   var resource;
  //   if(session.secret) {
  //     resource = api.base_url + '/user/' + session.secret;
  //     request.get(resource, function(e,h,b) {
  //       if(e) { return callback(
  //           new Error('Connection Failed. Please try again later.')); }
  //       try {
  //         var user = JSON.parse(b);
  //         if(user['status-code'] === 404) {
  //           return callback(new Error('Invalid Secret. Are you sure that ' +
  //             'is the link we provided you with?'));
  //         }
  //         user.twitter = twitter_user;
  //         user.id      = user._id;
  //         user.name    = user.name || twitter_user.name;
  //         var put = {uri: resource, body: user, method: 'PUT', json: true};
  //         request(put, 
  //           function (e,h,b) {
  //             if(e) {
  //               return callback(new Error('Our services are too busy. ' +
  //                 'Please try again later.'));
  //             }
  //             return callback(null,user);
  //         });
  //       } catch(exc) {
  //         return callback(new Error('Something went south! Can you please' + 
  //           ' try again?'));
  //       }
  //     });
  //   }
  //   else {
  //     resource = api.base_url + '/user/by_twitter/' + twitter_user.screen_name;
  //     request.get(resource, function (e,h,b) {
  //       try {
  //         console.log('==')
  //         console.log(b)
  //         console.log('==')
  //         var rows = JSON.parse(b).rows;
  //         if(rows && rows[0] && rows[0].value.twitter.screen_name === twitter_user.screen_name) {
  //           return callback(null,rows[0].value);
  //         }
  //       } catch(exc) { callback(new Error("Please register before trying to use the service")); }
  //       return callback(new Error('You are not registered. Send us an email to register!'));
  //     });
  //   }
  // }
  // 
};