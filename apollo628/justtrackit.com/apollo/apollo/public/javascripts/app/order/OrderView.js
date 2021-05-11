/***
 * Apollo.order.View
 * @extends {Ext.Panel}
 * configured as a BorderLayout.
 */
Apollo.order.View = Ext.extend(Ext.Panel, {
    
    layout: 'border',		   
	closable: true,    
    order_id : null,
    border: true,
    iconCls: 'icon-package',
    
    /** order_id **/
    order_id : null,
    
    /***
     * dashTpl
     * dashboard template id
     */
    dashTpl : 'order-dashboard-template',
        
    initComponent : function() {
                                             
        // create an instance of Apollo.Order
		this.order = new Apollo.Order();                                       
                        
        // clear this order's dashboard when deactivated.
        this.on('deactivate', function() { App.clearDashboard(); },this);       
                                                						        
        // build items
        this.items = this.build();
                        
        // build toolbar
        this.tbar = this.buildToolbar();
        
        this.title = (this.order.bill_number) ? this.order.bill_number : this.order.id;
                                    
        // get ref to gmap.  load order directions only if GMap libs were loaded.
		var omap = Ext.getCmp('order_map') || null;
               
        this.directions = null;
        this.markerMgr = null;
        this.markers = null;
		if (omap) {
			this.markers = omap.getMap().createMarkers(this.getLocations());                                                                                       
		}
        // super                                
        Apollo.order.View.superclass.initComponent.call(this);
        
        // listen to render of last item in tab-panel.  set-up activate listener to renderDashboard        
        this.items.last().on('render', function() {             
            this.renderDashboard();            
            this.on('activate', function() {                                            
                this.renderDashboard(); 
                if (omap) {
                    omap.load({
                        markers: this.markers,
                        order: this.order
                    });
                }
            },this);  
        },this);    
    },
    
    // private.  renders dashboard template on page-north
    renderDashboard : function() {            
        try {    
            RExt.util.TemplateMgr.get(this.dashTpl, {
                getDuration: RExt.util.TemplateMgr.getDuration
            }).overwrite(App.getDashboard().body, this.order);
        }
        catch(e) {
            App.handleException(this, e);
        }                         
    },
    
    refresh : function() {
        // update the gmap directions
        var gmap = Ext.getCmp('gmap');
        if (gmap) {
            //this.directions = gmap.loadDirections(this.getLocations());
        }    
    },
    
    /***
     * getLocations
     * get a serial list of locations from order and routes.  this list is sent to the GMap.  each location object
     * of each entity will be tagged with an "index" key, specifying the index of that address in teh whole route.
     * [Shipper, index:0]->[Pickup-agent, index:1]->[Carrier, index:2]->[Delivery-agent, index:3]->[Consignee, index:4]
     * component so it can create a Directions object.
     * @return {Array} location hashes
     */   
    getLocations : function() {
        var list = [];
		var shipper = this.order.entities.find(function(e) { return e.role == 'shipper' ? true : false; });
		var consignee = this.order.entities.find(function(e) { return e.role == 'consignee' ? true : false; });		
        shipper.location.name = shipper.company.name;        
        consignee.location.name = consignee.company.name;
        
                
		var prev = null;
		routeIndex = 0;
		shipper.location.index = routeIndex++;        
        list.push(shipper.location);
		this.order.routes.each(function(route) {  
                      
			roles = {};
			route.entities.each(function(e) {                
                e.location.name = e.company.name;                 
                roles[e.role] = e;
            });                        
            if (route.type != 'local') {
                if (!prev || typeof(prev.consignee) == 'undefined') {
                    if (!prev || roles.shipper.company.id != prev.consignee.company.id) {
                        roles.shipper.location.index = routeIndex++;
                        list.push(roles.shipper.location);
                    }
                    else {
                        roles.shipper.location.index = prev.consignee.index;
                    }
                    roles.consignee.location.index = routeIndex++;
                    list.push(roles.consignee.location);
                }
            }
			prev = roles;
		},this);

		if (consignee) { // <-- hwb consgignee may not be set.
			consignee.location.index = routeIndex;			
            list.push(consignee.location);
		}        
        return list;
    },
     
    /***
     * buildToolbar
     * @return {array}
     */          
     buildToolbar : function() {
        
        // build list of recipients for this order
        var shipper = this.order.getShipper();
        var consignee = this.order.getConsignee(); 
        var recipients = [
            {id: shipper.id, name: shipper.company.name + ' (Shipper)'},
            {id: consignee.id, name: consignee.company.name + ' (Consignee)'}
        ];
        
        // query routes for potential recipients                         
        this.order.routes.each(function(r) {
            r.entities.each(function(e) {
                var role = e.role;
                if (role == 'shipper' || role == 'consignee') {
                    role = (role == 'shipper') ? 'Pickup agent' : 'Delivery agent';
                }
                recipients.push({
                    id: e.id,
                    name: e.company.name + ' (' + role + ')'
                });                 
            });
        });
        
         var docMgr = Ext.getCmp('document_mgr');
         
         var docsMenu = docMgr.getMenu();
         docsMenu.on('itemclick', function(item, ev) {
             docMgr.preview(item, this.order.id, recipients);              
         },this);
                          
         var pod = Ext.getCmp('pod_form'); 
                                        
         var actionsMenu = new Ext.menu.Menu({
             items: [
                 {text: 'Enter POD', iconCls: 'icon-door-in', scope: this, handler: function(btn, ev) {
                     pod.setKey(this.order.id);
                     pod.showInsert();
                     pod.on('actioncomplete', function(form, action) {
                         if (typeof(action.result) != 'undefined') {
                            if (action.result.success == true) {
                                 pod.hide();
                                 this.order.setPod(action.result.data.pod);
                                 console.log('pod: ', this.order.getPod());
                             }
                         }    
                     },this);                    
                 }},
                 this.buildFinalizeMenu()
             ]    
         });
         return [	
            {text: 'Documents', tooltip: 'Transmit documents via email/fax', iconCls: 'icon-page-white-stack', menu: docsMenu}, '-',	
            {text: 'Actions', iconCls: 'icon-application-lightning', menu: actionsMenu}, '-',						
			'Status:', this.buildOrderStatus(), '-'
	    ];  
     },
     
      /***
     * buildFinalizeMenu
     * build the order-finalization menu
     * @return {Object} menu-item
     */
    buildFinalizeMenu : function() {
        // create "finalize order" actions
        var items = [];
        var list = Apollo.order.Util.getOrderStatusData();
        for (var n=0,len=list.length;n<len;n++) {
            items.push({order_status_id: list[n].id, text: list[n].label, iconCls: 'order-status-' + list[n].name, name: list[n].name, handler: onFinalize, scope: this});    
        }
        
        // button-handler
        function onFinalize(item, ev) {
            var order_id = this.order.id;
            var valid = false;
            switch (item.name) {
                case 'delivered':
                    valid = this.validateOrder();
                    break;
                case 'cancelled':
                    valid = true;
                    break;
            } 
            if (valid === true) {
                Ext.MessageBox.confirm('Confirm', 'Finalize order as "<strong>' + item.text.toUpperCase() + '</strong>"?', function(btn) {                
                    if (btn == 'yes') {       
                        App.request({
                            url: 'order/finalize/' + order_id,
                            params: {
                                order_status_id: item.order_status_id
                            },
                            method: 'POST',
                            success: function(res){                                
                                
                            }                            
                        });                                                    
                    }
                });    
            }                                   
        }
                
        return {text: 'Finalize', iconCls: 'icon-flag-red', menu: items};    
    },
    
     /***
	 * onRender impl.
	 * this is the main render function for the entire order load-tab
	 * @param {Object} sender
	 * @param {Object} el
	 */
    build : function() {
        // render the tab.

		var center = [
            this.buildOrderRouting(),
            this.buildOrderLog(),
            this.buildOrderCosts(),
            this.buildRevenu()
        ];

		var east = [];

		// panel shipper
		var shipper = new Apollo.order.EntityPanel({
			entity: this.order.getShipper(),
            order_id: this.order.id,
			title: 'Shipper',
			header: true,
			frame: false,            
            iconCls: 'icon-door-out',
            listeners : {                                               
                update: function(panel, entity) {            
                    this.order.replaceEntity(entity); 
                    // address was updated.  need to create Marker.                   
                    this.renderDashboard();   
                    this.refresh();  // combine renderDashboard() with refresh()?                        
                },
                scope: this
            }	
		});
                       
		east.push(shipper);
        
        var consignee = this.order.getConsignee();
        if (!consignee) { consignee = 'consignee'; }
		// panel consignee
        var consignee = new Apollo.order.EntityPanel({
			entity: consignee,
            frame: false,
            order_id: this.order.id,
			title: 'Consignee',			
            iconCls: 'icon-door-in',
            cls: 'panel-east',
            listeners : {
                update : function(panel, entity) {
                    this.order.replaceEntity(entity);                    
                    this.renderDashboard();
                    this.refresh();// combine renderDashboard() with refresh()?     
                },
                scope: this
            }	
        });        
        east.push(consignee);
                      
		// shipment panel
        var shipment = this.order.getShipment();        
		east.push(new Apollo.order.ShipmentPanel({
			xtype: 'rpanel',
			title: 'Shipment',
			header: true,
			frame: false,            
            order_id : this.order.id,
            shipment: shipment
		}));		                
        
        // BillingPanel              
        east.push(new Apollo.order.BillingPanel({
            title: 'Billing',
            header: true,
            frame: false,
            order: this.order,
            order_id: this.order.id,
            listeners : {
                update : function() {
                    this.renderDashboard();
                },
                scope: this        
            }
        }));
        
        // POD
        east.push(new Apollo.order.POD({    
            id: 'pod_' + this.order.id,  
            header: true,      
            title: 'Proof of delivery',
            order: this.order    
        }));
        
        
		var regions = [{
            id: 'order-view-center-' + this.order.id,
            region: 'center',   
            cls: 'r-tab-panel-view', 
            frame: false,  
            plain: true,    
            style: 'padding: 5px', 
            header: false,
            border: false,
			xtype: 'tabpanel',                       				            	
            minTabWidth: 120,
            resizeTabs: true,
			autoScroll: true,
			deferredRender: false,
			activeTab: 0,            			            
			items: center			
		},{
            id: 'order-view-east-' + this.order.id,
            cls: 'order-layout-east',
			region: 'east',
			layout: 'accordion',
            frame: false,
            plain: true,            
			collapsible: true,
            collapseMode: 'mini',
			split: true,                                   
            cmargins: '5 5 5 5',
			width: 250,			
            border: false,                                    			            	
			layoutConfig: {
		        // layout-specific configs go here
                fill: false,
		        titleCollapse: true,
		        animate: true,
		        activeOnTop: true
		    },
			items: east
		}];

		return regions;
    },
    	
	/***
	 * onMapRoute
	 * click handler for routelink
	 * @param {Object} ev
	 * @param {Object} btn
	 */
	onMapRoute : function(param) {
        var gmap = Ext.getCmp('gmap');
		var route = this.order.routes.get(param.id);
		if (route) {
            var index = this.order.routes.indexOf(route);			
		}
		else {
			alert('onMapRoute() could not locate route');
		}

	},
    
	/***
	 * onNotifyEndity
	 * user clicks panel button to send notification to an entity
	 * @param {Object} entity
	 */
	onNotifyEntity : function(sender) {
        console.log('sender: ', sender);
        Ext.MessageBox.confirm('Confirm', 'Send agent notification?', function(btn) {
            if (btn == 'yes') {       
                Ext.Ajax.request({
                    url: 'order/notify_entity/' + sender.id,
                    params: {foo: 'bar'},
                    method: 'POST',
                    success : function(conn, response, options) {
                        var res = Ext.decode(conn.responseText);
                        Application.setAlert(res.msg, res.success);
                    },
                    failure: function(conn, response, options) {
                        Application.setAlert('An error occurred -- could not send notifications');
                    }
                });
            }
        });
	},
    
    /***
     * onNotifyRoute
     * send notifications to all route entities.
     * @param {Object} sender
     */
    onNotifyRoute : function(sender) {
        Ext.MessageBox.confirm('Confirm', 'Send agent notifications?', function(btn) {
            if (btn == 'yes') {
                Ext.Ajax.request({
                    url: 'order/notify_route/' + sender.id,
                    method: 'POST',
                    success : function(conn, response, options) {
                        console.log(response);
                        var res = Ext.decode(conn.responseText);
                        Application.setAlert(res.msg, res.success);
                    },
                    failure: function(conn, response, options) {
                        alert('failure');
                        Application.setAlert('An error occurred -- could not send notifications');
                    }
                });  
            }
        });
    },
    
    /***
    * buildOrderStatus
    *
    */
    buildOrderStatus : function() {
        // build "status" ComboBox
        var status = new Ext.form.ComboBox({
            fieldLabel: 'Order status',
            hiddenName:'shipping_status_id',
            store: new Ext.data.SimpleStore({
                fields: ['value', 'name'],
                data : Apollo.order.Util.getShippingStatusData(),
                id : 0
            }),
            value: this.order.getCurrentShippingStatus(),
            displayField:'name',
            valueField: 'value',
            mode: 'local',
            triggerAction: 'all',
            selectOnFocus:true,
            listWidth: 250,
            width:250
        });

        status.on('select', function(field, oldVal, newVal) {
            var record = field.store.getAt(newVal);
            Ext.MessageBox.confirm('Confirm', 'Change order status to "' +  record.data.name + '"?', function(btn) {
                if (btn == 'yes') {
                    App.request({
                        url: 'order/change_status/' + this.order.id,
                        params: {
                            shipping_status_id : record.data.value
                        },
                        success : function(res) {
                            if (res.success == true) {
                                this.order.setShippingStatus(record.data.name);
                                this.renderDashboard();
                            }   
                        },
                        scope: this
                    });                    
                }
            },this);
        },this);

		return status;
    },

    /***
    * buildOrderRouting
    *
    */
    buildOrderRouting : function() {
        
		// get and render teh Apollo.order.RouteView
		
        panels = [];
                
        this.order.routes.each(function(route) {                            
            switch (route.type) {
                case 'route':                                        
                    var panel = new Apollo.order.RoutePanel({
                        id: 'route_panel_' + route.id,
                        layout: 'fit',                                                
                        route: route,
                        order: this.order,
                        listeners: {
                            update: function(rpanel, route) {
                                //this.refresh();    
                            },
                            'delete' : function(rpanel, route) {                                  
                                //this.refresh();                   
                                accordion.remove(panel);  
                            },
                            scope: this
                        }
                    });                    
                    break;
                case 'local':
                    var panel = new Apollo.order.LocalRoutePanel({
                        id: 'route_panel_' + route.id,                        
                        layout: 'fit',
                        route: route,
                        order: this.order,
                        listeners: {
                            update: function(rpanel, route) {
                                //this.refresh();    
                            },
                            'delete' : function(rpanel, route) {                                  
                                //this.refresh();                   
                                accordion.remove(panel);  
                            },
                            scope: this
                        }
                    });
                    break;
            }
            if (panel) {
                panels.push(panel);
            }
            else {
                alert('Order::buildOrderRouting -- no panel created for ' + route.type);
            }
                       
        },this);                                          
		         
        var accordion = new Ext.Panel({
            id: 'order-view-route-accordion-' + this.order.id,
            deferredRender: false,
            layout: 'accordion',
            layoutConfig: {
    	        titleCollapse: true,
    	        animate: true,
    	        activeOnTop: true,
                fill: false
    	    },
            tbar : [{
				text: 'Add Route',
                iconCls: 'icon-lorry-add',
                menu: [
                    {text: 'Master waybill', handler: this.onAddMawb, scope: this},
                    {text: 'Local', handler: this.onAddLocal, scope: this}
                ]				
			}, '-'],
    		header: true,
            items: (panels.length > 0) ? panels : null,
    		border: true,
            frame: false,
    		title: 'Routing',
            iconCls: 'icon-lorry'    		
    	});        

        return accordion;
    },
    
     /***
     * onAddMawb
     * user clicks add-mawb button
     */
    onAddMawb : function(btn, ev) {                                                                       
        var fpanel = Ext.getCmp('routing_form');   
                                                                        
        fpanel.setKey(this.order.id);
        fpanel.setOrder(this.order);
        fpanel.showInsert();     
                                                                                   
		fpanel.on('actioncomplete', function(form, action) {
            fpanel.hide();            
            this.addRoutePanel(new Apollo.order.RoutePanel({                    
                route: this.order.addRoute(action.result.data.route),
                order: this.order
            }));
        },this);  
	},
    
    /**
     * onAddLocal
     */
    onAddLocal : function(btn, ev) {
        var fpanel = Ext.getCmp("local_route_form");
        fpanel.setKey(this.order.id);
        fpanel.setOrder(this.order);
        fpanel.showInsert(); 
        fpanel.on('actioncomplete', function(form, action) {
            fpanel.hide();                        
            this.addRoutePanel(new Apollo.order.LocalRoutePanel({                    
                route: this.order.addRoute(action.result.data.route),
                order: this.order
            }));    
        },this);
    },
    
    /**
     * addRoutePanel
     * processes a successful route-insert.
     * @param {Apollo.order.RoutePanel} rpanel     
     */  
    addRoutePanel : function(rpanel) {                                                  
        var accordion = Ext.getCmp('order-view-route-accordion-' + this.order.id);
        
        this.refresh();
                          
        rpanel.on('delete', function(p) {    // <-- listen to delete requests on panel                    
            accordion.remove(rpanel);
        });
        
        var costs = this.findByType(Apollo.order.Costs)[0];
        costs.refresh();        
        accordion.add(rpanel);                                
        accordion.doLayout();
        rpanel.expand();                      
    },
    
    /***
     * buildOrderLog
     *
     */
    buildOrderLog : function() {
        
        var log = new Apollo.order.Log({
            id: 'order-log-' + this.order.id,
            order_id: this.order.id,
            data: this.order.getLog()
        });
        
        // create log-popup button
        var logButton = new RExt.Toolbar.PopupButton({
            text: 'Add log entry',
            iconCls: 'icon-comment-add',
            menu: Ext.getCmp('log_popup')
        });
        logButton.on('click', log.onAdd, log, {});
        
        var logFilter = new Ext.form.ComboBox({                        
            store: new Ext.data.SimpleStore({
                fields: ['id', 'name'],
                data : Apollo.order.Util.getOrderLogTypes(),
                id : 0
            }),       
            width: 100,
            listWidth: 100,     
            displayField:'name',
            valueField: 'id',
            value: 'ALL',
            mode: 'local',
            triggerAction: 'all',
            selectOnFocus:true                    
        });
        logFilter.on('select', function(field, record, index) {
            if (record.data.name == 'ALL') {
                log.store.clearFilter();
            }
            else {
                log.store.filter('type', record.data.name);
            }
        });
        
        return {
            border: true,
            id: 'order-log-tab-' + this.order.id,
            tbar: [logButton, '-', 'Filter: ', logFilter, '-'],
            frame: false,
			title: 'Log',
            iconCls: 'icon-comments',
            bodyStyle: 'padding: 0px',
            autoScroll: true,
            items: log
		};
    },
        
    /***
     * buildOrderCosts
     * 
     */
    buildOrderCosts : function() {                
         var task = new Ext.util.DelayedTask(this.renderDashboard, this);
         var costs = new Apollo.order.Costs({
            id: 'order_costs_' + this.order.id,
            order: this.order,
            listeners : {
                update : function(total) {
                    this.order.setTotalCost(total);                    
                    task.delay(20);    
                },
                activate : function() {
                    // collapse east when costs-tab is activated.
                    Ext.getCmp('order-view-east-' + this.order.id).collapse();                                      
                    
                },
                scope: this
            }                     
        }); 
        return costs;                                     
    },    
    
    buildRevenu : function() {
        var panel = new Apollo.order.Revenu({
            order: this.order,
            listeners : {
                update : function(total) {
                    this.order.setTotalRevenu(total);
                    this.renderDashboard();    
                },
                activate : function() {
                    // collapse east when costs-tab is activated.
                    Ext.getCmp('order-view-east-' + this.order.id).collapse();                                      
                    
                },
                scope: this
            }
        });
        var tpl = RExt.util.TemplateMgr.get(panel.propertiesTpl);
        console.log('tpl: ', tpl);
        
        return panel;
    },
    
	/***
	 * updateRoute
	 * @param {Object} route
	 */
	updateRoute : function(route) {
		// update order grand-total		
		route.costs = this.order.costs.filter('order_id', route.id);

		var view = Ext.ComponentMgr.get('route_view');
		var el = view.update(route);
		Apollo.order.Util.gmap.applyShowHandlers(el, this.onMapCompany, this);

		// attach button click handlers on domQuery .btn-edit-expenses
		var buttons = el.query('.btn-edit-expenses');
		for (var n=0,len=buttons.length;n<len;n++) {
			var btn = Ext.fly(buttons[n]);
			btn.on('click', this.onAddRouteCost, this, {});
		}
		// apply show handlers to all buttons of class .btn-gmap
        var gmap = Ext.getCmp('gmap') || null;
        if (gmap) {
            gmap.applyShowHandlers(el, this.onMapCompany, this, '.btn-gmap');
            gmap.applyRouteHandlers(el, this.onMapRoute, this);
        }

	},              
    
    /***
     * validateOrder
     * make sure an order has necessary pre-requisites before allowing it to be finalized.
     * @return {Boolean}
     */        
    validateOrder : function() {         
        if (this.order.routes.getCount() == 0) {
            App.setStatus(App.STATUS_ERROR, 'Order-validation failed', "This order has no routes defined.  Aren't you supposed to move some freight to the Consignee??");
            return false;
        }
        else if (this.order.getTotalCost() == 0) {
            App.setStatus(App.STATUS_ERROR, 'Order-validation failed', "This order has no costs defined.  Moving freight free-of-charge is not a sustainable business plan.");
            return false;
        }
        else if (this.order.getPod() === false) {
            App.setStatus(App.STATUS_ERROR, 'Order-validation failed', "Proof of delivery not defined");
            return false;
        }
        return true;    
    },
    	
	/***
	 * getTitle
	 * return the title for this load-tab
	 */
    getTitle : function() {
        return 'Order id: ' + this.order.id;
    },
    
    destroy : function() {                       
        delete this.order; 
        // destroy markers collection if gmap is loaded.
        if (this.markers != null) {
            this.markers.clear();
        }                      
        App.clearDashboard();                
        Apollo.order.View.superclass.destroy.apply(this, arguments);
    }
});


