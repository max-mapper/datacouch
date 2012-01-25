(function($) {

  window.couch = { dbPath: "", rootPath: "/" };

  couch.defaults = {
    headers: {"Accept":"application/json"},
    dataType: "json",
    contentType: "application/json",
    type: "GET",
    url: "/"
  };  
  
  couch.errors = {
    forbidden: "You aren't allowed to do that."
  }
  
  couch.responseError = function(response) {
    if(!response) return false;
    if(_.isArray(response) && (response.length > 0) ) response = response[0];
    if (response.error) return couch.errors[response.error];
  }

  couch.request = function(opts) {
    var ajaxOpts = $.extend({}, couch.defaults, opts)
      , dfd = $.Deferred()
      ;
      
    $.ajax(ajaxOpts).then(
      function(successResponse) {
        var error = couch.responseError(successResponse);
        if (error) app.emitter.emit(error, 'error');
        dfd.resolve(successResponse);
      }, 
      function(errorResponse) {
        if(ajaxOpts.type !== "HEAD") app.emitter.emit("Fatal XHR Error", 'error');
        dfd.reject(errorResponse);
      }
    )
    
    return dfd.promise();
  }
  
  couch.get = function(path, opts) {
    if (!opts) opts = {data: {}};
    _.each(_.keys(opts.data), function(k) {
      opts.data[k] = JSON.stringify(opts.data[k]);
    })
    return couch.request($.extend({}, {url: couch.dbPath + path, type: "GET"}, opts));
  }
  
  couch.login = function(credentials) {
    return couch.request({
      url: couch.rootPath + "_session",
      type: 'POST',
      data: JSON.stringify(credentials)
    })
  }
  
  couch.logout = function() {
    return couch.request({url: couch.rootPath + "_session", type: 'DELETE'});
  }
  
  couch.session = function() {
    return couch.request({url: couch.rootPath + "_session"});    
  }
  
  couch.userDb = function() {
    var dfd = $.Deferred();
    function resolve(session) { return dfd.resolve(couch.db(couch.rootPath + session.info.authentication_db)) }
    if (app.session) { resolve(app.session) }
    couch.session().then(function(session) { resolve(session) })
    return dfd;
  }

  couch.db = function(uri) {
    return {
      name: name,
      uri: uri + "/",

      get: function(id) {
        return couch.request({url:this.uri + id, type:"GET"});
      },

      save: function(doc) {
        if (doc._id === undefined) {
          var type = "POST";
          var uri = this.uri;
        } else {
          var type = "PUT";
          var uri = this.uri + encodeURIComponent(doc._id);
        }
        return couch.request({url:uri, type:type, data:JSON.stringify(doc)});
      },

      designDocs: function(opts) {
        return couch.request($.extend(couch.defaults, {
          url: this.uri + "_all_docs",
          data: {startkey:'"_design/"', endkey:'"_design0"', include_docs:true}
        }));
      }

    };
  };

})(jQuery);