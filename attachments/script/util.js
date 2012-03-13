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

  // true if no admins exist in the database
  function isAdminParty( userCtx ) {
    // return !_.include(userCtx.roles, "_admin");
    return userCtx.roles.indexOf("_admin") !== -1;
  }
  
  function loggedIn() {
    return app.profile && app.profile._id
  }
  
  function catchModals( route ) {
    if(!route) return;
    // Trim off the #/ from the beginning of the route if it exists
    route = route.replace('#/', '');
    
    /*
      Basic rules:
        * If the href ends with a bang (!) we're going to launch a modal
        * Otherwise, we're going to pass it through to SugarSkull
    */

    if( route && route.indexOf( '!' ) === ( route.length -1 ) ) {

      route = route.substr(0, route.lastIndexOf('!'));

      // The ID (if one exists) will be what comes after the slash
      var id = route.split('/')[1];

      // If there is an ID, then we have to trim it off the route
      if (id) {
        route = route.split('/')[0];
      }

      if(route in app.routes.modals) app.routes.modals[ route ](id);

      event.preventDefault();

    }

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

  function geocode(query, type, callback) {
    var types = {
      google: function(query) {
        var geocoder = new google.maps.Geocoder()
        geocoder.geocode({
          address: query
        }, function(locResult) {
          var lat = locResult[0].geometry.location.lat()
            , lng = locResult[0].geometry.location.lng()
          callback({type: "Point", coordinates: [lng, lat]})
        });
      },
      yahoo: function(query) {
        var url = 'http://query.yahooapis.com/v1/public/yql?format=json&q=select * from geo.placefinder where text="'
          + encodeURIComponent(query) + '"';
        $.ajax({
          url: url,
          dataType: "jsonp"
        }).then(function(response) {
          var lat = response.query.results['Result'].latitude
            , lng = response.query.results['Result'].longitude
          callback({type: "Point", coordinates: [lng, lat]})
        })
      }
    }
    types[type](query);
  }
  
  function cachedRequest(opts) {
    if (!app.cache.promises) app.cache.promises = {};
    var dfd = $.Deferred();
    var key = JSON.stringify(opts);
    if (app.cache[key]) {
      dfd.resolve(jQuery.extend(true, {}, app.cache[key]));
      return dfd.promise();
    } else if (app.cache.promises[key]) {
      return app.cache.promises[key]();
    } else {
      var ajaxOpts = $.extend({}, opts);
      $.ajax(ajaxOpts).then(function(data) {
        app.cache[key] = data;
        dfd.resolve(data);
      })
      app.cache.promises[key] = dfd.promise;
      return dfd.promise();
    }
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

  function render( template, target, data ) {
    if (! (target instanceof jQuery)) target = $( "." + target + ":first" );
    target.html( $.mustache( $( "." + template + "Template:first" ).html(), data || {} ) );
    if (template in app.after) app.after[template]();
  }

  function notify( message, options ) {
    if (!options) var options = {};
    if (!options.showFor) options.showFor = 3000;
    $('#notification-container').show();
    $('#notification-message').text(message);
    if (!options.loader) $('.notification-loader').hide();
    if (options.loader) $('.notification-loader').show();
    if (!options.persist) setTimeout(function() { $('#notification-container').hide() }, options.showFor);
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
  
  function waitFor(condition, callback) {
    condition().then(
      callback,
      function(resp, status){
        console.log("not yet...", resp, status);
        setTimeout(function() {
          waitFor(condition, callback);
        }, 500);
      }
    )
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
    
    if (name) {
      url += name;
    }
    
    return fetchDatasets(url).then(function(datasets) {
      if (datasets.length > 0) {
        util.render('datasetsList', 'datasetsContainer', {name: name})
        util.render('datasets', 'datasets-wrapper', {
          name: name,
          datasets: datasets
        });
      } else {
        util.render('datasetsList', 'datasetsContainer')
        couch.request({url: app.baseURL + "api/users/" + name }).then(
          function(res) { util.render('datasets', 'datasets-wrapper', {name: name}) }
        , function(err) { util.render('noUser', 'datasets-wrapper', {name: name}) }
        )
      }
    })
  }
  
  function fetchDatasets(url, offset) {
    var dfd = $.Deferred();
    if (!offset) offset = 0;
    couch.request({url: url + '?limit=20&skip=' + offset}).then(function(resp) {
      app.lastOffset = resp.offset;
      var datasets = _.map(resp.rows, function(row) {
        return {
          baseURL: app.baseURL + 'edit#/',
          id: row.id,
          user: row.doc.user,
          avatar: row.doc.avatar,
          size: util.formatDiskSize(row.doc.disk_size),
          name: row.value,
          date: row.doc.createdAt,
          description: row.doc.description,
          nouns: row.doc.nouns,
          forkedFrom: row.doc.forkedFrom,
          forkedFromUser: row.doc.forkedFromUser,
          count: row.doc.doc_count
        };
      })
      dfd.resolve(datasets);
    })
    return dfd.promise();
  }

  function showApps(name) {
    var url = app.baseURL + "api/applications";
    if (name) url += "/user/" + name;
    return couch.request({url: url}).then(function(resp) {
      util.render('apps', 'appsContainer', {
        loggedIn: loggedIn(),
        apps: _(resp.rows).map(function(row) { return row.doc })
      });
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
          avatar: row.doc.avatar,
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
          loggedIn: loggedIn(),
          datasets: datasets,
          name: "Trending Datasets"
        });      
      }
    })
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
  
  function addApp(ddoc, dataset) {
    couch.request({url: app.baseURL + "api/applications/" + dataset}).then(function(result) {
      var apps = result.rows;
      if(_.detect(apps, function(appEntry) { return appEntry.ddoc === ddoc })) {
        util.hide('dialog');
        util.notify('That app is already installed');
      } else {
        var doc = {type: "app", user: app.profile._id, dataset: dataset, ddoc: ddoc};
        couch.request({url: app.baseURL + "api", type: "POST", data: JSON.stringify(doc)}).then(function(resp) {
          console.log('resp', resp)
          app.io.on(resp.id, function (err, data) {
            util.hide('dialog');
            app.routes.tabs['apps']();
          })
          util.render('busy', 'modal', {message: "Installing app..."});
        })
      }
    })
  }
  
  function searchTwitter(term) {
    var linkSearch = "http://search.twitter.com/search.json?rpp=4&page=1&q=filter:links%20";
    return $.ajax({dataType: "jsonp", url: linkSearch + encodeURIComponent(term)}).promise();
  }
  
  function renderIcons() {
    var input = $(this);
    input.addClass('loading');
    var word = input.val()
     .replace(/[^\w\s]|_/g, "")
     .replace(/\s+/g, ' ')
     .trim()
    util.lookupIcon(word).then(function(resp) {
     input.removeClass('loading');
     var matches = _.map(_.keys(resp.svg), function(match) {
       return {
         noun: match.toLowerCase(),
         svg: resp.svg[match]
       };
     })

     app.nouns = {};
     _.each(matches, function(noun) { app.nouns[noun.noun] = noun; })

     util.render('nouns', 'nounContainer', {nouns: matches});
    })
  }
  
  function projectToGeoJSON(epsg, coordinates, callback) {
    util.cachedRequest({url: app.baseURL + '/api/epsg/' + epsg, dataType: "jsonp"}).then(function(epsgData) {
      Proj4js.defs["EPSG:" + epsg] = epsgData.proj4;
      transformation = HodgeProj4.transform(coordinates[0], coordinates[1]).from("EPSG:" + epsg).to('WGS84');
      callback(false, {type: "Point", coordinates: [transformation.point.x, transformation.point.y]});
    }, callback)
  }
  
  function showLoader() {
    $( '.stream-loading' ).removeClass( 'hidden' );
  }

  function hideLoader() {
    $( '.stream-loading' ).addClass( 'hidden' );
  }

  function loaderShowing() {
    var showing = false;
    if( $( '.stream-loading' ).css( 'visibility' ) !== "hidden" ) showing = true;
    return showing;
  }
  
  function bindInfiniteScroll() {
    var settings = {
      lookahead: 400,
      container: $( document )
    };

    $( window ).scroll( function( e ) {
      if ( loaderShowing() ) {
        return;
      }

      var containerScrollTop = settings.container.scrollTop();
      if ( ! containerScrollTop ) {
        var ownerDoc = settings.container.get().ownerDocument;
        if( ownerDoc ) {
          containerScrollTop = $( ownerDoc.body ).scrollTop();        
        }
      }
      var distanceToBottom = $( document ).height() - ( containerScrollTop + $( window ).height() );

      if ( distanceToBottom < settings.lookahead ) {  
        showLoader()
        var url = app.baseURL + 'api/datasets';
        var name = $('.datasets').attr('data-name');
        if (name) url += ('/' + name);
        fetchDatasets(url, app.lastOffset + 20).then(function(datasets) {
          if (datasets.length > 0) {
            $('.datasets-wrapper').append( $.mustache( $( ".datasetsTemplate" ).html(), {datasets: datasets} ) );
            hideLoader()
          } else {
            $('.stream-loading').html('This is the last dataset!')
          }
        })
      }
    });
  }
  
  return {
    inURL: inURL,
    formatDiskSize: formatDiskSize,
    capitalize: capitalize,
    isAdminParty: isAdminParty,
    loggedIn: loggedIn,
    catchModals: catchModals,
    registerEmitter: registerEmitter,
    cachedRequest: cachedRequest,
    lookupIcon: lookupIcon,
    geocode: geocode,
    listenFor: listenFor,
    show: show,
    hide: hide,
    position: position,
    render: render,
    notify: notify,
    observeExit: observeExit,
    formatMetadata:formatMetadata,
    waitFor: waitFor,
    getBaseURL:getBaseURL,
    resetForm: resetForm,
    delay: delay,
    persist: persist,
    lookupPath: lookupPath,
    selectedTreePath: selectedTreePath,
    renderTree: renderTree,
    showApps: showApps,
    showDatasets: showDatasets,
    showTrendingsets: showTrendingsets,
    mergeFileTree: mergeFileTree,
    getDDocFiles: getDDocFiles,
    addHTMLElementForFileEntry: addHTMLElementForFileEntry,
    codeEditor: codeEditor,
    addApp: addApp,
    searchTwitter: searchTwitter,
    renderIcons: renderIcons,
    projectToGeoJSON: projectToGeoJSON,
    showLoader: showLoader,
    hideLoader: hideLoader,
    loaderShowing: loaderShowing,
    bindInfiniteScroll: bindInfiniteScroll
  };
}();