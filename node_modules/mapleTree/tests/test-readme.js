
 var maple = require('../treeRouter.js') 
   , router = new maple.RouteTree()
  
 router.define('/foo/bar/', function () {
   console.log('foo/bar route')
 })
 
 router.define('/hello/:foo', function () {
   console.log('hello/:foo')
 })
 
 router.define('/files/:file.:format/', function () {
   console.log('file callback')
   console.log('filename =>' + this.params.file + '.' + this.params.format)
 })

 var match = router.match('/foo/bar/')
 match.fn()  //prints 'foo/bar route'
 
 match = router.match('/hello/world')
 match.fn()        //prints 'hello/:foo'
 console.log(match.params.foo) //prints 'world'
 
 match = router.match('/files/index.html') 
 match.fn()  //prints 'filename => index.html'
 

 router = new maple.RouteTree({'fifo' : false }) //redefine router for test so we don't get route conflicts

 router.define('/hello/', function () {
   console.log('/hello/')
   this.next()
 })
 router.define('/hello/world/', function () {
   console.log('/hello/world/')
   this.next()
 })
 router.define('/hello/world/foo/', function () {
   console.log('/hello/world/foo/')
   this.next()
 })

 var match = router.match('/hello/world/foo')
 match.fn()
 /* PRINTS =>
  *  /hello/world/foo
  *  /hello/world/ 
  *  /hello/
 */

 router.fifo = true  //first match is invoked first now
 match = router.match('/hello/world/foo')
 match.fn()
 /* PRINTS =>
  *  /hello/
  *  /hello/world/ 
  *  /hello/world/foo/
 */