/***
 * Apollo.order.Costs
 * Has 2 child components for managing an order's costs.  first is EntityCostPanel, which manages the base-costs of 
 * Pickup-agent, Carrier and Delivery-agent.  the 2nd is a cost grid which manages "accessorial charges" like "lift-gate".
 * Assessorial charges are listed on the Invoice while base-costs are NOT.
 */
Apollo.order.Costs = Ext.extend(Ext.Panel, {
    
    layout : 'border',
    title: "Costs",
    iconCls: "icon-money",
    frame: true,    
    
    initComponent : function() {
        
        this.addEvents({
            'update' : true
        });
        
        var entityCosts = new Apollo.order.EntityCostPanel({
            region: 'west',
            width: 275,
            order: this.order,
            listeners : {
                update : function(amount) {
                    // fires the total + grid-total
                    this.fireEvent('update', amount + grid.getTotal());                        
                },
                scope: this
            }             
        });
            
        // create the ExpenseGrid
    	var grid = new Apollo.order.ExpenseGrid({                           
            region: 'center',            
            margins: '0 0 0 5',                       
            border: true,	
            order: this.order,
            iconCls: 'icon-money',                		
    		id: 'expense_grid_' + this.order.id,    		    		
    		enableColLock: false,
    		autoExpandColumn: 'company',
            listeners : {                
                update : function(total) {           
                    // fires grid-total + entity-costs total
                    this.fireEvent('update', total + entityCosts.getTotal());                             
                },
                scope: this
            }
    	});     
        grid.init(this.order);
                           
                
        this.items = [
            entityCosts,
            grid
        ];
        
        Apollo.order.Costs.superclass.initComponent.call(this);
        
        this.order.setTotalCost(this.getTotal());
    },
    
    getTotal : function() {
        var total = 0;
        this.items.each(function(i) {            
            total += i.getTotal();
        });
        return total;
    },
    
    getAccessorialCost : function() {
        var grid = this.items.find(function(i) {return (i instanceof Apollo.order.ExpenseGrid) ? true : false;});
        return grid.getTotal();        
    },
    getEntityCost : function() {
        var panel = this.items.find(function(i) { return (i instanceof Apollo.order.EntityCostPanel) ? true : false});  
        return panel.getTotal();  
    },
    
    refresh : function() {
        var panel = this.findByType(Apollo.order.CostPanel)[0];
        panel.build();    
    }
});

