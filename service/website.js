var couch = require('couch')
  , path = require('path')
  , _ = require('underscore')
  , htmldir = path.resolve(__dirname, '..', 'attachments')
  ;
module.exports = function (t) {
  // static files
  // t.route('/favicon.ico').file(path.join(htmldir, 'favicon.ico'))
  // t.route('/favicon.png').file(path.join(htmldir, 'favicon.png'))
  t.route('/').file(path.join(htmldir, 'pages', 'index.html'))
  t.route('/loggedin').file(path.join(htmldir, 'loggedin.html'))

  // t.templates.directory(path.resolve(__dirname, '..', 'templates'))

  t.route('/*').files(htmldir)
}