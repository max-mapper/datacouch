var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc = { _id: '_design/analytics' };

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (userCtx.roles.indexOf('_admin') > -1) return;
  if (newDoc) throw "Admins only";
};

ddoc.views = {
  uniques: {
    map: function(doc) { emit([doc.ip, doc.page], 1)},
    reduce: "_sum"
  }
}

module.exports = ddoc;