/**
 * Apollo.order.EntityCostPanel
 * A component that presents inline-editors for entity-costs.  when any cost is changed, 'update' event is fired, 
 * sending the total of all fields along as the event param.  the parent component is listening for this event so 
 * it can update the dashboard with latest cost.
 */
Apollo.order.EntityCostPanel = Ext.extend(Ext.Panel, {
    
    region: 'west',  
    width: 250,         
    title: 'Carrier / Agent Costs',
    frame : false,        
    border: true,    
    bodyStyle: 'background-color: #fff;padding:5px;border:1px solid #8db2e3;border-top:0',
        
    tpl : 'order-entity-cost-template',
    
    initComponent : function() {
        
        // collection of all inline editors
        this.fields = new Ext.util.MixedCollection();
        
        this.addEvents({
            /**
             * @event update
             * @param {Float} total
             * fires when any inline editor is updated.
             */
            update : true
        });
        
        // render template on component render
        this.on('render', this.build, this);
        
        // super
        Apollo.order.EntityCostPanel.superclass.initComponent.call(this);
    },
    
    // private.  render the template.  attach listeners on inline-fields.
    build : function() {
                
        var tpl = RExt.util.TemplateMgr.get(this.tpl);    
        
        // clear the fields collection before rendering template.
        this.fields.clear();
        
        // render templtae                                  
        tpl.overwrite(this.body, this.order.routes.getRange());
        
        // add fields to collection               
        this.fields.addAll(Application.applyInlineEditors(this, this.body));
        
        // attach 'change' listeners; inform parent when any cost changes.  send total cost as event param.
        this.fields.each(function(i) {            
            i.on('change', function(f, oldVal, newVal) { 
                var id = f.el.id.split('-').pop();
                                
                // 1. find the route where this entity exists.                
                var route = this.order.routes.find(function(r) {return (r.entities.find(function(e) { return (e.id == id) ? true : false })) ? true : false; });   
                
                // 2. now grab the entity                             
                var entity = route.entities.find(function(e) { return (e.id == id) ? true : false;});
                
                // 3. update its cost
                entity.cost = f.getValue();
                
                // 4. and signal the parent.
                this.fireEvent('update', this.getTotal()); 
            },this);
        },this);                                                                                                                
    },
    
    /**
     * getTotal
     * @return {Float} total cost of all fields
     */
    getTotal : function(fields) {        
        var total = 0.00;
        this.order.routes.each(function(r) {
            r.entities.each(function(e) {                
                total += parseFloat(e.cost);        
            });    
        });        
        return total;       
    },
    
    // private. clear the fields collection   
    destroy : function() {
        this.fields.clear();        
        Apollo.order.EntityCostPanel.superclass.destroy.call(this);
    }   
});

/***
 * Apollo.order.ExpenseGrid
 * An edit-grid for editing order-expenses.  fires 'update' event when costs are changed, sending the grand-total along
 * as the evnet param.  the parent component is listening to this event so it can update the dashboard with the latest
 * cost.
 * @param {Object} param
 */
