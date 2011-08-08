/**  Creates databases for users
  *  Usage: change settings then "node provision_databases.js"
  *  Author: Max Ogden (@maxogden)
 **/

var follow = require('follow')
  , request = require('request')
  ;

var couch = "http://admin:admin@localhost:5984"
  , db = couch + "/datacouch"
  , h = {"Content-type": "application/json", "Accept": "application/json"}
  ;

follow({db:db, include_docs:true}, function(error, change) {
  if (error || change.deleted || !("doc" in change)) return;
  if (!("type" in change.doc)) return;
  if (change.doc.type !== "newDB") return;
  var doc = change.doc;
  var dbName = couch + "/" + encodeURIComponent(emailToDB(doc.user) + "/" + doc.name);
  request({uri: dbName, method: "HEAD", headers: h}, function(err, resp, body) {
    if(resp.statusCode === 404) {
      console.log('creating ' + dbName);
      request({uri: dbName, method: "PUT", headers: h}, function (err, resp, body) {
        if (err) throw new Error('ahh!! ' + err);
        if (!JSON.parse(body).ok) throw new Error('error creating: ' + body);
      })
    }
  })
})

function emailToDB(email) {
  return email.replace(/@/ig, "/").replace(/\./ig, "$");
}