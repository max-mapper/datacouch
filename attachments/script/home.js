var app = {
	baseURL: util.getBaseURL(window.location.href),
	container: 'main_content',
	emitter: util.registerEmitter(),
	cache: {}
};

couch.dbPath = app.baseURL + "api/";
couch.rootPath = couch.dbPath + "couch/";

app.handler = function(route) {
  if (route.params && route.params.route) {
    var path = route.params.route;
    app.routes[path](route.params.id);
  } else {    
    app.routes['home']();
  }  
};

app.showDatasets = function(name) {
  var url = app.baseURL + "api/datasets/";
  if (name) {
    url += name;
  } else {
    name = "Recent Datasets";
  }
  return couch.request({url: url}).then(function(resp) {
    var datasets = _.map(resp.rows, function(row) {
      return {
        url: app.baseURL + 'edit#/' + row.id,
        id: row.id,
        user: row.doc.user,
        gravatar_url: row.doc.gravatar_url,
        size: util.formatDiskSize(row.doc.disk_size),
        name: row.value,
        date: row.doc.createdAt,
        nouns: row.doc.nouns,
        count: row.doc.doc_count - 1 // TODO calculate this programatically
      };
    })
    if (datasets.length > 0) {
      util.render('datasets', 'datasetsContainer', {
        loggedIn: function() { return app.session.userCtx.name },
        name: name,
        datasets: datasets
      });      
    } else {
      couch.request({url: app.baseURL + "api/users/" + name}).then(
        function(res) { util.render('datasets', 'datasetsContainer', {name: name}) }
      , function(err) { util.render('noUser', 'datasetsContainer', {name: name}) }
      )
    }
  })
}

app.routes = {
  home: function() {
    if (window.location.pathname.indexOf('_rewrite') > -1) {
      var user = window.location.pathname.split('_rewrite')[1].replace('/', '');
    } else {
      var user = $.url(window.location.pathname).segment()[0];
    }
    if (user.length > 0) {
      app.showDatasets(user);
    } else {
      app.emitter.on('login', function(name) {
        app.showDatasets(name);
        app.emitter.clear('login');
      })
      app.emitter.on('session', function(session) {
        if(!session.userCtx.name) app.showDatasets();
      })
    }
    monocles.fetchSession();
  },
  "new": function() {
    monocles.ensureProfile().then(function(profile) {
      util.show('dialog');
      util.render( 'newDatasetForm', 'dialog-content' );
    })
  },
  fork: function(id) {
    monocles.ensureProfile().then(function(profile) {
      util.show('dialog');
      util.render('loadingMessage', 'dialog-content', {message: "Forking to your account..."});
      couch.request({url: app.baseURL + "api/" + id }).then( function( dataset ) { 
        couch.request({url: couch.rootPath + "_uuids"}).then( function( data ) { 
          var docID = data.uuids[ 0 ];
          var doc = {
            forkedFrom: dataset._id,
            _id: "dc" + docID,
            type: "database",
            description: dataset.description,
            name: dataset.name,
            user: app.profile._id,
            gravatar_url: app.profile.gravatar_url,
            createdAt: new Date()
          };
          couch.request({url: app.baseURL + "api/" + doc._id, type: "PUT", data: JSON.stringify(doc)}).then(function(resp) {
            var dbID = resp.id
              , dbName = dbID + "/_design/recline"
              ;
            function waitForDB(url) {
              couch.request({url: url, type: "HEAD"}).then(
                function(resp, status){
                  app.sammy.setLocation(app.baseURL + 'edit#/' + dbID);
                },
                function(resp, status){
                  console.log("not created yet...", resp, status);
                  setTimeout(function() {
                    waitForDB(url);
                  }, 500);
                }
              )
            }
            waitForDB(couch.rootPath + dbName);
          });
        });
      });
    })
  },
  settings: function() {
    monocles.ensureProfile().then(function(profile) {
      util.show('dialog');
      util.render( 'editProfileForm', 'dialog-content', profile );
    })    
  },
  logout: function() {
    couch.logout().then(function() {
      util.render('userControls', 'userControls');
      delete app.session;
      $( '#header' ).data( 'profile', null );
      app.sammy.setLocation("#");
    })
  }
}

