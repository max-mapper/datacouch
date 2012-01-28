

var fs = require('fs')
  , join = require('path').join
  , JSONStream = require('./')
  , es = require('event-stream')
  , request = require('request')
  , floby = require('json-streams').createParseStream()
var file = join(__dirname, 'test/fixtures/all_docs_include.json')
  , stat = fs.statSync(file)
  , parser = JSONStream.parse(['rows',/./])


function checkStream() {
  var start = Date.now()
    fs.createReadStream(file).pipe(floby)
floby.on('end', function (err, array) {
      var time = Date.now() - start
    
      console.error({type: 'JSONStream.parse', size: stat.size, time: time})
    })
}
  
function checkParse() {
  var start = Date.now()
  fs.readFile(file, function (err, json) {
    var obj = JSON.parse(json)
    var time = Date.now() - start
    
    console.error({type: 'JSON.parse', size: stat.size, time: time})
    checkStream()   
  })
}

checkParse()