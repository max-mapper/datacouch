

var maple = require('../treeRouter.js')
   , tree = new maple.RouteTree({'fifo' : false})
   , assert = require('assert')

//note cbs.length is one less than matching routes, this is because the best match is placed in match.fn when '.match()' is invoked
//keep in mind, these functions can be defined in any order, because there are no conflicts between them
tree.define('/hello/', function () {
  console.log('/hello/')
  this.next()
})
tree.define('/hello/world', function () {
  console.log('/hello/world/')
  this.next()
})
tree.define('/hello/world/foo/', function () {
  console.log('/hello/world/foo/')
  this.next()
})
tree.define('/hello/world/foo/bar/', function () {
  console.log('/hello/world/foo/bar')
  this.next() //note, there is no next for this route, but make sure no crash 
})

var match = tree.match('/hello/world/foo/bar')
console.log('callbacks length before invocation => ' + match.cbs.length)
match.fn()
console.log('callbacks length after invocation => ' + match.cbs.length) 

console.log('\n\n')
match = tree.match('/hello/world/')
console.log('callbacks length before invocation => ' + match.cbs.length)
match.fn()
console.log('callbacks length after invocation => ' + match.cbs.length) 


