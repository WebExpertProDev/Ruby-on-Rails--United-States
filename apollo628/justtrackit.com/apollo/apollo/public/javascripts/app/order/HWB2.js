/***
 * Apollo.order.HWB
 * present an order form to user.
 * @author Chris Scott
 *
 */
Apollo.order.HWB = Ext.extend(RExt.sys.Form, {   
    
    /***
     * controller & actions
     */ 
    controller: 'order',
    actions: {
        insert: 'insert_hwb',        
        update: 'update_entity',   
        add_entity: 'add_entity'         
    },
    
    /***
     * entity
     */
    entity : null,
    
    /***
     * isQuote (Boolean} [false]
     * set true to make this hwb a quote instead.     
     */
    isQuote : false,
    
    /***
     * fieldsets
     * a list of fieldsets to build.  if empty, all will be built.
     * @param {Object} param
     */  
     fieldsets : [],
    
    /***
     * setEntity
     * @param {Object/String} e
     * if @param is object, it's a full entity object; otherwise it's a string representing the "role" (shipper / consignee / carrier) --
     * the type of entity we'd *like to* create.
     */
    setEntity : function(e) {
        var role = null;                
        if (typeof(e) == 'object') {    // <-- an existing entity was provided.
            this.entity = e;
            this.setKey(e.id);
            role = e.role;                    
        }
        else if (typeof(e) == 'string') {    // <-- just a string.  we want to create this type of entity.
            role = e;        
        }                
        
        if (this.fieldsets.length) {
            for (var n=0,len=this.fieldsets.length;n<len;n++) {
                var fs = this.getComponent(this.id + '_' + this.fieldsets[n]);
                if (this.fieldsets[n] == role) {
                    fs.enable(true);
                    fs.show();
                }
                else {
                    fs.disable(true);
                    fs.hide();
                }  
            }
        }                                  
    },
    
    init : function() {                
        
        if (this.entity == null) { return false; }
        
        var e = this.entity;
        
        var prefix = e.role;
        var values = {};
        e.date_in = new Date(e.date_in);  
        e.time_in = e.date_in.format("G:i");
               
        e.date_out = new Date(e.date_out);
        e.time_out = e.date_out.format("G:i");
        for (var k in e) {
            values[prefix + '[' + k + ']'] = e[k];    
        }
        
        values[prefix + '[company_location_id]'] = e.location.id;
                                      
        this.form.setValues(values);   
        
        var comboCompany = this.form.findField(prefix + '[company_id]');        
        var rec = new comboCompany.store.recordType({id: e.company.id, name: e.company.name, roles: []});
        
        comboCompany.store.removeAll();
        comboCompany.store.add(rec);
        comboCompany.setValue(rec.data.id);        
        comboCompany.disable();
                
        var comboAccount = this.form.findField(prefix + '[account_id]');                        
        var rec = new comboAccount.store.recordType({id: e.account.id, first: e.account.first, last:e.account.last, roles: []});
        comboAccount.store.removeAll();
        comboAccount.store.add(rec);
        comboAccount.setValue(rec.data.id);                  
        comboAccount.setCompanyId(comboCompany.getValue());
               
        var comboLocation = this.form.findField(prefix + '[company_location_id]');
        var rec = new comboLocation.store.recordType({id: e.location.id, airport: e.location.airport.iso});
        comboLocation.store.removeAll();
        comboLocation.store.add(rec);
        comboLocation.setValue(rec.data.id);        
        comboLocation.setCompanyId(comboCompany.getValue());                                                                             
    },
    
	/***
	 * render
	 * override Ext.form.Form::render
	 * @param {Object} el
	 */
    initComponent : function() {
        // initialize the domain-roles for client.  a bit of a hack.  ensures that account_popup will have its roles cached.
        // if shown before the company_form is.  it's company_form that does the role ajax query / role-cacheing.
        //var fpanel = Ext.getCmp('company_form');
        //fpanel.setDomain(RExt.company.Util.loadDomainByName('client'));
                                                                                          
        if (this.fieldsets.length == 0) { // <-- build them all.
            var shipper = this.buildShipper();
            var consignee = this.buildConsignee();	            	
            var billing = this.buildBilling();       
            var shipment = this.buildShipment();	
            
            var columns = new Ext.Panel({ // <-- 2-column layout
                border: false,
                layout: 'column',
                autoHeight: true,
                items: [{
                    columnWidth: 0.5,
                    layout: 'fit',
                    style: 'margin-right:10px',
                    items: [shipper, consignee]
                }, {
                    columnWidth: 0.5,                    
                    title: 'Options',
                    bodyStyle: 'padding: 5px',
                    frame: true,
                    header: true,
                    layout: 'fit',
                    items: [shipment, billing]
                }]
            });                         
            this.items = columns;          
        }
        else {
            var items = [];
            for (var n=0,len=this.fieldsets.length;n<len;n++) {
                var fieldset = this.fieldsets[n].substring(0,1).toUpperCase() + this.fieldsets[n].substring(1,this.fieldsets[n].length);                    
                if (typeof(this['build' + fieldset]) == 'function') {
                    items.push(this['build' + fieldset]()); 
                }
                else {
                    alert('Apollo.order.HWB::build -- unknown fieldset "' + fieldset);
                }
            }                
            this.items = items;
        }        
        Apollo.order.HWB.superclass.initComponent.call(this);
        
        if (this.useDialog == true) {
            this.dialog.on('afterlayout', function() {
                columns.doLayout();    
            });            
        }              
    },
    
    /***
     * buildShipper
     * build "shipper" fieldset
     * @param {Object} param
     */
    buildShipper : function(param) {
        
        var domain = RExt.company.Util.getDomainByName('client');
                                     
        // build shipper ComboBox        
        var company = new RExt.company.CompanyCombo({
            hiddenName: 'shipper[company_id]',
            listeners: {                
                select: function(param) {                    
                    location.setCompanyId(company.getValue());                            			
                    account.setCompanyId(company.getValue());                                        
        		},                
                scope: this                
            }
        });
        company.setDomain(domain);
                                               
        // build shipper_contact combo		                        
		var location = new RExt.company.LocationCombo({
            hiddenName: 'shipper[company_location_id]'
        });
                            				                                       
		// build shipper_contact combo		                        
		var account = new RExt.company.AccountCombo({
		    hiddenName: 'shipper[account_id]',
            domain: domain        
		});
		        		
        this.on('reset', function() {
            company.reset();
            location.reset();
            account.reset();
        });
        
        // shipper fieldset
		return {
            id: this.id + '_shipper',
            iconCls: 'icon-door-out',            
			layout: 'form',
            xtype: 'fieldset',
			title: 'Shipper',
			defaultType: 'textfield',
			bodyStyle: 'padding: 5px',
			autoHeight: true,
			items: [
				company,
                location,
				account,
                new Ext.form.DateField({
	                name: 'shipper[date_in]',
					tabIndex: 1,
	                fieldLabel: 'Pick-up date',
	                allowBlank: false,
	                format: 'm/d/Y'
	            }),new Ext.Panel({
                    layout: 'column',                                        
                    items: [{
                        width: 200,                                                
                        layout: 'form',
                        items: new Ext.form.TimeField({
        	                name: 'shipper[time_in]',
        					tabIndex: 1,
                            emptyText: 'time...',
        	                fieldLabel: 'Ready/close',
        	                allowBlank: false,					
                            format: 'H:i',	
                            width: 75			        	                
        	            })
                    },{
                        width: 100,                                                                   
                        layout: 'form',
                        hideLabels: true,
                        items: new Ext.form.TimeField({
        	                name: 'shipper[time_out]',
        					tabIndex: 1,      
                            emptyText: 'time...',  	                
        	                allowBlank: false,
                            width: 75,
                            format: 'H:i'								        	                
        	            })
                    }]                                       
                }),						
				new Ext.form.TextArea({
					fieldLabel: 'Remarks',
					tabIndex: 1,
					name: 'shipper[attn]',
					width: 210,
					allowBlank: true
				})
			]
		};    
    },
    
    /***
     * buildConsignee
     * build "consignee" fieldset
     * @param {Object} param
     */
    buildConsignee : function(param) {
        
        var domain = RExt.company.Util.getDomainByName('client');
                        
        // build shipper ComboBox        
        var company = new RExt.company.CompanyCombo({
            hiddenName: 'consignee[company_id]',
            listeners: {
                select: function(param) {                    
                    location.setCompanyId(company.getValue());
                    account.setCompanyId(company.getValue());
        		},                
                scope: this
            }  
        });
        company.setDomain(domain);
        
        // build location                                            
		var location = new RExt.company.LocationCombo({
            hiddenName: 'consignee[company_location_id]'            
        });
                        				                                      
		// build account
        var account = new RExt.company.AccountCombo({
            hiddenName: 'consignee[account_id]',
            domain: domain            
        });
        
        
        this.on('render', function() {
            var shipperAccounts = this.form.findField('shipper[account_id]');
            account.store.on('load', function(rs, options) {
                account.store.add(shipperAccounts.store.getRange());        
            });
        },this);
        
        this.on('reset', function() {
            company.reset();
            location.reset();
            account.reset();    
        });
        
        // consignee fieldset
		var consignee = new Ext.form.FieldSet({
            iconCls: 'icon-door-in',
            id: this.id + '_consignee',
			layout: 'form',
			xtype: 'fieldset',            
			checkboxToggle:true,
			checkboxName: 'has_consignee',
			title: 'Consignee',
			bodyStyle: 'padding: 5px',
			autoHeight: true,			
			defaultType: 'textfield',
			items: [
				company,
                location,
				account,
                new Ext.form.DateField({
	                name: 'consignee[date_in]',
					tabIndex: 1,
	                fieldLabel: 'Delivery date',
	                allowBlank: false,
	                format: 'm/d/Y'
	            }),new Ext.Panel({
                    layout: 'column',
                    items: [{
                        width: 200,
                        layout: 'form',
                        items: new Ext.form.TimeField({
        	                name: 'consignee[time_in]',
        					tabIndex: 1,
                            emptyText: 'time...',
        	                fieldLabel: 'Ready/close',
        	                allowBlank: true,
        	                format: 'H:i',
        	                width: 75
        	            })
                    },{
                        width: 100,                        
                        layout: 'form',
                        hideLabels: true,
                        items: new Ext.form.TimeField({
        	                name: 'consignee[time_out]',
        					tabIndex: 1,
                            emptyText: 'time...',
        	                fieldLabel: 'Close time',
        	                allowBlank: true,	
                            format: 'H:i',                
        	                width: 75				
        	            })
                    }]                                      
                }),			                								
				new Ext.form.TextArea({
					fieldLabel: 'Remarks',
					tabIndex: 1,
					name: 'consignee[attn]',					
                    width: 210,
					allowBlank: true
				})
			]
		});
        // listen to form-show -- expand the consignee (it's a checkBoxToggle fieldset;
        this.on('show', function() { consignee.expand(true); }, this);    
        return consignee;
    },
    
    /***
     * buildBilling
     * build "billing" filedset
     * @param {Object} param
     */
    buildBilling : function(param) {
        var domain = RExt.company.Util.getDomainByName('client');
        var comboBillTo = new RExt.company.CompanyCombo({
            hiddenName: 'order[bill_to_id]'    
        });
        comboBillTo.setDomain(domain);
        
                           
        return {
            id: this.id + '_billing',            
            iconCls: 'icon-creditcards',
			layout: 'form',
            xtype: 'fieldset',            
			title: 'Billing',
			autoHeight: true,
			autoWidth: true,
			defaultType: 'textfield',
			bodyStyle: 'padding: 5px',
            collapsible: true,
			items: [
				new Ext.form.ComboBox({
	                name: 'shipping_method',
                    emptyText: 'Select...',
					tabIndex: 1,
					width: 100,
					listWidth: 100,                    
	                hiddenName: 'order[shipping_method_id]',
                    hiddenId: Ext.id(),
	                fieldLabel: 'Service level',
	                allowBlank: false,
					triggerAction: 'all',
	                displayField: 'name',
	                valueField: 'value',
	                mode: 'local',
	                store: new Ext.data.SimpleStore({
	                    fields: ['value', 'name'],
	                    data: Apollo.order.Util.getShippingMethods()
	                })
	            }),{	            	            
					layout: 'form',
                    style: 'margin-top: 10px',
                    title: 'Bill to third party instead of shipper',
                    collapsed: true,                    
                    autoHeight: true,
                    xtype: 'fieldset',
                    checkboxToggle: true,
                    checkboxName: 'bill_third_party',								        					
					items: [
						comboBillTo,
					]				    
				}
			]
        };    
    },
    
    /***
     * buildShipment
     * build "shipment" fieldset
     * @param {Object} param
     */
    buildShipment : function() {
        var fs_multiple = this.buildMultiplePickup();
        
		// build shipment details fieldset
		return {
            id: this.id + '_shipment',
            iconCls: 'icon-bricks',
            layout: 'form',
            xtype: 'fieldset',
            labelWidth: 105,
			title: 'Shipment',
			autoHeight: true,
			autoWidth: true,
			bodyStyle: 'padding: 5px',
            collapsible: true,
			defaultType: 'textfield',
        	items: [
	            new Ext.form.ComboBox({
	                name: 'commodity',
                    emptyText: 'Select...',
					tabIndex: 1,
					width: 175,
					listWidth: 175,
	                hiddenName: 'order[shipping_commodity_id]',
                    hiddenId: Ext.id(),
	                fieldLabel: 'Commodity',
	                allowBlank: false,
	                mode: 'local',
					triggerAction: 'all',
	                displayField: 'name',
	                valueField: 'value',
	                store: new Ext.data.SimpleStore({
	                    fields: ['value', 'name'],
	                    data: Apollo.order.Util.getShippingCommodities()
	                })
	            }),
                new Ext.form.NumberField({
                    name: 'order[declared_value]',
					tabIndex: 1,
                    fieldLabel: 'Decl. value $',
                    allowBlank: true,                    
                    width: 80
                }),
                new Ext.form.NumberField({
                    name: 'order[pieces]',
					tabIndex: 1,
                    minValue: 1,
                    fieldLabel: '# Pieces',
                    allowBlank: false,                    
                    width: 30
                }),
                new Ext.form.NumberField({
                    name: 'order[weight]',
					tabIndex: 1,                    
                    fieldLabel: 'Weight',
                    allowBlank: true,
                    width: 80
                }),
                fs_multiple
		]};   
        
    },
    
    /***
     * buildMultiplePickup
     * builds the "multiple pickup checkbox fieldset.  for specifying shipment pickup from multiple locations.     
     */
    buildMultiplePickup : function() {
        // create view's record def.
        var Location = Ext.data.Record.create([
            {name: 'location', type: 'string'},
            {name: 'contact', type: 'string'},
            {name: 'address1', type: 'string'},
            {name: 'address2', type: 'string'},
            {name: 'zip', type: 'string'},
            {name: 'phone', type: 'string'},
            {name: 'count'}
        ]);
        
        // build shipper ComboBox
        var store = new Ext.data.Store({
            reader: new Ext.data.ArrayReader({record: 'location'}, Location),
            baseParams: {}
        });
        
        // create view template
        var tpl = new Ext.XTemplate(
    		'<tpl for=".">',
                '<div id="hwb-pickup-{name}" style="padding: 3px;" class="x-grid3-row">',
                '    <p>Pickup {count} items from {location}</p>',
                '</div>',
            '</tpl>'
    	);
        
        // create view
        var view = new Ext.DataView({
            id: this.id + '_pickup_location_view',
            store: store,
            tpl: tpl,
            cls: 'x-grid3',
            multiSelect: true,            
            border: true,
            height: 100,
            autoScroll: true,
            style: 'padding: 5px',
            overClass:'x-grid3-row-over',
            itemSelector:'div.x-grid3-row',
            selectedClass: 'x-grid3-row-selected',
            emptyText: '<h2>Specify multiple pickup locations.</h2><h3 class="r-icon-text icon-information">If the shipment must be picked-up from multiple locations, you may specify the number of pieces to retrieve from each location</h3>'
        });
        
        
        var shipperForm = new Ext.form.FormPanel({
            width: 300,
            labelAlign: 'right',
            header: true,
            title: 'Pickup items from shipper',
            frame: true,
            items: [
                new Ext.form.NumberField({
                    fieldLabel: '# items',
                    name: 'count',
                    width: 50,
                    allowBlank: false
                })
            ],
            buttons: [
                {text: 'add', iconCls: 'icon-accept', handler: function(btn, ev) {
                    if (shipperForm.form.isValid()) {
                        onAddLocation(shipperForm);
                    }    
                }}
            ]
            
        });    
        
        
        var thirdPartyForm = new Ext.form.FormPanel({
            width: 300,
            labelAlign: 'right',
            header: true,
            title: 'Pickup from third party',
            frame: true,
            items: [
                new Ext.form.TextField({
                    fieldLabel: 'Location name',
                    name: 'location',
                    allowBlank: false
                }),
                new Ext.form.TextField({
                    fieldLabel: 'Contact name',
                    name: 'contact',
                    allowBlank: false
                }),
                new Ext.form.TextField({
                    fieldLabel: 'Address1',
                    name: 'address1',
                    allowBlank: false
                }),
                new Ext.form.TextField({
                    fieldLabel: 'Address2',
                    name: 'address2',
                    allowBlank: false
                }),
                new Ext.form.TextField({
                    fieldLabel: 'zip',
                    name: 'zip',
                    allowBlank: false
                }),
                new Ext.form.TextField({
                    fieldLabel: 'phone',
                    name: 'phone',
                    allowBlank: false    
                }),
                new Ext.form.NumberField({
                    fieldLabel: '# items',
                    name: 'count',
                    width: 50,
                    allowBlank: false
                })
            ],
            buttons: [
                {text: 'add', iconCls: 'icon-accept', handler: function() {
                    if (thirdPartyForm.form.isValid()) {
                        onAddLocation(thirdPartyForm);
                    }
                }}
            ]
            
        });
        /***
         * onAddLocation
         * form-handler for both popup forms.
         * @param {Object} form
         */
        function onAddLocation(fpanel) {
            var values = fpanel.form.getValues();
            if (typeof(values.location) == 'undefined') {
                values.location = 'SHIPPER';
            }
            if (view.store.findBy(function(r) { return (r.data.location == values.location)?true:false;}) == -1) {
                view.store.add(new Location(values));    
            }
            else {
                Application.setAlert('The location "' + values.location + '" already exists', false);
            }
            menu.hide();    
        }
                        
        var menu = new Ext.menu.Menu({
            items: [{
                text: 'Shipper', menu: [
                    new RExt.menu.PanelItem({
                        form: shipperForm
                    })
                ]},{
                    text: 'Third party',
                    menu: [new RExt.menu.PanelItem({
                        form: thirdPartyForm
                    })
                ]}
            ]  
        });  
        menu.on('show', function() {            
            shipperForm.form.reset();
            thirdPartyForm.form.reset();
        });
        
        var pickupBtn = new Ext.Button({
            text : 'Add pickup location', 
            iconCls: 'icon-add',
            menu: menu
        });
        return new Ext.form.FieldSet({
            iconCls: 'icon-arrow-join',
            id: this.id + '_multiple_pickup',
            title: 'Pick up items from multiple locations', 
            header: true,
            layout: 'fit',
            autoHeight: true,
            checkboxToggle: true,
            collapsed: true,
            checkboxName: 'multiple_pickup',
            items: {
                header: true,
                title: 'Pick-up locations',
                frame: true,
                autoHeight: true,
                tbar: [
                    pickupBtn,
                    '-',
                    {text: 'Remove location', iconCls: 'icon-delete', handler: function() {
                        var rs = view.getSelectedRecords();
                        if (rs.length == 0) {
                            return false;
                        }
                        view.store.remove(rs[0]);    
                    }}
                ], 
                items: view
            }
        });
    },
    
    /***
     * isValid
     * override isValid to provide custom handling of multiple-pickup locations.
     * 
     */
    isValid : function() {
        var isValid = Apollo.order.HWB.superclass.isValid.apply(this, arguments);
        if (!isValid) {
            return false;
        }      
        var fs = Ext.getCmp(this.id + '_multiple_pickup') || null;                                
        if (fs != null) {            
            if (fs.checkbox.dom.checked == true) {
                // user has chosen to specify multiple pickup locations.
                var view = Ext.getCmp(this.id + '_pickup_location_view');
                
                // verify user has added at least one record.
                if (view.store.getCount() == 0) {
                    Ext.MessageBox.alert('Error', "You've selected 'multiple pickup locations' but haven't specified any");
                    return false;
                }
                // verify that number of pieces is same as the sum in pickup-locations.
                var total = this.form.findField('order[pieces]').getValue();
                var found = 0;
                view.store.each(function(r){
                    found += parseInt(r.data.count);
                });
                if (total != found) {
                    Ext.MessageBox.alert('Error', 'The total number of items at multiple locations (' + found + ') does not match field "# pieces" (' + total + ')');
                    return false;
                }
            }
        }               
                
        // now check dates.
        var msg = '';
        var pdraw = this.form.findField('shipper[date_in]').getRawValue();
        var ddraw = this.form.findField('consignee[date_in]').getRawValue();
                
        var stin = this.form.findField('shipper[time_in]').getValue();                                     
        var stout = this.form.findField('shipper[time_out]').getValue();  
        if (new Date(pdraw + ' ' + stout) - new Date(pdraw + ' ' + stin) < 0) {
            isValid = false;
            msg += 'Shipper close-time occurs before ready-time.  ';
        }      
        var ctin = this.form.findField('consignee[time_in]').getValue();
        var ctout = this.form.findField('consignee[time_out]').getValue();
        if (new Date(ddraw + ' ' + ctout) - new Date(ddraw + ' ' + ctin) < 0) {
            isValid = false
            msg += 'Consignee close-time occurs before ready-time.  ';
        }
        
        var pdate = new Date(pdraw + ' ' + stin);            
        var ddate = new Date(ddraw + ' ' + ctout);   
        if ((ddate - pdate) < 0 ) {
            isValid = false;
            msg += "Consignee's delivery-date occurs before the Shipper's pickup-date.  ";
        }        
        if (isValid === false) {
            Ext.MessageBox.alert('Date error', msg);                
        }                         
        return isValid;
    },
    
    /***
     * getParams
     * implement getParams in order to json encode multiple-location pickups.
     */
    getParams : function() {        
        var params = {
            is_quote : this.isQuote  // <-- send isQuote param to determine if this is a new HWB or just a quote  
        };
        var fs = Ext.getCmp(this.id + '_multiple_pickup') || null;        
        if (fs && fs.checkbox.dom.checked == true) {           
            var view = Ext.getCmp(this.id + '_pickup_location_view');
            var locations = [];
            view.store.each(function(r){
                locations.push(r.data);
            });
            params.locations = Ext.encode(locations);                           
        }        
        return params;
    },
                       
    /***
     * setIsQuote
     * @param {Boolean} v
     */
    setIsQuote : function(v) { 
        this.isQuote = v; 
        this.setTitle('New Quote');        
    },
    
    /***
     * reset
     * override to set isQuote to false
     */
    reset : function() {
        this.isQuote = false;
        this.setTitle('New House Waybill');
        Apollo.order.HWB.superclass.reset.call(this);    
    }     
});