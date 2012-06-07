

var maple = require('../treeRouter.js')
   , tree = new maple.RouteTree()
   , assert = require('assert')


//the purpose of this test is to make sure similar routes don't interfere with one another. I made this because I had an early bug where routes differing by 1 letter would sometimes match
tree.define('/trees.e/', function () {
  console.log('/trees.e')
})

tree.define('/trees/', function () {
  console.log('/trees')
})

tree.define('/tree/', function () {
  console.log('/tree')
})

var matcher

matcher = tree.match('/tree')
matcher.fn()

matcher = tree.match('/trees')
matcher.fn()

matcher = tree.match('/trees.e')
matcher.fn()
