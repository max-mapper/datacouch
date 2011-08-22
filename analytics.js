var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc = { _id: '_design/analytics' };

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (userCtx.roles.indexOf('_admin') > -1) return;
  if (newDoc) throw "Admins only";
};

ddoc.views = {
  popular_datasets: {
    map: function(doc) { 
      if(doc.page.indexOf('edit/') > -1) emit([doc.page.split('edit/')[1], doc.ip], 1)
    },
    reduce: "_sum"
  }
}

module.exports = ddoc;