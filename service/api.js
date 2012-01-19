var request = require('request')
  , couch = require('couch')
  , qs = require('querystring')
  , filed = require('filed')
  , path = require('path')
  , _ = require('underscore')
  ;

module.exports = function (t) {
  
  function proxyCouch(req, resp) {
    var url = t.couchurl + req.route.splats.join('/') 
    if (req.query) url += "?" + req.query
    request({url: url, json:true}).pipe(resp)
  }
  
  t.route('/api/couch', proxyCouch)
  t.route('/api/couch/*', proxyCouch)
}

