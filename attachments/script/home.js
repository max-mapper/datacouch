var app = {
	baseURL: util.getBaseURL(window.location.href),
	container: 'main_content',
	emitter: util.registerEmitter(),
	cache: {}
};

couch.dbPath = app.baseURL + "api/";
couch.rootPath = couch.dbPath + "couch/";

app.routes = {
  home: function() {
    
    util.showDatasets();      
    
    var user;
    // If we are not logged in, show the banner
    monocles.fetchSession().then( function( session ) {
      
      if( !session.userCtx.name ){
        util.render( 'banner', 'bannerContainer' );
      }
      
      // Otherwise, show the global data feed
      //util.showDatasets();

    });
    
    app.emitter.on('login', function(name) {
      $('.banner').slideUp();
    })
  },
  user: function(){
    var username;

    // If we're using the full path to the design doc
    // then split on _rewrite, and the user name will be the first thing
    // after that
    if (window.location.pathname.indexOf('_rewrite') > -1) {
      username = window.location.pathname.split('_rewrite')[1].replace('/', '');

    // Otherwise, it's the first thing adter the TLD
    } else {
      username = $.url(window.location.pathname).segment()[0];
    }

    util.showDatasets( username );
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
            forkedFromUser: dataset.user,
            _id: "dc" + docID,
            type: "database",
            description: dataset.description,
            name: dataset.name,
            user: app.profile._id,
            couch_user: app.session.userCtx.name,
            gravatar_url: app.profile.gravatar_url,
            createdAt: new Date()
          };
          couch.request({url: app.baseURL + "api/" + doc._id, type: "PUT", data: JSON.stringify(doc)}).then(function(resp) {
            var dbID = resp.id
              , dbName = dbID + "/_design/recline"
              ;
            function waitForDB(url) {
              couch.request({url: url, type: "HEAD"}).then(
                function(resp, status) {
                  window.location = app.baseURL + 'edit#/' + dbID;
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
      app.routes['home']();
      history.pushState({}, "", "/");
      
    })
  }
}

app.after = {
  newProfileForm: function() {
    $('.cancel').click(function(e) {
      util.hide('dialog');
      app.routes['home']();
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
      app.routes['home']();
    })
    $( '.profile_setup' ).submit( function( e ) {
      monocles.updateProfile($( e.target ).serializeObject());
      e.preventDefault();
      util.hide('dialog');
      app.routes['home']();
      return false;
    });
  },
  newDatasetForm: function() {
    var doc = {}, docID;
    couch.request({url: couch.rootPath + "_uuids"}).then( function( data ) { docID = data.uuids[ 0 ] });
    $('.cancel').click(function(e) {
      util.hide('dialog');
      app.routes['home']();
    })
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
        type: "database",
        user: app.profile._id,
        couch_user: app.session.userCtx.name,
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
              window.location = app.baseURL + 'edit#/' + dbID;
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

var routeTemplate = function( route ){
  
  if( route.split('')[0] === '#' ){

    route = route.replace('#', '')
    
    app.routes[ route ]();
 
  } else {
 
    app.routes.user();      
 
  }  
}

$(function() {  
  app.routes['home']();    

  if( $.url(window.location.pathname).segment()[0].length ){
    app.routes['user']();
  }
  
  $('a').live('click', function( event ) {
    var route =  $(this).attr('href');

    if( route.split('#')[0] != 'edit') {
      event.preventDefault();
      history.pushState({}, "", route);
      routeTemplate( route );
    }

  });

  $(window).bind('popstate', function() {

    event.preventDefault();

    routeTemplate( $.url(window.location.pathname).segment()[0] );
  });
})