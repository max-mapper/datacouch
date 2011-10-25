// adapted from https://github.com/harthur/costco. heather rules

var costco = function() {
  
  function evalFunction(funcString) {
    try {
      eval("var editFunc = " + funcString);
    } catch(e) {
      return {errorMessage: e+""};
    }
    return editFunc;
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
    });
  }

  function mapDocs(docs, editFunc, callback) {
    var edited = []
      , failed = []
      , updatedDocs = []
      ;
  
    var q = async.queue(function (doc, done) {
      try {
        editFunc(_.clone(doc), function(updated) {
          if (updated && !_.isEqual(updated, doc)) {
            edited.push(updated);
          }
          updatedDocs.push(updated);
          done();
        });
      } catch(e) {
        failed.push(doc)
        done(e);
      }
    }, 20);

    q.drain = function() {
      callback({
        edited: edited, 
        docs: updatedDocs, 
        failed: failed
      })
    }

    _.map(docs, function(doc) {
      q.push(doc, function(err) {
        if (err) console.log('processing error', err)
      })
    })
  }
  
  function updateDocs(editFunc) {
    var dfd = $.Deferred();
    util.notify("Download entire database into Recline. This could take a while...", {persist: true, loader: true});
    couch.request({url: app.dbPath + "/json"}).then(function(docs) {
      util.notify("Updating " + docs.docs.length + " documents. This could take a while...", {persist: true, loader: true});
      mapDocs(docs.docs, editFunc, function(transformed) {
        uploadDocs(transformed.edited).then(
          function(updatedDocs) { 
            util.notify(updatedDocs.length + " documents updated successfully");
            recline.initializeTable(app.offset);
            dfd.resolve(updatedDocs);
          },
          function(err) {
            dfd.reject(err);
          }
        );
      });
    });
    return dfd.promise();
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
      var reader = new FileReader();
      reader.readAsText(file);
      reader.onload = function(event) {
        var payload = {
          url: app.dbPath + "/_bulk_docs", // todo more robust url composition
          data: event.target.result
        };
        var worker = new Worker('/script/costco-csv-worker.js');
        worker.onmessage = function(message) {
           message = JSON.parse(message.data);
           if (message.done) {
             var error = couch.responseError(JSON.parse(message.response))
             if (error) {
               app.emitter.emit(error, 'error');
             } else {
               util.notify("Data uploaded successfully!");
               recline.initializeTable(app.offset);
             }
             util.hide('dialog');
           } else if (message.percent) {
             if (message.percent === 100) {
               util.notify("Waiting for CouchDB...", {persist: true, loader: true})
             } else {
               util.notify("Uploading... " + message.percent + "%");            
             }
           } else {
             util.notify(JSON.stringify(message));
           }
         };
         worker.postMessage(payload);
      };
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