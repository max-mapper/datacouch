# DataCouch

A dataset collaboration network built on top of CouchDB. Developed as a free software @codeforamerica project for the City of Boston by @maxogden

Very much a work in progress as of Spring 2012!

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

NOTE: find me in IRC on freenode/#couchdb if you get confused

This will walk you through getting datacouch running on your local machine.

Requirements: node.js >= 0.6 and CouchDB >= 1.1

Install node.js v0.6.11 and npm

    // install node
    git clone clone git://github.com/joyent/node.git
    cd node/
    git checkout v0.6.11
    ./configure && make && sudo make install
    // then install npm
    curl http://npmjs.org/install.sh | sh

Simply [build couchdb](https://github.com/iriscouch/build-couchdb) or do `brew install couchdb`. Once the install is successful, start your server and visit the [Futon](http://localhost:5984/) to make sure it worked.

Create a couchdb admin user via the futon admin / logout area in the bottom right corner of the screen. You can't run datacouch in admin party.

You need to go [create a twitter app](https://dev.twitter.com/apps/new) in order to use datacouch (it uses Twitter for login).
NOTE: If you create a new app and leave the callback url blank then datacouch will fail to authenticate. Twitter will respond with a 401 of "Desktop applications only support the oauth_callback value 'oob'". Just enter "http://localhost" as your callback url.

Once your app is complete copy the consumer secret, key and couch url (with admin credentials) into your environment via `.bashrc`/`.bash_profile`:

    export DATACOUCH_TWITTER_KEY="KEY FROM https://dev.twitter.com/ HERE"
    export DATACOUCH_TWITTER_SECRET="SECRET FROM https://dev.twitter.com/ HERE"
    export DATACOUCH_ROOT="http://admin:pass@localhost:5984"

Once you save your environment variables either: close your terminal or run `source .bashrc` or `source .bash_profile` to load your environment changes.

Now you can start datacouch!

    node run.js
    open http://localhost:9999
