

var maple = require('../treeRouter.js')
   , tree = new maple.RouteTree()
   , assert = require('assert')

tree.define('/hello/world', function () {
  console.log('hello world')
})

tree.define('/hello/saam', function () {
   console.log('hello saam')
})

tree.define('/colon/:hello/definite', function () {
   console.log('colon definite')
})
//note, above route will hold preference because it was defined first
//note, when routes overlap, it is good practice to name the colon arguments the same, because otherwise, you may run into funky behavior
tree.define('/colon/:hello/:finish', function () {
   console.log('colon match')
})

tree.define('/wildcard/*', function () {
   console.log('wildcard')
})

tree.define(/\/regexp\/match\//, function () {
   console.log('regexp match')
})
tree.define(/\/regexp\/(\w+)\/?/, function () {
  console.log('regexp with word group')
})

tree.define('/', function () { //root matching is optimized to run in constant time
   console.log('root match')
})

tree.define('/files/:file.:format', function () {
   console.log('file and format')
   this.next.call(this, 'testing', 'argument', 'list')
   //will call below routes function ...
})
tree.define('/files/', function () {
  console.log('arguments to next() length => ' + arguments.length) 
  console.log('next() was correctly invoked')
})

tree.define('/form.json', function () {
   console.log('form.json')
})

var matcher
matcher = tree.match('/hello/saam/')
assert.ok(matcher.perfect)

matcher = tree.match('/hello/world/')
assert.ok(matcher.perfect)

matcher = tree.match('/colon/saam/last')
assert.ok(matcher.perfect)
assert.equal(matcher.params.hello, 'saam')
assert.equal(matcher.params.finish, 'last')

matcher = tree.match('/colon/saam')
assert.equal(false, matcher.perfect)
assert.equal(matcher.params.hello, 'saam') //notice route doesn't match perfectly, but the param should still exist

matcher = tree.match('/colon/saam/definite')
assert.ok(matcher.perfect)
assert.equal(matcher.params.hello, 'saam')

matcher = tree.match('/colon/hello%20world/definite') //test decodeURIComponent
assert.ok(matcher.perfect)
assert.equal(matcher.params.hello, 'hello world')

matcher = tree.match('/wildcard/i/can/match/anything')
assert.ok(matcher.perfect)
assert.equal(matcher.extras[0], 'i/can/match/anything')

matcher = tree.match('/wildcard/')
if (matcher.fn) { throw new Error("this route should not match")}

matcher = tree.match('/regexp/match')
assert.ok(matcher.perfect)

matcher = tree.match('/regexp/wordgroup')
assert.ok(matcher.perfect)
assert.equal(matcher.extras[0], 'wordgroup')

matcher = tree.match('/')
assert.ok(matcher.perfect)

matcher = tree.match('/files/index_one.html')
assert.ok(matcher.perfect)
assert.equal(matcher.params.file, 'index_one')
assert.equal(matcher.params.format, 'html')

matcher = tree.match('/files/ind_ex.html/doesnt_exist')
assert.equal(false, matcher.perfect)

matcher = tree.match('/form.json')
assert.ok(matcher.fn)


console.log('\n\nall tests have passed')




