
mapleTree
=========

mapleTree is a small, recursive router for Node.js. It works by creating a routing tree and searching for full and partial matches.
mapleTree is designed to be minimal. It is written with the intention that other libraries will be built on top of it or extend its functionality.

####Install
    npm install mapleTree
#### From Source
    git clone git://github.com/saambarati/mapleTree.git
    cd mapleTree
    npm link

API
---

### Simple Routing
     var mapleTree = require('mapleTree') 
       , router = new mapleTree.RouteTree()
      
     router.define('/foo/bar/', function () {
       console.log('foo/bar route')
     })
     
     router.define('/hello/:foo', function () {
       console.log('hello/:foo')
     })
     
     router.define('/files/:file.:format/', function () {
       console.log('file callback')
       console.log('filename =>' + this.params.file + '.'+ this.params.format)
     })
    
     /*
      *  the matcher object  contains a few important properties. It is what is returned from a router.match() call
      *  matcher.cbs = {Array}                           //collection of callbacks, the closest match first
      *  matcher.fn = {function}                         //placeholder for best matching function. The best depends on 'fifo' being true or false. (see below)
      *  matcher.perfect = {boolean} default => false    //were we able to match an exact path, or did we only match partially?
      *  matcher.extras = {Array}                        //match a regexp capture group that isn't part of params
      *  matcher.params = {Object}                       //collection of colon args
      *  matcher.next {function}                         //invoke next matching function if one exists
     */ 
     var match = router.match('/foo/bar/')
     match.fn()  //prints 'foo/bar route'
     
     match = router.match('/hello/world')
     match.fn()        //prints 'hello/:foo'
     console.log(match.params.foo) //prints 'world'
     
     match = router.match('/files/index.html') 
     match.fn()  //prints 'filename => index.html'
     
  
### Partial Matches -- *first in first out / first in last out*
     var mapleTree = require('mapleTree') 
       , router = new mapleTree.RouteTree({'fifo' : false })
  
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
     //or when creating the router you can pass an options obj  => new maple.RouteTree({'fifo' : true})
     match = router.match('/hello/world/foo')
     match.fn()
     /* PRINTS =>
      *  /hello/
      *  /hello/world/ 
      *  /hello/world/foo/
     */
  

### Some Notes

Routing using `match.next` will not match against the root (`/`) route. I figure if you need a function to run against
the root, it is better served being run outside of the router, considering you want it to run every time.
I could be wrong about this stance though, and am interested in listening to arguments defending the contrary. 
Maybe if enough people want the functionality I can add it as an option when instantiating the router similar to `fifo`.





