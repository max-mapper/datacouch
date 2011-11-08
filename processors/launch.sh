#!/bin/bash
cd analytics && forever start collect_analytics.js
cd ../auth && forever start auth_server.js
# cd ../backup && forever start backup_documents.js
cd ../provision && forever start provision_databases.js
cd ../stats && forever start compute_stats.js
cd ../uploader && forever start uploader.js
cd ../sharejs && forever start sharejs_server.js
cd ../reverse_proxy && forever start proxy_server.js
cd ../