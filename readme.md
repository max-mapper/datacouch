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

get Couch and set up an admin user account

![_users db security settings](http://i.imgur.com/vBMw7.png)

create these databases:

    // the main database. each document inside it will correspond to a user's dataset or app
    // and will contain metadata such as # docs, if it was forked, etc
    datacouch
    
    // user profile documents will be stored here
    datacouch-users
    
    // user auth sessions will be stored here
    datacouch-sessions

setup the Couch configuration like so:

    httpd, allow_jsonp, true

install node.js v0.6.7 and npm

    // install node
    git clone clone git://github.com/joyent/node.git
    cd node/
    git checkout v0.6.7
    ./configure && make && make install
    // then install npm
    curl http://npmjs.org/install.sh | sh

install the required npm modules

    cd datacouch/
    npm install (this installs the deps defined in `/package.json`)
    npm install couchapp -g (this installs the `couchapp` binary command globally)

deploy the main datacouch couchapp to your Couch. it mostly sets database permissions and adds database views:

    couchapp push couchapp.js http://admin:pass@localhost:5984/datacouch

go to dev.twitter.com and make an app and then add some environment variables to your `.bashrc`/`.bash_profile`:

    export DATACOUCH_ROOT="http://admin:pass@localhost:5984"
    export DATACOUCH_TWITTER_KEY="KEY FROM https://dev.twitter.com/ HERE"
    export DATACOUCH_TWITTER_SECRET="SECRET FROM https://dev.twitter.com/ HERE"

now you can open datacouch!

    open http://localhost:9999
