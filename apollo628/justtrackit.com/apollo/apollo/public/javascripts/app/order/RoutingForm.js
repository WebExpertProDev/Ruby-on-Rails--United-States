
/***
 * Apollo.order.RoutingForm
 * a form for adding order-routes.
 * @author Chris Scott
 *
 */

Apollo.order.RoutingForm = Ext.extend(RExt.form.AccordionForm, {
    id: 'routing_form',
    
    /** controller / action **/
    controller: 'order',
    actions: {
        insert: 'add_route',
        update: 'update_route'           
    },
     
    iconCls: 'icon-lorry-add',    
    autoHeight: false,    
    useDialog: true,
	dialogConfig: {	
        shadow: false,
    	modal: false,
    	maximizable: true
	},       
	header: false,
	frame: true,
	labelWidth: 75,
	labelAlign: 'right',
	autoScroll: true,
	defaultType: 'textfield', 
                
    order : null,
    
    /***
	 * render
	 * override Ext.form.Form::render
	 *
	 */
	initComponent : function(param) {
        
        this.addEvents({
            /***
             * @event
             * @param {Object} Apollo.Order
             * fires when the setOrder method is called, giving all child plugins a chance to respond
             */
            'setorder' : true    
        });          
              
        // build plugins                                   												        		                       						                                                               
        this.plugins = [
            new Apollo.order.CarrierProperties({
                region: 'left'
            }),            
            new Apollo.order.PickupDeliveryPanel({
                region: 'accordion'    
            })
        ];       
                        
        Apollo.order.RoutingForm.superclass.initComponent.call(this);                
	},
            
	/***
	 * init
	 * @param {Object} order
	 * @param {Object} btn
	 * @param {Object} ev
	 */
	setOrder : function(order) {                                                      
        if (typeof(order) != 'undefined') {
            this.order = order; 
            
            // show a helpful hint about defining company locations.
            var combo = Ext.getCmp('application_company_combo');                                                
            App.setStatus(App.STATUS_NOTICE, 'Carriers', "To use any particular carrier or carting-agent, it *MUST* have locations</em> defined for both " + order.getShipper().location.airport.iso + ' AND ' + order.getConsignee().location.airport.iso + "--you can quickly edit your desired carrier using the select-box below");
            setTimeout(function() {
                combo.el.frame("00ff00", 1, {duration: 3});
            },1000);
                        
            this.fireEvent('setorder', order);               
        }      
        else {var values = {};
            return alert('RoutingForm::setOrder called without an order');
        }                			
	},
    
    /***
     * getOrder
     * return {Object} this.order
     */
    getOrder : function() {
        return this.order;
    },
    
    setValues : function(route) {
        this.fireEvent('setvalues', route);
                        
        var values = {};                
        var form = this.form;
        route.entities.each(function(e) {
            var role = e.role;                              
            for (var k in e) {
                if (Ext.isDate(e[k])) { // <-- special care must be taken with date-fields.
                    // set the time_in / time_out data from teh date_in / date_out field.                  
                    values[role + '[' + k + ']'] = e[k];                    
                    values[role + '[' + k.replace('date', 'time') + ']'] = e[k].format("H:i");        
                } 
                else if (typeof(e[k]) != 'object') {
                    values[role + '[' + k + ']'] = e[k];
                }
            }    
        });
        for (var k in route) {
            if (typeof(route[k]) != 'object') {
                values['route[' + k + ']'] = route[k];
            }
        }                                                        
        Apollo.order.RoutingForm.superclass.setValues.call(this, values);    
    },
    
	/***
	 * getParams
	 * override RExt.form.Form::getParams
	 *
	 */
	getParams : function() {
		// set the origin_id
		var params = {
			'origin_id' : null
		};
		if (this.order.routes.getCount() > 0) {
			params.origin_id = this.order.routes.last().destination.airport.id;
		}
		else {
			params.origin_id = this.order.getShipper().location.airport.id;
		}
		return params;
	},
	    
    /***
     * isValid
     * provide custom isValid impl. for RoutingForm.  this is for checking dates.
     * @return {Boolean}
     */
    isValid : function() {        
        
        var valid = Apollo.order.RoutingForm.superclass.isValid.call(this);
        if (valid == false) {
            return valid;
        }
        else {                        
            var din = new Date(this.form.findField('carrier[date_in]').getRawValue() + ' ' + this.form.findField('carrier[time_in]').getValue());            
            var dout = new Date(this.form.findField('carrier[date_out]').getRawValue() + ' ' + this.form.findField('carrier[time_out]').getValue());
            valid = ( (dout - din) > 0 ) ? true : false;
            if (valid === false) {
                App.setStatus(App.STATUS_ERROR, 'Date Error', 'Arrival date is earlier than departure date');                
            }             
        }
        return valid;
    },
    
    /***
     * getter/setters for some fields
     */
    getCarrier : function() {
        return this.form.findField('carrier[company_id]');
    },
    getOrigin : function() {
        return this.form.findField('origin_airport_id');        
    },
    getDestination : function() {
        return this.form.findField('destination_airport_id');
    },
    getShipper : function() {
        return this.order.getShipper();
    }
});

