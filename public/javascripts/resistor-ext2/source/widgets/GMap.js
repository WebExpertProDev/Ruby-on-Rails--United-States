Ext.namespace('RExt.google');
RExt.google.GMap = Ext.extend(Ext.Panel, {
    
    markers : null,
    
    order: null,
        
    /**
     * @property (Boolean}
     * loaded
     */
    loaded: false,
    
    /**
     * @private {google.maps.Map2}     
     * ptr to google maps instance     
     */
    map : null,
        
	/**
	 * @private {google.maps.Directions}	
	 */
	directions : null,
    
    /**
     * @private {google.maps.GeoCache}      
     * ptr to google maps GeoCache instance
     */
    cache : null,
    
    /**
     * @private {google.maps.GeoClientCoder}     
     * ptr to google geo-coder instance
     */
    geo : null,           
    
    // following are std Ext.Window params
    layout: 'fit',
    frame: true,			    
    border: true,
    header: false,        
    
    /***
     * initComponent
     */               
    initComponent : function() {
        
        if (typeof(google) != 'undefined') {
            Ext.onReady(function(){
                this.buildMap();
            }, this);            
        }
                                                                                                                           
        RExt.google.GMap.superclass.initComponent.call(this);
    },
    	     
	/***
	 * buildMap (onRender)
	 *
	 */
	buildMap : function() {                		                		                       		
                
        var mapEl = Ext.getBody().createChild({tag:'div', cls:'x-hidden'});
                       
        this.on('render', function() {            
            this.body.appendChild(mapEl);     
            mapEl.removeClass('x-hidden');                    
        },this);
        
        // bodyresize, relay resize events to gmap
        this.on('bodyresize', function(p, w, h) {
            mapEl.setWidth(w);
            mapEl.setHeight(h);
            this.map.checkResize();
        });
                
        // create Map2 instance
        this.map = new google.maps.Map2(mapEl.dom, {});

		// add zoom controls
		this.map.addControl(new GSmallMapControl());

		// create GEO Coder instance;
		this.geo = new GClientGeocoder();

		// create cache
		this.cache = new google.maps.GeocodeCache();

		// set GeoCache.  should I do this??  was cacheing / load-tab before.
		//this.geo.setCache(this.cache);

		// default center the map.
        this.map.setCenter(new google.maps.LatLng(37.4419, -122.1419), 13);
        
        this.directions = new google.maps.Directions(this.map);                                           	           
	},
	
    load : function(markers) {                                          
        this.markers = markers;  
        this.refresh();  
                
    },
    
	/***
	 * isLoaded
	 * true if GMap libs were loaded
	 * @return {Bool}
	 */
	isLoaded : function() {
		return this.rendered;
	},

	/***
	 * getMap
	 * return the GMap instance
	 * @return {google.maps.Map2 || false}
	 *
	 */
	getMap : function() {
        return (this.rendered == true) ? this.map : false;
	},
	        
    createMarkers : function(locations) {           
        var markers = new Ext.util.MixedCollection();
        var map = this.getMap();
        for (var n=0,len=locations.length;n<len;n++) {
            var l = locations[n];
            if (l.lat && l.lng) {
                var marker = new google.maps.Marker(new google.maps.LatLng(l.lat, l.lng));                                                                                
                markers.add(l.id, marker);                                                                                 
            }                    
        }              
        return markers;
    },
    
    createMarker : function(l) {
        if (l.lat && l.lng) {
            var marker = new google.maps.Marker(new google.maps.LatLng(l.lat, l.lng)); 
            if (this.markers.containsKey(l.id)) {
                this.markers.replace(l.id, marker);
            }
            else {
                this.markers.add(l.id, marker);
            }    
                                                                                              
            return marker;                                
        }         
    },
            
    refresh : function() {                                
        this.map.clearOverlays();
        var points = [];
        var prev = null;
        this.markers.each(function(m) {            
            points.push(m.getLatLng());
            this.map.addOverlay(m);               
        },this);  
        if (points.length) {
            var poly = new google.maps.Polyline(points);
            this.map.addOverlay(poly);
            
            this.fireEvent('load', {                
                markers: this.markers,
                polyline: poly        
            });                              
        }                                           
    },
                   	
	/***
	 * showLocation
	 * @param {Object} company
	 * 	@cfg {String} zip
	 * 	@cfg {String} address1
	 *	@cfg {String} address2
	 * 	@cfg {Object} city {name, iso, lat, lng}
	 *  @cfg {Object} country {name, iso}
	 *  @cfg {Object} region {name, iso}
	 * @param {google.maps.Marker}
	 * @param {Object} el, the dialog show el.
	 */
	showLocation : function(location) {                                   						
        var marker = this.markers.get(location.id);
        if (!marker) {
            throw new Error('Could not find that location on the map');                      
        }        
                                          
		this.map.setCenter(marker.getLatLng());
				
        var info = ['<div class="gmap-info-popup">',
            '<h2>' + location.name + '</h2>',
            '<address>' + location.addr1 + '<br />',
                location.city.name + ' ' + location.region.iso + ', ' + location.country.iso
        ];
        if (location.phone1) { info.push('<br /><strong>Phone1:</strong> ' + location.phone1); }               
        if (location.phone2) { info.push('<br /><strong>Phone2:</strong> ' + location.phone2); }
        if (location.fax) { info.push('<br /><strong>FAX:</strong> ' + location.fax); }
        if (location.email) { info.push('<br /><strong>Email:</strong> ' + location.email); }
        info.push('</address>', '</div>');        
        marker.openInfoWindowHtml(info.join(''));

		this.map.setZoom(13);				
        this.setTitle(location.name);

	},
    
    drawZone : function(center, radius, color){
    	//Function created by Chris Haas
    	
    	var circleQuality = 5						//1 is best but more points, 5 looks pretty good, too
    	var points = [];							//Init Point Array
    	oldCenter = center;
    	oldRadius = radius;
    	var M = Math.PI / 180;						//Create Radian conversion constant
    	var L = this.map.getBounds();					//Holds copy of map bounds for use below
    	var circleSquish = 1;
    	var T = this.map.getCurrentMapType();    	
        circleSquish = (L.minX - L.maxX) / (L.minY - L.maxY);	//The map isn't completely square so this calculates the lat/lon ratio
    	
        //Loop through all degrees from 0 to 360
    	for(var i=0; i<=360; i+=circleQuality){
    		var P = new GPoint(center.x + (radius * Math.cos(i * M)) * circleSquish, center.y + (radius * Math.sin(i * M)));
    		points.push(P);
    	}
    	oldPoly = new GPolyline(points, color)
    	this.map.addOverlay(oldPoly);
    }
});

/***
 * RExt.google.MapStore
 * A special extension of Ext.data.Store for GMap
 */
RExt.google.MapStore = Ext.extend(Ext.data.Store, {
    
});

/***
 * RExt.google.LocationRecord
 * record for map Store
 */
RExt.google.LocationRecord = Ext.data.Record.create([
    {name: 'id'},
    {name: 'name'},    
    {name: 'country'},
    {name: 'region'},
    {name: 'city'},
    {name: 'airport'}, 
    {name: 'is_primary'},           
    {name: 'is_billing'},
    {name: 'lat'},
    {name: 'lng'},
    {name: 'marker'}       
]);

/***
 * RExt.google.LocationLink
 * A special extension of RExt.LinkButton that knows how to deal with locations
 * @param {Object} l
 */
RExt.google.LocationLink = Ext.extend(RExt.LinkButton, {
    location : null,
    
    setLocation : function(l) {
        this.location = l;    
    },
    getLocation : function() { return this.location; },
    
    reset : function() {
        this.location = null;    
    },
    
    onClick : function(ev, node) {
        if (this.location == null) { return false; }
        RExt.google.LocationLink.superclass.onClick.call(this, this.location);            
    }
});

