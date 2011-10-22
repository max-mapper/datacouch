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
  
var mock_response =   {
  "default_profile": false,
  "contributors_enabled": false,
  "profile_use_background_image": true,
  "protected": false,
  "id_str": "12241752",
  "time_zone": "Alaska",
  "profile_background_color": "000000",
  "name": "max ogden",
  "profile_background_image_url": "http://a2.twimg.com/profile_background_images/302423430/yqcK2.gif",
  "profile_image_url_https": "https://si0.twimg.com/profile_images/1507010845/Screen_Shot_2011-08-18_at_5.08.05_PM_normal.png",
  "default_profile_image": false,
  "following": null,
  "utc_offset": -32400,
  "profile_image_url": "http://a3.twimg.com/profile_images/1507010845/Screen_Shot_2011-08-18_at_5.08.05_PM_normal.png",
  "description": "hacking the perpetual gibson. currently at Code for America",
  "show_all_inline_media": false,
  "geo_enabled": true,
  "friends_count": 318,
  "profile_text_color": "000000",
  "location": "san francisco",
  "is_translator": false,
  "profile_sidebar_fill_color": "b5e8fc",
  "status": {
    "in_reply_to_user_id_str": "1623",
    "retweet_count": 0,
    "in_reply_to_status_id": null,
    "id_str": "113755784583716864",
    "contributors": null,
    "truncated": false,
    "geo": null,
    "coordinates": null,
    "favorited": false,
    "in_reply_to_user_id": 1623,
    "in_reply_to_screen_name": "jchris",
    "possibly_sensitive": false,
    "retweeted": false,
    "source": "web",
    "in_reply_to_status_id_str": null,
    "id": 113755784583716860,
    "place": null,
    "text": "@jchris check this talk out http://t.co/AWU63bw",
    "created_at": "Tue Sep 13 23:27:47 +0000 2011"
  },
  "follow_request_sent": null,
  "profile_background_tile": true,
  "profile_background_image_url_https": "https://si0.twimg.com/profile_background_images/302423430/yqcK2.gif",
  "url": "http://www.maxogden.com",
  "statuses_count": 2038,
  "followers_count": 1685,
  "screen_name": "maxogden",
  "notifications": null,
  "profile_link_color": "17c6ee",
  "lang": "en",
  "verified": false,
  "favourites_count": 8,
  "profile_sidebar_border_color": "70D4F3",
  "id": 12241752,
  "listed_count": 172,
  "created_at": "Mon Jan 14 23:11:21 +0000 2008"
}

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
    var data = _.extend(util.couchUserDoc(mock_response)
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
        if(e) throw new Error(e);
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