Apollo.order.ExpenseGrid = function(param){

    var fm = Ext.form
    
    // create company ComboBox listing companies who can incur an order expense
    var comboCompany = new Ext.form.ComboBox({
        name: 'company',
        hiddenName: 'expense-grid-company_id',
        allowBlank: false,
        mode: 'local',
        triggerAction: 'all',
        valueField: 'id',
        displayField: 'name',
        store: new Ext.data.SimpleStore({
            fields: ['id', 'name'],
            data: []
        })
    });
    
    var comboCostType = new Ext.form.ComboBox({
        name: 'cost_type',
        hiddenName: 'expense-grid-cost-type',
        allowBlank: false,
        mode: 'local',
        triggerAction: 'all',
        valueField: 'id',
        displayField: 'name',
        store: new Ext.data.SimpleStore({
            fields: [{
                name: 'id',
                mapping: 1
            }, {
                name: 'name',
                mapping: 1
            }],
            data: Apollo.order.Util.getShippingCosts()
        })
    });
    var costEditor = comboCostType;
    
    // define a custom summary function
    /*
    Ext.grid.GroupSummary.Calculations['totalCost'] = function(v, record, field){
        return v + (record.data.estimate * record.data.rate);
    }
    */
    
    var summary = new Ext.grid.GroupSummary();
    
    // the column model has information about grid columns
    // dataIndex maps the column to the specific data field in
    // the data store (created below)
    var cm = new Ext.grid.ColumnModel([{
        id: 'route',
        dataIndex: 'route',
    }, {
        id: 'date',
        header: "Date",
        dataIndex: 'when',
        width: 95,
        renderer: Ext.util.Format.dateRenderer('Y-m-d'),
        editor: new fm.DateField({
            format: 'Y-m-d'
        })
    }, {
        id: 'company',
        header: "Company",
        dataIndex: 'company',
        width: 150,
        editor: comboCompany
    }, {
        id: 'type',
        header: "Expense type",
        dataIndex: 'type',
        width: 150,
        editor: costEditor
    }, {
        id: 'cost',
        header: "Cost",
        dataIndex: 'cost',
        summaryType: 'sum',
        summaryRenderer: Ext.util.Format.usMoney,
        width: 60,
        renderer: Ext.util.Format.usMoney,
        editor: new fm.NumberField({
            allowBlank: false,
            allowNegative: false
        })
    
    }]);
    
    // by default columns are sortable
    cm.defaultSortable = true;
    
    // type so we can add records dynamically
    var Cost = Ext.data.Record.create([{
        name: 'order_entity_id',
        mapping: 1,
        type: 'string'
    }, {
        name: 'order_id',
        mapping: 2,
        type: 'string'
    }, {
        name: 'cost',
        mapping: 3,
        type: 'float'
    }, {
        name: 'company',
        mapping: 4,
        type: 'string'
    }, {
        name: 'when',
        mapping: 5,
        type: 'date',
        dateFormat: 'Y-m-d'
    }, {
        name: 'type',
        mapping: 6,
        type: 'string'
    }, {
        name: 'route',
        mapping: 7,
        type: 'string'
    }, {
        name: 'id',
        mapping: 0
    }]);
    
    // create the Data Store
    // entity_cost_id, entity_id, order_id, cost, company, when, type
    var ds = new Ext.data.GroupingStore({
        proxy: new Ext.data.MemoryProxy([]),
        reader: new Ext.data.ArrayReader({
            id: 0
        }, Cost),
        groupField: 'route',
        sortInfo: {
            field: 'cost',
            direction: "ASC"
        },
    });
            
    param.cm = cm;
    param.ds = ds;
    param.view = new Ext.grid.GroupingView({
        forceFit: true,
        showGroupName: false,
        enableNoGroups: false, // REQUIRED!
        hideGroupedColumn: true
    });
    
    param.plugins = summary;
    
    
    // *super*
    Apollo.order.ExpenseGrid.superclass.constructor.call(this, param);
    
    /***
     * @event beforeedit
     * grid - This grid
     * record - The record being edited
     * field - The field name being edited
     * value - The value for the field being edited.
     * row - The grid row index
     * column - The grid column index
     * cancel - Set this to true to cancel the edit or return false from your handler.
     * @param {Object} param
     */
    this.on('beforeedit', function(param){
        // show the appropriate companies in combo.
        if (param.field == 'company') {
            var field = this.getColumnModel().getColumnById(param.field).editor.field;
            field.store.each(function(r){
                field.store.remove(r);
            });
            var route = this.order.routes.get(param.record.data.order_id);
            route.entities.each(function(e){
                field.store.insert(0, new field.store.recordType({
                    id: e.company.name,
                    name: e.company.name
                }));
            }, this);
            
        }
    }, this);
    
    this.addEvents({
        'update': true
    });
    
};
Ext.extend(Apollo.order.ExpenseGrid, Ext.grid.EditorGridPanel, {
    
    controller: 'order',
    actions: {
        insert: null,
        update: 'update_costs',
        'delete' : 'delete_cost',
    },
    
    title: "Accessorial Charges",
    region: 'center',    
    bodyStyle: 'border:1px solid #8db2e3;border-top:0',
    initComponent : function() {        
        // build toolbar            
        this.tbar = [            
            {                
                iconCls: 'icon-add',
                listeners: {
                    click: this.onAdd,
                    scope: this    
                }                
            }, '-',
            {iconCls: 'icon-disk', handler: this.onUpdate, scope: this}, '-',
            {iconCls: 'icon-delete', handler: this.onDelete, scope: this}, '-'        
        ];
        
        // super
        Apollo.order.ExpenseGrid.superclass.initComponent.call(this);    
    },
    
    /***
     * on
     * override on, only allow one listener on 'update' event.  remove prev. before adding.
     * @param {Object} event
     * @param {Object} method
     * @param {Object} scope
     */
    on: function(event, method, scope){
        if (event == 'update') {
            this.removeListener(event, method, scope);
        }
        Apollo.order.ExpenseGrid.superclass.on.apply(this, arguments);
    },
    
    /***
     * init
     * @param {Object} order
     */
    init: function(order){
    
        var data = order.getCosts();
        var route = order.routes.first();
        for (var n = 0, len = data.length; n < len; n++) {
            var order_id = data[n][2];
            if (order_id != route.id) {
                route = order.routes.find(function(r){
                    return (r.id == order_id) ? true : false;
                });
            }
            data[n].push(route.index + ', ' + route.origin.airport.iso + ' -> ' + route.destination.airport.iso);
            
        }
        
        
        this.store.loadData(data);
        
    },
    
    /***
     * onAdd
     * user clicks [Edit Costs] button on toolbar
     * @param {Object} btn
     * @param {Object} ev
     */
    onAdd: function(btn, ev){
        ///////////////////////////////////////////////////////////////////////
        // BUG? [SOLVEd]: I've seen this handler get attached multiple times before.  keep an eye out here                 
        //console.info('ExpenseForm::onAdd -- bug?  route-count: ', this.order.routes.getCount());     
        ///////////////////////////////////////////////////////////////////////
        
        var popup = Ext.getCmp('expense_popup');
        var fpanel = popup.form;
        fpanel.setKey(this.order.id);        
        fpanel.showInsert();                
                
        if (this.order.routes.getCount() == 0) {            
            App.setAlert(App.STATUS_NOTICE, 'To add a cost to this order, you must first add at least one Route');             
            return false;  
        }
        popup.show(btn.el);        
        fpanel.init(this.order);        
                
        fpanel.on('actioncomplete', function(form, action){
            if (typeof(action.result) != 'undefined') {
                if (action.result.success == true) {
                    this.doInsert(action.result);
                    
                    //this.total.dom.innerHTML = this.order.getTotalCost(); // <-- update route total cost
                    popup.hide();
                }
            }
        }, this);                
        
    },
    
    /***
     * onDelete
     * @param {Object} res
     */
    onDelete : function(btn, ev) {
        var rec = this.getSelectionModel().getSelected();  
                               
        if (rec) {
            Ext.MessageBox.confirm('Confirm', 'Delete order-cost?', function(btn) {
                if (btn == 'yes') {
                    App.request({
                        url: this.controller + '/' + this.actions['delete'] + '/' + rec.data.id,
                        success: function(res) {
                            this.store.remove(rec);
                            this.getView().refresh(); 
                            this.fireEvent('update', this.getTotalCost());          
                        },
                        scope: this
                    });
                }
            },this);
        }
    },
    
    /***
     * doInsert
     * @param {RResponse} res
     */
    doInsert: function(res){
        var data = res.data;
        var route = this.order.routes.find(function(r){
            return (r.id == data.order_id) ? true : false;
        });
        data.route = route.index + ', ' + route.origin.airport.iso + ' -> ' + route.destination.airport.iso;                       
        data.when = new Date(data.when);  
        data.cost = parseFloat(data.cost);                      
        var ds = this.getStore();
        this.stopEditing();
        var cost = new ds.recordType(data);
        ds.insert(this.store.getCount(), cost);
        this.fireEvent('update', this.getTotalCost());
    },
    
    /***
     * onUpdate
     * @param {Object} btn
     * @param {Object} ev
     */
    onUpdate: function(btn, ev){
        records = this.store.getModifiedRecords();
        
        var modified = [];
        for (var n = 0, len = records.length; n < len; n++) {
            var rec = records[n];
            fields = [];
            for (var k in rec.modified) {
                fields.push({
                    name: k,
                    value: rec.data[k]
                });
            }
            modified.push({
                id: rec.data.id,
                fields: fields,
                data: rec.data
            });
        }
        
        // if there are modified records, Ajax them up to server.
        if (modified.length > 0) {
            //Ext.MessageBox.wait('Saving', 'Please wait');
            App.showSpinner('Saving...');
            var grid = this;            
            App.request({                
                url: this.controller + '/' + this.actions.update + '/' + this.order.id,
                scope: this,
                success: function(res){                                                            
                    if (res.success == true) {
                        grid.store.commitChanges();
                        this.getView().refresh();
                        grid.fireEvent('update', this.getTotalCost()); // <-- fire update event.
                    }
                },                                
                params: {
                    modified: Ext.encode(modified)
                }                  
            });                        
        }
        else {
            App.setAlert(App.STATUS_NOTICE, 'Costs are updated');
        }
        
        
    },
    
    /***
     * getTotalCost
     */
    getTotalCost : function() {
        var total = 0;
        this.store.each(function(rec) { total += parseFloat(rec.data.cost); });
        return total;    
    },
    
    /***
     * getTotal
     * @alias getTotalCost
     */
    getTotal : function() {
        return this.getTotalCost();
    },
    
    getOrder: function(){
        return this.order;
    },
    getRouteId: function(){
        return this.route_id;
    }
    
});

Ext.data.Record.prototype.toArray = function(){
    var row = [];
    for (var n = 0, len = this.fields.items.length; n < len; n++) {
        row[this.fields.items[n].mapping] = this.data[this.fields.items[n].name];
    }
    return row;
};


/***
 * Apollo.order.ExpenseForm
 * A form for adding expenses to grid
 * @author Chris Scott
 *
 */
Apollo.order.ExpenseForm = Ext.extend(RExt.sys.Form, {
    controller: 'order',
    actions: {
        insert: 'add_expense'
    },
     
    /***
     * reset
     */
    reset: function() {
    
        // * super *
        Apollo.order.ExpenseForm.superclass.reset.apply(this, arguments);                
    },
    
    /***
     * init
     * @param {Object} order
     */
    init: function(order){
        this.order = order;
        
        var comboRoute = this.form.findField('cost_order_id');
        var comboCompany = this.form.findField('cost[order_entity_id]');
        
        comboCompany.lastQuery = null;
        comboCompany.reset();
        
        var Record = Ext.data.Record.create([{
            name: 'id'
        }, {
            name: 'name'
        }]);
        comboRoute.store.removeAll();
                
        order.routes.each(function(route){
            comboRoute.store.insert(0, new Record({
                id: route.id,
                name: route.origin.airport.iso + ' -> ' + route.destination.airport.iso
            }));
            
        }, this);
        // auto-select the first route.
        comboRoute.setValue(this.order.routes.first().id); 
        comboRoute.fireEvent('select', comboRoute, comboRoute.store.getAt(0), 0);
    },
    
    /***
     * render
     * override Ext.form.Form::render
     * @param {Ext.Element}
     */
    initComponent: function(){
        
        // create company ComboBox listing companies who can incur an order expense
        var comboCompany = new Ext.form.ComboBox({
            name: 'company',
            disabled: false,
            hiddenName: 'cost[order_entity_id]',
            fieldLabel: 'Company',
            allowBlank: false,
            mode: 'local',
            triggerAction: 'all',
            valueField: 'id',
            displayField: 'name',
            width: 150,
            store: new Ext.data.SimpleStore({
                fields: ['id', 'name']
            })
        });
        
        // create company ComboBox listing companies who can incur an order expense
        var comboRoute = new Ext.form.ComboBox({
            name: 'route',
            disabled: false,
            hiddenName: 'cost_order_id',
            fieldLabel: 'Route',
            allowBlank: false,
            mode: 'local',
            triggerAction: 'all',
            valueField: 'id',
            displayField: 'name',
            width: 150,
            store: new Ext.data.SimpleStore({
                fields: ['id', 'name']
            }),
            listeners: {
                select : function(field, record, index) {
                    var records = [];
                    var route = this.order.routes.get(record.data.id);
                    comboCompany.store.each(function(record){
                        comboCompany.store.remove(record);
                    });
                    route.entities.each(function(e){
                        records.push(new comboCompany.store.recordType({
                            id: e.id,
                            name: e.company.name
                        }));
                    });
                    // init order-entity Combo.
                    comboCompany.store.add(records);
                },
                scope: this
            }
        });
                                        
        var fieldset = {
            layout: 'form',
            header: false,
            autoHeight: true,
            border: true,
            defaultType: 'textfield',
            
            items: [comboRoute, comboCompany, new Ext.form.ComboBox({
                fieldLabel: 'Expense',
                hiddenName: 'cost[shipping_cost_id]',
                store: new Ext.data.SimpleStore({
                    fields: ['value', 'name'],
                    data: Apollo.order.Util.getShippingCosts(),
                    id: 0
                }),
                displayField: 'name',
                allowBlank: false,
                forceSelection: true,
                valueField: 'value',
                mode: 'local',
                triggerAction: 'all',
                selectOnFocus: true,
                width: 190
            }), new Ext.form.NumberField({
                name: 'cost[cost]',
                fieldLabel: 'Cost',
                allowBlank: false,
                width: 50
            }), new Ext.form.DateField({
                name: 'cost[when]',
                fieldLabel: 'Date',
                allowBlank: false,
                format: 'Y-m-d'
            })]
        };
        
        this.items = fieldset;
        Apollo.order.ExpenseForm.superclass.initComponent.call(this);
    }
});