/***
 * Apollo.order.RoutingOptions
 * not sure if I'll use this.
 */
Apollo.order.RoutingOptions = Ext.extend(RExt.form.Component, {
        
    style: 'margin-bottom: 5px',
    iconCls: 'icon-cog',    
    collapsible: true,                        
    autoHeight: true,
    title: 'Options',
                      
    initComponent: function(){        
        Apollo.order.RoutingOptions.superclass.initComponent.call(this);
    }
});

/***
 * Apollo.order.CarrierProperties
 */
Apollo.order.CarrierProperties = Ext.extend(RExt.form.Component, {
    
    iconCls: 'icon-lorry',	          
	title: 'Carrier',
	autoHeight: true,            
	defaultType: 'textfield',
    frame: false,
    header: false,    
    
    /***
     * init
     * plugin init method, called by Ext
     * @param {Object} fpanel
     */
    init : function(fpanel) {
        Apollo.order.CarrierProperties.superclass.init.apply(this, arguments); 
        
        // append some special events from CarrierProperties onto the containing-form RoutingForm.  other components need to 
        // react to these events (carting-agents, for example, need to reset themselves when carrier, origin, destination change)    
        fpanel.relayEvents(this, ['selectorigin', 'invalidorigin', 'selectcarrier', 'selectcarrierrole', 'invaliddestination', 'selectdestination']);
        
        this.relayEvents(fpanel, ['setorder']);                          
    },
    
    /***
     * initComponennt
     */     
    initComponent : function() {
        
        /***
         * @event init
         * @param {Object} order
         */
        this.on('setorder', function(order) {
                                   
            var shipper = order.getShipper();
            var consignee = order.getConsignee();
                                    
            // preset origin with last route's destination    		                            		                
    		var last = order.routes.last();
            var rec = null;
    		if (last) {
    			this.origin_id = last.destination.city.id;		
                rec = new origin.store.recordType({id: last.destination.airport.id, name: last.destination.airport.iso});            				
    		}
    		else {
    			var location = shipper.location;                		
    			origin.setValue(location.airport.iso);
                rec = new origin.store.recordType({id: location.airport.id, name: location.airport.iso}); 
    			this.origin_id = location.city.id;
    		}
            origin.remoteValid = true;
            origin.lastQuery = null;           
            origin.store.insert(0, rec);
            origin.setValue(rec.data.id);
                                   	
    		// preset destination with consignee's airport  
            destination.remoteValid = true;
    		destination.lastQuery = null;
                      		
    		if (consignee) {						
                var record = new destination.store.recordType({id: consignee.location.airport.id, name: consignee.location.airport.iso});                
    			destination.store.insert(0, record);
    			destination.setValue(record.data.id);                                                          
    		}
            carrier.store.baseParams.order_id = order.id;
            carrier.reset();
    		carrier.lastQuery = null;   
            
            // disable all domain-role radios by default.  they get set when a carrier is selected.
            if (domainGroup.rendered == true) {
                domainGroup.disableAll();
            }                             		                                             		    		       
        },this);
        
        /***
         * @event setvalues
         * @param {Object} route
         */
        this.on('setvalues', function(route) {
            var rec = new origin.store.recordType({id: route.carrier.company.id, name: route.carrier.company.name, roles: []});
            carrier.store.insert(0, rec);
            carrier.setValue(rec.data.id);
            
            var rec = new origin.store.recordType({id: route.shipper.location.airport.id, name: route.shipper.location.airport.iso, roles: []});
            origin.store.insert(0, rec);
            origin.setValue(rec.data.id);
            
            var rec = new destination.store.recordType({id: route.consignee.location.airport.id, name: route.consignee.location.airport.iso, roles: []});
            destination.store.insert(0, rec);
            destination.setValue(rec.data.id);                                             
        },this);
        
        this.addEvents({
            selectcarrier: true,
            selectcarrierrole: true,
            selectorigin: true,
            invalidorigin: true,
            selectdestination: true,
            invaliddestination: true
        });
        
        var reader = new Ext.data.JsonReader({
            root: 'data',
            totalProperty: 'total',
            id: 'id'
        },[
            {name: 'id', mapping: 0},
            {name: 'name', mapping: 1},
            {name: 'roles', mapping: 2}
        ]);
        
        // get combo template from TEmplateMgr.  this is a pre-rendered instance of XTemplate
        var resultTpl = RExt.util.TemplateMgr.get('combo-template');
        
		// create carrier ComboBoxAdd
        var carrier = new RExt.form.ComboBoxAdd({
            name: 'carrier',
			tabIndex: 1,
            shadow: false,
            emptyText: 'Select a carrier...',
            hiddenName: 'carrier[company_id]',
            fieldLabel: 'Carrier',
            allowBlank: false,
            mode: 'remote',
            triggerAction: 'all',
            valueField: 'id',
            displayField: 'name',
			pageSize: 10,
			typeAhead: true,
			anchor: '90%',
            tpl: resultTpl,
			itemSelector: 'div.search-item',
			onSelect: function(record, index){	// <-- override ComboBox::onSelect			    
	        	this.setValue(record.data.id);
				this.setRawValue(record.data.name);
				this.collapse();
            	this.fireEvent('select', this, record, index);
	        },	
            listeners : {
                /**
                 * select.  analyze the roles of selected carrier -- make appropriate form adjustments to suit the domain of carrier.
                 * @param {Object} combo
                 * @param {Object} rec
                 * @param {Object} index
                 */
                select : function(combo, rec, index) {  
                    var hasSelection = false;
                    domainGroup.disableAll();
                    for (var n=0,len=rec.data.roles.length;n<len;n++) {                                                                        
                        var radio = domainGroup.getByValue(rec.data.roles[n].cls.split('-').pop());                    
                        if (radio) {
                            radio.enable(); 
                            if (hasSelection == false) { 
                                radio.setChecked(true);
                                hasSelection = true;
                            }                    
                        }                        
                    }                                                                                           
                },
                scope: this
            },
            store: new Ext.data.Store({
            	proxy: new Ext.data.HttpProxy({
	                url: 'company/search_carrier'
	            }),
	            reader: reader,
				baseParams: {
					domain: 'carrier',
                    role: '',
					type: ''
				},
                listeners : {
                    load: function(ds, rs, params) {
                        if (rs.length == 0) { carrier.lastQuery = null; }
                    }
                }
	        })
        });
		/***
		 * onAddCarrier
		 * user clicks ComboBox [add] button.  show the "add company" form.
		 * this form is shared with OrderForm.
		 */
        carrier.on('add', function(param) {
			var cform = Ext.getCmp('company_form');            
            var domain = RExt.company.Util.loadDomainByName('carrier');            
            cform.setDomain(domain);
            
			// save a ref to active ComboBoxAdd so we can add to its store in doInsert
			this.field = param.field
			cform.showInsert();
            cform.on('actioncomplete', function(form, action) {
                if (typeof(action.result) != 'undefined') {        			
        			cform.hide();			
        			carrier.insert(0, action.result.data.company);
        		}    
            }, this, {});            
		}, this);	
        /***
         * @event beforequery
         * attach origin to query
         */	       
        carrier.on('beforequery', function(ev) {                        
            carrier.store.baseParams.origin_id = origin.getValue();
            carrier.store.baseParams.destination_id = destination.getValue();        
        });
        
        // domain-group
        var domainGroup = new Ext.ux.RadioGroup({
            xtype: 'ux-radiogroup',
            fieldLabel: 'Services',
            itemCls: 'roles',
            tabIndex: 1,
            horizontal: true,
            hideLabel: false,
            name: 'carrier_role', 
            id: 'carrier_role',                                                
            radios:[{
                id: this.id + '_radio_ground',
                value: 'ground',                
                checked:true,        
                boxLabel: '',                                       
                labelCls: 'role-vendor-carrier-ground',
                listeners: {
                    check: onSelectDomain,
                    scope: this             
                }                
            }, {
                id: this.id + '_radio_air',
                value: 'air_commercial',        
                boxLabel: '',        
                labelCls: 'role-vendor-carrier-air_commercial',
                checked: false,
                listeners: {
                    check: onSelectDomain,
                    scope: this                 
                }                
            }, {
                id: this.id + '_radio_freight',
                value: 'air_freight',       
                boxLabel: '',         
                labelCls: 'role-vendor-carrier-air_freight',
                checked: false,
                listeners: {
                    check: onSelectDomain,
                    scope: this                   
                }                
            }]
        });
        domainGroup.on('render', function() { this.disableAll(); });
        
        function onSelectDomain(field, checked) {
            if (checked == true) {                
                var attnParent = carrierAttn.container.findParentNode('.x-form-item', 1, true);
                carrier.store.baseParams.role = field.value;
                this.fireEvent('selectcarrierrole', field.value);                
                switch (field.value) {
                    case 'ground':
                        carrierAttn.disable();
                        carrierAttn.hide();                        
                        break;
                    case 'air_freight':                                                
                    case 'air_commercial':
                        carrierAttn.enable();
                        carrierAttn.show();                                              
                        break;
                }                                                                                               
            }            
        }  
        
        // carrier attn field.  use for flight-info
        var carrierAttn = new Ext.form.TextArea({
            name: 'carrier[attn]',
            growMax: 50,
            hideParent: true,
            labelPosition: 'top',
            fieldLabel: 'Flight info',                        
            anchor: '98%',
            listeners : {
                render: function() {
                    this.container.findParentNode('.x-form-item', 1, true).enableDisplayMode();
                    this.hide();
                }
            },
            hide : function() {
                Ext.form.TextArea.superclass.hide.call(this);
                this.container.findParentNode('.x-form-item', 1, true).hide();
            },
            show : function() {
                Ext.form.TextArea.superclass.show.call(this);
                this.container.findParentNode('.x-form-item', 1, true).show();
            }    
        });
                       
		/***
		 * @event 'select'
		 * @param {Object} param
		 * listen to comboSelectType and reset carrier when changed.
		 */        
		carrier.on('select', function(field, rec, index) {                         
            this.fireEvent('selectcarrier', rec);
        },this);
		
        RM = Ext.ComponentMgr.get('region_manager');
        
        // origin airport combo
		var origin  = RM.renderAirport({
			width: 150,			
			tabIndex: 1,                        			
			fieldLabel: 'Airport',
			hiddenName: 'origin_airport_id',            
			name: 'origin',                        
		});
        /***
         * @event select
         * @param {Object} field
         * @param {Object} record
         * @param {Object} index
         */        
		origin.on('select', function(field, record, index) { 
            carrier.reset();
            carrier.lastQuery = null;
            this.fireEvent('selectorigin', record); 
        },this);
        origin.on('servervalidateinvalid', function() { this.fireEvent('invalidorigin', origin); },this);
        
		// destination airport combo
		var destination  = RM.renderAirport({
			width: 150,			
			tabIndex: 1,                        			
			fieldLabel: 'Airport',
			hiddenName: 'destination_airport_id',            
			name: 'destination_ap',                        
		});
        /***
         * @event select
         * @param {Object} field
         * @param {Object} record
         * @param {Object} index
         */                
		destination.on('select', function(field, record, index) { 
            carrier.reset();
            carrier.lastQuery = null;
            this.fireEvent('selectdestination', record);	
        },this);
        destination.on('servervalidateinvalid', function() { this.fireEvent('invaliddestination', destination); },this);
	    
		var carrierTimeIn = new Ext.form.TimeField({			
			name: 'carrier[time_in]',
			fieldLabel: 'Time',
			format: 'H:i',
			tabIndex: 1,
			allowBlank: false,
			width: 100
		});

		var carrierTimeOut = new Ext.form.TimeField({			
			tabIndex: 1,
			format: 'H:i',
			name: 'carrier[time_out]',
			fieldLabel: 'Time',
			allowBlank: false,
			width: 100
		});
                                                            
        // built the shit       		                        
		this.items = [                                               
            new Ext.form.FieldSet({
                title: 'Carrier',
                autoHeight: true,                           
                items: [
                    carrier,
                    domainGroup,
                    new Ext.form.TextField({
        				name: 'route[bill_number]',
        				tabIndex: 1,
                        anchor: '98%',
        				fieldLabel: 'Airbill',
        				allowBlank: true
        			}),    
                    carrierAttn 
                ]    
            }),                           
            new Ext.form.FieldSet({ 			    
                title: 'Origin',
                autoHeight: true,
                items: [
                    origin,
                    new Ext.form.DateField({
                        name: 'carrier[date_in]',
        				tabIndex: 1,
                        fieldLabel: 'Depart date',
                        allowBlank: false,
                        format: 'm/d/Y'
                    }),
                    carrierTimeIn,
                ]
            }),
            new Ext.form.FieldSet({
                title: 'Destination',
                autoHeight: true,
                items: [
                    destination,	
                    new Ext.form.DateField({
                        name: 'carrier[date_out]',
        				tabIndex: 1,
                        fieldLabel: 'Arrival date',
                        allowBlank: false,
                        format: 'm/d/Y'
                    }),
                    carrierTimeOut
                ]
            })
        ];		                      		       
        Apollo.order.CarrierProperties.superclass.initComponent.call(this);        
    }           
});

