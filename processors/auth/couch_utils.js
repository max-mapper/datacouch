var couch         = process.env['DATACOUCH_ROOT']
  , couchVhost    = process.env['DATACOUCH_VHOST']
  , crypto  = require('crypto')
  , request = require('request')
  , url     = require('url')
  , qs      = require('querystring')
  , _       = require('underscore')
  , h       = {"Content-type": "application/json", "Accept": "application/json"}
  ;

module.exports = function() {

  function couchUserDoc(userData) {
    var salt = crypto.randomBytes(16).toString('hex')
      , password = crypto.randomBytes(16).toString('hex')
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
        if(e || (b && b.error)) throw new Error(url + " - " + JSON.stringify(b) + '-' + JSON.stringify(e));
        callback(_.extend({}, userData
          , { _id: b.id
            , _rev: b.rev
        }))
      }
    )
  }

  function waitForStatusCode(url, statusCode, callback) {
    var start = new Date();
    (function headRequest() {
      request.head(url
        , function(e,r,b) {
          if( (new Date() - start) > 5000 ) callback(true, {"statusCode": r.statusCode})
          if(r.statusCode !== statusCode) {
            setTimeout(function() {
              headRequest(url);
            }, 100)
          } else {
            callback(false, {"statusCode": statusCode})
          }
        })
    }())
  }

  return {
    couchUserDoc: couchUserDoc,
    couchProfile: couchProfile,
    logUserIn: logUserIn,
    getOrCreate: getOrCreate,
    getDoc: getDoc,
    createDoc: createDoc,
    waitForStatusCode: waitForStatusCode
  }
}()
