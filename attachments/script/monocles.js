var monocles;

$(function(){
  monocles = function() {

    var oldestDoc = null,
      streamDisabled = false,
      newUser = false;

    var db = couch.db(app.baseURL + "api");

    function userProfile() {
      return app.profile;
    }
    
    function loginFail() { alert('oh noes! an error occurred whilst logging you in') };

    // binds UX interaction and form submit event handlers to the signup/login forms
    function showLogin(callback) {
      $.oauthpopup({
        path: app.baseURL + "api/twitter/login",
        callback: callback
      });
    }

    // gets user's stored profile info from couch
    function fetchProfile(session) {
      var dfd = $.Deferred();
      couch.request({url: app.baseURL + "api/profile"}).then(
        function(profile) {
          app.profile = profile;
          dfd.resolve( profile );
        },
        function(error) {
          dfd.reject(error)
        }
      )
      return dfd.promise();
    }

    function updateProfile(profileDoc) {
      var dfd = $.Deferred();
      
      function upload(updatedDoc) {
        couch.request({url: app.baseURL + "api/users", data: JSON.stringify(updatedDoc), type: "POST"}).then(function(resp) {
          updatedDoc._rev = resp.rev;
          app.profile = updatedDoc;
          dfd.resolve(updatedDoc);
        });
      }

      couch.request({ url: app.baseURL + "api/users/" + profileDoc._id }).then(
        function( profile ) {
          $.extend(profile, profileDoc);
          upload(profile);
        },
        function(err) {
          if (err.status === 404) {
            upload(profileDoc);
          }
        }
      )
      return dfd.promise();
    };

    function generateProfile(form) {
      var newProfile = form.serializeObject();
      newProfile._id = newProfile.username;
      delete newProfile.username;
      newProfile.rand = Math.random().toString(); 
      updateProfile(newProfile).then(fetchSession);
    }

    function switchNav(route) {
      var nav = $("#aspect_nav ul");
      nav.find(".selected").removeClass('selected');
      var link = nav.find("a[href=#" + route + "]");
      link.parents('li').addClass('selected');
      $(".aspect-header a").text(link.attr('data-label'));
    }

    function initFileUpload() {
      var docURL
        , currentFileName
        , uploadSequence = [ ];

      couch.request({url: couch.rootPath + "_uuids"}).then(  
        function( data ) { 
          docURL = couch.dbPath + data.uuids[ 0 ] + "/";
        }
      )

      $( '.file_list' ).html( "" );

      var uploadSequence = [];
      uploadSequence.start = function (index, fileName, rev) {
        var next = this[index];
        currentFileName = fileName;
        var url = docURL + fileName;
        if ( rev ) url = url + "?rev=" + rev;
        next(url);
        this[index] = null;
      };

      $('#file_upload').fileUploadUI({
        multipart: false,
        uploadTable: $( '.file_list' ),
        downloadTable: $( '.file_list' ),
        buildUploadRow: function ( files, index ) {
          return $( $.mustache( $( '#uploaderTemplate' ).text(), { name: files[ index ].name } ));
        },
        buildDownloadRow: function ( file ) {
          return $( '<tr><td>' + currentFileName + '<\/td><\/tr>' );
        },
        beforeSend: function (event, files, index, xhr, handler, callBack) {
          uploadSequence.push(function (url) {
            handler.url = url;
            callBack();
          });
          if (index === 0) {
            uploadSequence.splice(0, uploadSequence.length - 1);
          }
          if (index + 1 === files.length) {
            uploadSequence.start(0, files[ index ].fileName);
          }
        },
        onComplete: function (event, files, index, xhr, handler) {
          app.pendingDoc = handler.response;
          var nextUpload = uploadSequence[ index + 1 ];
          if ( nextUpload ) {
            uploadSequence.start( index + 1, files[ index ].fileName, app.pendingDoc.rev );
          }
        },
        onAbort: function (event, files, index, xhr, handler) {
          handler.removeNode(handler.uploadRow);
          uploadSequence[index] = null;
          uploadSequence.start(index + 1, handler.url);
        }
      });
    }

    // pubsubhubbubb notification functions
    function subscribeHub() {
      var callbackURL = "http://" + document.domain + app.baseURL + "push"
        , topicURL = "http://" + document.domain + app.baseURL + "feeds/" + userProfile().name;
      $.post(app.hubURL, { 
        "hub.mode": "subscribe", "hub.verify": "sync", "hub.topic": topicURL, "hub.callback": callbackURL
      })
    }

    function pingHub() {
      var publishURL = "http://" + document.domain + app.baseURL + "feeds/" + userProfile().name;
      $.post(app.hubURL, { 
        "hub.mode": "publish", "hub.url": publishURL
      })
    }

    function submitPost( e ) {
      var form = this;
      var date = new Date();
      var post = {
        type: "note",
        created_at : date,
        profile : userProfile(),
        message : $( "[name=message]", form ).val(),
        hostname : document.domain
      };

      if ( app.pendingDoc ) {
        db.get(app.pendingDoc.id).then(function(doc) {
          db.save( $.extend({}, post, doc )).then( afterPost );
        })
      } else {
        db.save( post ).then( afterPost );
      }

      e.preventDefault();
      return false;
    }

    function afterPost( newDoc ) {
      // Clear post entry form
      $( "form.status_message [name=message]" ).val( "" );
      $( '.file_list' ).html( "" );
      app.pendingDoc = null;

      // Reload posts
      getPostsWithComments( { reload: true } );

      // notify the pubsubhubbub hub
      // pingHub();
    }

    function randomToken() {
      return String( Math.floor( Math.random() * 1000 ) );
    }

    function disableStream() {
      if ( streamDisabled === false ) {
        $( 'header' ).fadeOut( 200 );
        $( '.stream' ).hide();
        streamDisabled = true;
      }
    }

    function enableStream() {
      if ( streamDisabled ) {
        $( 'header' ).fadeIn( 200 );
        $( '.stream' ).show();
        streamDisabled = false;
      }
    }

    function showLoader() {
      $( '.loader' ).removeClass( 'hidden' );
    }

    function hideLoader() {
      $( '.loader' ).addClass( 'hidden' );
    }

    function loaderShowing() {
      var showing = false;
      if( $( '.loader' ).css( 'display' ) !== "none" ) showing = true;
      return showing;
    }

    function getPostsWithComments( opts ) {
      enableStream();
      var opts = opts || {};
      if( opts.offsetDoc === false ) return;
      var posts, comments;
      showLoader();

      // Renders only when posts and comments are both loaded.
      function renderStream() {
         if ( posts && comments ) {
          hideLoader();

          if ( posts.length > 0 ) {
            var append = true;
            if ( opts.reload ) append = false;
            util.render( 'stream', 'content', {data: renderPostsWithComments( posts, comments ), append: append} );
          } else if ( ! opts.offsetDoc ){
            util.render( 'empty', 'content' );
          }
        }
      }

      var query = {
        "descending" : true,
        "limit" : 20
      }

      if ( opts.offsetDoc ) {
        $.extend( query, {
          "startkey": opts.offsetDoc.key,
          "startkey_docid": opts.offsetDoc.id,
          "skip": 1
        })
      }

      couch.get('stream', {data: query} ).then(
        function( data ) {
          if( data.rows.length === 0 ) {
            oldestDoc = false;
            hideLoader();
            posts = [];
          } else {
            oldestDoc = data.rows[ data.rows.length - 1 ];
            posts = data.rows;
          }
          renderStream();
        }
      );

      var commentsQuery = {
        "descending" : true,
        "limit" : 250
      }

      couch.get( 'comments', {data: commentsQuery}).then( 
        function( data ) {
          comments = data;

          // Reverse order of comments
          comments.rows = comments.rows.reduceRight( function( list, c ) {
            list.push( c );
            return list;
          }, [] );

          renderStream();
        }
      );
    }

    function renderPostsWithComments( posts, comments ) {
      var data = {
        items : _.map(posts, function( r ) {
          var postComments = comments.rows.filter(
            function( cr ) {
              return cr.value.parent_id === r.id;
            }).map( 
            function( cr ) {
              return $.extend({
                id : cr.id,
                created: cr.value.created_at,
                message : util.linkSplit( cr.value.message )
              }, cr.value.profile );
            }), 
            photos = [], 
            files = [];

            var attachments = _.keys( r.value._attachments || {} );

            _.each(attachments, function( file ) { 
              var attachment = { 
                name : file,
                url: couch.dbPath + r.id + "/" + file
               };
                if (r.value._attachments[file].content_type.match(/(jpe?g|png|gif)/ig)) {
                  photos.push(attachment);
                } else {
                  files.push(attachment);
                }
              }
            );

          return $.extend({
            comments : postComments,
            latestComments: postComments.slice( -2 ),  // grab the last 2 comments
            hasComments : postComments.length > 0,
            hasHiddenComments : postComments.length > 2,
            commentCount : postComments.length,
            hiddenCommentCount : postComments.length - 2,
            randomToken : randomToken(),
            message : util.linkSplit( r.value.message ),
            id: r.id,
            created_at : r.value.created_at,
            hostname : r.value.hostname || "unknown",
            files : files,
            photos: photos
          }, r.value.profile );
        }),
        profile: userProfile(),
        db : "api",
        host: document.domain
      };
      data[ 'notid' ] = data[ 'items' ][ 0 ][ 'id' ];
      return data;
    }

    function getComments( postID ) {
      var commentsQuery = {
        startkey: [postID],
        endkey: [postID + "\u9999"]
      }
      cq = commentsQuery;
      return couch.get( 'comments', {data: commentsQuery});
    }

    function formatComments( postID, data ) {
      var comments = data.rows.map( function( r ) {
        return $.extend({
          id : r.id,
          created: r.value.created_at,
          message : util.linkSplit( r.value.message ),
          hostname : r.value.hostname || "unknown",
          randomToken : randomToken()
        }, r.value.profile );
      });

      return {
        id : postID,
        host: document.domain,
        empty : comments.length === 0,
        comments : comments
      };
    }

    function showComments( postID, post ) {
      getComments( postID ).then(function( comments ) {
        post.html( $.mustache( $( '#commentsTemplate' ).text(), formatComments( postID, comments ) ) );
        post.show().find( '*' ).show();
        post.closest( 'li' ).find( 'a.show_post_comments' ).hide().end().find( 'a.hide_post_comments' ).show();
        post.find( 'label' ).inFieldLabels();
        post.find( '.timeago' ).timeago();
        $( 'form', post ).submit( submitComment );
        $( ".hover_profile", post ).cluetip( { local: true, sticky: true, activation: "click" } );
      });
    }

    function saveComment(comment) {
      var dfd = $.Deferred();
      db.save(comment).then(function() {
        db.get(comment.parent_id).then(function(post) {
          if (!post.updated_at || post.updated_at < comment.created_at) post.updated_at = comment.created_at;
          post.comment_count = (post.comment_count || 0) + 1;
          db.save(post).then(function() {
            dfd.resolve(comment);
          });
        })
      })
      return dfd.promise();
    }

    function submitComment( e ) {
      var form = $(this)
        , date = new Date()
        , parent = form.closest( '.stream_element' )
        , parent_id = parent.attr( 'data-post-id' )
        , parent_created_at = parent.attr( 'data-created-at' )
        , doc = {
            created_at : date,
            profile : userProfile(),
            message : form.find( '[name=message]' ).val(),
            hostname : document.domain,
            parent_id : parent_id,
            parent_created_at : parent_created_at
        };
      saveComment( doc ).then( function( savedComment ) {
        form.find( '[name=message]' ).val( '' );
        showComments( parent_id, form.closest( 'div.comments' ) );
      });

      e.preventDefault();
      return false;
    }

    function decorateStream() {
      $( ".hover_profile" ).cluetip( { local: true, sticky: true, activation: "click" } );
      $( '.timeago' ).timeago();
      $( 'a.hide_post_comments' ).click( function( e ) {
        var comment = $( this ).closest( 'li' ).find( 'div.comments' );
        comment.find( '*' ).remove();
        comment.closest( 'li' ).find( 'a.hide_post_comments' ).hide().end().find( 'a.show_post_comments' ).show();
        e.preventDefault();
      })

      $( 'a.show_post_comments' ).click( function( e ) {
        var postComments = $( this );
        var post = postComments.closest( '.stream_element' ).find( 'div.comments' )
          , postID = postComments.closest( '.stream_element' ).attr( 'data-post-id' );

        showComments( postID, post );
        e.preventDefault();
      })
    }

    return {
      db: db,
      userProfile: userProfile,
      showLogin: showLogin,
      fetchProfile: fetchProfile,
      updateProfile: updateProfile,
      generateProfile: generateProfile,
      switchNav: switchNav,
      initFileUpload: initFileUpload,
      subscribeHub: subscribeHub,
      pingHub: pingHub,
      submitPost: submitPost,
      afterPost: afterPost,
      randomToken: randomToken,
      disableStream: disableStream,
      enableStream: enableStream,
      showLoader: showLoader,
      hideLoader: hideLoader,
      loaderShowing: loaderShowing,
      getPostsWithComments: getPostsWithComments,
      renderPostsWithComments: renderPostsWithComments,
      getComments: getComments,
      formatComments: formatComments,
      showComments: showComments,
      submitComment: submitComment,
      decorateStream: decorateStream
    }

  }();
})