/***
 * Apollo.order.AgentPanel
 */
Apollo.order.PickupDeliveryPanel = Ext.extend(RExt.form.Component, {

    iconCls: 'icon-user-go',    
    id: 'agent_panel',    
    autoHeight: true,
    title: 'Pickup and Delivery',
    
    prevRoute : null,
    
    carrier_id : null,
    
    /***
     * initComponent
     */
    initComponent: function(){    
        this.items = this.build();                                        
        Apollo.order.PickupDeliveryPanel.superclass.initComponent.call(this);
    },
    
    /***
     * init
     * plugin init, called by framework
     */
    init: function(fpanel){
        Apollo.order.PickupDeliveryPanel.superclass.init.apply(this, arguments);  
                        
        this.relayEvents(fpanel, ['setorder', 'selectorigin', 'invalidorigin', 'selectcarrier', 'selectcarrierrole', 'invaliddestination', 'selectdestination']);                                        
    },
    
    /***
     * build
     */
    build: function(){
                        
        this.on('setorder', function(order) { 
            this.order = order;                                             
            if (order.routes.getCount() > 0) {                
                this.prevRoute = order.routes.last();                          
            }       
            else {
                this.prevRoute = null;
            }      
            fsPickupAgent.reset(); 
            fsDeliveryAgent.reset();            
        },this);
       
       this.on('show', function(fpanel, verb) {                     
           if (this.prevRoute) {   
               // since there's a prev. route, the SHIPPER for this route becomes the CONSIGNEE of previous route.                         
                var shipper = this.prevRoute.entities.find(function(e) { return (e.role == 'consignee')?true:false; });
                                
                var msg = 'The ' + shipper.domain.name + ' <strong>' + shipper.company.name + '</strong> from the previous route ';
                msg += '<strong>' + this.prevRoute.origin.airport.iso + '->' + this.prevRoute.destination.airport.iso + '</strong> is in possession of the shipment';                
                App.setStatus(App.STATUS_NOTICE, 'Order-routing', msg);
                                    
                radioShipperPickup.setBoxLabel('<strong>' + shipper.company.name + '</strong> will deliver to Carrier');                        
                radioCarrierPickup.setBoxLabel('Carrier will pick-up from <strong>' + shipper.company.name+ '</strong>');                                                                
                radioAgentPickup.setValue(true);            
           }   
           else {
                App.hideStatus();
                radioShipperPickup.setBoxLabel("Shipper will deliver to Carrier");         
                radioCarrierPickup.setBoxLabel("Carrier will pick-up from Shipper");                
                     
           } 
       },this);
       
        
        /***
         * @event setvalues
         * @param {Object} route
         */
        this.on('setvalues', function(route) {
            
            var index = this.order.routes.indexOf(route);
            var prev = this.order.routes.itemAt(index-1);
            
            if (prev) {                                       
                var prev_entity = null;
                if (prev.type == 'route' || prev.type == 'mawb') {
                    prev_entity = prev.entities.find(function(e) { return (e.role == 'consignee') ? true : false; });
                }  
                else if (prev.type == 'local') {
                    prev_entity = prev.entities.find(function(e) { return (e.role == 'carrier') ? true : false; });                    
                }      
                radioShipperPickup.setBoxLabel('<strong>' + prev_entity.company.name + '</strong> will deliver to Carrier');
                radioCarrierPickup.setBoxLabel('Carrier will pick-up from <strong>' + prev_entity.company.name+ '</strong>');    
            }
            else {
                radioShipperPickup.setBoxLabel("Shipper will deliver to Carrier");                
                radioCarrierPickup.setBoxLabel("Carrier will pick-up from Shipper");    
            }
            
            radioShipperPickup.setValue(false);
            radioCarrierPickup.setValue(false);
            radioAgentPickup.setValue(false);                               
            switch (route.pickup_mode) {
                case 'shipper':
                    radioShipperPickup.setValue(true);
                    break;
                case 'carrier':
                    radioAgentPickup.setValue(false);    // <-- wtf bug?                                                                 
                    break;
                case 'agent':
                    radioAgentPickup.setValue(true);
                    break;
            }    
            switch (route.delivery_mode) {
                case 'carrier':
                    radioAgentDelivery.setValue(false);    // <-- wtf bug?
                    radioCarrierDelivery.setValue(true);                    
                    break;
                case 'agent':
                    radioAgentDelivery.setValue(true);
                    break;
            }
                
        },this);
        
        var radioCarrierPickup = new Ext.form.Radio({
            id: 'radio_carrier_pickup',
            boxLabel: 'Carrier will pick-up from Shipper',
            hideLabel: true,
            name: 'pickup_mode',
            inputValue: 'carrier'
        });
        var radioShipperPickup = new Ext.form.Radio({
            id: 'radio_shipper_pickup',
            boxLabel: 'Shipper will deliver to Carrier',
            hideLabel: true,
            name: 'pickup_mode',
            inputValue: 'shipper'
        });
        var radioAgentPickup = new Ext.form.Radio({
            id: 'radio_pickup_agent',
            boxLabel: 'Carting-agent will deliver to Carrier',
            hideLabel: true,
            name: 'pickup_mode',
            inputValue: 'agent',
            checked: 'on'
        });
        
        radioAgentPickup.on('check', function(field, checked) {            
            if (checked) {
                fsPickupAgent.enable(true);
                fsPickupAgent.show();
            }
            else {
                fsPickupAgent.disable(true);
                fsPickupAgent.hide();
                
            }
        });
        
        var fsPickupAgent = new Apollo.order.AgentFieldSet({
            id: 'fs_pickup_agent',
            role: 'shipper',
            title: 'Carting-agent'
        });   
        fsPickupAgent.relayEvents(this, ['setvalues']);
        
        this.on('selectcarrier', function(rec) {            
            fsPickupAgent.reset();            
        });
        this.on('selectcarrierrole', function(role) {
            fsPickupAgent.setCarrierRole(role);
        });
        
        this.on('selectorigin', function(rec) {
            fsPickupAgent.reset();
        });
        this.on('invalidorigin', function() {            
            fsPickupAgent.reset();    
        });
        this.on('selectdestination', function(rec) {
            fsDeliveryAgent.reset();
        });        
        this.on('invaliddestination', function() {
            fsDeliveryAgent.reset();    
        });
                
        var radioCarrierDelivery = new Ext.form.Radio({
            id: 'radio_carrier_delivery',
            boxLabel: 'Carrier will deliver to Consignee',
            hideLabel: true,
            name: 'delivery_mode',
            inputValue: 'carrier'
        });       
        var radioAgentDelivery = new Ext.form.Radio({
            id: 'radio_delivery_agent',
            boxLabel: 'Use carting-agent',
            hideLabel: true,
            name: 'delivery_mode',
            inputValue: 'agent',
            checked: 'on'
        });
        radioAgentDelivery.on('check', function(field, checked) {                        
            if (checked == true) {
                fsDeliveryAgent.enable(true);
                fsDeliveryAgent.show();
            }
            else {
                fsDeliveryAgent.disable(true);
                fsDeliveryAgent.hide();
                
            }
        });
        var fsDeliveryAgent = new Apollo.order.AgentFieldSet({
            id: 'fs_delivery_agent',
            role: 'consignee',
            title: 'Carting-agent'
        });
        fsDeliveryAgent.relayEvents(this, ['setvalues']);
                                                    
        return [            
            new Ext.form.FieldSet({
                title: 'Pickup',
                collapsible: true,
                autoHeight: true,
                items: [                                        
                    radioShipperPickup,
                    radioCarrierPickup,
                    radioAgentPickup,
                    fsPickupAgent
                ]           
            }),
            new Ext.form.FieldSet({
                title: 'Delivery',
                collapsible: true,
                autoHeight: true,
                items: [
                    radioCarrierDelivery,
                    radioAgentDelivery,
                    fsDeliveryAgent
                ]
            })
        ];        
    }
});

