// adapted from https://github.com/harthur/costco. heather rules

var costco = function() {
  var vm = require('vm');
  
  function evalFunction(funcString) {
    var funcString = '(' + funcString + ')'
    try { eval(funcString) }
    catch (e) { return {errorMessage: e+""} }
    return vm.runInNewContext(funcString, {})
  }
  
  function previewTransform(docs, editFunc, currentColumn) {
    var preview = [];
    mapDocs(_.clone(docs), editFunc, function(updated) {
      for (var i = 0; i < updated.docs.length; i++) {      
        var before = docs[i]
          , after = updated.docs[i]
          ;
        if (!after) after = {};
        if (currentColumn) {
          preview.push({before: JSON.stringify(before[currentColumn]), after: JSON.stringify(after[currentColumn])});      
        } else {
          preview.push({before: JSON.stringify(before), after: JSON.stringify(after)});      
        }
      }
      util.render('editPreview', 'expression-preview-container', {rows: preview});
      util.notify('Rendered ' + preview.length + ' preview docs')
    });
  }

  function mapDocs(docs, editFunc, callback) {
    var edited = []
      , failed = []
      , updatedDocs = []
      ;
  
    var functions = _.map(docs, function(doc) {
      return function(next) {
        try {
          editFunc(_.clone(doc), function(updated) {
            if (updated && !_.isEqual(updated, doc)) {
              edited.push(updated);
            }
            updatedDocs.push(updated);
            next()
          });
        } catch(e) {
          failed.push(doc)
          next(e)
        }
      }
    })
    
    async.series(functions, function(err) {
      if (err) console.log('processing error', err)
      callback({
        edited: edited, 
        docs: updatedDocs, 
        failed: failed
      })
    })
  }
  
  function updateDocs(editFunc, callback) {
    var transformDoc = {
      "transform": editFunc.toString(),
      "dataset": app.datasetInfo._id,
      "type": "pendingTransformation",
      "user": app.profile._id
    }
    
    couch.request({url: couch.rootPath + "_uuids"}).then( function( data ) {
      var _id = data.uuids[0]
      transformDoc["_id"] = _id
      app.io.emit('save', transformDoc)
      util.notify("Transforming documents...", {persist: true, loader: true})
      app.io.on(_id, function (err, data) {
        if (err && callback) callback(err)
        if (data.progress) return util.notify("Transforming documents... " + data.progress + "%", {persist: true, loader: true})
        util.notify("Documents updated successfully!")
        recline.initializeTable(app.offset)
        if (callback) callback(false, data)
      })
    })

  }
  
  function updateDoc(doc) {
    return couch.request({type: "PUT", url: app.dbPath + "/" + doc._id, data: JSON.stringify(doc)})
  }

  function uploadDocs(docs) {
    var dfd = $.Deferred();
    if(!docs.length) dfd.resolve("Failed: No docs specified");
    couch.request({url: app.dbPath + "/_bulk_docs", type: "POST", data: JSON.stringify({docs: docs})})
      .then(
        function(resp) {ensureCommit().then(function() { 
          var error = couch.responseError(resp);
          if (error) {
            dfd.reject(error);
          } else {
            dfd.resolve(resp);            
          }
        })}, 
        function(err) { dfd.reject(err.responseText) }
      );
    return dfd.promise();
  }
  
  function ensureCommit() {
    return couch.request({url: app.dbPath + "/_ensure_full_commit", type:'POST', data: "''"});
  }
  
  function deleteColumn(name) {
    var deleteFunc = function(doc, emit) {
      delete doc[name];
      emit(doc);
    }
    return updateDocs(deleteFunc);
  }
  
  function uploadCSV(file) {
    if (file) {
      util.notify("Uploading file...", {persist: true, loader: true});
      
      var xhr = new XMLHttpRequest();
      xhr.onerror = function (e) {
        util.notify('upload abort', e)
      }
      xhr.onabort = function (e) {
        util.notify('upload error', e)
      }
      xhr.upload.onprogress = function (e) {
        var percent = (e.loaded / e.total) * 100;
        if (percent === 100) {
          util.notify("We got your data. Waiting for it to process... (this could take a while for large files, feel free to check back later)", {persist: true, loader: true});
        } else {
          util.notify("Uploading file... " + percent + "%", {persist: true, loader: true});
        }
      }
      xhr.onload = function (e) { 
        var resp = JSON.parse(e.currentTarget.response)
          , status = e.currentTarget.status;
        if (status > 299) { 
          util.notify("Error! " + e.error);
        } else {
          util.notify(resp + " documents created.", {showFor: 10000});
        }
        recline.initializeTable(app.offset);
      }
      xhr.open('PUT', app.baseURL + "api/upload/" + app.datasetInfo._id);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file)
      
      // var reader = new FileReader();
      // reader.readAsText(file);
      // reader.onload = function(event) {
      //   couch.request({
      //     url: app.baseURL + "api/upload/" + app.datasetInfo._id,
      //     type: "POST", 
      //     data: event.target.result
      //   }).then(function(done) {
      //     util.notify("Data uploaded successfully!");
      //     recline.initializeTable(app.offset);
      //   })
      // };
    } else {
      util.notify('File not selected. Please try again');
    }
  };

  return {
    evalFunction: evalFunction,
    previewTransform: previewTransform,
    mapDocs: mapDocs,
    updateDocs: updateDocs,
    updateDoc: updateDoc,
    uploadDocs: uploadDocs,
    deleteColumn: deleteColumn,
    ensureCommit: ensureCommit,
    uploadCSV: uploadCSV 
  };
}();