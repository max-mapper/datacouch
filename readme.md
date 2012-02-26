# DataCouch

A dataset collaboration network built on top of CouchDB. Developed as a free software @codeforamerica project for the City of Boston by @maxogden

Very much a work in progress as of Winter 2011/2012!

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

NOTE: these instructions aren't 100% done yet. find me in IRC on freenode/#couchdb if you get confused

This will walk you through getting datacouch dev environment running on your local machine.

Requirements: node.js >= 0.6 and CouchDB >= 1.1

Simply [build couchdb](https://github.com/iriscouch/build-couchdb). Once the install is successful, start your server and visit the [Futon](http://localhost:5984/). Create a new admin user via the admin / logout area in the bottom right corner of the screen.

Create these databases:

    // the main database. each document inside it will correspond to a user's dataset or app
    // and will contain metadata such as # docs, if it was forked, etc
    datacouch
    
    // user profile documents will be stored here
    datacouch-users
    
    // user auth sessions will be stored here
    datacouch-sessions

Setup the Couch configuration like so:

    httpd, allow_jsonp, true

Install node.js v0.6.7 and npm

    // install node
    git clone clone git://github.com/joyent/node.git
    cd node/
    git checkout v0.6.7
    ./configure && make && make install
    // then install npm
    curl http://npmjs.org/install.sh | sh

Install the required npm modules

    cd datacouch/
    npm install (this installs the deps defined in `/package.json`)
    npm install couchapp -g (this installs the `couchapp` binary command globally)

Deploy the main datacouch couchapp to your Couch. It mostly sets database permissions and adds database views:

    couchapp push couchapp.js http://admin:pass@localhost:5984/datacouch

Once deployed you will need to go [create a twitter app](https://dev.twitter.com/apps/new) in order to use datacouch. 
NOTE: If you create a new app and leave the callback url blank then datacouch will fail to authenticate. Twitter will respond with a 401 of "Desktop applications only support the oauth_callback value 'oob'"

Once your app is complete copy the consumer secret and key into your envirnonment via `.bashrc`/`.bash_profile`:

    export DATACOUCH_TWITTER_KEY="KEY FROM https://dev.twitter.com/ HERE"
    export DATACOUCH_TWITTER_SECRET="SECRET FROM https://dev.twitter.com/ HERE"

Once you save your environment variables either: close your terminal or run `source .bashrc` or `source .bash_profile` to load your environment changes.

Last thing to do is to edit the default settings in `service/defaults.js`.

Now you can start datacouch!

    node run.js
    open http://localhost:9999


notes:

twitter keys registration sucks, use localhost for callback
apps database was missing
dont do npm install, use bundled
transforming errors
catch transform syntax errors
rename column