/**
 * Apollo.order.Revenu
 * order-revenu manager
 */
Apollo.order.Revenu = Ext.extend(Ext.Panel, {
        
    layout: 'border',
    frame: true,
    title: 'Revenue',
    iconCls: 'icon-creditcards',  
    
    propertiesTpl : 'order-revenu-properties-template',
    summaryTpl : 'order-revenu-summary-template',
    
                
    initComponent : function() {
                
        this.addEvents({
            /**
             * @event update
             * @param {Float} total_revenu
             * fires when Revenu properties are updated
             */
            update : true
        });
        
        this.items = [{
            id: 'revenu_properties_' + this.order.id,
            title: 'Properties',
            region: 'west',
            width: 275,
            frame: false,
            bodyStyle: 'background-color: #fff;padding:5px;border:1px solid #8db2e3;border-top:0',
            margins: '0 5 0 0',
            listeners: {
                render: this.renderProperties,
                scope: this
            }
        },{
            id: 'revenu_summary_' + this.order.id,
            title: 'Summary',
            region: 'center',            
            margins: '0 0 0 0',
            bodyStyle: 'background-color: #fff;padding:5px;border:1px solid #8db2e3;border-top:0',
            listeners : {
                render: function(panel) {
                    // listen to costMgr; re-render the template when it gets updated.                    
                    Ext.getCmp('order_costs_' + this.order.id).on('update', function(amount) { this.renderSummary(panel); },this);                    
                    this.renderSummary(panel);
                },
                scope: this
            }
        }];
        
        // super        
        Apollo.order.Revenu.superclass.initComponent.call(this);
        
        this.order.setTotalRevenu(this.getTotal());
        
    },
    
    // render revenu properties template
    renderProperties : function(panel) {                
        var tpl = RExt.util.TemplateMgr.get(this.propertiesTpl);                
        tpl.overwrite(panel.body, this.order);
        
        var fields = Application.applyInlineEditors(this, panel.body);
        for (var n=0,len=fields.length;n<len;n++) {
            fields[n].on('change', function(f, oldVal, newVal) {                
                var id = f.el.id.split('-').pop();
                var revenus = this.order.getRevenus();
                for (var i=0,leni=revenus.length;i<leni;i++) {
                    if (revenus[i].id == id) {                        
                        revenus[i].value = f.getValue();
                        this.order.setRevenus(revenus);                                                
                    }
                }                
                this.renderSummary(this.getComponent('revenu_summary_' + this.order.id));
                
                // fire update event so that view know to re-render the dashboard
                this.fireEvent('update', this.getTotal());                    
            },this);
        }
    },
    
    // render summary template
    renderSummary : function(panel) {
        
        var costMgr = Ext.getCmp('order_costs_' + this.order.id);                                        
        var tpl = RExt.util.TemplateMgr.get(this.summaryTpl);
        
        var total_cost = costMgr.getTotal();
        var total_revenu = this.getTotal();
        
        var toMoney = Ext.util.Format.usMoney;        
        var data = {         
            accessorial_costs: toMoney(costMgr.getAccessorialCost()),
            entity_costs : toMoney(costMgr.getEntityCost()),
            total_cost : toMoney(total_cost),
            revenus : this.order.getRevenus(),
            total_revenu : toMoney(total_revenu),
            total_invoice : toMoney(total_cost + total_revenu)     
        }; 
        this.order.setTotalRevenu(total_revenu);
                              
        tpl.overwrite(panel.body, data);               
    },
    
    /**
     * getTotal
     * returns the total revenu based upon total cost
     * @return {Float}
     */
    getTotal : function() {
        var costMgr = Ext.getCmp('order_costs_' + this.order.id);
        var total_cost = costMgr.getTotal();
        var total_revenu = 0;        
        var revenus = this.order.getRevenus();
        for (var n=0,len=revenus.length;n<len;n++) {
            // if the item is "insurance", multiplcand is declared_value, otherwise it's total_cost              
            var multiplicand = (revenus[n].item.name == 'insurance') ? this.order.getShipment().values.declared_value : total_cost; 
            switch (revenus[n].type.name) {
                case 'percentage':
                    revenus[n].total = revenus[n].value / 100 * multiplicand;
                    break;
                case 'fee':
                    revenus[n].total = revenus[n].value;
                    break;
                case 'multiplier':
                    revenus[n].total = revenus[n].value * multiplicand;
                    break;
            }                          
            total_revenu += revenus[n].total
        }
        return total_revenu;
    }
});

/***
 * Apollo.order.QuoteView
 * A special extension of order.View for handling quotes.
 */
Apollo.order.QuoteView = Ext.extend(Apollo.order.View, {
    
    initComponent : function() {        
        Apollo.order.QuoteView.superclass.initComponent.call(this);
    },
    
    buildToolbar: function() {
        var docsMgr = Ext.getCmp('document_mgr');
        var doc = docsMgr.findByName('quote');   
        var tbar = [{
            text: 'Convert to HAWB',
            iconCls: 'icon-accept',
            handler: this.onConvert,
            scope: this
        }, '-'];
        if (doc) {
            tbar.push({
                text: 'Send quote',
                name: doc.name,
                iconCls: 'icon-email-go',
                handler: this.onSend,
                scope: this
            }, '-');
        }
        return tbar;        
    },
    
    onConvert : function(btn, ev) {
        var mgr = Ext.getCmp('order_manager');
        mgr.convertQuote(this);                     
    },
    
    onSend : function(btn, ev) {
        var shipper = this.order.getShipper();
        var recipients = [{id: shipper.company.id, name: shipper.company.name}];        
        var docsMgr = Ext.getCmp('document_mgr');   
        docsMgr.preview(btn, this.order.id, recipients); 
    }
});

/***
 * Apollo.order.GMap
 * 
 */
Apollo.order.GMap = Ext.extend(Ext.Window, {
    // following are std Ext.Window params
    id: 'order_map',
    layout: 'fit',
    frame: true,
	width: 700,
	height: 500,
	resizable: true, 
    maximizable: true,   
	constrain: true,
	title: 'Map',
    closeAction:'hide',
	center: true,    
	modal: false,
    border: false,
    shadow: false,
    layout: 'border',
    
    initComponent : function() {
        
        this.addEvents({
            load : true
        });
        
        this.items = this.build();
               
        Apollo.order.GMap.superclass.initComponent.call(this);
    },
    
    // private
    build : function() {
        
        var store = new Ext.data.Store({            
            reader: new Ext.data.JsonReader({
                root: 'data',                
                id: 'id'
            }, RExt.google.MapRecord)            
        });   
        
        var map = new RExt.google.GMap({
            id: 'gmap',
            region: 'center',
            layout: 'fit',
            bodyBorder: false,
            store: store                       
        });
        
        
        return [map,{
            id: this.id + '_panel',
            region: 'east',  
            cls: 'gmap-info-panel',          
            width: 200,
            collapsible: true,
            collapseMode: 'mini',
            border: true,
            bodyBorder: false,
            split: true,                       
            header: false,
            frame: true,
            items: [
                new Apollo.order.ClientMapPanel({
                    role: 'shipper',
                    title: 'Pickup'
                }), 
                new Apollo.order.ClientMapPanel({
                    role: 'consignee',
                    title: 'Delivery'
                })                                
            ]                        
        }];    
    },
    
    /***
     * getMap
     * @return {RExt.google.GMap} returrs the GMap instance.
     */
    getMap : function() { return this.getComponent('gmap'); },
    
    /***
     * showEntity
     * shows a particular entity on gmap
     * @param {Object} e
     */ 
    showEntity : function(e) {
        try {
            this.getComponent('gmap').showLocation(e.location);
            this.show();
        } 
        catch (exc) {
            App.setAlert(App.STATUS_ERROR, "Could not locate that address on map");        
            App.handleException(e);    
        }    
    },
    
    load : function(cfg) {
        this.getMap().load(cfg.markers);
        
        this.fireEvent('load', cfg); 
    }
});

/**
 * Apollo.order.ClientMapPanel
 * A map-panel for handling client information related to the order.  Can be configured as either 'shipper' or 'consignee'.
 * Contains map-links for the client and associated agent (pickup or delivery).  shows useful distance calculations.
 */
Apollo.order.ClientMapPanel = Ext.extend(Ext.Panel, {
    
    /**
     * @cfg {String} role ['shipper']
     * The role this client plays in the order.  shipper || consignee
     */
    role: 'shipper',
    
    frame: true,
    disabled: true,
    iconCls: 'icon-door-out',
    title: 'Pickup',
    style: 'margin-bottom: 5px',
    layout: 'form',
    
    // private        
    initComponent : function() {        
        this.items = this.build();
        Apollo.order.ClientMapPanel.superclass.initComponent.call(this);
    },
    
    // private
    build : function() {
        
        var shipper = new RExt.google.LocationLink({
            text: (this.role == 'shipper') ? 'Shipper' : 'Consignee',
            handler: this.showLocation,                       
            scope: this                                                   
        });
        var agent = new RExt.google.LocationLink({
            text: (this.role == 'shipper') ? 'Pickup-agent' : 'Delivery-agent',
            handler: this.showLocation,                
            scope: this                                                  
        });
        var d = new RExt.form.Label({            
            fieldLabel: 'Distance',
            width: 70                                         
        });
        var dd = new RExt.form.Label({            
            fieldLabel: 'Driving distance',            
            width: 70                             
        });
                                           
        var directions = new google.maps.Directions();
                
        this.on('load', function(param) {
            
            // reset links & fields
            shipper.reset();
            agent.reset();
            d.reset();
            dd.reset();
                                   
            // sanity check shipper exists. 
            var sentity = param.order.getShipper();           
            if (!sentity) { 
                panel.disable();
                return false; 
            }
            this.enable();
            var map = this.getMap();
            shipper.setLocation(sentity.location);
            
            if (param.order.routes.getCount() == 0) {
                agent.disable();
            }
            else {
                                                                
                agent.setLocation(param.order.routes.last().entities.find(function(e){ return (e.role == 'shipper') ? true : false}).location);
                
                if (param.markers.containsKey(shipper.location.id) && param.markers.containsKey(agent.location.id)) {
                    // get way-points for each entity
                    var pointA = param.markers.get(shipper.location.id).getLatLng();
                    var pointB = param.markers.get(agent.location.id).getLatLng();
                    
                    // set distance values
                    d.setValue(Math.floor(0.001 * pointA.distanceFrom(pointB)) + 'km');
                    
                    // load GDirections                                
                    directions.loadFromWaypoints([pointA, pointB]);
                    GEvent.addListener(directions, 'load', function(res){
                        if (res.getStatus().code == 200) {
                            dd.setValue(Math.floor(0.001 * directions.getDistance().meters) + 'km');
                        }
                        else {
                            console.warn('ClientPanel -- directions error: ', res.getStatus());
                        }
                    });
                }
                else {
                    console.warn('ClientPanel -- could not find all markers');
                }                
            }                                                                                                                                                                                                                                              
        },this);
                
        return [shipper, agent, d, dd];              
    }
});


