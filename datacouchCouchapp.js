var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc = { _id: '_design/datacouch'};

ddoc.views = {
  /**
   * A simple map function mocking _all, but allows usage with lists etc.
   */
  all: {
    map: function(doc) {
      emit(doc._id, doc);
    }
  },
  by_user: {
    map: function(doc) {
      if(doc.type === "database") emit([doc.user, doc.createdAt] , doc.name);
    }
  },
  by_date: {
    map: function(doc) {
      if(doc.type === "database") emit(doc.createdAt, doc.name);
    }
  },
  popular: {
    map: function(doc) {
      if(doc.hits) emit(doc.hits);
    }
  },
  templates: {
    map: function(doc) {
      if(doc.type === "template") emit(doc.name);
    }
  },
  applications: {
    map: function(doc) {
      if(doc.type === "app") emit(doc.dataset);
    }
  },
  applications_by_user: {
    map: function(doc) {
      if(doc.type === "app") emit(doc.user);
    }
  },
  forks: {
    map: function(doc) {
      if(doc.forkedFrom) emit(doc.forkedFrom);
    }
  }
};

ddoc.filters = {
  by_value: function(doc, req) {
    if (!req.query.k || !req.query.v || !doc[req.query.k]) return false;
    return doc[req.query.k] === req.query.v;
  }
}


module.exports = ddoc;