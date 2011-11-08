var couchapp = require('couchapp')
  , path = require('path')
  ;

module.exports = {
  _id: '_design/backup',
  views: {
    revisions: {
      map: function(doc) {
        emit(doc._id.split("-"), 1);
      },
      reduce: "_sum"
    }
  }
}