
var maple = require('../treeRouter.js')
   , tree = new maple.RouteTree()
   , assert = require('assert')

//test console warning. If the console doesn't print a warning, something is wrong
// should print 1 warning per redefinition
tree.define('/hello/:world', function () {})
tree.define('/hello/:foo', function () {})

tree.define('/wildcard/*', function (){})
tree.define('/wildcard/*', function () {})

tree.define('/foo/bar/', function () {})
tree.define('/foo/bar/', function () {})

tree.define('/home/:filename.html', function (){})
tree.define('/home/:anothername.html', function (){})
