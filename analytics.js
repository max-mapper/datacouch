var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc = { _id: '_design/analytics' };

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (userCtx.roles.indexOf('_admin') > -1) return;
  if (newDoc) throw "Admins only";
};

module.exports = ddoc;