/***
 * Apollo.order.Dims
 * A form for editing Shipment's DIMS
 * @param {Object} param
 */
Apollo.order.Dims = function(param){

    Apollo.order.Dims.superclass.constructor.call(this, Ext.apply({
        useDialog: true
    }, param));
    
    
    // create a simple observable which other components can listen to.
    var Observer = function(){
        this.addEvents({
            "update": true
        });
    };
    
    Ext.extend(Observer, Ext.util.Observable);
    this.observable = new Observer();
    
    
};
Ext.extend(Apollo.order.Dims, RExt.sys.Form, {
    
    /** controller / actions **/
    controller : 'order',
    actions: {
        update: 'update_dims'        
    },
    
    /***
     * set default params
     */
    useDialog: true,
    style: 'padding:5px',
    frame: true,
    title: 'DIMs',
    header: false,
    labelAlign: 'right',
    layout: 'form',
    dialogConfig: {
        height: 400,
        width: 550
    },
    modal: true,
    
    /***
     * order_id
     * the primary key this grid is associated with
     */
    order_id: null,
    
    /***
     * deleted.  a list  of record ids that need to be deleted on server when update fires.
     */
    deleted: [],
    
    /***
     * initComponent     
     * @param {Object} param
     *
     */
    initComponent: function(param){
    
        this.items = [this.buildDimsPanel(), this.buildShipmentPanel()];
        Apollo.order.Dims.superclass.initComponent.call(this);        
    },
    
    buildDialog: function(){
        return [this, this.buildGrid()];
    },
    
    /***
     * buildGrid
     */
    buildGrid: function(param){
    
        var fm = Ext.form;
                
        // the column model has information about grid columns
        // dataIndex maps the column to the specific data field in
        // the data store (created below)
        var cm = new Ext.grid.ColumnModel([{
            id: 'pieces',
            header: "Pieces",
            dataIndex: 'pieces',
            editor: new fm.NumberField({
                allowBlank: false,
                revertInvalid: true,
                allowNegative: false,
                minValue: 1                
            })
        }, {
            id: 'length',
            header: "Length",
            dataIndex: 'length',
            editor: new fm.NumberField({
                allowBlank: false,
                allowNegative: false,
                minValue: 1
            })
        }, {
            id: 'width',
            header: "Width",
            dataIndex: 'width',
            editor: new fm.NumberField({
                allowBlank: false,
                allowNegative: false,
                minValue: 1
            })
        }, {
            id: 'height',
            header: "Height",
            dataIndex: 'height',
            editor: new fm.NumberField({
                allowBlank: false,
                allowNegative: false,
                minValue: 1,
                listeners: {
                    // add a TAB listener to last column; start editing a new row.  Bryan Lastname's suggestion
                    specialkey : function(field, ev) {
                        if (ev.getKey() === ev.TAB) {
                            this.onAdd(field, ev);
                            
                        }
                    },
                    scope: this
                }
            })            
        
        }]);
        
        // by default columns are sortable
        cm.defaultSortable = true;
        
        // type so we can add records dynamically
        var Dim = Ext.data.Record.create([{
            name: 'id',
            mapping: 0
        }, {
            name: 'pieces',
            mapping: 1,
            type: 'int'
        }, {
            name: 'length',
            mapping: 2,
            type: 'float'
        }, {
            name: 'width',
            mapping: 3,
            type: 'float'
        }, {
            name: 'height',
            mapping: 4,
            type: 'float'
        }, {
            name: 'weight',
            mapping: 5,
            type: 'float'
        }]);
        
        // create the Data Store
        // entity_cost_id, entity_id, order_id, amount, company, when, type
        var ds = new Ext.data.Store({
            proxy: new Ext.data.MemoryProxy([]),
            reader: new Ext.data.ArrayReader({
                id: 0
            }, Dim)
        });
        
        // *super*region: 'center',            
        var grid = new Ext.grid.EditorGridPanel({
            ds: ds,
            cm: cm,
            enableColLock: false,
            autoExpandColumn: 'pieces',
            tbar: [{
                text: 'Add',
                iconCls: 'icon-add',
                handler: this.onAdd,
                scope: this
            }, '-', {
                text: 'Remove row',
                iconCls: 'icon-delete',
                handler: this.onRemove,
                scope: this
            }],
            iconCls: 'icon-accept',
            frame: false,
            viewConfig: {
                forceFit: true
            },
            header: false,
            shadow: false,
            style: 'padding:5px',
            border: true,
            region: 'center'
        });
        
        /***
         * @event afteredit
         * perform validation afteredit.  refuse to allow total pices in grid to exceed #pieces in hwb
         * grid - This grid
         * record - The record being edited
         * field - The field name being edited
         * value - The value being set
         * originalValue - The original value for the field, before the edit.
         * row - The grid row index
         * column - The grid column index
         */
        grid.on('afteredit', function(param){            
            var valid = this.validatePieces((param.record.dirty) ? true : false);
            if (param.field == 'pieces') { // <-- don't allow pieces to exceed HWB's total pieces.                                              
                if (valid == false) {
                    param.record.reject();                    
                }                
            }
            if (valid) {
                this.updateVolume();
            }
        }, this);
        this.grid = grid;
        
        return grid;
        
    },
            
    /***
     * buildDimsPanel
     *
     */
    buildDimsPanel: function(){
    
        // dim factor combo
        var comboDimFactor = new Ext.form.ComboBox({
            name: 'dim_factor_id',
            tabIndex: 1,
            width: 100,
            hiddenName: 'dims[dim_factor]',
            fieldLabel: 'DIM factor',
            allowBlank: false,
            triggerAction: 'all',
            displayField: 'value',
            selected: 194,
            valueField: 'value',
            mode: 'local',
            store: new Ext.data.SimpleStore({
                fields: ['value'],
                data: Apollo.order.Util.getDimFactors()
            })
        });
        this.dimFactor = comboDimFactor;
        
        /***
         * @event select
         * re-calculate dim weight when dim factor changes.
         * @param {Object} param
         */
        comboDimFactor.on('select', function(param){
            var dimWeight = this.form.findField('weight[dim]');
            var inches = this.form.findField('dims[i]');
            dimWeight.setValue(Math.ceil(inches.getValue() / comboDimFactor.getValue()));
        }, this);
        
        /***
         * build dims form
         */
        //var fpanel = new Ext.form.FormPanel({
        var panel = new Ext.Panel({
            id: 'dims_form',
            autoHeight: true,
            title: 'Dim Calculations',
            iconCls: 'icon-calculator',
            style: 'margin-bottom: 5px',
            layout: 'form',
            frame: true,
            items: [comboDimFactor, {
                xtype: 'fieldset',
                title: 'Volume',
                iconCls: 'icon-box',
                layout: 'form',
                autoHeight: true,
                items: [new Ext.form.NumberField({
                    name: 'dims[i]',
                    disabled: true,
                    fieldLabel: 'Cubic inches',
                    allowBlank: false,
                    anchor: '88%'
                }), new Ext.form.NumberField({
                    name: 'dims[f]',
                    disabled: true,
                    fieldLabel: 'Cubic feet',
                    allowBlank: false,
                    anchor: '88%'
                }), new Ext.form.NumberField({
                    name: 'dims[m]',
                    disabled: true,
                    fieldLabel: 'Cubic meters',
                    allowBlank: false,
                    anchor: '88%'
                })]
            }, {
                xtype: 'fieldset',
                layout: 'form',
                iconCls: 'icon-shape-align-bottom',
                title: 'Weight',
                autoHeight: true,
                items: [new Ext.form.NumberField({
                    name: 'weight[dim]',
                    disabled: true,
                    fieldLabel: 'DIM weight',
                    allowBlank: true,
                    anchor: '88%'
                }), new Ext.form.NumberField({
                    name: 'shipment[weight]',
                    fieldLabel: 'Actual weight',
                    allowBlank: true,
                    anchor: '88%'
                })]
            }]
        });
        
        return panel;
    },
    
    /***
     * buildShipmentPanel
     * build the shipment fieldset
     */
    buildShipmentPanel: function(param){
    
        return new Ext.Panel({
            frame: true,
            header: true,
            title: 'Shipment',
            autoHeight: true,
            layout: 'form',
            items: [new Ext.form.ComboBox({
                name: 'commodity',
                emptyText: 'Select...',
                tabIndex: 1,
                width: 160,
                listWidth: 160,
                hiddenName: 'shipment[shipping_commodity_id]',
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
            }), new Ext.form.NumberField({
                name: 'shipment[pieces]',
                fieldLabel: 'Pieces',
                allowBlank: false,
                width: 50
            }), new Ext.form.NumberField({
                name: 'shipment[declared_value]',
                fieldLabel: 'Declared value',
                allowBlank: true,
                width: 50
            })]
        })
    },
    
    /***
     * show / hide
     * defer to dialog show/hide
     */
    show: function(){
        this.dialog.show();
    },
    hide: function(){
        this.dialog.hide();
    },
           
    /***
     * on
     * override on, only allow one listener on 'update' event.  remove prev. before adding.
     * @param {Object} event
     * @param {Object} method
     * @param {Object} scope
     */
    on: function(event, method, scope){
        if (event == 'update') {
            this.observable.purgeListeners();
            this.observable.on(event, method, scope);
        }
        else {
            Apollo.order.Dims.superclass.on.apply(this, arguments);
        }
    },
    
    /***
     * init
     * init the grid with new data
     */
    init: function(param){                    
        this.values = param.values
        this.values.dim_factor = 194;
        this.values.actual_weight = 666;
        this.values.reweigh = 666;
        this.values.chargeable_weight = 666;
        this.order_id = param.order_id;
        
        this.grid.store.removeAll();
        if (param.dims.length > 0) {
            this.grid.store.add(param.dims);
        }
        
        this.calculate();
        
        this.setValues();
        
        // clear deleted array
        this.deleted = [];
    },
    
    /***
     * calculate
     * calculate dims
     */
    calculate: function(){
        // calculate shipment volume  
        var volume = {
            i: 0,
            f: 0,
            m: 0
        };
        // iterate store (length * width * height * pieces)
        this.grid.store.each(function(r){
            volume.i += r.data.length * r.data.width * r.data.height * r.data.pieces;
        });
        
        // calculate unit conversions
        volume.f = volume.i * Apollo.order.Util.INCH_TO_FOOT;
        volume.m = volume.i * Apollo.order.Util.INCH_TO_METER;
        this.volume = volume;
        
    },
    
    updateVolume : function() {  
        this.calculate();                                          
        this.form.setValues({
            'dims[i]': this.volume.i.toFixed(2),
            'dims[f]': this.volume.f.toFixed(5),
            'dims[m]': this.volume.m.toFixed(5),
            'weight[dim]' : Math.ceil(this.volume.i / this.dimFactor.getValue())
        });        
    },
    
    /***
     * getTotalPieces
     * return the total number of pieces found in store
     * @return {Integer}
     */
    getTotalPieces: function(){
        var total = 0;
        this.grid.store.each(function(r){
            total += r.data.pieces;
        });
        return total;
    },
    
    /***
     * validatePieces
     * @param {Boolean} allowEqual [false] set to true to allow equal.  used when adding a new (dirty) record.
     * @return {boolean}
     */
    validatePieces: function(allowEqual){
        if (typeof(allowEqual) == 'undefined') {
            allowEqual = false;
        }
        var pieces = this.form.findField('shipment[pieces]').getValue();
        var valid = (allowEqual == true) ? this.getTotalPieces() <= pieces : this.getTotalPieces() < pieces;
        if (!valid) {
            // have to wrap MessageBox in setTimeout here due to window focus issues.  if user ends edit by clicking next field with
            // mouse, the MessageBox event is fired before the mouse-event.  result:  modal MessageBox loses focus to DimsForm and appears beneath.
            // setTimout ensures the MessageBox event fires *after* mouse-event.
            setTimeout(function(){
                Ext.MessageBox.alert('Alert', 'This HWB contains ' + pieces + ' pieces and they appear to have all been dimensioned already.  If you made a mistake, you must first remove a dimensioned piece.');
            }, 250);
            
            return false;
        }
        else {
            return true;
        }
    },
    
    /***
     * add
     * add blank record to grid
     * @param {Object} btn
     * @param {Object} ev
     */
    onAdd: function(btn, ev){
        if (!this.validatePieces(btn instanceof Ext.form.Field)) {
            return false;
        }
        var rec = new this.grid.store.reader.recordType({
            id: null,
            length: null,
            width: null,
            height: null,
            pieces: null
        });
        var index = (!btn instanceof Ext.form.Field) ? 0 : this.grid.store.getCount();                           
        this.grid.stopEditing();
        this.grid.store.insert(index, rec);
        this.grid.startEditing(index, 0);
    },
    
    /***
     * onRemove
     * @param {Object} rs
     */
    onRemove: function(btn, ev){
        var rec = this.grid.getSelectionModel().getSelected();
        if (rec) {
            rec.reject();
            if (rec.data.id) {
                this.deleted.push(rec.data.id);
            }
            this.grid.store.remove(rec);
        }
        
    },
    
    /***
     * validate
     * this is a validator that will work for all EditorGrids
     * @param {Object} rs
     */
    isValid: function(){
        var valid = Apollo.order.Dims.superclass.isValid.apply(this, arguments);
        if (!valid) {
            return false;
        }
        
        // first remove any non-dirty rows left over after editing.
        this.grid.store.each(function(r) {
            if (r.dirty == false && r.data.id === null) {
                this.grid.store.remove(r);
            }                
        },this);
        
        var rs = this.grid.store.getRange();
        var invalidText = 'field is invalid';
        var colCount = this.grid.colModel.getColumnCount();
        for (var n = 0, len = rs.length; n < len; n++) {
            var index = this.grid.store.indexOf(rs[n]);
            var rec = rs[n];
            for (var c = 0; c < colCount; c++) {
                var col = this.grid.colModel.config[c];
                var ed = this.grid.colModel.getCellEditor(c, index);
                if (ed.rendered == false) {
                    ed.render();
                }
                ed.field.setValue(rec.data[col.dataIndex]);
                invalidText = ed.field.invalidText;
                valid = ed.field.isValid();
                
                if (valid == false) {
                    Application.setAlert(App.STATUS_ERROR, invalidText);
                    this.grid.startEditing(index, c);
                    return false;
                }
            }
        }
        
        // now count the total #pieces in store.  it cannot be > total #pieces specified in hwb.
        if (valid == true) {
            valid = this.validatePieces(true);
        }
        return valid;
    },
    
    /***
     * onUpdate
     * update the grid data.
     */
    getParams: function(){
        var rs = this.grid.store.getRange();
        
        var modified = [];
        for (var n = 0, len = rs.length; n < len; n++) {
            var rec = rs[n];
            fields = [];
            for (var k in rec.modified) {
                fields.push({
                    name: k,
                    value: rec.data[k]
                });
            }
            modified.push({
                id: rec.data.id || 0,
                fields: fields,
                data: rec.data
            });
        }
        return {
            modified: Ext.encode(modified),
            deleted: Ext.encode(this.deleted) // <-- rows that were removed
        }
    },
                    
    /***
     * setValues
     * sets the form values (see above)
     */
    setValues: function(){
    
        var form = this.form;
        form.reset();
        form.setValues({
            'dims[i]': this.volume.i.toFixed(2),
            'dims[f]': this.volume.f.toFixed(5),
            'dims[m]': this.volume.m.toFixed(5),
            'dims[dim_factor]': this.values.dim_factor,
            'shipment[shipping_commodity_id]': this.values.commodity_id,
            'shipment[pieces]': this.values.pieces,
            'shipment[weight]': this.values.weight,
            'shipment[declared_value]': this.values.declared_value
        });
        form.findField('shipment[shipping_commodity_id]').fireEvent('select', {});
        form.findField('dims[dim_factor]').fireEvent('select', {});
    },
    
    getValues: function(){
        return {
            dims: this.grid.store.getRange(),
            values: {
                pieces: this.form.findField('shipment[pieces]').getValue(),
                weight: this.form.findField('shipment[weight]').getValue(),
                declared_value: this.form.findField('shipment[declared_value]').getValue(),
                commodity: this.form.findField('shipment[shipping_commodity_id]').getRawValue(),
                commodity_id: this.form.findField('shipment[shipping_commodity_id]').getValue()
            }
        }
    },
    
    /***
     * doActionComplete
     * override sys.Dialog::doActionComplete
     * fire event 'update' if all is good.
     */
    doActionComplete: function(form, action){
        Apollo.order.Dims.superclass.doActionComplete.apply(this, arguments);
        if (action.result.success == true) {            
            var store = this.grid.store;
            store.removeAll();
            store.loadData(action.result.data.items);                                    
            this.observable.fireEvent('update', this.grid);
            this.hide();
        }
    }
    
});