/***
 * Apollo.order.AgentFieldSet
 * 
 */
Apollo.order.AgentFieldSet = Ext.extend(Ext.form.FieldSet, {
        	
    iconCls: 'icon-user-go',                    
    autoHeight: true,
    title: 'Cartage-agent',	        
    role: null,  
    hideLabels: true,    
    
    /***
     * initComponent
     */       
    initComponent : function() {  
        
        /***
         * @event reset
         * used for resetting the combo
         */
        this.addEvents({
            'reset' : true    
        });
                            
        this.checkboxName = 'use_' + this.role;
        
        var reader = new Ext.data.JsonReader({
            root: 'data',
            totalProperty: 'total',
            id: 'id'
        },[
            {name: 'id', mapping: 0},
            {name: 'name', mapping: 1},
            {name: 'roles', mapping: 2}
        ]);
        
        var agentProxy = new Ext.data.HttpProxy({
            url: 'company/search_agent'
        });
               
        // combo
		var combo = new RExt.form.ComboBoxAdd({
			name: this.role + '_company_id',
            emptyText: 'Select company...',
			tabIndex: 1,
            shadow: false,
			hiddenName: this.role + '[company_id]',
			fieldLabel: 'Agent',
			allowBlank: false,
			mode: 'remote',
			triggerAction: 'all',
			valueField: 'id',            
			displayField: 'name',
			anchor: '90%',
			pageSize: 10,
			tpl: RExt.util.TemplateMgr.get('combo-template'),
			itemSelector: 'div.search-item',
			onSelect: function(record, index){	// <-- override ComboBox::onSelect			    
	        	this.setValue(record.data.id);
				this.setRawValue(record.data.name);
				this.collapse();
            	this.fireEvent('select', this, record, index);
	        },
			store: new Ext.data.Store({
	            proxy: agentProxy,
				reader: reader,
				baseParams: {
					role: this.role
				},
                listeners : {
                    load: function(ds, rs, params) {
                        if (rs.length == 0) { combo.lastQuery = null; }
                    }
                }
	        })
		});        
        /***
         * @event beforequery
         */
        combo.on('beforequery', function() {            
            var fpanel = Ext.getCmp('routing_form');
            var carrier_role = fpanel.form.findField('carrier_role');                        
            carrier = fpanel.getCarrier();
            airport = (this.role == 'shipper') ? fpanel.getOrigin() : fpanel.getDestination();            
            combo.store.baseParams.carrier_id = carrier.getValue();
            combo.store.baseParams.carrier_role = carrier_role.getValue();
            combo.store.baseParams.airport_id = airport.getValue();
            
        },this);
        
        /***
         * @event reset
         */
        this.on('reset', function() {                                                           
            combo.reset();
            combo.lastQuery = null;    
        });
        
        /***
         * @event setvalues
         */
        this.on('setvalues', function(route) {               
            if (route.pickup_mode == 'agent') {
                var rec = new combo.store.recordType({
                    id: route[this.role].company.id,
                    name: route[this.role].company.name,
                    roles: []
                });
                combo.store.removeAll();
                combo.store.insert(0, rec);
                combo.setValue(rec.data.id);
            }
        },this);
        
        /***
         * @event add       
         */
        combo.on('add', function() {
            this.reset();		
    		var fpanel = Ext.getCmp('company_form');			                       
            var domain = RExt.company.Util.loadDomainByName('agent');            
            fpanel.setDomain(domain);              
    		fpanel.setKey(null);            
    		fpanel.showInsert();
                        
            // this gets a bit complex.  it's the popup's combo that gets the actioncomplete event
            // if it pops up a CompanyForm.
    		fpanel.on('actioncomplete', function(form, action) {
                if (typeof(action.result) != 'undefined') {
        			var fpanel = Ext.getCmp('company_form');
        			fpanel.hide();			
        			combo.insert(0, action.result.data.company);
        		}
            }, this);
            
            fpanel.setTitle('Create new carting-agent', 'icon-user-go');  
        }, this);
        
        this.combo = combo;
                        		                
        this.items = [             
            combo    		
	    ];
        Apollo.order.AgentFieldSet.superclass.initComponent.call(this);        
    },        
    
    setAgent : function(company) {
        this.combo.insert(0, company);    
    },
    
    setCarrierRole : function(role) {        
        this.reset();
        this.combo.store.baseParams.carrier_role = role;    
    },
    
    /***
     * reset
     */        
    reset : function() {
        this.fireEvent('reset');
    }
});

