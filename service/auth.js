var tako = require('tako')
  , couch = require('couch')
  , _ = require('underscore')
  , request = require('request')
  , jsonreq = request.defaults({json:true})
  , qs = require('querystring')
  ;

module.exports = function (t) {

  var users = couch(t.couchurl + 'datacouch-users')
  var sessions = couch(t.couchurl + 'datacouch-sessions')
  
  function setCookie (id, resp) {
    var twoWeeks = new Date(new Date().getTime()+1209726000).toUTCString()
    resp.setHeader('set-cookie', ['DatacouchToken='+id + '; Version=1; Path=/; HttpOnly; Expires=' + twoWeeks])
    resp.setHeader('x-datacouch-token', id)
  }
  
  function parseCookies(cookie) {
    var cookies = {}
    cookie.split(';').forEach(function( cookie ) {
      var parts = cookie.split('=')
      cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim()
    })
    return cookies
  }
  
  function extractToken(req) {
    if (req.headers.cookie) {
      var cookies = parseCookies(req.headers.cookie)
      if (cookies['DatacouchToken']) return cookies['DatacouchToken']
    }
    if (req.headers['x-datacouch-token']) return req.headers['x-datacouch-token']
    if (req.qs && req.qs.token) return req.qs.token
  }
  
  function Session (obj) {
    for (i in obj) this[i] = obj[i]
  }
  
  Session.prototype.twitterOAuth = function () {
    var oauth = 
      { consumer_key: t.twitterKey
      , consumer_secret: t.twitterSecret
      }
    return oauth
  }
    
  Session.prototype.requestTwitterToken = function (cb) {
    var oauth = _.extend({callback: this.callback}, this.twitterOAuth())
      , url = 'http://api.twitter.com/oauth/request_token'    
      , self = this
      ;
    request.post({url:url, oauth:oauth}, function (e, r, body) {
      if (e) return cb(e)
      if (r.statusCode !== 200) {
        e = new Error(body)
        e.statusCode = r.statusCode
        return cb(e)
      }
      var t = qs.parse(body) 
      if (!self.twitter) self.twitter = {}
      self.twitter.request_token = t
      self.save(cb)
    })
  }
  
  Session.prototype.verifyTwitterToken = function (params, cb) {
    var self = this
      , oauth = _.extend({
          token: this.twitter.request_token.oauth_token
        , verifier: params.oauth_verifier
        , token_secret: this.twitter.request_token.oauth_token_secret
      }, self.twitterOAuth())
      , url = 'https://api.twitter.com/oauth/access_token'
      ;
    request.post({url:url, oauth:oauth}, function (e, r, body) {
      if (e) return cb(e)
      if (r.statusCode !== 200) {
        e = new Error(body)
        e.statusCode = r.statusCode
        return cb(e)
      }
      var t = qs.parse(body)
      self.setTwitterToken(t, cb)
    })
  }
  
  Session.prototype.setTwitterToken = function (t, cb) {
    var self = this;
    var url = 'https://api.twitter.com/1/users/show.json?'
      , params = 
        { screen_name: t.screen_name
        , user_id: t.user_id
        }
    url += qs.stringify(params)
    self.twitter.token = t
    jsonreq({url:url, oauth:self.twitterOAuth()}, function (e, resp, body) {
      if (e) return cb(e)
      if (resp.statusCode !== 200) {
        e = new Error(body)
        e.statusCode = resp.statusCode
        return cb(e)
      }
      users.atomic(body.screen_name, "twitter", body, function(err, resp) {
        console.log('atomic', err, resp)
      })
      self.save(cb)
    })
  }
  
  Session.prototype.save = function (cb) {
    var self = this
    sessions.post(self, function (e, info) {
      self._id = info.id
      self._rev = info.rev
      self.callback = t.vhosturl + 'api/twitter/callback/' + self._id
      cb(e, self)
    })
  }
  
  Session.prototype.redirect = function (location, resp) {
    var self = this;
    resp.statusCode = 302
    resp.setHeader('location', location)
    console.log(location)
    setCookie(self._id, resp)
    resp.end()
  }
  
  function session (obj, cb) {
    if (!obj) obj = {}
    if (obj._id) return sessions.getCached(obj._id, function (e, doc) { cb(e, new Session(doc)) })
    else new Session(obj).save(cb)
  }
  
  t
    .route('/api/twitter/login', function (req, resp) {
      session(req.user, function (err, session) {
        if (err) return resp.error(err)
        session.requestTwitterToken(function (e) {
          if (e) return resp.error(e)
          var u = 'http://api.twitter.com/oauth/authorize?oauth_token=' + 
                  session.twitter.request_token.oauth_token
          resp.statusCode = 302
          resp.setHeader('location', u)
          setCookie(session._id, resp)
          resp.end()
        })
      })
    })
  
  t
    .route('/api/twitter/callback/:id', function (req, resp) {
      session({_id:req.params.id}, function (e, session) {
        if (e) return resp.error(e)
        session.verifyTwitterToken(req.qs, function (e) {
          if (e) return resp.error(e)
          session.redirect(t.vhosturl + 'loggedin', resp)
        })
      })
    })
  
  t
    .route('/api/profile', function (req, resp) {
      var user = req.user.twitter.token.screen_name
      jsonreq(users.url + user).pipe(resp)
    })
    .must('auth')
  
  t
    .route('/api/logout', function (req, resp) {
      if (sessions.cache) delete sessions.cache[req.user._id]
      sessions.post(_.extend(req.user, {_deleted: true}), function(err) {
        if(err) console.error(err)
      })
      setCookie('', resp)
      resp.setHeader('content-type', 'application/json')
      resp.end(JSON.stringify({ok: true, status: 'Logged out successfully'}))
    })
    .must('auth')

  t
    .auth(function (req, resp, cb) {
      var userToken = extractToken(req)
      if (userToken) {
        session({_id:userToken}, function (e, sessionDoc) {
          if (e) return cb(null) // If there is no token it may be expired or invalid
          cb(sessionDoc)
        })
      } else {
        cb(null)
      }
    })
}