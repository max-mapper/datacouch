// redirect /edit/somedatasetid to /edit/#/somedatasetid
(function() {
  var id = $.url(window.location.href).segment(2);
  if (id && id.length > 0) window.location.href = $.url(window.location.href).attr('base') + '/edit/#/' + id;
})()

var app = {
  baseURL: util.getBaseURL(window.location.href),
  container: 'main_content',
  emitter: util.registerEmitter()
};

couch.dbPath = app.baseURL + "api/";
couch.rootPath = couch.dbPath + "couch/";
app.io = io.connect('/');

app.handler = function(route) {
  if (route.params && route.params.id) {
    var path = route.params.route;
    app.routes['recline'](route.params.id);
  } else {
    app.routes['noID']();
  }  
};

app.routes = {
  pages: {
    dataset: function(id) {
      $('.homeButton').attr('href', app.baseURL);
      recline.bootstrap(id);
    },
    noID: function() {
      alert('you have to specify an id!');
    }
  },
  modals: {
    browse: function() {
      couch.request({url: app.baseURL + "api/templates"}).then(function(templates) {
        var templateData = {templates: _(templates.rows).map(function(row) { 
          return _.extend({}, row.doc, { 
            screenshot: app.baseURL + "api/" + row.doc._id + '/screenshot.png'
          })
        })}
        recline.showDialog("appTemplates", templateData);
      })
    },
    login: function() {
      monocles.showLogin(recline.showSessionButtons);
    },
    logout: function() {
      util.notify("Signing you out...", {persist: true, loader: true});
      $.getJSON(app.baseURL + 'api/logout').then(function() {
        delete app.session;
        util.notify("Signed out");
        util.render('signIn', 'project-controls');
        app.routes.tabs.data();
      })
    },
    edit: function() { recline.showDialog('editDatasetInfo', app.datasetInfo) },
    loggedIn: function() { },
    fork: function(id) {
      monocles.ensureProfile().then(function(profile) {
        recline.showDialog('busy', {message: "Forking to your account..."});
        couch.request({url: app.baseURL + "api/" + id }).then( function( dataset ) { 
          couch.request({url: couch.rootPath + "_uuids"}).then( function( data ) { 
            var docID = data.uuids[ 0 ];
            var doc = {
              forkedFrom: dataset._id,
              forkedFromUser: dataset.user,
              _id: "dc" + docID,
              type: "database",
              nouns: dataset.nouns,
              description: dataset.description,
              name: dataset.name,
              user: app.profile._id,
              avatar: app.profile.avatar,
              createdAt: new Date()
            };
            couch.request({url: app.baseURL + "api/" + doc._id, type: "PUT", data: JSON.stringify(doc)}).then(function(resp) {
              var dbID = resp.id
                , dbName = dbID + "/_design/recline"
                ;
              function waitForDB(url) {
                couch.request({url: url, type: "HEAD"}).then(
                  function(resp, status) {
                    window.location = app.baseURL + 'edit/#/' + dbID;
                  },
                  function(resp, status){
                    console.log("not created yet...", resp, status);
                    setTimeout(function() {
                      waitForDB(url);
                    }, 500);
                  }
                )
              }
              waitForDB(app.baseURL + "api/couch/" + dbName);
            });
          });
        });
      })
    },
    cancel: function() {
      util.hide('dialog');
    },
    close: function() {
      util.hide('dialog');
    }
  },
  tabs: {
    data: function() {
      var datasetInfo = _.extend({}, app.datasetInfo, { 
        canEdit: function() { return util.loggedIn() && ( app.datasetInfo.user === app.profile._id ) }
      });
      if (datasetInfo.nouns) datasetInfo.hasNouns = true;
      util.render('dataTab', 'sidebar', datasetInfo)
      util.searchTwitter(window.location.href).then(
        function(results) {
          util.render('tweetStream', 'tweetsContainer', results)
        })
      recline.initializeTable(app.offset);
    },
    apps: function() {
      couch.request({url: app.baseURL + 'api/applications/' + app.dbInfo.db_name}).then(function(resp) {
        var apps = _.map(resp.rows, function(row) {
          return {ddoc: row.doc.ddoc, url: row.doc.url, subdomain: row.doc._id};
        })
        util.render('appsTab', 'sidebar', {apps: apps, loggedIn: util.loggedIn()})        
      })
    },
    wiki: function() {
      util.render('wikiTab', 'sidebar', {loggedIn: util.loggedIn()});
    }
  }
}