/**
 * Apollo.order.LocalRoute
 * A form for creating local deliveries, much simpler than a master waybill.
 */
Apollo.order.LocalRoute = Ext.extend(RExt.sys.Form, {
    
    controller : 'order',
    actions: {
        'insert' : 'insert_local_route',
        'update' : 'udpate_local_route',
        'delete' : 'delete_local_route'
    },
    useDialog: true,
    iconCls: 'icon-lorry',
    layout: 'fit',
    frame: true,
    header: false,
    title: 'Local delivery',    
    dialogConfig: {
        width: 400,
        height: 200
    },    
    
    initComponent : function() {
        
        this.addEvents({
            /**
             * @event setorder
             * @param {Apollo.Order} order
             * fires when this form is loaded with an order              
             */
            'setorder' : true
        });
        
        this.items = this.build();
               
        Apollo.order.LocalRoute.superclass.initComponent.call(this);
    },
        
    build : function() {              
       var combo = new RExt.company.CompanyCombo({
           hiddenName: 'carrier[company_id]',
           domain: RExt.company.Util.getDomainByName('agent'),
           emptyText: 'Select cartage-agent...'                              
       });
       combo.store.baseParams.role = 'carrier';
       
       this.on('setorder', function(order) {
           combo.store.baseParams.airport_id = order.getShipper().location.airport.id;    
       });
        
       return [           
           new Ext.form.FieldSet({
                title: 'Cartage-agent',
                autoHeight: true,
                autoWidth: true,
                items: combo   
           })           
       ];       
    },
    
    setOrder : function(order) {
        this.setKey(order.id);
        this.fireEvent('setorder', order);
            
    }
       
});

/***
 * override Ext.form.Checkbox to provide a setBoxLabel method
 * @param {Object} v
 */
Ext.override(Ext.form.Checkbox, {
    
    show : function() {
        Ext.form.Checkbox.superclass.show.call(this);   
        this.wrap.enableDisplayMode();
        this.wrap.show(); 
    },
    
    hide : function() {
        this.wrap.enableDisplayMode();
        this.wrap.hide();
        Ext.form.Checkbox.superclass.hide.call(this);    
    },
    
    setBoxLabel : function(v) {
        function doSet() {            
            var label = this.wrap.query('.x-form-cb-label')[0];
            label.innerHTML = v;                            
        }
    	if (!this.rendered) {
            this.on('render', doSet, this);
        }
        else {
            doSet.call(this);
        }  
    } 
   
});
