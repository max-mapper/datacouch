var recline = function() {
  
  function formatDiskSize(bytes) {
    return (parseFloat(bytes)/1024/1024).toString().substr(0,4) + "MB"
  }
  
  function showDialog(template, data, modalWidth) {
    if (!data) data = {};
    if (!modalWidth) modalWidth = ""
    util.show('dialog');
    $('.modal').css('width', modalWidth);
    util.render(template, 'modal', data);
    util.observeExit($('.modal'), function() {
      util.hide('dialog');
    })
    $('.dialog').draggable({ handle: '.top', cursor: 'move' });
  }
  
  function updateWords(column, transform) {
    costco.updateDocs(function(doc, emit) { 
      doc[column] = _.map(doc[column].split(' '), transform).join(' ')
      emit(doc)
    });
  }
  
  function handleMenuClick() {
    $( '.menu li' ).click(function(e) {
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
              recline.initializeTable(app.offset);
            }
          )
        }
      }
      
      util.hide('menu');
      actions[$(e.target).attr('data-action')]();
      
      e.preventDefault();
    }) 
  }
  
  function renderRows(response) {
    var rows = response.rows;
    
    if (rows.length < 1) {
      util.render('dataTable', 'data-table-container', {loggedIn: util.loggedIn()});
      return;
    };
    
    var tableRows = [];
    
    rows.map(function(row) {
      var cells = [];
      app.headers.map(function(header) {
        var value = "";
        if (row.value[header]) {
          value = row.value[header];
          if (typeof(value) == "object") value = JSON.stringify(value);
        }
        var cell = {header: header, value: value};
        if (_.include(["_id", "_rev"], header)) cell.state = "collapsed";
        cells.push(cell);
      })
      tableRows.push({id: row.value._id, cells: cells});
      
    })
    
    var headers = app.headers.map(function(header) {
      var header = {header: header};
      if (_.include(["_id", "_rev"], header.header)) header.state = "collapsed";
      return header;
    })
    
    util.render('dataTable', 'data-table-container', {
      rows: tableRows,
      headers: headers,
      notEmpty: function() { return app.headers.length > 0 },
      loggedIn: util.loggedIn(),
      isOwner: isOwner()
    })
    
    app.newest = rows[0].id;
    app.oldest = rows[rows.length - 1].id;
    app.offset = response.offset;

    function activate(e) {
      e.removeClass('inaction').addClass('action');
    }
    
    function deactivate(e) {
      e.removeClass('action').addClass('inaction');
    }
        
    if (app.offset + getPageSize() >= app.dbInfo.doc_count) {
      deactivate($( '.viewpanel-paging .last'));
      deactivate($( '.viewpanel-paging .next'));
    } else {
      activate($( '.viewpanel-paging .last'));
      activate($( '.viewpanel-paging .next'));
    }
    
    if (app.offset === 0) {
      deactivate($( '.viewpanel-paging .previous'));
      deactivate($( '.viewpanel-paging .first'));
    } else {
      activate($( '.viewpanel-paging .previous'));
      activate($( '.viewpanel-paging .first'));
    }
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
    return couch.request({url: app.dbPath + '/_all_docs?' + $.param({startkey: '"_design/"', endkey: '"_design0"'})}).then(
      function ( data ) {
        var ddocCount = data.rows.length;
        app.docCount = totalDocs - data.rows.length;
        $('#docCount').text(app.docCount + " documents");
      }
    )    
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
    
    util.listenFor(['esc', 'return']);
    
    getDbInfo(app.dbPath).then(function( dbInfo ) {
      util.render( 'generating', 'project-actions' );    
            
      showSessionButtons();
      
      couch.request({url: app.baseURL + "api/" + id}).then(function(datasetInfo) {
        app.datasetInfo = datasetInfo;
        app.ddocs = {};
        util.render('sidebar', 'left-panel');
      })

      initializeTable();
    })
  }
  
  function showSessionButtons() {
    monocles.fetchProfile().then(function(profile) {
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
  
  function initializeTable(offset) {
    util.render( 'tableContainer', 'right-panel' );
    showDialog('busy');
    couch.request({url: app.dbPath + '/headers'}).then(function ( headers ) {
      util.hide('dialog');
      getDbInfo(app.dbPath).then(function(dbInfo) { 
        updateDocCount(dbInfo.doc_count);
      });
      app.headers = headers;
      app.csvUrl = app.dbPath + '/csv?headers=' + escape(JSON.stringify(headers));
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
        );
      })
      fetchRows(false, offset);
    })
  }
  
  return {
    formatDiskSize: formatDiskSize,
    handleMenuClick: handleMenuClick,
    showDialog: showDialog,
    updateDocCount: updateDocCount,
    bootstrap: bootstrap,
    showSessionButtons: showSessionButtons,
    fetchRows: fetchRows,
    activateControls: activateControls,
    getPageSize: getPageSize,
    renderRows: renderRows,
    hasFork: hasFork,
    isOwner: isOwner,
    initializeTable: initializeTable
  };
}();