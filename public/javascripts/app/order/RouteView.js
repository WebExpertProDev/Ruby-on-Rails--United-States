
/***
 * Apollo.order.RoutePanel
 *
 * @param {Object} param
 * @author Chris Scott
 *
 */

Apollo.order.RoutePanel = Ext.extend(Ext.Panel, {
    
    /***
     * pointers to route and order
     */
    route : null,    
    order: null,   
                      
    autoScroll: true,        
    collapsible: true,            
    border:false,
    frame: false,    
    cls: 'route-panel',
    bodyStyle: 'padding:5px',
    
    /***
     * initComponent
     */   
    initComponent : function() {
        
        if (typeof(this.route) == 'undefined') {
    		alert('ERROR, Apollo.order.EntityPanel -- you must supply "route" to constructor');
    		return false;
    	}
    
        // render the template on render.  we need to render an XTemplate to the body el, which only exists at onRender
        this.on('render', function() { this.build(); },this);
            
    	// add entity events
    	this.addEvents({
            /***
             * @event delete
             * @param {Apollo.order.RouteView}
             * @param {Object} route, the deleted route
             * fires when after teh user deletes a route
             */
            'delete' : true,
            
            /***
             * @event update
             * @param {Apollo.order.RouteView}
             * @param {Object} the new route hash from server
             * fires when this route has been updated.
             */
    		'routemap': true		
    	});  
    
        this.id = 'route_panel_' + this.route.id;
        this.title = this.route.index + '. ' + this.route.origin.airport.iso + ' -> ' + this.route.destination.airport.iso;
        
        this.tbar = [
            {text: 'Edit', handler: this.onEdit, iconCls: 'icon-pencil', scope: this}, '-',
            {text: 'Delete', handler: this.onDelete, iconCls: 'icon-delete', scope: this}, '-',
            {text:'Send notifications', handler: this.onNotify, iconCls: 'icon-email', scope: this},
            '-'
        ];
        		        
        Apollo.order.RoutePanel.superclass.initComponent.call(this);
    },
    
    /***
     * onEdit
     * @param {Object} toolbarBtn
     * @param {Object} ev
     */    
     onEdit : function(btn, ev) {
                  
        var fpanel = Ext.getCmp('routing_form');
        fpanel.setKey(this.route.id);        
        fpanel.setOrder(this.order);                                          
        fpanel.showUpdate();                                                         
        fpanel.setValues(this.route);                                   		                                                                   
                                  
        fpanel.on('actioncomplete', function(form, action) {
            var res = action.result;
            if (res.success == true) { 
                fpanel.hide();                             
                this.route = this.order.replaceRoute(res.data.route);                                
                this.fireEvent('update', this, res.data.route);
                 
                //this.items.each(function(i) { this.remove(i, true)},this);  
                this.body.dom.innerHTML = '';
                this.build(true);
                
            }    
        },this);                                                                                                             
     },
    
    /***
     * onDelete
     * @param {Object} toolbarBtn
     * @param {Object} ev
     */
    onDelete : function(btn, ev) {
        Ext.MessageBox.confirm('Confirm', 'Delete route <strong>' + this.route.origin.airport.iso + '->' + this.route.destination.airport.iso + '?</strong>', function(btn) {                
            if (btn == 'yes') {       
                App.request({
                    url: 'order/delete_route/' + this.route.id,
                    success: function(res) {
                        if (res.success == true) {
                            this.order.removeRoute(this.route);
                            this.fireEvent('delete', this, this.route);    // <-- defer to OrderView
                        }
                    },
                    scope: this
                })
            }
        },this);        
    },
    
    /***
     * onNotifyRoute
     * send notifications to all route entities.
     * @param {Object} sender
     */
    onNotify : function(toolbarBtn, ev) {
        Ext.MessageBox.confirm('Confirm', 'Send agent notifications?', function(btn) {
            if (btn == 'yes') {
                App.request({
                    url: 'order/notify_route/' + this.route.id,
                    method: 'POST',
                    success : function(res) {
                        console.log(res);                                                
                    }
                });                                
            }
        },this);
    },
    
    /***
     * applyToolHandlers
     * applies handlers to tools
     */
    applyToolHandlers : function(param) {
        for (var key in param.route) {
            this.on(key, param.route[key], param.scope);
        }
        var columns = this.getComponent(this.id + '_columns');
        if (columns.items) {
            columns.items.each(function(e){
                for (var key in param.entity) {
                    e.on(key, param.entity[key], param.scope);
                }
            });
        }
    },
                    
    /***
     * build
     * compile this route's template     
     */
    build : function() {
                
        var tpl = RExt.util.TemplateMgr.get('route-template', {
            getDuration : RExt.util.TemplateMgr.getDuration
        });                           
                                                                            
        // build carrier
        this.route.carrier = this.route.entities.find(function(e) { 
            return (e.role == 'carrier')?true:false;
        });
        // build carrier
        this.route.shipper = this.route.entities.find(function(e) { 
            return (e.role == 'shipper')?true:false;
        });
        // build carrier
        this.route.consignee = this.route.entities.find(function(e) { 
            return (e.role == 'consignee')?true:false;
        });                                        
        tpl.overwrite(this.body, this.route);        
        this.processBody();
                      
        return true;                                                              
    },
    
    /***
     * processBody
     * post-process the body el after rendering XTemplate.  used to apply inlineEditors, location-edit nodes, etc.      
     */
    processBody : function() {
        App.applyInlineEditors(this, this.body);   
                               
        var popup = Ext.getCmp('location_popup');
        var fpanel = popup.getFormPanel();
        
        // apply edit-location 
        var list = this.body.query('.btn-edit-company');                                         
        for (var n=0,len=list.length;n<len;n++) {                                        
            var el = Ext.fly(list[n]);                                   
            el.on('click', function(ev, node){                                                             
                var entity_id = node.id.split('-').pop();                   
                var e = this.route.entities.find(function(i) { return (i.id == entity_id) ? true : false; });                                                                                                                                                                                                                                                              
                try {
                    fpanel.showUpdate();                
                    fpanel.setKey(e.location.id);                                 
                    popup.show(node);  
                    fpanel.setTitle('Company location -- ' + e.company.name + ' (' + e.location.airport.iso + ')');
                    fpanel.setValues(e.location);
                }
                catch (exc) {
                    console.error('Exception at RouteView::build -- entity_id: ', entity_id);
                    App.handleException(this, exc);
                }                      
                fpanel.on('actioncomplete', function(form, action){
                    if (action.type == 'submit') {
                        var res = action.result;                        
                        if (res.success == true) {                            
                            e.location = res.data.location;                            
                            this.route.entities.replace(e.id, e);
                            this.fireEvent('update', this, this.route);
                            popup.hide();
                            this.build();                                                            
                        }
                    }
                }, this); 
                                                          
            },this);
        }   
        
        // apply gmap links        
        var gmap = Ext.getCmp('order_map');        
        if (gmap) {
            var list = this.body.query('.gmap');
            for (var n = 0, len = list.length; n < len; n++) {
                var el = Ext.fly(list[n]);
                el.on('click', function(ev, node){
                    var entity_id = node.id.split('-').pop();
                    var e = this.route.entities.find(function(i){
                        return (i.id == entity_id) ? true : false;
                    });
                    if (e) {                        
                        gmap.showEntity(e);                        
                    }                    
                }, this);
            }
        }        
        Ext.fly(this.body.query('.route')[0]).boxWrap();
    }
    
    
});
Ext.reg('routepanel', Apollo.order.RoutePanel);    // <--- register xtype

