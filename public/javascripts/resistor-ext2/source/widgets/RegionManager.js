/***
 * RExt.RegionManager
 * A widget for handling / rendering country / region / city comboBoxes
 * @author Chris Scott
 *
 */
RExt.RegionManager = function(param) {
       
	/*** @private countries array ***/
	if (typeof(param.countries) != 'undefined') {
		this.countries = param.countries;
	}
	this.id = 'region_manager';

	/*** @private formName, the name of the form, for building field names (eg: this.formName + '[country]' ***/
	this.formName = '';

	/*** @private idSuffix, optional suffix to apply to each field id to ensure uniqueness in Ext.ComponentMgr ***/
	this.idSuffix = '';

	this.param = param;

	/*** @private common reader for all fields ***/
	this.reader = new Ext.data.JsonReader({
        root: 'data',
        totalProperty: 'total',
        id: 'id'
    },[
        {name: 'id', mapping: 0},
        {name: 'name', mapping: 1}
    ]);
                            
	/***
	 * add to ComponentMgr for all to use
	 */
	Ext.ComponentMgr.register(this);        
    
};
RExt.RegionManager.prototype = {
    
    controller : 'region',
    
    countries : [],
            
    /***
     * defaultCountry [United States]
     * default this country in Country Combo.
     */
    defaultCountry : 'United States',
            
	/***
	 * setFormName
	 * sets the "formName" prefix
	 * @param {String} formName	the prefix to append to each ComboBox hiddenName (eg: company[country_id] -- "company" is prefix)
	 * @param {String} [idSuffix] optional idSuffix to append to Combo ids when multiple forms of same name will be rendered.
	 *                                     important when rendering to load-tabs, where multiple forms of same will exist.
	 *                                     this will ensure that each field has a unique name in Ext.ComponentMgr
	 */
	setFormName : function(name, idSuffix) {
		this.formName = name;
		if (typeof(idSuffix) != 'undefined') {
			this.idSuffix = idSuffix;
		}
	},
    
    /***
     * associate
     * wires up the given region fields to each other. 
     * @param {Object} param {country, region, city, airport}
     */    
    associate : function(country, region, city, airport) {        
		/***
		 * @event select
		 * 
		 */
		country.on('select', function() {
			region.reset();
		    region.lastQuery = null;
            region.doQuery('', true);
            if (typeof(city) != 'undefined') {
                city.reset();
                city.lastQuery = null;
            }
		});
		
        /***
		 * @event beforequery
		 * append the selected country id to the query, eg: 2:Brandon
		 * see docs Ext.form.ComboBox, for event sig.
		 * ev.query is what the user typed into the field.  you got here after a time of queryDelay
		 * @param {Object} ev
		 */
		region.on('beforequery', function(ev) {
            this.store.baseParams.country_id = country.getValue();			
		});
        
        if (typeof(city) != 'undefined') {
            /***
             * @event select
             * if city combo exists on same form, reset it when a new region is selected.
             */
            region.on('select', function(field, rec, index){
                city.lastQuery = null;
                city.store.baseParams.region_id = region.getValue();
                city.doQuery('', true);
            });
            
            /***
             * @event beforequery
             * listen to beforequery, append region_id to query if the region combo exists on same form.
             * @param {Object} ev
             */
            city.on('beforequery', function(ev){
                this.store.baseParams.region_id = region.getValue();
            });
            
            /***
             * @event add
             * listen to city combo [+] button to add a new city.
             * @param {Object} param
             */
            city.on('add', function(param) {
                this.onAddCity(city, region);    
            },this);
            
            if (typeof(region) != 'undefined') {
                region.doQuery('', true);
            }
        }
        
        if (typeof(airport) != 'undefined') {
            airport.on('add', function(param) {
                this.onAddAirport(airport, city);                            
            },this);
        }
        
    },
    
	/***
	 * renderCountry
	 * creates the country combo and attaches events.
	 * @param {Object} config	 
	 * @return {Object} Ext.form.ComboBox
	 *
	 */
	renderCountry : function(config) {
       
		var country = new Ext.form.ComboBox(Ext.apply({
	        name: 'country',			
	        hiddenName: this.formName + '[country_id]',
	        mode: 'local',
            tabIndex: 1,
            shadow: false,
	        fieldLabel: 'Country',
			triggerAction: 'all',
			forceSelection: true,
	        allowBlank: false,
	        displayField: 'name',
            value: this.defaultCountry,
	        valueField: 'id',
	        store: new Ext.data.SimpleStore({
	            fields: ['id', 'name'],
	            data: this.countries
	        })
	    },config));
        
        // select default country.  the Combo's being finicky here...not sure why I have to be so verbose
        // the keep the default country set.
        var index = country.store.find('name', this.defaultCountry);
        var rec = country.store.getAt(index);     
        country.setValue(rec.data.id); 
        
        // override reset method to make sure default country gets set properly
        country.reset = function() {
            Ext.form.ComboBox.superclass.reset.call(this);
            country.setValue(rec.data.id);
            country.setRawValue(rec.data.name);    
        };                      
		return country;
	},

	/***
	 * renderRegion
	 * creates a region ComboBox and attaches events
	 * @return {Object} Ext.form.ComboBox
	 *
	 */
	renderRegion : function(config) {
                
		 // build the Store & Proxy
	    var ds = new Ext.data.Store({
	        proxy: new Ext.data.HttpProxy({
	            url: 'region/query'
	        }),
	        reader: this.reader,
			baseParams: {country_id: ''}
	    });
		// build the ComboBox
	    var region = new Ext.form.ComboBox(Ext.apply({
	        name: 'region',		
            shadow: false,	
	        hiddenName: this.formName + '[region_id]',
	        fieldLabel: 'State', 
            emptyText: 'Select state...', 
            minChars: 2,          
			forceSelection: false,
            editable: true,
	        allowBlank: false,
	        mode: 'remote',
			triggerAction: 'all',            
	        valueField: 'id',
	        displayField: 'name',
			typeAhead: true,
	        store: ds,
            tabIndex: 1
	    },config));
		// listen to events.
        region.store.on('load', function(store, records, options) {            
            if (records.length == 1) {
                var rec = records.shift();
                region.setValue(rec.data.id);
                region.fireEvent('select', region, rec, region.store.indexOf(rec));
            }
            else if (records.length == 0) {
                region.reset();
                
            }
        });
        // fix Combo reset so it resets lastQuery as well
		region.reset = function() {
            this.lastQuery = null;
            Ext.form.ComboBox.superclass.reset.apply(this, arguments);
        }
        		
		return region;
	},

	/***
	 * renderCity
	 * creates a city ComboBox and attaches evetns
	 * @return {Object} Ext.form.ComboBox
	 *
	 */
	renderCity : function(config) {        
		config = config || {};

		// build city ComboBox
	    var ds = new Ext.data.Store({
	        proxy: new Ext.data.HttpProxy({
	            url: 'region/query'
	        }),
	        reader: this.reader,
			baseParams: {region_id: ''}
	    });
		var name = 'city_id';
		if (this.formName) {
			name = this.formName + '[' + name + ']'
		}
		var autoConfig = {			
			hiddenName: name,
			tabIndex: 1,
            shadow: false,
			width: 150,	
            minLength: 4,		
            editable: true,
	        fieldLabel: 'City',
	        allowBlank: false,
			forceSelection: false,            
			hideTrigger1: true,
	        mode: 'remote',
			triggerAction: 'all',
	        valueField: 'id',
	        displayField: 'name',
			typeAhead: false            	
		};
		config = Ext.applyIf(config, autoConfig);
                
		config.store = ds;

	    var city = new RExt.form.ComboBoxAdd(config);
                        
        // fix Combo reset so it resets lastQuery as well
		city.reset = function() {
            this.lastQuery = null;
            Ext.form.ComboBox.superclass.reset.apply(this, arguments);
        }
        
        // listen to events.
        city.store.on('load', function(store, records, options) {            
            if (records.length == 1) {
                var rec = records.shift();
                city.setValue(rec.data.id);
                city.fireEvent('select', city, rec, city.store.indexOf(rec));
                city.collapse();
            }
            else if (records.length == 0) {
                city.reset();
                
            }
        });
        
        city.onLoad = function() {            
            if(!this.hasFocus){
                return;
            }
            if(this.store.getCount() > 0){
                this.expand();
                this.restrictHeight();
                if(this.lastQuery == this.allQuery){
                    
                }else{
                    this.selectNext();
                    if(this.typeAhead && this.lastKey != Ext.EventObject.BACKSPACE && this.lastKey != Ext.EventObject.DELETE){
                        this.taTask.delay(this.typeAheadDelay);
                    }
                }
            }else{
                this.onEmptyResults();
            }            
        };

		

		return city;

	},

	/***
	 * renderAirport
	 * creates an airport ComboBox and attaches evetns
	 * @return {Object} Ext.form.ComboBox
	 *
	 */
    renderAirport : function(config) {
        
        config = config || {};
		
		var name = 'airport_id';
		if (this.formName) {
			name = this.formName + '[' + name + ']'
		}
		var autoConfig = {			
			hiddenName: name,
            minLength: 3,
			tabIndex: 1,
            selectOnFocus: true,
	        fieldLabel: 'Airport',
	        allowBlank: false,
            shadow: false,
            emptyText: '3-letter airport code...',
            forceSelection: false,
			hideTrigger1: true,
	        mode: 'local',
			triggerAction: 'all',
	        valueField: 'id',
	        displayField: 'name',		
            store: new Ext.data.SimpleStore({
				'id':'id',
                fields: ['id', 'name'],
                data: []                
            }),
            plugins:[Ext.ux.plugins.RemoteValidator],
			rvOptions: {
				url:'/region/validate_airport'                
			},
            remoteValidationDelay: 1000,
            listeners: {
                'servervalidatevalid': function(res){
                    var rec = new this.store.recordType({
                        id: res.data.id, 
                        name: res.data.airport
                    });
                    this.store.removeAll();
                    this.store.insert(0, rec);
                    this.setValue(rec.data.id);
                    this.fireEvent('select', this, rec, this.store.indexOf(rec));
                    this.collapse();                                    
                },
                'servervalidateinvalid' : function(res) {                    
                    this.markInvalid(res.msg);
                    this.emptyText = res.msg;
                    this.setValue('');
                }                                                            
            }				
		};
        
		config = Ext.applyIf(config, autoConfig);
		
	    var combo = new RExt.form.ComboBoxAdd(config);
        combo.on('beforequery', function() { this.store.removeAll(); });        
        return combo;
		                                   
    },
    
    /***
     * onAddAirport
     * @param {Ext.form.ComboBox} airport
     * @param {Ext.form.ComboBox} city
     */
    onAddAirport : function(airport, city) {        
        if (!city.getValue()) {
            App.setAlert(App.STATUS_NOTICE, 'To add a new airport, you must first select a city.');
            return false;
        }
        Ext.Msg.prompt('New ' + city.getRawValue() + ' airport', 'Airport code?:', function(btn, text){                                
            if (btn == 'ok'){
                App.request({
                    url: this.controller + '/' + 'insert_airport',
                    params : {
                        iso : text,
                        city_id : city.getValue()    
                    },
                    success : function(res) {
                        var rec = new airport.store.recordType({
                            id: res.data.airport.id,
                            name: res.data.airport.iso    
                        });
                        airport.remoteValid = true;
                        airport.store.insert(0, rec);
                        airport.setValue(rec.data.id);
                    }
                });
            }
        },this);        
    },
    
    /***
     * onAddCity
     * handler for adding a new city to the database
     * @param {Object} city
     * @param {Object} region
     */
    onAddCity : function(city, region) {                  
        if (!region.getValue()) {
            App.setAlert(App.STATUS_NOTICE, 'To add a new city, you must first select a state/province.');
            return false;
        }
        Ext.Msg.prompt('New ' + region.getRawValue() + ' city', 'City name?:', function(btn, text){                                
            if (btn == 'ok'){
                App.request({
                    url: this.controller + '/' + 'insert_city',
                    params : {
                        name : text,
                        region_id : region.getValue()    
                    },
                    success : function(res) {
                        var rec = new city.store.recordType({
                            id: res.data.city.id,
                            name: res.data.city.name    
                        });                        
                        city.remoteValid = true;
                        city.store.insert(0, rec);
                        city.setValue(rec.data.id);
                    }
                });
            }
        },this);                 
    }
}

