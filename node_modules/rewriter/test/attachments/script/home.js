// redirect /someuser to /#/someuser
(function() {
  var user = $.url(window.location.href).segment(1)
  if (user.length > 0) window.location.href = $.url(window.location.href).attr('base') + '/#/' + user;  
})()

var app = {
  baseURL: util.getBaseURL(window.location.href),
  container: 'main_content',
  emitter: util.registerEmitter(),
  cache: {}
};

couch.dbPath = app.baseURL + "api/";
couch.rootPath = couch.dbPath + "couch/";

/*
  app.routes
    - pages (URL routed with SugarSkull, hrefs like "#/" or "#/bob")
    - modals (no URL change triggered, hrefs like "#/cancel!" or "#/logout!")
*/

app.routes = {
  pages: {
    welcome: function() {
      util.render( 'welcome', 'content' );
      util.render( 'banner', 'bannerContainer' );
      util.render( 'loginButton', 'userButtons' );
      
      couch.request({url: app.baseURL + 'api/datasets/newurbanmechs?limit=5'}).then(function(response) {
        var datasets = _(response.rows).map(function(dataset) { return dataset.doc });
        util.render('recentDatasets', 'featured-datasets', {datasets: datasets});
      })

      app.emitter.on('login', function(name) {
        window.location.href = "#/activity";
      })
    },
    activity: function(username) {
      util.render('stream', 'content');
      monocles.fetchSession().then(function() {
        if(util.loggedIn()) {
          monocles.ensureProfile().then(function(profile) {
            util.render('userControls', 'userControls');
            util.render('userActions', 'userButtons');
            util.render( 'loggedIn', 'session_status', {
              username : profile._id,
              avatar : profile.avatar
            });
          })
        } else {
          util.render('smallLogin', 'userControls');
        }
      })
      util.showDatasets(username);
      if (username) {
        couch.request({url: app.baseURL + 'api/users/' + username}).then(function(profile) {
          profile.avatar = profile.avatar.replace('_normal.', '_bigger.');
          util.render('bio', 'infoContainer', profile);
        })
      } else {
        util.render('info', 'infoContainer');
      }
    }
  },
  modals: {
    loggedin: function() {
      window.close();
    },
    "new": function() {
      monocles.ensureProfile().then(function(profile) {
        util.show('dialog');
        util.render( 'newDatasetForm', 'modal' );
      })
    },    
    settings: function() {
      monocles.ensureProfile().then(function(profile) {
        util.show('dialog');
        util.render( 'editProfileForm', 'modal', profile );
      })    
    },
    login: function() {
      monocles.showLogin(function() {
        window.location.href = "#/activity";
      });
    },
    logout: function() {
      couch.logout().then(function() {
        util.render('empty', 'userButtons');
        util.render('userControls', 'userControls');
        delete app.session;
        $( 'body' ).data( 'profile', null );
        window.location.href = "#/welcome";
      })
    },
    cancel: function() {
      util.hide('dialog');
    },
    close: function() {
      window.close();
    }
  }
}

app.after = {
  newProfileForm: function() {
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
            $('.username-message').text('unavailable!')
          } else {
            input.addClass('available');
            $('.username-message').text('available!')
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
    $( '.profile_setup' ).submit( function( e ) {
      monocles.updateProfile($( e.target ).serializeObject());
      e.preventDefault();
      util.hide('dialog');
      window.location.href = "#/";
      return false;
    });
  },
  newDatasetForm: function() {
    var doc = {}, docID;
    couch.request({url: couch.rootPath + "_uuids"}).then( function( data ) { docID = data.uuids[ 0 ] });
    var input = $(".modal #icon-picker")
      , iconThrottler = _.throttle(util.renderIcons, 1000);
    input.keyup(iconThrottler);
    
    $('.modal-footer .ok').click(function(e) {
      var defaultProperties = {
        _id: "dc" + docID,
        type: "database",
        user: app.profile._id,
        avatar: app.profile.avatar,
        createdAt: new Date()
      };
      
      _.extend(doc, $('.modal form').serializeObject(), defaultProperties);
      
      var selectedNoun = $('.nounWrapper.selected .icon-subtitle').text()
      if (selectedNoun.length > 0) doc.nouns = [app.nouns[selectedNoun]];

      util.hide('dialog');
      couch.request({url: app.baseURL + "api/" + doc._id, type: "PUT", data: JSON.stringify(doc)}).then(function(resp) {
        var dbID = resp.id
          , dbName = dbID + "/_design/recline"
          ;
        function waitForDB(url) {
          couch.request({url: url, type: "HEAD"}).then(
            function(resp, status){
              window.location = app.baseURL + 'edit/#/' + dbID;
            },
            function(resp, status){
              console.log("not created yet...", resp, status);
              setTimeout(function() {
                waitForDB(url);
              }, 500);
            }
          )
        }
        util.show('dialog');
        util.render('loadingMessage', 'modal', {message: "Creating dataset..."});
        waitForDB(couch.rootPath + dbName);
      })
    })
  },
  datasets: function() {
    $('.timeago').timeago();
    util.bindInfiniteScroll()
  },
  nouns: function() {
    $('.nounContainer svg').click(function(e) {
      $('.nounWrapper.selected').removeClass('selected');
      $(e.currentTarget).parents('.nounWrapper').toggleClass('selected')
    })
  }
}

$(function() {
  
  // route all link clicks through the catchModals function
  $('a').live('click', function(event) {
    var route =  $(this).attr('href');
    util.catchModals(route);
  });
  
  app.defaultRoute = function() {
    monocles.fetchSession().then( function( session ) {
      console.log(session)
      if ( session.userCtx.name ) {
        window.location.href = "#/activity";
      } else if ( util.isAdminParty( session.userCtx ) ) {
        util.render( 'adminParty', 'content' );
      } else {
        window.location.href = "#/welcome";
      }
    });
  }
  
  app.router = Router({
    '/': {on: app.defaultRoute},
    '/welcome': {on: 'welcome'},
    '/activity': {on: 'activity'},
    '/(\\w+)!': {on: function(modal) { util.catchModals("#/" + modal + "!") }},
    '/:username': {on: 'activity'}
  }).use({ resource: app.routes.pages, notfound: function() { console.log('notfound') } })

  // see if route matches /#/someuser
  var user = $.url(window.location.href).fsegment(1);
  if (user.length > 0) {
    app.router.init("/" + user);
  } else {
    app.router.init('/');
  }

})