/**
 * Apollo.order.LocalRoutePanel
 * A special extension of RoutePanel to handle local-routes
 * 
 */
Apollo.order.LocalRoutePanel = Ext.extend(Apollo.order.RoutePanel, {
    tplId : 'order-route-local-template',        
    
    initComponent : function() {                 
        Apollo.order.LocalRoutePanel.superclass.initComponent.call(this);
        
        this.title = "Local (" + this.route.entities.first().location.airport.iso + ')';        
    },
    
    build : function() {
        var tpl = RExt.util.TemplateMgr.get(this.tplId);        
        tpl.overwrite(this.body, this.route);
        this.processBody();                         
    },
    
    onEdit : function(btn, ev) {
        console.log('Apollo.order.LocalRoutePanel::onEdit -- no impl.');
    },
    
    onDelete : function(btn, ev) {
        console.log('Apollo.order.LocalRoutePanel::onDelete -- no impl. -- can probably use super');
        Apollo.order.LocalRoutePanel.superclass.onDelete.apply(this, arguments);
    }      
});

/***
 * Apollo.order.EntityPanel
 * A Class for rendering a TabPanel for order entities
 * | Contact | Company | Instructions |
 * does a DomQuery to search for .x-tab
 * @author Chris Scott
 * @param {Object} param
 */