app.after = {
  tableContainer: function() {
    recline.activateControls();
  },
  dataTable: function() {
    $('.column-header-menu').click(function(e) { 
      app.currentColumn = $(e.target).siblings().text();
      util.position('menu', e);
      util.render('columnActions', 'menu');
      e.stopPropagation();
    });
    
    $('.column-header').click(function(e) {
      var header = $(e.currentTarget);
      if(header.hasClass('collapsed') || ( header.width() > 60 ) ) {
        header.toggleClass('collapsed');
        header.find('.column-header-title').toggleClass('collapsed');
        var td = $('td[data-header="' + header.find('.column-header-name').text() + '"]');
        td.toggleClass('collapsed');
        td.find('.data-table-cell-value').toggleClass('collapsed');
      }
    })
    
    $('.row-header-menu').click(function(e) { 
      app.currentRow = $(e.target).parents('tr:first').attr('data-id');
      util.position('menu', e);
      util.render('rowActions', 'menu');
    });
    
    $('.data-table-cell-edit').click(function(e) {
      var editing = $('.data-table-cell-editor-editor');
      if (editing.length > 0) {
        editing.parents('.data-table-cell-value').html(editing.text()).siblings('.data-table-cell-edit').removeClass("hidden");
      }
      $(e.target).addClass("hidden");
      var cell = $(e.target).siblings('.data-table-cell-value');
      cell.data("previousContents", cell.text());
      util.render('cellEditor', cell, {value: cell.text()});
    })
  },
  columnActions: function() { recline.handleMenuClick() },
  rowActions: function() { recline.handleMenuClick() },
  cellEditor: function() {
    $('.data-table-cell-editor .okButton').click(function(e) {
      var cell = $(e.target);
      var rowId = cell.parents('tr').attr('data-id');
      var header = cell.parents('td').attr('data-header');
      var doc = _.find(app.cache, function(cacheDoc) {
        return cacheDoc._id === rowId;
      });
      doc[header] = cell.parents('.data-table-cell-editor').find('.data-table-cell-editor-editor').val();
      util.notify("Updating row...", {persist: true, loader: true});
      costco.updateDoc(doc).then(function(response) {
        util.notify("Row updated successfully");
        recline.initializeTable();
      })
    })
    $('.data-table-cell-editor .cancelButton').click(function(e) {
      var cell = $(e.target).parents('.data-table-cell-value');
      cell.html(cell.data('previousContents')).siblings('.data-table-cell-edit').removeClass("hidden");
    })
  },
  editDatasetInfo: function() {
    var input = $(".modal #icon-picker")
      , iconThrottler = _.throttle(util.renderIcons, 1000);
    input.keyup(iconThrottler);
    
    $('.modal-footer .ok').click(function(e) {
      _.extend(app.datasetInfo, $('.modal form').serializeObject());
      
      var selectedNoun = $('.nounWrapper.selected .icon-subtitle').text()
      if (selectedNoun.length > 0) app.datasetInfo.nouns = [app.nouns[selectedNoun]];
      
      couch.request({url: app.baseURL + "api", data: JSON.stringify(app.datasetInfo), type: "POST"}).then(function(resp) {
        app.datasetInfo._rev = resp.rev;
        app.routes.tabs.data();
        util.notify('Updated dataset info');
      })
      util.hide('dialog');
    })
  },
  actions: function() {
    $('.button').click(function(e) { 
      var action = $(e.target).attr('data-action');
      if(action) {
        util.position('menu', e, {left: -60, top: 5});
        util.render(action + 'Actions', 'menu');
        recline.handleMenuClick();
      }
    });
  },
  bulkEdit: function() {
    $('.modal-footer .ok').click(function(e) {
      var funcText = $('.expression-preview-code').val();
      var editFunc = costco.evalFunction(funcText);
      ;
      if (editFunc.errorMessage) {
        util.notify("Error with function! " + editFunc.errorMessage);
        return;
      }
      util.hide('dialog');
      costco.updateDocs(editFunc);
    })
    
    var editor = $('.expression-preview-code');
    editor.val("function(doc, emit) {\n  doc['"+ app.currentColumn+"'] = doc['"+ app.currentColumn+"'];\n  emit(doc);\n}");
    editor.focus().get(0).setSelectionRange(18, 18);
    editor.keydown(function(e) {
      // if you don't setTimeout it won't grab the latest character if you call e.target.value
      window.setTimeout( function() {
        var errors = $('.expression-preview-parsing-status');
        var editFunc = costco.evalFunction(e.target.value);
        if (!editFunc.errorMessage) {
          errors.text('No syntax error.');
          costco.previewTransform(app.cache, editFunc, app.currentColumn);
        } else {
          errors.text(editFunc.errorMessage);
        }
      }, 1, true);
    });
    editor.keydown();
  },
  reproject: function() {
    $('.modal-footer .ok').click(function(e) {
      util.hide('dialog');
      costco.updateDocs(app.reprojectFunction);
    })
    
    var editor = $('.expression-preview-code');
    editor.val("function(doc, emit) {\n  emit(doc['lat'], doc['lon']);\n}");
    editor.focus().get(0).setSelectionRange(18, 18);
    editor.keydown(function(e) {
      // if you don't setTimeout it won't grab the latest character if you call e.target.value
      window.setTimeout( function() {
        var errors = $('.expression-preview-parsing-status');
        app.epsgCode = $('#epsg-code').val();
        var editFunc = costco.evalFunction(e.target.value);
        app.reprojectFunction = function(editDoc, emit) {
          editFunc(editDoc, function(lat, lon) {
            if (lat && lon) {
              util.projectToGeoJSON(app.epsgCode, [lat, lon], function(err, geometry) {
                editDoc.geometry = geometry;
                emit(editDoc);
              })
            }
          })
        }
        if (!editFunc.errorMessage) {
          errors.text('No syntax error.');
          costco.previewTransform(app.cache, app.reprojectFunction, 'geometry');
        } else {
          errors.text(editFunc.errorMessage);
        }
      }, 1, true);
    });
    editor.keydown();
  },
  geocode: function() {
    $('.modal-footer .ok').click(function(e) {
      util.hide('dialog');
      costco.updateDocs(app.geocodeFunction, function(updated) {
        console.log('update resp', updated)
        util.notify('Geocoded docs and stored them in the "geometry" column', {showFor: 5000})
      })
    })
    
    var editor = $('.expression-preview-code');
    editor.val("function(doc, emit) {\n  emit(doc['"+app.currentColumn+"']);\n}");
    editor.focus().get(0).setSelectionRange(18, 18);
    editor.keydown(function(e) {
      util.notify('Geocoding...', {loader: true, persist: true})
      // if you don't setTimeout it won't grab the latest character if you call e.target.value
      window.setTimeout( function() {
        var errors = $('.expression-preview-parsing-status');
        app.geocoder = $('#geocoderSelect option:selected').attr('data-value');
        var editFunc = costco.evalFunction(e.target.value);
        app.geocodeFunction = function(editDoc, emit) {
          editFunc(editDoc, function(address) {
            if (address) {
              util.geocode(address, app.geocoder, function(result) {
                editDoc.geocode = result
                if (app.geocoder === "google") setTimeout(function() { emit(editDoc) }, 250)
                else emit(editDoc);
              })
            }
          })
        }
        if (!editFunc.errorMessage) {
          errors.text('No syntax error.');
          costco.previewTransform(app.cache, app.geocodeFunction, 'geocode');
        } else {
          errors.text(editFunc.errorMessage);
        }
      }, 1, true);
    });
    editor.keydown();
  },
  rename: function() {
    $('.modal-footer .ok').click(function(e) {
      util.notify("Renaming column...", {persist: true, loader: true});
      var columnName = $('#columnName').val();
      costco.updateDocs(function(doc, emit) {
        doc[columnName] = doc[app.currentColumn];
        delete doc[app.currentColumn];
        emit(doc);
      });
    })
  },
  urlImport: function() {
    $('.modal-footer .ok').click(function(e) {
      app.apiURL = $.url($('#url-input').val().trim());
      util.notify("Fetching data...", {persist: true, loader: true});
      var query = $.param($.extend({}, app.apiURL.data.param.query, {"callback": "?"}))
      $.getJSON(app.apiURL.attr('base') + app.apiURL.attr('path') + "?" + decodeURIComponent(query)).then(
        function(docs) {
          app.apiDocs = docs;
          util.notify("Data fetched successfully!");
          recline.showDialog('jsonTree', {}, "800px");
        },
        function (err) {
          util.hide('dialog');
          util.notify("Data fetch error: " + err.responseText);
        }
      );
    })
  },
  uploadImport: function() {
    $('.modal-footer .ok').click(function(e) {
      util.hide('dialog');
      util.notify("Saving documents...", {persist: true, loader: true});
      var file = $('#file')[0].files[0];
      costco.uploadCSV(file);
    })
  },
  jsonTree: function() {
    util.renderTree(app.apiDocs);
    $('.modal-footer .ok').click(function(e) {
      util.hide('dialog');
      util.notify("Saving documents...", {persist: true, loader: true});
      costco.uploadDocs(util.lookupPath(util.selectedTreePath())).then(function(msg) {
        util.notify("Docs saved successfully!");
        recline.initializeTable(app.offset);
      });
    })
  },
  pasteImport: function() {
    $('.modal-footer .ok').click(function(e) {
      util.notify("Uploading documents...", {persist: true, loader: true});
      try {
        var docs = JSON.parse($('.data-table-cell-copypaste-editor').val());        
      } catch(e) {
        util.notify("JSON parse error: " + e);
      }
      if (docs) {
        if(_.isArray(docs)) {
          costco.uploadDocs(docs).then(
            function(docs) {
              util.notify("Data uploaded successfully!");
              recline.initializeTable(app.offset);
              util.hide('dialog');
            },
            function (err) {
              util.hide('dialog');
            }
          );        
        } else {
          util.notify("Error: JSON must be an array of objects");
        } 
      }
    })
  },
  sidebar: function() {
    var tabs = $('.ui-tabs-nav li');
    tabs.find('a').click(function(e) {
      var clicked = $(e.target)
        , tab = clicked.attr('data-tab')
        ;
      tabs.removeClass('ui-state-active');
      clicked.parents('li').addClass('ui-state-active');
      app.routes.tabs[tab]();
      e.preventDefault();
    })
    tabs.find('a').first().click();
  },
  appTemplates: function() {
    $('.appTemplate').click(function(e) {
      var ddoc = $(e.currentTarget).attr('data-ddoc');
      util.addApp(ddoc, app.datasetInfo._id);
    })
  },
  dataTab: function() {
    $('.timeago').timeago();
  },
  appsTab: function() {
    $('.root').live('click', function(e) {
      var clicked = $(e.target)
        , subdomain = clicked.attr('data-subdomain')
        , ddoc = clicked.attr('data-ddoc')
        ;
      if(clicked.hasClass('selected')) return;
      $('.sidebar .selected').removeClass('selected');
      $(this).find('li').removeClass('hidden');
      clicked.addClass('selected');
      if (subdomain) {
        util.render("ddocIframe", "right-panel", {subdomain: subdomain});
        util.getDDocFiles("/_design/" + ddoc).then(function(folder) {
          app.fileHtmlElementByPath = {}
          app.stateByPath = {}
          var ul = document.createElement("ul")
          for (var childEntry in folder.children) {
            util.addHTMLElementForFileEntry(folder.children[childEntry], ul)
          }
          clicked.find('#files').html('').html(ul);
        }); 
      }
    })
  },
  wikiTab: function() {
    sharejs.open(app.dbInfo.db_name, 'text', function(doc, error) {
      if (error) {
        console.log(error);
      } else {
        var elem = document.getElementById('editor');
        elem.disabled = false;
        if (util.loggedIn()) {
          doc.attach_textarea(elem);
        } else {
          var update = function() { elem.innerHTML = doc.snapshot };
          update();
          doc.on('change', update);
        }
      }
    });
  },
  nouns: function() {
    $('.nounContainer svg').click(function(e) {
      $('.nounWrapper.selected').removeClass('selected');
      $(e.currentTarget).parents('.nounWrapper').toggleClass('selected')
    })
  }
}

$(function() {  
  
  app.emitter.on('error', function(error) {
    util.notify("Server error: " + error);
  })
  
  $('a').live('click', function(event) {
    var route =  $(this).attr('href');
    util.catchModals(route);
  });

  app.router = Router({
    '/': {on: 'noID'},
    '/(\\w+)!': {on: function(modal) { util.catchModals("#/" + modal + "!") }},
    '/:dataset': {on: 'dataset'}
  }).use({ resource: app.routes.pages });
  
  // see if route matches /edit/#/somedatasetid
  var id = $.url(window.location.href).fsegment(1);
  if (id.length > 0) {
    app.router.init("/" + id);
  } else {
    app.router.init('/');
  }
  
})