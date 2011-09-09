var util = function() {

  $.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
      if (o[this.name]) {
        if (!o[this.name].push) {
          o[this.name] = [o[this.name]];
        }
        o[this.name].push(this.value || '');
      } else {
        o[this.name] = this.value || '';
      }
    });
    return o;
  };
  
  function formatDiskSize(bytes) {
    var size = (parseFloat(bytes)/1024/1024).toString().substr(0,4);
    if (size < 1) {
      return "less than 1MB";
    } else {
      return size + "MB";
    }
  }
  
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
  }

  function inURL(url, str) {
    var exists = false;
    if ( url.indexOf( str ) > -1 ) {
      exists = true;
    }
    return exists;
  }
  
  function currentPath() {
    // the current relative path, but loose the leading slash
    // e.g. for http://woo.com/#pizza this would return #pizza
    return $.url(window.location.href).attr('relative').replace('/', '');
  }
  
  function emailToDB(email) {
    return email.replace(/@/ig, "/").replace(/\./ig, "$");
  }
  
  // true if no admins exist in the database
  function isAdminParty( userCtx ) {
    return userCtx.roles.indexOf("_admin") !== -1;
  }
  
  function registerEmitter() {
    var Emitter = function(obj) {
      this.emit = function(obj, channel) { 
        if (!channel) var channel = 'data';
        this.trigger(channel, obj); 
      };
    };
    MicroEvent.mixin(Emitter);
    return new Emitter();
  }
  
  function lookupIcon(word) {
    var params = {
      resource: "http://thenounproject.com/search",
      q: word
    }
    var ajaxOpts = {
      url: "http://jsonpify.heroku.com?" + $.param(params),
      dataType: "jsonp"
    }
    return cachedRequest(ajaxOpts);
  }
  
  function cachedRequest(opts) {
    var dfd = $.Deferred();
    var key = JSON.stringify(opts);
    if (app.cache[key]) {
      dfd.resolve(jQuery.extend(true, {}, app.cache[key]));
    } else {
      var ajaxOpts = $.extend({}, opts);
      $.ajax(ajaxOpts).then(function(data) {
        app.cache[key] = data;
        dfd.resolve(data);
      })
    }
    return dfd.promise();
  }
  
  function listenFor(keys) {
    var shortcuts = { // from jquery.hotkeys.js
      8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
      20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
      37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del", 
      96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
      104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/", 
      112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8", 
      120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
    }
    window.addEventListener("keyup", function(e) { 
      var pressed = shortcuts[e.keyCode];
      if(_.include(keys, pressed)) app.emitter.emit("keyup", pressed); 
    }, false);
  }
  
  function observeExit(elem, callback) {
    var cancelButton = elem.find('.cancelButton');
    app.emitter.on('esc', function() { 
      cancelButton.click();
      app.emitter.clear('esc');
    });
    cancelButton.click(callback);
  }
  
  function show( thing ) {
    $('.' + thing ).show();
    $('.' + thing + '-overlay').show();
  }

  function hide( thing ) {
    $('.' + thing ).hide();
    $('.' + thing + '-overlay').hide();
    if (thing === "dialog") app.emitter.clear('esc'); // todo more elegant solution
  }
  
  function position( thing, elem, offset ) {
    var position = $(elem.target).offset();
    if (offset) {
      if (offset.top) position.top += offset.top;
      if (offset.left) position.left += offset.left;
    }
    $('.' + thing + '-overlay').show().click(function(e) {
      $(e.target).hide();
      $('.' + thing).hide();
    });
    $('.' + thing).show().css({top: position.top + $(elem.target).height(), left: position.left});
  }

  function render( template, target, options ) {
    if ( !options ) options = {data: {}};
    if ( !options.data ) options = {data: options};
    var html = $.mustache( $( "." + template + "Template:first" ).html(), options.data );
    if (target instanceof jQuery) {
      var targetDom = target;
    } else {
      var targetDom = $( "." + target + ":first" );
    }
    if( options.append ) {
      targetDom.append( html );
    } else {
      targetDom.html( html );
    }
    if (template in app.after) app.after[template]();
  }
  
  function notify( message, options ) {
    if (!options) var options = {};
    $('#notification-container').show();
    $('#notification-message').text(message);
    if (!options.loader) $('.notification-loader').hide();
    if (options.loader) $('.notification-loader').show();
    if (!options.persist) setTimeout(function() { $('#notification-container').hide() }, 3000);
  }

  function formatMetadata(data) {
    out = '<dl>';
    $.each(data, function(key, val) {
      if (typeof(val) == 'string' && key[0] != '_') {
        out = out + '<dt>' + key + '<dd>' + val;
      } else if (typeof(val) == 'object' && key != "geometry" && val != null) {
        if (key == 'properties') {
          $.each(val, function(attr, value){
            out = out + '<dt>' + attr + '<dd>' + value;
          })
        } else {
          out = out + '<dt>' + key + '<dd>' + val.join(', ');
        }
      }
    });
    out = out + '</dl>';
    return out;
  }

  function getBaseURL(path) {
    var url = $.url(path);
    var base = url.attr('base');
    // construct correct URL in and out of couchdb vhosts, e.g. http://awesome.com vs. http://localhost:5984/datacouch/_design/datacouch/_rewrite
    if (url.attr('path').indexOf("_rewrite") > 0) base = base + url.attr('path').split('_rewrite')[0] + "_rewrite";
    return base + "/";
  }
  
  var persist = {
    restore: function() {
      $('.persist').each(function(i, el) {
        var inputId = $(el).attr('id');
        if(localStorage.getItem(inputId)) $('#' + inputId).val(localStorage.getItem(inputId));
      })
    },
    save: function(id) {
      localStorage.setItem(id, $('#' + id).val());
    },
    clear: function() {
      $('.persist').each(function(i, el) {
        localStorage.removeItem($(el).attr('id'));
      })
    }
  }
  
  // simple debounce adapted from underscore.js
  function delay(func, wait) {
    return function() {
      var context = this, args = arguments;
      var throttler = function() {
        delete app.timeout;
        func.apply(context, args);
      };
      if (!app.timeout) app.timeout = setTimeout(throttler, wait);      
    };
  };
  
  function resetForm(form) {
    $(':input', form)
     .not(':button, :submit, :reset, :hidden')
     .val('')
     .removeAttr('checked')
     .removeAttr('selected');
  }
  
  function largestWidth(selector, min) {
    var min_width = min || 0;
    $(selector).each(function(i, n){
        var this_width = $(n).width();
        if (this_width > min_width) {
            min_width = this_width;
        }
    });
    return min_width;
  }
  
  function getType(obj) {
    if (obj === null) {
      return 'null';
    }
    if (typeof obj === 'object') {
      if (obj.constructor.toString().indexOf("Array") !== -1) {
        return 'array';
      } else {
        return 'object';
      }
    } else {
      return typeof obj;
    }
  }
  
  function lookupPath(path) {
    var docs = app.apiDocs;
    try {
      _.each(path, function(node) {
        docs = docs[node];
      })
    } catch(e) {
      util.notify("Error selecting documents" + e);
      docs = [];
    }
    return docs;
  }
  
  function nodePath(docField) {
    if (docField.children('.object-key').length > 0) return docField.children('.object-key').text();
    if (docField.children('.array-key').length > 0) return docField.children('.array-key').text();
    if (docField.children('.doc-key').length > 0) return docField.children('.doc-key').text();
    return "";
  }
  
  function selectedTreePath() {
    var nodes = []
      , parent = $('.chosen');
    while (parent.length > 0) {
      nodes.push(nodePath(parent));
      parent = parent.parents('.doc-field:first');
    }
    return _.compact(nodes).reverse();
  }
  
  // TODO refactor handlers so that they dont stack up as the tree gets bigger
  function handleTreeClick(e) {
    var clicked = $(e.target);
    if(clicked.hasClass('expand')) return;
    if (clicked.children('.array').length > 0) {
      var field = clicked;
    } else if (clicked.siblings('.array').length > 0) {
      var field = clicked.parents('.doc-field:first');
    } else {
      var field = clicked.parents('.array').parents('.doc-field:first');
    }
    $('.chosen').removeClass('chosen');
    field.addClass('chosen');
    return false;
  }
  
  var createTreeNode = {
    "string": function (obj, key) {
      var val = $('<div class="doc-value string-type"></div>');
      if (obj[key].length > 45) {
        val.append($('<span class="string-type"></span>')
        .text(obj[key].slice(0, 45)))
        .append(
          $('<span class="expand">...</span>')
          .click(function () {
            val.html('')
            .append($('<span class="string-type"></span>')
              .text(obj[key].length ? obj[key] : "   ")
            )
          })
        )
      }
      else {
        var val = $('<div class="doc-value string-type"></div>');
        val.append(
          $('<span class="string-type"></span>')
          .text(obj[key].length ? obj[key] : "   ")
        )
      }
      return val;
    }
    , "number": function (obj, key) {
      var val = $('<div class="doc-value number"></div>')
      val.append($('<span class="number-type">' + obj[key] + '</span>'))
      return val;
    }
    , "null": function (obj, key) {
      var val = $('<div class="doc-value null"></div>')
      val.append($('<span class="null-type">' + obj[key] + '</span>'))
      return val;
    }
    , "boolean": function (obj, key) {
      var val = $('<div class="fue null"></div>')
      val.append($('<span class="null-type">' + obj[key] + '</span>'))
      return val;
    }
    , "array": function (obj, key, indent) {
       if (!indent) indent = 1;
        var val = $('<div class="doc-value array"></div>')
        $('<span class="array-type">[</span><span class="expand" style="float:left">...</span><span class="array-type">]</span>')
          .click(function (e) {
            var n = $(this).parent();
            var cls = 'sub-'+key+'-'+indent
            n.html('')
            n.append('<span style="padding-left:'+((indent - 1) * 10)+'px" class="array-type">[</span>')
            for (i in obj[key]) {
              var field = $('<div class="doc-field"></div>').click(handleTreeClick);
              n.append(
                field
                  .append('<div class="array-key '+cls+'" >'+i+'</div>')
                  .append(createTreeNode[getType(obj[key][i])](obj[key], i, indent + 1))
                )
            }
            n.append('<span style="padding-left:'+((indent - 1) * 10)+'px" class="array-type">]</span>')
            $('div.'+cls).width(largestWidth('div.'+cls))
          })
          .appendTo($('<div class="array-type"></div>').appendTo(val))
        return val;
    }
    , "object": function (obj, key, indent) {
      if (!indent) indent = 1;
      var val = $('<div class="doc-value object"></div>')
      $('<span class="object-type">{</span><span class="expand" style="float:left">...</span><span class="object-type">}</span>')
        .click(function (e) {
          var n = $(this).parent();
          n.html('')
          n.append('<span style="padding-left:'+((indent - 1) * 10)+'px" class="object-type">{</span>')
          for (i in obj[key]) {
            var field = $('<div class="doc-field"></div>').click(handleTreeClick);
            var p = $('<div class="id-space" style="margin-left:'+(indent * 10)+'px"/>');
            var di = $('<div class="object-key">'+i+'</div>')
            field.append(p)
              .append(di)
              .append(createTreeNode[getType(obj[key][i])](obj[key], i, indent + 1))
            n.append(field)
          }

          n.append('<span style="padding-left:'+((indent - 1) * 10)+'px" class="object-type">}</span>')
          di.width(largestWidth('div.object-key'))
        })
        .appendTo($('<div class="object-type"></div>').appendTo(val))
      return val;
    }
  }

  function renderTree(doc) {
    var d = $('div#document-editor');
    for (i in doc) {
      var field = $('<div class="doc-field"></div>').click(handleTreeClick);
      $('<div class="id-space" />').appendTo(field);    
      field.append('<div class="doc-key doc-key-base">'+i+'</div>')
      field.append(createTreeNode[getType(doc[i])](doc, i));
      d.append(field);
    }

    $('div.doc-key-base').width(largestWidth('div.doc-key-base'));
  }
  
  function showDatasets(name) {
    var url = app.baseURL + "api/datasets/";

    // If a name is passed in, then add it to the url
    if (name) {
      url += name;
    
    // No name was passed in, so we're looking at the global
    // data sets feed
    } else {
      name = "Recent Datasets";
    }
    return couch.request({url: url}).then(function(resp) {
      var datasets = _.map(resp.rows, function(row) {
        return {
          baseURL: app.baseURL + 'edit#/',
          id: row.id,
          user: row.doc.user,
          gravatar_url: row.doc.gravatar_url,
          size: util.formatDiskSize(row.doc.disk_size),
          name: row.value,
          date: row.doc.createdAt,
          nouns: row.doc.nouns,
          forkedFrom: row.doc.forkedFrom,
          forkedFromUser: row.doc.forkedFromUser,
          count: row.doc.doc_count - 1 // TODO calculate this programatically
        };
      })
      
      if (datasets.length > 0) {
        util.render('datasets', 'datasetsContainer', {
          loggedIn: function() { 
            return app.session && app.session.userCtx.name 
          },
          name: name,
          datasets: datasets
        });      
      } else {
        couch.request({url: app.baseURL + "api/users/" + name}).then(
          function(res) { util.render('datasets', 'datasetsContainer', {name: name}) }
        , function(err) { util.render('noUser', 'datasetsContainer', {name: name}) }
        )
      }
    })
  }

  function showTrendingsets(name) {
    var url = app.baseURL + "api/trending";

    return couch.request({url: url}).then(function(resp) {
      var datasets = _.map(resp.rows, function(row) {
        return {
          baseURL: app.baseURL + 'edit#/',
          id: row.id,
          user: row.doc.user,
          gravatar_url: row.doc.gravatar_url,
          size: util.formatDiskSize(row.doc.disk_size),
          name: row.doc.name,
          date: row.doc.createdAt,
          nouns: row.doc.nouns,
          forkedFrom: row.doc.forkedFrom,
          forkedFromUser: row.doc.forkedFromUser,
          count: row.doc.doc_count - 1 // TODO calculate this programatically
        };
      })
      
      if (datasets.length > 0) {
        util.render('datasets', 'trendingSetsContainer', {
          loggedIn: function() {return app.session && app.session.userCtx.name },
          datasets: datasets,
          name: "Trending Datasets"
        });      
      }
    })
  }
  
  function routeViews( route ){

    var fullRoute = route;
    
    if( !route.length ) {
      app.routes.pages[ 'home' ]();
    }

    // If we've made it this far, then the ID (if one exists) will be
    // what comes after the slash
    id = route.split('/')[1];
    
    // If there is an Id, then we have to trim it off the route
    if(id){
      route = route.split('/')[0];
    }
    
    // If "#" is in the route, and it's the first char, then we are dealing with
    // a modal, we're going to route it through the views modals object
    if( route.indexOf( '#' ) === 0 ) {
      route = route.replace('#', '');
      app.routes.modals[ route ]( id );

    // Otherwise, it's a page, and we're going to route it through the
    // views pages object, and pushState
    } else {
      
      if( route === "/" ) {
        history.pushState({route: "home"}, "wee", '/'); 
        app.routes.pages[ 'home' ]();
        return;
      }

      history.pushState({route: "user", id: id}, "woo", '/' + fullRoute); 
      app.routes.pages[ 'user' ]( id );
      
    }
  }
  
  function formatProperties( properties ) {
    var data = {properties: []};
    _.each(_.keys(properties), function(prop) {
      if (_.include(["name", "description", "source", "nouns", "apps"], prop)) {
        data[prop] = properties[prop];
      }
    }) 
    if(properties.nouns) data.hasNouns = true;
    if(properties.hits) data.properties.push({key:'Unique Visitors', value: properties.hits});
    if(properties.createdAt) data.properties.push({key:'Created', value: properties.createdAt});
    if(properties.statsGenerated) data.properties.push({key:'Updated', value: properties.statsGenerated});
    return data;
  }
  
  // transform couch _attachment objects into file trees that are compatible with the Nide editor
  function mergeFileTree(arr, obj, attachments, ddocPath) {
    var x = arr.shift();
    if (typeof obj["children"][x] === "undefined") {
      obj["children"][x] = {"children": {}};
    } 
    if(arr.length > 0) {
      util.filePath.push(x);
      var currentPath = util.filePath.join("/");
    } else {
      if (util.filePath.length > 0) {
        var currentPath = util.filePath.join("/") + "/" + x;
      } else {
        var currentPath = x;
      }
    }
    obj["children"][x].path = ddocPath + "/" + currentPath;
    if (attachments[currentPath]) {
      obj["children"][x].type = "file";
      obj["children"][x].name = x;
    } else {
      obj["children"][x].type = "directory";
      obj["children"][x].name = _.last(util.filePath);
    }
    if (arr.length > 0) {
      mergeFileTree(arr, obj["children"][x], attachments, ddocPath);
    }
  }
  
  function getDDocFiles(ddocPath) {
    var dfd = $.Deferred();
    couch.request({url: app.dbPath + ddocPath}).then(function(ddoc) {
      app.ddocs[ddoc._id] = ddoc;
      var folder = {
        "name": "",
        "type": "directory",
        "path": ddocPath,
        "children": {}
      }
      _.each(_.keys(ddoc._attachments), function(file) {
        util.filePath = [];
        util.mergeFileTree(file.split('/'), folder, ddoc._attachments, ddocPath)
      })
      dfd.resolve(folder);
    })
    return dfd.promise();
  }
  
  function addHTMLElementForFileEntry(entry, parentElement) {
    var thisElement = document.createElement("li");
    app.fileHtmlElementByPath[entry.path] = thisElement

    if (app.fileEntriesArray) {
      app.fileEntriesArray.push(entry)
    }

    if (entry.type == "directory") {
      thisElement.className = 'folder'
      if (app.stateByPath[entry.path] == 'open') {
        thisElement.className += ' open'
      }
      thisElement.innerHTML = '<img src="/images/folder.png">' + entry.name;
      $(thisElement).click(function(e) {
        if (!e.offsetX) e.offsetX = e.clientX - $(e.target).position().left;
        if (!e.offsetY) e.offsetY = e.clientY - $(e.target).position().top;
        if (e.target == thisElement && e.offsetY < 24) {
          if (e.offsetX < 24) {
            $(this).toggleClass('open');
            app.stateByPath[entry.path] = $(this).hasClass('open') ? 'open' : '';
          } else {
            $('.right-panel').html(codeEditor(entry));
          }
        }
      })
      var ul = document.createElement("ul")
      thisElement.appendChild(ul)
      for (var childEntry in entry.children) {
        addHTMLElementForFileEntry(entry.children[childEntry], ul)
      }
    } else {
      thisElement.innerHTML = '<img src="/images/file.png">' + entry.name;
      $(thisElement).click(function(e) {
        $('.right-panel').html(codeEditor(entry));
      })
    }
    if (entry.name.charAt(0) == '.') {
      thisElement.className += ' hidden'
    }
    parentElement.appendChild(thisElement)
  }
  
  function saveFile(file, content) {
    var dfd = $.Deferred();
    
    var path = _.rest(file.split('/'))
      , ddoc = path.splice(0,2).join('/')
      , attachment = path.join('/')
      ;
    $.ajax({
       type: "PUT",
       contentType: app.ddocs[ddoc]._attachments[attachment].content_type,
       headers: {"Accept":"application/json"},
       url: app.dbPath + "/" + ddoc + "/" + attachment + "?rev=" + app.ddocs[ddoc]._rev,
       data: content,
       dataType:"json"
     }).then(function(resp) {
       app.ddocs[ddoc]._rev = resp.rev;
       dfd.resolve(resp);
     }, dfd.reject);
     return dfd.promise();
  }
  
  function codeEditor(entry) {
    if(entry.type !== "file") return;
    var codeMirror;
    var editor = document.createElement('div')
    var versionEditors = []
    var actionsBar = document.createElement('div')
    actionsBar.className = 'actions'
    actionsBar.innerHTML = '<b>' + entry.path + '</b> '
    var renameButton = document.createElement('button')
    renameButton.innerHTML = 'Rename'
    $(renameButton).click(function(e) {
      var newName = prompt('New filename:', entry.name)
      if (newName) {
        renameFile(entry.path, entry.path.replace(/\/[^\/]+$/, '/' + newName))
      }
    })
    actionsBar.appendChild(renameButton)
    editor.appendChild(actionsBar)
    editor.className = 'code-editor'
    $.ajax({dataType: "text", url: app.dbPath + entry.path}).then(
      function(file) {
        codeMirror = CodeMirror(editor, {
          value: file,
          mode: "javascript",
          lineNumbers: true,
          onChange: function(editor) {
            $('.selected').addClass('syncing');
            content = editor.getValue()
            changed = true
          }
        });
  
        var content = file
        var changed = false;
        var saving = false;
  
        setInterval(function() {
          if (changed && !saving) {
            var done = false;
            saving = true;
            var selected = $('.selected')
            saveFile(entry.path, content).then(function(resp){
              if (resp.ok) {
                changed = false
                done = true;
                selected.removeClass('syncing')
              }
              saving = false
            })
            setTimeout(function() {
              if (!done) {
                saving = false
              }
            }, 8000)
          }
        }, 3000)
      },
      function(err) { console.log('err!', err) }
    )
    return editor;
  }
  
  function addApp(ddoc, id) {
    var docURL = app.baseURL + "api/" + id;
    couch.request({url: docURL}).then(function(doc) {
      if(!doc.apps) doc.apps = [];
      if(_.detect(doc.apps, function(appEntry) { return appEntry.ddoc === ddoc })) {
        util.hide('dialog');
        util.notify('That app is already installed')
      } else {
        doc.apps.push({ddoc: ddoc});
        couch.request({url: docURL, type: "PUT", data: JSON.stringify(doc)}).then(function(resp) {
          var dbName = id + "/_design/" + ddoc;
          function waitUntilExists(url) {
            couch.request({url: url, type: "HEAD"}).then(
              function(resp, status) {
                couch.request({url: app.baseURL + "api/" + id}).then(function(datasetInfo) {
                  util.hide('dialog');
                  app.datasetInfo = datasetInfo;
                  app.routes.tabs['apps']();
                })
              },
              function(resp, status){
                console.log("not created yet...", resp, status);
                setTimeout(function() {
                  waitUntilExists(url);
                }, 500);
              }
            )
          }
          util.render('busy', 'dialog-content', {message: "Installing app..."});
          waitUntilExists(couch.rootPath + "api/couch/" + dbName);
        })
      }
    })
  }
  
  return {
    inURL: inURL,
    currentPath: currentPath,
    formatDiskSize: formatDiskSize,
    capitalize: capitalize,
    emailToDB: emailToDB,
    isAdminParty: isAdminParty,
    registerEmitter: registerEmitter,
    cachedRequest: cachedRequest,
    lookupIcon: lookupIcon,
    listenFor: listenFor,
    show: show,
    hide: hide,
    position: position,
    render: render,
    notify: notify,
    observeExit: observeExit,
    formatMetadata:formatMetadata,
    getBaseURL:getBaseURL,
    resetForm: resetForm,
    delay: delay,
    persist: persist,
    lookupPath: lookupPath,
    selectedTreePath: selectedTreePath,
    renderTree: renderTree,
    showDatasets: showDatasets,
    showTrendingsets: showTrendingsets,
    routeViews: routeViews,
    formatProperties: formatProperties,
    mergeFileTree: mergeFileTree,
    getDDocFiles: getDDocFiles,
    addHTMLElementForFileEntry: addHTMLElementForFileEntry,
    codeEditor: codeEditor,
    addApp: addApp
  };
}();