Apollo.order.EntityPanel = Ext.extend(RExt.Panel, {
    
    // Ext.Panel params
    border: true,    
    frame: true,    
    columnWidth: 0.5,
          
    // default panel title
    title: 'UNSET ORDER ENTITY',

    // entity ptr 
    entity : null,
    
    // entity-template id.
    tpl : 'order-entity-template',
           
    // order_id ptr
    order_id : null,
    
    /***
     * initComponent
     */
    initComponent : function() {
                
        if (typeof(this.entity) == 'object') {        
		    title = this.entity.role +  '--' + this.entity.company.name;
    	}
        else {
            this.height = 150;
                    
            // add some text to show we mean business...                        
            this.html = {
                tag:'div', cn:[
                {tag: "h2", html: 'Notice:'},
                {tag: "h3", cls: "r-icon-text icon-exclamation", html: 'No consignee has been set for this order'}
            ]}; 
             
            // since this panel was not provided with a valid entity object, hide the top toolbar, since it has no relelvence
            // until an entity is created. 
            this.on('render', function() {                                
                var btn = new Ext.Button({text: 'Add Consignee', iconCls: 'icon-add', menu: Ext.getCmp('hwb_popup'), handler: this.onSetEntity, scope: this});
                this.add(btn);
                this.getTopToolbar().hide();    
            });                  
        }
        
        // tbar
        this.tbar = this.buildToolbar();
        
        // tools
        this.tools = [{
            id: 'map',
            on: {
                click: function(btn, ev){
                    var gmap = Ext.getCmp('order_map');
                    if (gmap) {                        
                        gmap.showEntity(this.entity);                                               
                    }                    
                },
                scope: this
            }
        }];
                
        // add entity events
    	this.addEvents({    // <--- some of these events are old irrlevent and should be factored-out    		            
            /***
             * @event update
             * @param {Panel/this}
             * @param {Object} entity, the updated entity
             * fires when this entity has been updated
             */
            update: true
    	});
    
        this.on('ready', function() {                        
            // apply edit-company links                           
            var el = Ext.fly('btn-edit-company-' + this.entity.id);                                                                                           
            if (el) {            
                var popup = Ext.getCmp('location_popup');
                var fpanel = popup.getFormPanel();
                var gmap = Ext.getCmp('order_map');   
                el.on('click', function(ev, node){                                                                                                                                                                                                                                                                                                                                                                                                                            
                    try {
                        fpanel.showUpdate();                
                        fpanel.setKey(this.entity.location.id);                                 
                        popup.show(node);  
                        fpanel.setTitle('Company location -- ' + this.entity.company.name + ' (' + this.entity.location.airport.iso + ')');
                        fpanel.setValues(this.entity.location);                                                
                    }
                    catch (e) {
                        console.error('Exception at RouteView::build -- entity_id: ', this.entity.id);
                        App.handleException(this, e);
                    }      
                    fpanel.on('actioncomplete', function(form, action){
                        if (action.type == 'submit') {
                            var res = action.result;                        
                            if (res.success == true) {                            
                                this.entity.location = res.data.location;                                                                
                                this.renderTemplate(true);
                                this.fireEvent('update', this, this.entity);
                                popup.hide();
                                this.build();                                                            
                            }
                        }
                    }, this);                                                                                                                                                                      
                },this);
            } 
            
            // apply editor popup to account                                    
            var el = Ext.fly('btn-edit-account-' + this.entity.account.id);                                                           
            if (el) {            
                el.on('click', function(ev, node){                                                                        
                    var popup = Ext.getCmp('account_popup');
                    var fpanel = popup.getFormPanel();                                        
                    fpanel.setDomain(RExt.company.Util.loadDomainById(this.entity.domain.id));
                    fpanel.load(this.entity.account.id);
                    fpanel.showUpdate();
                    fpanel.setTitle('Edit Account');
                    popup.show(node);                                                                                
                    fpanel.on('actioncomplete', function(form, action){
                        if (action.type == 'submit') {
                            var res = action.result;                            
                            if (res.success == true) {
                                // replace entity.account with new data from server and re-render template
                                this.entity.account = res.data.account;
                                this.renderTemplate(true);                                                                
                                popup.hide();
                                                                                                                        
                            }
                        }
                    }, this);                                                            
                },this);
            }
            // apply gmap links            
            var map = Ext.getCmp('order_map');
            if (map) {
                var el = Ext.fly('btn-gmap-entity-' + this.entity.id);
                if (el) {
                    el.on('click', function(ev, node){                                                
                        map.showEntity(this.entity);                                                                                                                  
                    }, this);
                }
            }
                    
        },this);
        
        this.addClass('order-entity');
        
        // super
        Apollo.order.EntityPanel.superclass.initComponent.call(this);
    },
    
    /***
     * buildToolbar
     * @return {Array}
     */
    buildToolbar : function() {
        // Create hwb form.  this is going to be creative.  going to instantiate an hwb form, rip-off the consignee fieldset,
        // and send it to a new form.        
        var btnEdit = new RExt.Toolbar.PopupButton({
            text: 'Edit',
            iconCls: 'icon-pencil',
            menu: Ext.getCmp('hwb_popup'),
            handler: this.onEdit, 
            scope: this
        });                             
        return [btnEdit, '-'];
        
    },
    
    /***
     * onSetEntity (what the fuck)
     * called when an entity panel is created without an entity.
     * used for case when an order is created without setting "consignee"
     */
    onSetEntity : function(btn, ev) {
                                                   
        // Create hwb form.  this is going to be creative.  going to instantiate an hwb form, rip-off the consignee fieldset,
        // and send it to a new form.   
        var popup = btn.menu;                    
        var fpanel = popup.form;        
        fpanel.setEntity(this.entity);
        fpanel.setKey(this.order_id);    
        fpanel.showInsert('add_entity');
                            
                                
        /***
         * @event beforeaction
         * set the "entity" param to "consignee".  this informs order/add_entity
         * that we're adding a "consignee".
         * @param {Object} form
         * @param {Object} action
         */
        fpanel.on('beforeaction', function(form, action) {            
            action.options.params = action.options.params || {}
            action.options.params.entity = this.entity;
        },this);
        
        /***
         * @event actioncomplete
         * @param {Object} form
         * @param {Object} action
         */
        fpanel.on('actioncomplete', function(form, action) {
            var res = action.result;
            if (res.success == true) {
                popup.hide(); 
                this.setHeight(this.tabPanelHeight + 20);                                
                this.getTopToolbar().show();    // <-- show the std. toolbar now.
                this.remove(this.items.first(), true); // <-- remove the button                               
                this.entity = res.data.entity;                                                         
                this.renderTemplate(true);                                     
                this.doLayout();                                                                    
            }
        },this);                                                                                                        
    },
    
    /***
     * onEdit
     * edit an order entity.
     * @param {Object} btn
     * @param {Object} ev
     */
    onEdit : function(btn, ev) {                                            
        var popup = btn.menu;
        var fpanel = popup.form;               
        fpanel.setEntity(this.entity);  
                                              
        fpanel.showUpdate();       
        fpanel.setTitle('Edit ' + this.entity.role);
        fpanel.on('show', function() { fpanel.init(); });                                        
        /***
         * @event actioncomplete
         * @param {Object} form
         * @param {Object} action
         */
        fpanel.on('actioncomplete', function(form, action) {
            var res = action.result;            
            if (res.success == true) {                   
                this.entity = res.data.entity;
                this.renderTemplate(true);
                this.fireEvent('update', this, this.entity);
                this.doLayout();                
            }
            popup.hide();
                     
        },this);                                    
        
    },
    
    /***
     * compile
     * compile template data.  compile is called by base-class RTemplate when it's gathering data
     * for its template render
     * @return {Hash || false} template data.  return false to cancel template render.
     */
    compile : function() {        
        if (typeof(this.entity) == 'object') {
            var data = Ext.apply(Apollo.order.EntityPanel.superclass.compile.apply(this, arguments), this.entity);   
            
            // pre-format the location --> CITY, REGION, COUNTRY (AIRPORT)                                 
            data.company.location = this.entity.location.city.name + ', ' + this.entity.location.region.iso + ', ' + this.entity.location.country.iso + ' (' + this.entity.location.airport.iso + ')';
            return data;
        }
        else {
            return false;
        }                        
    },
    
    /***
     * onInlineEditComplete
     * implement RPanel::onInlineEditComplete to keep the entity data up-to-date
     * @param {Object} res
     */
    onInlineEditComplete : function(res) {
        if (typeof(this.entity[res.data.field]) != 'undefined'){
            this.entity[res.data.field] = res.data.value;    
        }            
    }
    
});
Ext.reg('entitypanel', Apollo.order.EntityPanel);    // <-- register xtype

