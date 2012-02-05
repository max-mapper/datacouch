var request = require('request')
  , qs = require('querystring')
  , filed = require('filed')
  , path = require('path')
  , url = require('url')
  , _ = require('underscore')
  , BufferedStream = require('morestreams').BufferedStream
  , opts = require('./defaults')()

module.exports = function (t, rewrites, options) {
  if (options) _.extend(opts, options)

  function resolveSymbols(to, params, query) {
    _.each(params, function(val, param) {
      to = to.replace(':' + param, val)
      if (query) {
        _.each(query, function(queryVal, queryKey) {
          function replaceSymbol(input) {
            if (!_.isString(input)) return input
            return input.replace(':' + param, val)
          }
          var newVal = _.isArray(queryVal) ? _.map(queryVal, replaceSymbol) : replaceSymbol(queryVal)
          query[queryKey] = newVal
        })
      }
    })
    return to
  }
  
  function createProxy(req, resp, opts, stream) {
    var proxy = request(opts)
    req.pipe(proxy)
    if (stream) {
      stream.pipe(proxy)
      stream.resume()
    }
    proxy.pipe(resp)
  }
  
  function route(rewrite, callback) {
    t.route(rewrite.from, function(req, resp) {
      if (!rewrite.before) return callback(req, resp)
      
      var stream = new BufferedStream
      stream.pause()
      req.pipe(stream)
      
      rewrite.before(req, resp, function(err) {
        if (err) res.end(err)
        else callback(req, resp)
      })
    })
  }
  
  function proxyFile(rewrite, req, resp) {
    route(rewrite, function(req, resp) {
      filed(path.resolve(opts.attachments, rewrite.to)).pipe(resp)
    })
  }
  
  function proxyRequest(rewrite) {
    route(rewrite, function(req, resp, stream) {
      var to = rewrite.to
        , query = _.extend({}, rewrite.query)
      if (req.route.splats) to = to.replace('*', req.route.splats.join('/'))
      if (req.query) _.extend(query, qs.parse(req.query))
      if (req.route.params) to = resolveSymbols(to, req.route.params, query)
      if (query.key) query.key = JSON.stringify(query.key)
      if (query.startkey) query.startkey = JSON.stringify(query.startkey)
      if (query.endkey) query.endkey = JSON.stringify(query.endkey)
      if (_.keys(query).length) to += "?" + qs.stringify(query)
      var opts = {url: to}
      if (rewrite.json) opts.json = rewrite.json
      createProxy(req, resp, opts, stream)
    })
  }
  
  function proxyCouch(rewrite) {
    proxyRequest(_.extend({}, rewrite, {
      to: opts.ddoc + rewrite.to,
      json: true
    }))
  }
  
  function flattenRewrites(rewrites) {
    var flattened = []
    _.each(rewrites, function(rewrite) {
      if (rewrite.rewrites) {
        _.each(rewrite.rewrites, function(subRewrite) {
          flattened.push(_.extend({}, subRewrite, {before: rewrite.before}))
        })
      } else {
        flattened.push(rewrite)
      }
    })
    return flattened
  }
  
  _.each(flattenRewrites(rewrites), function(rewrite) {
    var to = rewrite.to
      , protocol = url.parse(to).protocol
    if (_.first(to) === "/") to = _.rest(to).join('')
    if (_.first(to) === '_') return proxyCouch(rewrite)
    if (protocol && protocol.match(/https?/i)) return proxyRequest(rewrite)
    else return proxyFile(rewrite)
  })

  t.route('/*').files(opts.attachments)
}

