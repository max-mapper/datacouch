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
    pages (URL routed with SugarSkull, hrefs like "#/" or "#/bob")
      home
      activity
    actions (no URL change triggered, hrefs like "#/cancel!" or "#/logout!")
      new
      settings
      login
      logout
      cancel
*/

app.routes = {
  pages: {
    welcome: function() {
      util.render( 'welcome', 'content' );
      util.render( 'banner', 'bannerContainer' );
      util.render( 'loginButton', 'userButtons' );

      app.emitter.on('login', function(name) {
        window.location.href = "#/activity";
      })
    },
    activity: function(username) {
      util.render('stream', 'content');
      util.render('userControls', 'userControls');
      monocles.ensureProfile().then(function(profile) {      
        util.render( 'loggedIn', 'session_status', {
          username : profile._id,
          avatar : profile.avatar
        });
        util.showDatasets(username);
        if (username) {
          couch.request({url: app.baseURL + 'api/users/' + username}).then(function(profile) {
            profile.avatar = profile.avatar.replace('_normal.', '_bigger.');
            util.render('bio', 'infoContainer', profile);
          })
        } else {
          util.render('info', 'infoContainer');
        }
        util.render('userActions', 'userButtons')
      });
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
    var inputs = $(".dataset_setup textarea[name='description'], .dataset_setup input[name='name']");
    var renderIcons = _.throttle(function() {
        var input = $(this);
        input.addClass('loading');
        app.cache.words = {};
        var words = _.reduce(inputs, function(memo, el) { 
          return memo + " " + $(el).val()
        }, "")
          .replace(/[^\w\s]|_/g, "")
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ');
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
        description: form.description,
        type: "database",
        user: app.profile._id,
        avatar: app.profile.avatar,
        createdAt: new Date()
      });
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
        util.render('loadingMessage', 'modal', {message: "Creating dataset..."});
        waitForDB(couch.rootPath + dbName);
      })
      e.preventDefault();
      return false;
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

$(function() {
  
  $('a').live('click', function(event) {
    var route =  $(this).attr('href');
    util.catchModals(route);
  });
  
  app.defaultRoute = function() {
    monocles.fetchSession().then( function( session ) {
      if ( session.userCtx.name ) {
        window.location.href = "#/activity";
      } else if ( util.isAdminParty( session.userCtx ) ) {
        util.render( 'adminParty', 'userButtons' );
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
    '/:username': {on: 'activity'},
  }).use({ resource: app.routes.pages, notfound: function() {console.log('notfound')} }).init('/');
  
})