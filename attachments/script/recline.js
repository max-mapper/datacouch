var recline = function() {
  
  function formatDiskSize(bytes) {
    return (parseFloat(bytes)/1024/1024).toString().substr(0,4) + "MB"
  }
  
  function showDialog(template, data, modalWidth) {
    if (!data) data = {};
    if (!modalWidth) modalWidth = ""
    util.show('datacouch-dialog');
    $('.datacouch-dialog .modal').css('width', modalWidth);
    util.render(template, 'datacouch-dialog .modal', data);
    util.observeExit($('.datacouch-dialog .modal'), function() {
      util.hide('datacouch-dialog');
    })
    $('.datacouch-dialog').draggable({ handle: '.top', cursor: 'move' });
  }
  
  function updateWords(column, transform) {
    costco.updateDocs(function(doc, emit) { 
      doc[column] = _.map(doc[column].split(' '), transform).join(' ')
      emit(doc)
    });
  }
  
  function refreshTable() {
    util.loadDataset(function(err, backend) {
      app.recline.model.fetch()
      app.recline.model.query(app.recline.model.queryState.attributes)
    }, app.recline.model.backend)
  }
  
  function handleMenuClick() {
    $( '.dropdown-menu li a' ).live('click', function(e) {
      var actions = {
        bulkEdit: function() { showDialog('bulkEdit', {name: app.currentColumn}, "800px") },
        reproject: function() { showDialog('reproject', {}, "800px") },
        csv: function() { window.location.href = app.csvUrl },
        json: function() { window.location.href = app.dbPath + "/json" },
        urlImport: function() { showDialog('urlImport') },
        pasteImport: function() { showDialog('pasteImport') },
        uploadImport: function() { showDialog('uploadImport') },
        deleteColumn: function() {
          var msg = "Are you sure? This will delete '" + app.currentColumn + "' from all documents.";
          if (confirm(msg)) costco.deleteColumn(app.currentColumn);
        },
        renameColumn: function() { showDialog('rename', {name: app.currentColumn}) },
        titlecase: function() {
          updateWords(app.currentColumn, function(word) {
            return util.capitalize(word)
          })
        },
        lowercase: function() {
          updateWords(app.currentColumn, function(word) {
            return word.toLowerCase()
          })
        },
        uppercase: function() {
          updateWords(app.currentColumn, function(word) {
            return word.toUpperCase()
          })
        },
        geocode: function() { showDialog('geocode', {}, "800px") },
        wipe: function() {
          var msg = "Are you sure? This will permanently delete all documents in this dataset.";
          if (confirm(msg)) costco.updateDocs(function(doc, emit) { emit(_.extend(doc, {_deleted: true})) });
        },
        destroy: function() {
          var msg = "Are you sure? This will permanently delete this entire dataset.";
          if ( confirm(msg) ) {
            var datasetDoc = _.extend({}, app.datasetInfo, {_deleted: true})
            couch.request({url: app.baseURL + 'api', data: JSON.stringify(datasetDoc), type: "POST"}).then(function(b) { 
              window.location.href = "/";
            });
          }
        },
        deleteRow: function() {
          var doc = _.find(app.cache, function(doc) { return doc._id === app.currentRow });
          doc._deleted = true;
          costco.uploadDocs([doc]).then(
            function(updatedDocs) { 
              util.notify("Row deleted successfully");
              recline.refreshTable()
            }
          )
        }
      }

      actions[$(e.target).attr('data-action')]();
      
      e.preventDefault();
    }) 
  }

  function activateControls() {
    $( '.viewPanel-pagingControls-page' ).click(function( e ) {      
      $(".viewpanel-pagesize .selected").removeClass('selected');
      $(e.target).addClass('selected');
      fetchRows(app.newest);
    });
    $( '.viewpanel-paging a' ).click(function( e ) {
      var action = $(e.target);
      if (action.hasClass("last")) fetchRows(false, app.dbInfo.doc_count - getPageSize());
      if (action.hasClass("next")) fetchRows(app.oldest);
      if (action.hasClass("previous")) fetchRows(false, app.offset - getPageSize());
      if (action.hasClass("first")) fetchRows();
    });
  }
  
  function getPageSize() {
    var pagination = $(".viewpanel-pagesize .selected");
    if (pagination.length > 0) {
      if (pagination.hasClass("show-all")){
        return app.docCount;
      } else {
        return parseInt(pagination.text())
      }
    } else {
      return 10;
    }
  }
  
  function fetchRows(id, skip) {

    var query = {
      "limit" : getPageSize()
    }
    
    if (id) {
      $.extend( query, {"startkey": '"' + id + '"'});
      if (id !== app.newest) $.extend( query, {"skip": 1});
    }
    
    if (skip) $.extend( query, {"skip": skip});
    
    var req = {url: app.dbPath + '/rows?' + $.param(query)};
    
    couch.request(req).then(function(response) {
      var offset = response.offset + 1;
      $('.viewpanel-pagingcount').text(offset + " - " + ((offset - 1) + getPageSize()));
      app.cache = response.rows.map(function(row) { return row.value; } );
      renderRows(response);
    });

  }
  
  function updateDocCount(totalDocs) {
    app.docCount = totalDocs
    $('#docCount').text(app.docCount + " documents");
  }
  
  function getDbInfo(url) {
    var dfd = $.Deferred();
    return couch.request({url: url}).then(function(dbInfo) {
      app.dbInfo = dbInfo;

      $.extend(app.dbInfo, {
        "host": window.location.host,
        "disk_size": formatDiskSize(app.dbInfo.disk_size)
      });

      if( util.inURL("_rewrite", app.baseURL) ) app.dbInfo.db_name = "api";
      
      dfd.resolve(dbInfo);
    });
    return dfd.promise();
  }
  
  function bootstrap(id) {
    app.dbPath = app.baseURL + "db/" + id;

    getDbInfo(app.dbPath).then(function( dbInfo ) {
      app.dbInfo = dbInfo
      util.render( 'generating', 'project-actions' );
      var sessionButtonsRenderer = showSessionButtons()

      app.emitter.on('metadata', function(datasetInfo) {
        app.datasetInfo = datasetInfo;
        app.ddocs = {};
        
        util.render('sidebar', 'left-panel');
        var datasetInfo = _.extend({}, app.datasetInfo, { 
          canEdit: function() { return util.loggedIn() && ( app.datasetInfo.user === app.profile._id ) }
        });
        if (datasetInfo.nouns) datasetInfo.hasNouns = true;
        util.render('dataTab', 'sidebar', datasetInfo)
        
        couch.request({url: app.baseURL + 'api/applications/' + app.dbInfo.db_name}).then(function(resp) {
          var apps = _.map(resp.rows, function(row) {
            return {ddoc: row.doc.ddoc, url: row.doc.url, subdomain: row.doc._id};
          })
          util.render('appsTab', 'bottom', {apps: apps, loggedIn: util.loggedIn()})        
        })
        
      })
      
      showDialog('busy')
      app.emitter.on('headers', function ( headers ) {
        util.hide('datacouch-dialog')
        app.headers = headers;
        app.csvUrl = app.dbPath + '/csv?headers=' + escape(JSON.stringify(headers));
        sessionButtonsRenderer.then(function() {
          hasFork(function(fork) {
            util.render( 'actions', 'project-actions',
              $.extend({}, app.dbInfo, {
                url: app.csvUrl,
                isOwner: recline.isOwner(),
                showForkButton: function() {
                  return (util.loggedIn() && !recline.isOwner() && !fork);
                },
                fork: fork
              })
            )
          })
        })
      })
    })
  }
  
  function showSessionButtons() {
    return monocles.fetchProfile().then(function(profile) {
      app.profile = profile;
      util.render('signOut', 'project-controls');
    }, function() {
      util.render('signIn', 'project-controls')
    })
  }
  
  function hasFork(callback) {
    couch.request({url: app.baseURL + 'api/forks/' + app.dbInfo.db_name}).then(
      function ( response ) {
        var isOwner = _.detect(response.rows, function(row) {
          return row.doc.user === app.profile._id;
        })
        if(isOwner) isOwner = isOwner.id;
        callback(isOwner);
      })
  }
  
  function isOwner() {
    return app.datasetInfo.user === app.profile._id;
  }
  
  return {
    formatDiskSize: formatDiskSize,
    handleMenuClick: handleMenuClick,
    showDialog: showDialog,
    refreshTable: refreshTable,
    updateDocCount: updateDocCount,
    bootstrap: bootstrap,
    showSessionButtons: showSessionButtons,
    fetchRows: fetchRows,
    activateControls: activateControls,
    getPageSize: getPageSize,
    hasFork: hasFork,
    isOwner: isOwner
  };
}();