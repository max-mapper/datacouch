var app = {
  baseURL: util.getBaseURL(window.location.href),
  container: 'main_content',
  emitter: util.registerEmitter(),
  cache: {},
  reservedPages: ['edit']
};

couch.dbPath = app.baseURL + "api/";
couch.rootPath = couch.dbPath + "couch/";

/*
 app.routes
   pages
    home
    user
  modals
    new
    settings
    logout
  actions
    fork
*/
app.routes = {
  pages: {
    home: function() {

      util.showDatasets();      
      util.showTrendingsets();      

      var user;
      // If we are not logged in, show the banner
      monocles.fetchSession().then( function( session ) {

        if( !session.userCtx.name ){
          util.render( 'banner', 'bannerContainer' );
        }

      });

      app.emitter.on('login', function(name) {
        $('.banner').slideUp();
      })
    },
    user: function(){
      monocles.fetchSession();
      
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
  },
  modals: {
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
    logout: function() {
      couch.logout().then(function() {
        util.render('empty', 'userButtons');
        util.render('userControls', 'userControls');
        delete app.session;
        $( '#header' ).data( 'profile', null );
        app.routes.pages['home']();
        history.pushState({}, "", "/");
      })
    },
    fork: function(id) {
      monocles.ensureProfile().then(function(profile) {
        util.show('dialog');
        util.render('loadingMessage', 'modal', {message: "Forking to your account..."});
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
                    window.location = app.baseURL + 'edit/' + dbID;
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
    }
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
    $('.cancel').click(function(e) {
      util.hide('dialog');
      app.routes['home']();
    })
    $( '.profile_setup' ).submit( function( e ) {
      monocles.updateProfile($( e.target ).serializeObject());
      e.preventDefault();
      util.hide('dialog');
      app.routes.pages['home']();
      return false;
    });
  },
  newDatasetForm: function() {
    var doc = {}, docID;
    couch.request({url: couch.rootPath + "_uuids"}).then( function( data ) { docID = data.uuids[ 0 ] });
    $('.cancel').click(function(e) {
      util.hide('dialog');
      app.routes.pages['home']();
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
        description: form.description,
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
              window.location = app.baseURL + 'edit/' + dbID;
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
    var id = '';
    route = route.replace('#', '').split('/');
    
    if( route.indexOf('/') ) {
      id = route[1]
    }    
    
    route = route[0]
    app.routes[ route ]( id ); 
 
  } else {
    app.routes.pages['user']();      
  }  
}

$(function() {  
    
  // set the route as the pathname, but loose the leading slash
  var route = window.location.pathname.replace('/', '');

  util.routeViews( route );
  
  $('a').live('click', function( event ) {
    /*
      Basic rules of this router:
        We are going to let the following types of hrefs through
         * links off domain (contains http://)
         * point to elements in app.reservedKeywords through
         
        If it's not one of these things, then we are going to prevent default and
          * If there is a hash in the href, we're going to launch a modal
          * Otherwise, we're going to pushState and render a page view
    */
    
    var route =  $(this).attr('href')

    // If "http://" is in the route, we're going to let it through, and this function is over
    if( route.indexOf( 'http://' ) > -1) {
      return;
    }

    // If the route contains one of our reserved pages, let it through
    if( route.split('/')[0].indexOf(app.reservedPages) > -1){
      return;
    }

    // If it's not off tld or if it's not going to start with a reserved page,
    // then we're going to prevent default and handle everything with javascript
    event.preventDefault();
    util.routeViews( route )
  });

  $(window).bind('popstate', function() {

    event.preventDefault();

    util.routeViews( $.url(window.location.pathname).segment()[0] );
  });
})