/***
 * Apollo.order.ShipmentPanel
 * @param {Object} param
 */

Apollo.order.ShipmentPanel = Ext.extend(RExt.Panel, {
    /***
     * Ext config
     */
    iconCls: 'icon-bricks',
        
    /***
     * order_id
     */
    order_id: null,
    
    /***
     * shipment info {pieces, weight, declared_value, commodity}
     */
    shipment: null,
    
    /***
     * tpl
     * template id to compile
     */
    tpl: 'order-shipment-template',
    
    initComponent : function() {
        
        this.tbar = [{
            text: 'Edit DIMs',
            iconCls: 'icon-calculator-edit',
            handler: this.onEditDims,
            scope: this
        }, '-'];  
        Apollo.order.ShipmentPanel.superclass.initComponent.call(this);      
    },
    
    /***
     * onEditDims
     * init the Dims grid with this order_id and order-item records.
     */
    onEditDims: function(){
        var panel = Ext.getCmp('dims');
        
        panel.setKey(this.order_id);
        panel.showUpdate();
        panel.init({
            values: this.shipment.values,
            dims: this.shipment.dims
        });
        // listen to update event on Dims popup.  update template when grid is updated.
        panel.on('update', function(grid){
            //this.shipment.dims = grid.store.getRange();  
            this.shipment = panel.getValues();
            //this.dimsTpl.overwrite(Ext.getCmp(this.id + '_dims').body, this.compileDims());
            this.renderTemplate(true); // <-- true as in "overwrite" (see RPanel.renderTemplate)        
        }, this);
    },
    
    /***
     * compile
     * compile data for XTemplate render
     */
    compile: function(){
        var items = this.shipment.dims;
        
        // prepare data for template render.
        var data = this.shipment.values;
        
        // add dims from Collection
        data.items = [];
        for (var n = 0, len = items.length; n < len; n++) {
            data.items.push(items[n].data);
        }
        
        // mix with parent.
        return Ext.apply(data, Apollo.order.ShipmentPanel.superclass.compile.apply(this, arguments));
    }
    
});

/***
 * Apollo.order.Log
 * @extends DataView
 */