app.after = {
  newProfileForm: function() {
    $('.cancel').click(function(e) {
      util.hide('dialog');
      app.sammy.setLocation("#");
    })
    $(".profile_setup input[name='username']").keyup(function() {
      var input = $(this);
      input.removeClass('available').removeClass('notAvailable').addClass('loading');
      $('.username-message').text('');
      util.delay(function() {
        var username = input.val();
        couch.get( "users/search/" + username).then(function(response) {
          input.removeClass('loading');
          if ( response.rows.length > 0 ) {
            input.addClass('notAvailable');
            $('.username-message').text('username taken!')
          } else {
            input.addClass('available');
            $('.username-message').text('username available!')
          }
        })
      }, 500)();
    });
    $('.profile_setup').submit( function( e ) {
      monocles.generateProfile( $( e.target ) );
      e.preventDefault();
      util.hide('dialog');
      return false;
    });
  },
  editProfileForm: function() {
    $('.cancel').click(function(e) {
      util.hide('dialog');
      app.sammy.setLocation("#");
    })
    $( '.profile_setup' ).submit( function( e ) {
      monocles.updateProfile($( e.target ).serializeObject());
      e.preventDefault();
      util.hide('dialog');
      app.sammy.setLocation("#");
      return false;
    });
  },
  newDatasetForm: function() {
    var doc = {}, docID;
    couch.request({url: couch.rootPath + "_uuids"}).then( function( data ) { docID = data.uuids[ 0 ] });
    $('.cancel').click(function(e) {
      util.hide('dialog');
      app.sammy.setLocation("#");
    })
    var inputs = $(".dataset_setup textarea[name='description'], .dataset_setup input[name='name']");
    var renderIcons = _.throttle(function() {
        var input = $(this);
        input.addClass('loading');
        app.cache.words = {};
        var words = _.reduce(inputs, function(memo, el){ return memo + " " + $(el).val() }, "").replace(/[^\w\s]|_/g, "").replace(/\s+/g, ' ').trim().split(' ');
        var requests = _.map(words, function(word) {
          var request = util.lookupIcon(word);
          request.then(function(resp) {
            var matches = _.map(_.keys(resp.svg), function(match) {
              return {
                noun: match.toLowerCase(),
                svg: resp.svg[match]
              };
            })
            matches = _.select(matches, function(match){ return word === match.noun });
            _.each(matches, function(match) {
              app.cache.words[match.noun] = match;
            })
            doc.nouns = _.map(app.cache.words, function(word) {return word});
            util.render('nouns', 'nounContainer', {nouns: doc.nouns, nounsExist: function() {return doc.nouns.length > 0}});
          })
          return request.promise();
        })
        $.when.apply(null, requests).then(function() { inputs.removeClass('loading') })
      }, 1000);
    inputs.keyup(renderIcons);
    $( '.dataset_setup' ).submit( function( e ) {
      var form = $( e.target ).serializeObject();
      $.extend(doc, {
        _id: "dc" + docID,
        name: form.name,
        type: "database",
        user: app.profile._id,
        gravatar_url: app.profile.gravatar_url,
        createdAt: new Date()
      });
      couch.request({url: app.baseURL + "api/" + doc._id, type: "PUT", data: JSON.stringify(doc)}).then(function(resp) {
        var dbID = resp.id
          , dbName = dbID + "/_design/recline"
          ;
        function waitForDB(url) {
          couch.request({url: url, type: "HEAD"}).then(
            function(resp, status){
              app.sammy.setLocation(app.baseURL + 'edit#/' + dbID);
            },
            function(resp, status){
              console.log("not created yet...", resp, status);
              setTimeout(function() {
                waitForDB(url);
              }, 500);
            }
          )
        }
        util.render('loadingMessage', 'dialog-content', {message: "Creating dataset..."});
        waitForDB(couch.rootPath + dbName);
      })
      e.preventDefault();
      return false;
    });
  },
  loginButton: function() {
    $('.login').click(function(e) {
      monocles.showLogin();
      return false;
    })
  },
  actions: function() {
    $('.button').click(function(e) { 
      var action = $(e.target).attr('data-action');
      util.position('menu', e, {left: -60, top: 5});
      util.render(action + 'Actions', 'menu');
      recline.handleMenuClick();
    });
  },
  datasets: function() {
    $('.timeago').timeago();
    $('svg').height('15px').width('25px');
  },
  nouns: function() {
    $('svg').height('30px').width('50px');
  }
}

app.sammy = $.sammy(function () {
  this.get('', app.handler);
  this.get("#/", app.handler);
  this.get("#:route", app.handler);
  this.get("#:route/:id", app.handler);
});

$(function() {  
  app.sammy.run();  
})