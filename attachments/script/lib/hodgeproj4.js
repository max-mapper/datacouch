/*
  hodgeproj4.js -- Convenience for proj4js Javascript reprojection library.   
  Author:      Jesse Bounds :: rebounds.net
  Requirements: proj4js.js (http://trac.osgeo.org/proj4js) and Proj4 projection definitions (http://spatialreference.org/ref/epsg/)
*/

/**
 * Namespace: Proj4js
 *
 * hodgeproj4 makes it easier to use the Proj4js JavaScript library to transform point coordinates from one 
 * coordinate system to another, including datum transformations by wrapping calls to the underlying library
 * in a convenient, self documenting interface
 *
 * Using it is a layup:
 *
 * Simply include the requisite scripts in your page header:
 * 
 *      <!-- proj4js script from osgeo.org/proj4js -->
 * 		<script src="/javascripts/proj4js-combined.js"></script>
 *      <!-- the proj4 projection definition (for any non WGS84/EPSG:4236 projection - 
 *           you can find these at http://spatialreference.org/ref/epsg/) -->
 *  	<script src="/javascripts/defs/EPSG2249.js"></script>
 *      <!-- yours truly -->
 *  	<script src="/javascripts/hodgeproj4.js">
 * 
 *      -- NOTE: You do NOT have to include a script for WGS84/EPSG:4236 - proj4js has that one baked in! --
 * 
 * 	Now, go ahead, do a projection transformation!
 * 
 *  	// In this example, we go from Massachusetts State Plane to WGS84
 *  	transformation = HodgeProj4.transform(761254.49731, 2944252.55218).from('EPSG2249').to('WGS84');
 *		// You just transformed x,y inline, so now you can do stuff like:
 *		drawDotOnMap(transformation.x, transformation.y); 
 * 
 *  You are so smart, nice job!
*/

/**
 * Global namespace object for hodgeproj4 
 */
HodgeProj4 = {
	
    /**
     * Property: point
     * proj4js point object
     */
	point: null,
	
	/**
     * Property: src
     * the proj4js projection object that can be used as the src in a transformation
     */
	src: null,
	
	/**
     * Property: destination
     * the proj4js projection object that can be used as the destination in a transformation
     */
	destination: null,
	
	/** 
    * Method: transform(x (lat), y (lon))
    * Set HodgeProj object's x,y coordinates so that we can do something with them 
    * (like transform them from one plane to the destination projection)
    *
    * Parameters:
    * x - {Proj4js.Proj} src map projection for the transformation
    * y - {Proj4js.Proj} destination map projection for the transformation
    * point - {Object} point to transform, may be geodetic (long, lat) or
    *     projected Cartesian (x,y), but should always have x,y properties.
    *
    * Returns:
    * HodgeProj4 object itself with the point property set using the passed in parameters
    */
	transform: function(x, y) {					
		this.point = new Proj4js.Point(x, y);   		
		return this;
	},
	
	/** 
    * Method: from(projection)
    * Set HodgeProj object's src property so that we can use it to transform
    * from this src projection to the destination projection
    *
    * Parameters:
    * projection - string that represents a valid Proj4 projection code
    *
    * Returns:
    * HodgeProj4 object itself with the src property set using the passed in parameter
    */
	from: function(projection) {
		this.src = new Proj4js.Proj(projection);
		return this;
	},
	
	/** 
    * Method: to(projection)
    * Set HodgeProj object's destination property so that we can use it to transform
    * from the src projection to this destination projection
    * Calling this method also performs the transformation on the point since 
    * hodgeproj4 has all required data that it needs to do a transformation
    *
    * Parameters:
    * projection - string that represents a valid Proj4 projection code
    *
    * Returns:
    * HodgeProj4 object itself with the destination property set using the passed in parameter
    */
	to: function(projection) {
		this.destination = new Proj4js.Proj(projection);
		Proj4js.transform(this.src, this.destination, this.point); 
		return this;
	}
	
};