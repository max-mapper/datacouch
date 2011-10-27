# DataCouch

A dataset collaboration network built on top of CouchDB. Developed as a free software @codeforamerica project for the City of Boston by @maxogden

Very much a work in progress as of Fall 2011!

## Features

- Free public dataset hosting
- Dataset forking
- JSON and CSV data import and export
- Bulk data cleanup interface based on Google Refine
- Automatic REST JSON API powered by CouchDB
- Real-time dataset replication and changes feed (SLEEP/syncable.org)
- Geospatial queries
- Data-driven HTML5 application hosting
- Etherpad/Google docs style collaborative wiki
- Out of the box app visualizations + templates
- In-browser application source editor
- Geographic point reprojection (between any EPSG definitions)

## Roadmap (fork and help out please!)

- Data catalog functionality (search, categories)
- UI for rolling back through different dataset revisions
- Dataset pull requests and merging interface
- XML, XLS and other import/export options
- Additional bulk data editing helper functions  
- Integration with BuzzData/CKAN/Infochimps (by convincing them to make better APIs)

## Installation

This will walk you through getting datacouch dev environment running on your local machine. Please note that datacouch makes extensive use of CouchDB rewrites and vhosts so there is a bit of configuration that needs to happen during the install.

Requirements: node.js ~0.4.8 and CouchDB >= 1.1

get Couch and set up an admin user account

go to the `_users` db in [Futon](http://localhost:5984/_utils) and set the Security settings Member Roles to `["_admin"]`. This will make it so that only admins can view `_users` documents because Datacouch uses them to store private tokens and other things that shouldn't be shared publicly.

![_users db security settings](http://i.imgur.com/vBMw7.png)

create these databases:

    // the main database. each document inside it will correspond to a user's dataset or app
    // and will contain metadata such as # docs, if it was forked, etc
    datacouch
    
    // user profile documents will be stored here
    datacouch-users
    
    // unique visits to each dataset will be logged here
    datacouch-analytics
    
![couch databases](http://i.imgur.com/UFUxj.png)
    
setup the Couch configuration like so:

    httpd, allow_jsonp, true
    httpd, secure_rewrites, false
    vhosts, datacouch.dev, /datacouch/_design/datacouch/_rewrite
    httpd_global_handlers, _smalldata, {couch_httpd_proxy, handle_proxy_req, <<"http://localhost:12345">>}
    
![couch configuration from futon](http://i.imgur.com/QZ1MQ.png)
    
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
    npm install (this installs the deps defined in `/package.json`)
    npm install couchapp -g (this installs the `couchapp` binary command globally)
    npm install forever -g (a node process manager similar to god or monit)
  
deploy the various couchapps to your Couch. these mostly set database permissions and adds database views:

    couchapp push app.js http://admin:pass@localhost:5984/datacouch
    couchapp push users.js http://admin:pass@localhost:5984/datacouch-users
    couchapp push analytics.js http://admin:pass@localhost:5984/datacouch-analytics

go to dev.twitter.com and make an app and then add some environment variables to your `.bashrc`/`.bash_profile`:

    export DATACOUCH_ROOT="http://admin:pass@localhost:5984"
    export DATACOUCH_NONADMIN_ROOT="http://localhost:5984"
    export DATACOUCH_VHOST="couchdb.dev:5984"
    export DATACOUCH_TWITTER_KEY="KEY FROM https://dev.twitter.com/ HERE"
    export DATACOUCH_TWITTER_SECRET="SECRET FROM https://dev.twitter.com/ HERE"

to setup the real-time wiki tab you need to do the following:

    cd processors/sharejs
    node setup_couch.js
    
to support geometry reprojections you'll need to replicate the following database to your couch:

    curl -X POST http://admin:admin@localhost:5984/_replicate -d '{"target":"http://admin:pass@localhost:5984/datacouch","source":"http://max.ic.ht/epsg", "create_target": true}' -H "Content-type: application/json"

start the various node async processes. these should always be running somewhere. think of them like async job workers. you will want to run 'npm install' from each `processors` directory to install the various dependencies. then to launch all the node processors:

    chmod +x launch.sh && ./launch.sh

now you can open datacouch!

    open http://datacouch.dev:5984
    
to log in without twitter during development, uncomment the line in `/app.js` that contains `/fakelogin` and then `couchapp push app.js` into `/datacouch` again to enable 'fake' login. you can then visit `http://datacouch.dev:5984/fakelogin` to log in using the dummy twitter data from `mock_response.json`. make sure to never enable the `/fakelogin` route in production!