/***
 * Apollo.order.RouteEntityPanel
 * extends EntityPanel
 * @param {Object} param
 */
Apollo.order.RouteEntityPanel = Ext.extend(Apollo.order.EntityPanel, {
    
    /***
     * template id
     */
    tpl: 'route-entity-template',
    
    /***
     * initComponent
     */
    initComponent : function() {    
        if (this.entity != null) {
            if (this.entity.role == 'shipper') {
                this.title = 'Pickup Agent -- ';
            }
            else {
                this.title = 'Delivery Agent -- ';
            }
            this.title += this.entity.company.name;
        }
        Apollo.order.RouteEntityPanel.superclass.initComponent.apply(this, arguments);
    },
    
    /***
     * buildToolbar
     */
    buildToolbar : function() {
        // make no toolbar for RouteEntity.  all actions can be handled by parent RoutePanel
        return null;
        
    }
});
Ext.reg('routeentitypanel', Apollo.order.RouteEntityPanel); // <-- register xtype

/***
 * Apollo.order.CarrierPanel
 * extends EntityPanel
 */
Apollo.order.CarrierPanel = Ext.extend(Apollo.order.EntityPanel, {
        
    /***
     * template id
     */
    tpl : 'route-carrier-template',
    
    frame: false,
    border: false,
    header: false,
    
    initComponent : function() {
        Apollo.order.CarrierPanel.superclass.initComponent.apply(this, arguments);
        if (typeof(this.route) == 'undefined') {
            alert('Apollo.order.CarrierPanel error -- you must send the order route into panel constructor');
            return false;    
        };    
    },
    
    buildToolbar : function() {
        return null;
    },
    
    /***
     * compile
     */
    compile : function() {
        var data = Ext.apply({
            route: {
                id: this.route.id,
                bill_number: this.route.bill_number,
                index: this.route.index,
                origin: this.route.origin_name,
                origin_airport: this.route.origin.airport.iso,
                destination: this.route.destination_name,
                destination_airport: this.route.destination.airport.iso
            }    
        }, Apollo.order.CarrierPanel.superclass.compile.apply(this, arguments));
                                    
        return data;            
    }       
});

/***
 * Apollo.order.ConsigneeForm
 * A simple form for adding a consignee to an existing order where one was not defined.
 * @param {Object} param
 */
Apollo.order.EntityForm = function(param) {
    Apollo.order.EntityForm.superclass.constructor.call(this, Ext.apply({
        
    },param));  
};
Ext.extend(Apollo.order.EntityForm, RExt.sys.Form, {
    
    getParams : function() {
        return {entity: this.entity};    
    },
    
    build : function() {
        
        var fs = this.fieldset;
        delete this.fieldset;
                
        var items = [];
        fs.items.each(function(f) {             
            items.push(f);
        },this);
        
        return items;
    }    
});
        