Apollo.order.Log = function(param){

    var Log = Ext.data.Record.create([{
        name: 'id'
    }, {
        name: 'created_at',
        type: 'string'
    }, {
        name: 'subject',
        type: 'string'
    }, {
        name: 'msg',
        type: 'string'
    }, {
        name: 'name',
        type: 'string'
    }, {
        name: 'type',
        type: 'string'
    }]);
    //[log.id, log.at, log.subject, log.msg, log.first + ' ' + log.last]
    var reader = new Ext.data.ArrayReader({
        id: 0,
        record: 'log'
    }, Log);
    
    // build shipper ComboBox
    var store = new Ext.data.Store({
        reader: reader,
        baseParams: {}
    });
    
    // load log
    store.loadData(param.data);
    delete param.data // <-- get rid of data before Ext.apply!!!
    var tpl = new Ext.XTemplate('<tpl for=".">', '<div id="order-log-entry-{id}" class="order-log-entry x-grid3-row">', '    <div class="hd">', '        <h3 class="subject {type}">{subject}</h3>', '        <div class="author-info"><span class="author">{name}</span>, <span class="timestamp">{created_at}</span></div>', '    </div>', '    <div class="bd">{msg}</div>', '    <div class="ft"></div>', '</div>', '</tpl>');
    
    Apollo.order.Log.superclass.constructor.call(this, Ext.apply({
        store: store,
        tpl: tpl,
        cls: 'x-grid3',
        autoHeight: true,
        multiSelect: true,
        overClass: 'x-grid3-row-over',
        itemSelector: 'div.order-log-entry',
        selectedClass: 'x-grid3-row-selected',
        emptyText: 'No logs to display',
        
        /*
 plugins: [
 new Ext.DataView.DragSelector(),
 new Ext.DataView.LabelEditor({dataIndex: 'name'})
 ],
 */
        prepareData: function(data){
            //data.created_at = data.created_at.format("m/d/Y g:i a");
            
            return data;
        }
    }, param));
    
};
Ext.extend(Apollo.order.Log, Ext.DataView, {

    /***
     * onAddLog
     * add a new custom log entry
     * @param {Object} route
     */
    onAdd: function(btn, ev){
        var popup = Ext.getCmp('log_popup');
        var form = popup.form;
        form.showInsert();
        form.setKey(this.order_id);
        form.on('actioncomplete', function(form, action){
            var res = action.result;
            if (action.result.success == true) {
                this.doInsert(action.result);
                popup.hide();
            }
        }, this);
    },
    
    /***
     * onInsertLog
     * @param {RResponse} res
     */
    doInsert: function(res){
        var rs = this.store.reader.readRecords([res.data.log]);
        
        this.store.insert(0, rs.records);
        this.refresh();
        this.select(0);
    },
    
    /***
     * doAction
     * Action-handler, called by RExt.Application
     */
    doAction : function(res) {
        
        this.doInsert(res);    
    }
});

/***
 * Apollo.order.LogForm
 * A form for creating custom order-logs
 * @author Chris Scott
 *
 */
Apollo.order.LogForm = Ext.extend(RExt.sys.Form, {
    /** controller /actions **/
    controller: 'order',
    actions: {
        insert: 'insert_log'
    },
    
    layout: 'form',
    iconCls: 'icon-user-comment',
    autoHeight: true,    
    frame: true,
    title: 'Add log message',
    
    /***
     * build
     *
     */
    initComponent: function(){
        this.items = [new Ext.form.TextField({
            name: 'log[subject]',
            allowBlank: false,
            fieldLabel: 'Subject',
            anchor: '90%',
        }), new Ext.form.TextArea({
            fieldLabel: 'Message',
            allowBlank: false,
            grow: true,
            growMin: 100,
            growMax: 250,
            anchor: '90%',
            name: 'log[msg]',
            autoGrow: true
        })];
        
        this.on('show', function() {            
            App.setStatus(App.STATUS_NOTICE, 'Order-log', 'Your account id along with a timestamp will automatically be tagged to this entry.')    
        },this);
        Apollo.order.LogForm.superclass.initComponent.call(this);
    }
});

/**
 * Apollo.order.POD
 * POD panel on east.
 */
Apollo.order.POD = Ext.extend(Ext.Panel, {
    title: 'Proof of delivery', 
    bodyStyle: 'padding: 10px;',   
    iconCls: 'icon-accept',
    frame: false,
    tplId : 'order-proof-of-delivery-template',
            
    initComponent : function() {        
        this.iconCls = (this.order.getPod() !== false) ? 'icon-accept' : 'icon-exclamation';        
        this.on('render', function() {
            var tpl = RExt.util.TemplateMgr.get(this.tplId);
            tpl.overwrite(this.body, {
                pod: this.order.getPod()
            });    
        },this);
        
        var pod = Ext.getCmp('pod_form');                                                           
        this.tbar = [
            {text: 'Set POD', iconCls: 'icon-pencil', handler: function() {
                pod.setKey(this.order.id);
                pod.showInsert();
                pod.on('actioncomplete', function(form, action) {
                    if (typeof(action.result) != 'undefined') {
                       if (action.result.success == true) {
                            pod.hide();
                            this.order.setPod(action.result.data.pod);                            
                        }
                    }    
                },this);                        
            }, scope: this}, '-'
        ]
        Apollo.order.POD.superclass.initComponent.call(this);
    },
    
    doAction : function(res) {
        switch (res.verb) {
            case 'update':
                this.setIconClass('icon-accept');
                var tpl = RExt.util.TemplateMgr.get(this.tplId);
                tpl.overwrite(this.body, {
                    pod: res.data
                }); 
                break;
        }        
    }
});

/***
 * Apollo.order.PODForm
 * Proof of Delivery form
 * @author Chris Scott
 *
 */
Apollo.order.PODForm = Ext.extend(RExt.sys.Form, {
    controller: 'order',
    actions: {
        insert: 'pod'
    },
    useDialog: true,
    dialogConfig: {
        width: 330,
        height: 180,                       
        border: false
    },           
    labelWidth: 60,
    bodyStyle: 'padding:10px',
    frame: true,
    border: false,
    header: false,
    title: 'Proof of Delivery',
    
    initComponent: function(param){
        this.items = [new Ext.form.TextField({
            name: 'pod[pod_name]',
            fieldLabel: 'Name',
            anchor: '93%',
            allowBlank: false,
            tabIndex: 1
        }), new Ext.form.DateField({
            name: 'date',
            fieldLabel: 'Date',
            allowBlank: false,
            format: 'Y-m-d',
            tabIndex: 1
        }), new Ext.form.TimeField({
            name: 'time',
            fieldLabel: 'Time',
            allowBlank: false,
            width: 75,
            tabIndex: 1
        })];
        Apollo.order.PODForm.superclass.initComponent.call(this);
    }
});

/***
 * @class Apollo.order.BillingForm
 * @author Chris Scott
 */
Apollo.order.BillingForm = Ext.extend(Ext.form.FormPanel, {
    width: 300,
    frame: true,
    title: 'Billing',
    iconCls: 'icon-creditcards',
    labelWidth: 75,
    labelAlign: 'right',
    
    /***
     * initComponent
     */
    initComponent : function() {
        this.addEvents({
            cancel: true
        });
        this.items = this.build();
                
        this.buttons = [
            {text: 'Update', iconCls: 'icon-accept', handler: this.onUpdate, scope: this},
            {text: 'Cancel', iconCls: 'icon-cancel', handler: function() {this.fireEvent('cancel');}, scope: this}
        ];
        
        
        Apollo.order.BillingForm.superclass.initComponent.call(this);
    },
    
    /***
     * build
     */
    build : function() {
        // build BillTo ComboBox
        var ds = new Ext.data.Store({
            proxy: new Ext.data.HttpProxy({
                url: 'company/search_client'
            }),
			baseParams: {domain: 'client'},
            reader: new Ext.data.JsonReader({
                root: 'data',
                totalProperty: 'total',
                id: 0
            },[
                {name: 'id', mapping: 0},
                {name: 'name', mapping: 1}
            ])
        });
                                                           
        // build "bill to" combo
        var comboBillTo = new RExt.form.ComboBoxAdd({
            name: 'bill_to',
            emptyText: 'Select company...',
			tabIndex: 1,
			width: 175,            
			listWidth: 175,
            hiddenName: 'order[bill_to_id]',
            fieldLabel: 'Bill to',
            allowBlank: false,
            mode: 'remote',
            triggerAction: 'all',
            valueField: 'id',
            displayField: 'name',
            pageSize: 10,
			width: 150,
            store: ds
        });
        //comboBillTo.on('add', this.onAddBillTo, this, {});
                           
        return [
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
                id: 'fs_third_party',        	            
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
        ];        
    },
    
    on : function(ev, handler, scope) {
        if (ev == 'actioncomplete') {
            this.form.on(ev, handler, scope);
        }
        else {
            Apollo.order.BillingForm.superclass.on.apply(this, arguments);
        }  
    },
    
    /***
     * init
     * @param {Object} order
     */
    init : function(order) {
        this.form.purgeListeners();        
        this.form.on('beforeaction', function() {
            //Ext.MessageBox.wait('Updating Billing', 'Please wait...');
            App.showSpinner('Saving...');    
        });
        this.form.on('actioncomplete', function(form, action) {
            App.processResponse(action.result);
            this.fireEvent('cancel');          
        },this);
        this.form.on('actionfailed', function(form, action) {
            App.processResponse(action.result);      
            this.fireEvent('cancel');      
        });
                
        this.pk = order.id;
        
        var method = this.form.findField('order[shipping_method_id]');
        var fs = this.getComponent('fs_third_party');
        
        if (order.getBillTo().id != order.getShipper().company.id) {
            fs.expand(true); 
            var comboBillTo = this.form.findField('order[bill_to_id]');            
            comboBillTo.store.insert(0, new comboBillTo.store.recordType({
                id: order.getBillTo().id,
                name: order.getBillTo().name    
            }));
            comboBillTo.setValue(order.getBillTo().id);
                
        }
        else {
            fs.collapse(true);
        }
        console.log('shipping_method_id: ', order.shipping_method_id);
        method.setValue(order.shipping_method_id);  
    },
    
    /***
     * onUpdate
     * 
     */
    onUpdate : function() {
        this.form.submit({
            url: 'order/update_billing/' + this.pk
        });         
    } 
});

/***
 * Apollo.order.BillingPanel
 * 
 */
Apollo.order.BillingPanel = Ext.extend(RExt.Panel, {
    tpl : 'billing-template',
    iconCls: 'icon-creditcards',
    
    initComponent : function() {
        this.addEvents({
            /***
             * @event update
             * fires when this component updates billing information.
             */
            'update' : true    
        });
        
        this.tbar = [
            {text: 'Edit', handler: this.onEdit, scope: this, menu: Ext.getCmp('billing_popup')}, '-'
        ];
        Apollo.order.BillingPanel.superclass.initComponent.call(this);    
    },
    
    onEdit : function(btn, ev) {
        var popup = btn.menu;
        var fpanel = popup.form;               
        fpanel.init(this.order);  
        fpanel.on('actioncomplete', function(form, action) {
            if (action.result.success == true) {                                
                this.order.setBillTo(action.result.data.bill_to);
                this.order.setShippingMethod(action.result.data.shipping_method);
                this.renderTemplate(true);
                this.fireEvent('update', this);
            }
        },this);
                                                                                        
    },
    
    compile : function() {
        var data = Apollo.order.BillingPanel.superclass.compile.apply(this, arguments);
        data.bill_to = this.order.getBillTo();
        data.shipping_method = this.order.shipping_method;
        return data;    
    }
});


