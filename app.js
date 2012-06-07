var path = require('path')
var tako = require('tako')
var filed = require('filed')
var gist = require('gist')
var request = require('request')
var qs = require('querystring')
var flatdb = require('flatdb')
var https = require('https')

var htmldir = path.resolve(__dirname, 'attachments')

var t = tako()

var options = {
  clientID: process.env['GITHUB_KEY'],
  clientSecret: process.env['GITHUB_SECRET'],
  callbackURL: process.env['VHOST'] + "/githuboauthcallback"
}

t.route('/', function (req, resp) {
  filed(path.join(htmldir, 'index.html')).pipe(resp)
})

t.route('/me', function (req, resp) {
  resp.setHeader('content-type', 'application/json')
  resp.end(JSON.stringify(req.user))
}).must('auth')

t.route('/logout', function (req, resp) {
  setCookie('', resp)
  resp.statusCode = 302
  resp.setHeader('location', process.env['VHOST'])
  resp.end()
})
  
t.route('/githuboauth', function (req, resp) {
  var u = 'https://github.com/login/oauth/authorize'
      + '?client_id=' + options.clientID
      + '&redirect_uri=' + options.callbackURL
      + '&scope=user,public_repo,repo,gist'
  resp.statusCode = 302
  resp.setHeader('location', u)
  resp.end()
})

t.route('/githuboauthcallback', function (req, resp) {
  var reqBody = { 
    client_id: options.clientID,
    client_secret: options.clientSecret,
    redirect_uri: options.callbackURL,
    code: req.qs.code
  }
  request.post({
      uri: 'https://github.com/login/oauth/access_token',
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "accept": "application/json"
      },
      body: qs.encode(reqBody)
    }, 
    function (e, r, body) {
      resp.statusCode = 200
      var data = JSON.parse(body)
      if (data.error) return resp.end(JSON.stringify(data))
      var token = data.access_token
      setCookie(token, resp)
      saveUser(token, resp)
    }
  )
})

t.route('/*').files(htmldir)

t.auth(function(req, resp, cb) {
  var token = extractToken(req)
  if (!token) return cb(null)
  getDB('users', function(err, db) {
    db.find({token: token}, function(err, docs) {
      if (err) return cb(null)
      if (!docs || docs.length === 0) return cb(null)
      cb(docs[0])
    })
  })
})

function getProfile(token, cb) {
  return request('https://api.github.com/user?' + qs.stringify({access_token: token}))
}

function saveUser(token, resp) {
  getDB('users', function(err, db) {
    db.save({token: token}, function(err) {
      if (err) {
        resp.statusCode = 500
        return resp.end('error saving user')
      }
      resp.statusCode = 302
      resp.setHeader('location', process.env['VHOST'])
      resp.end()
    })
  })
}

function getDB(name, cb) {
  if (!t.dbs) t.dbs = {}
  if (t.dbs[name]) return cb(null, t.dbs[name])
  var db = new flatdb(name)
  db.on('connect', function() {
    t.dbs[name] = db
    cb(null, db)
  })
}

function setCookie(id, resp) {
  var twoWeeks = new Date(new Date().getTime()+1209726000).toUTCString()
  resp.setHeader('set-cookie', ['Token='+id + '; Version=1; Path=/; HttpOnly; Expires=' + twoWeeks])
  resp.setHeader('x-token', id)
}

function extractToken(req) {
  if (req.headers.cookie) {
    var cookies = parseCookies(req.headers.cookie)
    if (cookies['Token']) return cookies['Token']
  }
  if (req.headers['x-token']) return req.headers['x-token']
  if (req.qs && req.qs.token) return req.qs.token
  return false
}

function parseCookies(cookie) {
  var cookies = {}
  cookie.split(';').forEach(function( cookie ) {
    var parts = cookie.split('=')
    cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim()
  })
  return cookies
}

t.httpServer.listen(8000, function () {
  console.log('dun runnin')
})