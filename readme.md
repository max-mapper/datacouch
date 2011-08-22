# DataCouch

A dataset collaboration network built on top of CouchDB. Very much a work in progress/alpha software.

## Installation

This will walk you through getting datacouch dev environment running on your local machine. Please note that datacouch makes extensive use of CouchDB rewrites and vhosts so there is a bit of configuration that needs to happen during the install.

Requirements: node.js and CouchDB. To support log in with BrowserID you will need to compile Couch with this plugin: http://github.com/iriscouch/browserid_couchdb (default installed on every iriscouch.com instance). For testing purposes you don't need the plugin installed.

get Couch >= 1.1 and set up an admin user account

create these databases:

    // the main database. each document inside it will correspond to a user's dataset
    // and will contain metadata such as # docs, if it was forked, etc
    datacouch
    
    // user profile documents will be stored here
    datacouch-users
    
    // unique visits to each dataset will be logged here
    datacouch-analytics

setup the Couch configuration like so:

    httpd, allow_jsonp, true
    httpd, secure_rewrites, false
    vhosts, datacouch.dev, /datacouch/_design/datacouch/_rewrite
    httpd_global_handlers, _analytics, {couch_httpd_proxy, handle_proxy_req, <<"http://localhost:9876">>}
    
add or edit the following line to/in your /etc/hosts file

    127.0.0.1	localhost couchdb.dev
    
install node.js v0.4.8 and npm

    // install node
    git clone clone git://github.com/joyent/node.git
    cd node/
    git checkout v0.4.8
    ./configure && make && make install
    // then install npm
    curl http://npmjs.org/install.sh | sh

install the required npm modules

    cd datacouch/
    npm install couchapp
    npm install couchapp -g
    cd processors/
    npm install request crypto deferred underscore follow
  
deploy the various couchapps to your Couch:

    cd datacouch/
    couchapp push app.js http://admin:pass@localhost:5984/datacouch
    couchapp push users.js http://admin:pass@localhost:5984/datacouch-users
    couchapp push analytics.js http://admin:pass@localhost:5984/datacouch-analytics
  
start the various node async processes (these should always be running somewhere)

    node provision_databases.js http://admin:pass@localhost:5984 datacouch
    node compute_stats.js http://admin:pass@localhost:5984
    node collect_analytics.js http://admin:pass@localhost:5984/datacouch-analytics

now you can launch datacouch:

    open http://datacouch.dev:5984
    
to log in without browserid during development, visit futon at http://couchdb.dev:5984/api/couch/_utils and use the "sign up" and "login" buttons in the bottom right corner to create and log into non-admin local test user accounts