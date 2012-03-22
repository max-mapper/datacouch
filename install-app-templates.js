var request = require('request').defaults({json: true})
var child_process = require('child_process')
var exec = child_process.exec
var spawn = child_process.spawn
var couchapp = require('couchapp')
var path = require('path')

var couch = process.env['DATACOUCH_ROOT']
if (couch[couch.length - 1] !== '/') couch += '/'
var couchapps = couch + 'datacouch-apps'

function getRepos(user, callback) {
  var reposURL = "https://api.github.com/users/" + user + "/repos"
  request(reposURL, function(e,r,b) {
    if (e) return callback(e)
    return callback(false, b)
  })
}

function cloneOrPull(repo, callback) {
  if (path.existsSync('./' + repo.name)) update = exec('(cd ' + repo.name + ' && git pull origin master)')
  else update = spawn('git', ['clone', repo.clone_url])
  update.stdout.on('data', function (data) {
    console.log(data.toString())
  })
  update.stderr.on('data', function (error) {
    console.log(error.toString())
  })
  update.on('exit', function() {
    callback(false)
  })
}

function pushCouchapp(app, target, callback) {
  couchapp.createApp(app, target, function (capp) {
    capp.push(function(resp) { callback(false, resp) })
  })
}

getRepos('burritomaps', function(err, repos) {
  if (err) return console.error('repo fetch error', err)
  repos.forEach(function(repo) {
    cloneOrPull(repo, function(err) {
      if (err) return console.error('clone stderr', err)
      var app = require('./' + repo.name + '/couchapp.js')
      pushCouchapp(app, couchapps, function() {
        console.log("pushed", app._id)
      })
    })
  })
})