
Ext.namespace('Apollo.order');

/***
 * Apollo.order.Manager
 * Order management tree
 * @author Chris Scott
 *
 */

Apollo.order.Manager = function(param){
    Apollo.order.Manager.superclass.constructor.call(this, Ext.apply({
        id: 'order_manager',    
        region: 'west',   
        margins: '0 0 5 5', 
        split: true,            
        width: 200,
        border: true,
        header: false,                
        autoScroll: true,
        rootVisible:false,
        lines:false,
        autoScroll:true,
        animCollapse:false,
        animate: false,    
        containerScroll: true,
    
        loader: new Ext.tree.TreeLoader({
            dataUrl: '/order/list',
            listeners: {
                beforeload: function(loader, node, cb) {                        
                    this.baseParams.path = node.getPath('nid');                                             
                }
            }
        }),
        root : new Ext.tree.AsyncTreeNode({
            text: 'Orders',
            nid: 'root',
            draggable: false, // disable root node dragging
            id: 'source',
            expanded: true
        }),
        listeners : {
            click: this.onClick,
            scope: this
        }
    }, param));    
};
Ext.extend(Apollo.order.Manager, Ext.tree.TreePanel, {

    /***
     * OrderManager default config
     *
     */
    
            
    /***
     * build
     * @param {Object} param
     */
    initComponent: function(param) { 
                
        // create advanced-search popup        
        var popup = new RExt.form.Popup({
            id: 'search_popup',
            shadow: false,                    
            form: new Apollo.order.SearchForm({
                id: 'search_form',                
                listeners: {
                    cancel: function() {
                        popup.hide();    // <-- this sucks I have to do this.  should be able to hide popup with form.hide().  problems with that.    
                    },
                    success : this.processQuery,
                    scope: this
                }   
            })  
        });       

        // add bill_number search to App toolbar 
        App.onReady(function() {     
            App.getToolbar().add(
                '-', {
                    text: 'Search', 
                    iconCls: 'icon-magnifier', 
                    menu: popup, 
                    handler: this.onSearch, 
                    scope: this
                }, '-',
                new Ext.form.TextField({
                    id: this.id + '_bill_number', 
                    emptyText: 'Bill number?',
                    listeners: {
                        render: function(field) {
                            new Ext.KeyMap(field.el, {
                                key: Ext.EventObject.ENTER,
                                fn: this.onSearchBillNumber,
                                scope: this
                            });    
                        },
                        scope: this
                    }
                    
                }),'-',
                new RExt.company.CompanyCombo({
                    id: 'application_company_combo',
                    allowBlank: true,
                    emptyText: 'Edit company',
                    width: 250,
                    listeners: {
                        select: function(combo, rec, index) { combo.onEdit(rec); combo.setValue('');}
                    }
                })                    
            );
        },this);
        
        // create OrderManager toolbar                                                                     
        this.tbar = [
            {text: 'New', iconCls: 'icon-add', menu: [{
                id: 'insert',
                text: 'House Waybill',
                iconCls: 'icon-package-add',
                handler: this.onNewOrder,
                scope: this
            },{
                text: 'Quote',
                iconCls: 'icon-calculator',
                handler: this.onNewQuote,
                scope: this
            }]                        
            }, '-'            
        ];                                        
                        
        Apollo.order.Manager.superclass.initComponent.call(this);
        
    },
    
    /***
     * OnSearchBillNumber
     * handles [ENTER] key-press on search-bill-number textfield
     * @param {Object} btn
     * @param {Object} ev
     */
    onSearchBillNumber : function(key, ev) {
        if (key == Ext.EventObject.ENTER) {
            try {
                var field = Ext.getCmp(ev.target.id);
                if (!field.getValue()) { return false; }
                this.onClickOrder(field.getValue());
                field.reset();
            }
            catch(e) {
                App.handleException(this, e);
            }            
        }                    
    },
    
    /***
     * onNewOrder
     * user clicks New->HWB
     * @param {Object} btn
     * @param {Object} ev
     */
    onNewOrder: function(ev, btn){
    
        var center = Ext.getCmp('page-center');
        var hwb = Ext.getCmp('hwb');                                
        hwb.showInsert();                                              
        hwb.on('actioncomplete', function(form, action){                                                
            root = this.getRootNode();
            this.getLoader().load(root);
            root.expand(); 
            hwb.hide(); 
            this.onClickOrder(action.result.data.order.id);                                 
        }, this);        
    },
    
    onNewQuote : function(item, ev) {
        var hwb = Ext.getCmp('hwb');                                
        hwb.showInsert();    
        hwb.setIsQuote(true);               
    },
    
    onBeforeLoad: function(node){
        console.log('onBeforeLoad: ', node);
    },
    
    /***
     * onClick
     * tree clicks
     * @param {Object} node
     * @param {Object} ev
     */
    onClick: function(node, ev){
        var path = node.attributes.nid.split(':');
        var id = path.pop();
        var object = path.pop();
        var isQuote = (node.getPath('nid').match(/is_quote/)) ? true : false;        
        switch (object) {
            case 'Order':                
                this.onClickOrder(id, isQuote);
                break;
        }
        
    },
    
    /***
     * onClickOrder
     * an order node on tree was clicked.
     * @param {Object} id
     * @param {Boolean} isQuote
     */
    onClickOrder: function(id, isQuote){
        isQuote = isQuote || false;
        var center = Ext.getCmp('page-center');
        var p = center.getComponent('order-view-' + id);
        
        if (p) {
            return center.activate(p);
        }
        //Ext.MessageBox.wait('Please wait...', 'Loading order');
        App.showSpinner('Loading');
        
        var el = Ext.getBody().createChild({
            tag: 'div',
            id: 'order-view-' + id
        });
        document.body.appendChild(el.dom);
        
        um = el.getUpdateManager();
        App.update(um, {
            url: '/order/view/' + id,
            method: 'POST',
            scripts: true,
            timeout: 20,
            text: 'Loading...',
            nocache: false,
            callback: function(conn, success, response, options){
                if (!App.validateResponseType('html', response)) {
                    delete el; // <-- remove the el or have memory-leak
                    Ext.get('order-view-' + id).remove();
                    el.remove();
                    return false;
                }  
                var cfg = {
                    id: 'order-view-' + id,
                    cls: 'order-view'                             
                };                   
                var view = null;
                if (isQuote === false) {
                    view = new Apollo.order.View(cfg);
                }
                else {
                    cfg.iconCls = 'icon-calculator';
                    view = new Apollo.order.QuoteView(cfg);
                }
                                                                                 
                /***
                 * @event destroy
                 * destroy the load-tab element.  was a memory leak.  NB:  ref to el must first be deleted.
                 *
                 */
                view.on('destroy', function(){
                    delete el;
                    Ext.get('order-view-' + id).remove();
                });
                center.add(view).show();
                App.getPage().doLayout();
                //Ext.MessageBox.hide();
                App.hideSpinner();
            },
            scope: this
        });
    },
    
    /***
     * convertQuote
     */
    convertQuote : function(quote) {
                                
        Ext.MessageBox.confirm('Confirm', 'Convert quote to HAWB?', function(btn) {
            if (btn == 'yes') {
                App.request({
                    url: 'order/convert_quote/' + quote.order.id,
                    method: 'POST',
                    success: function(res) {                                                  
                        var tree = this.getComponent('account_order_tree');
                        this.loader = tree.getLoader();
                        var root = tree.getNodeById('quotes');
                        var trash = [];
                        root.cascade(function(node) {
                            if (node.attributes.nid == 'Order:' + quote.order.id) {
                                trash.push(node);
                            }                
                        });
                        for (var n=0,len=trash.length;n<len;n++) { trash[n].remove(); }    
                        var dt = new Date(quote.order.getShipper().date_out);        
                        var pattern = "Year:" + dt.format("Y") + "/Month:" + dt.format("n") + "/Day:" + dt.format("d");
                        var left = root.nextSibling      
                        while (left) {                       
                            this.refreshPath(left, 'nid', pattern);
                            left = left.nextSibling;    
                        }
                        var right = root.previousSibling
                        while (right) {             
                            this.refreshPath(right, 'nid', pattern);
                            right = right.previousSibling;   
                        }    
                        var center = Ext.getCmp('page-center');
                        center.remove(quote);
                                                           
                    },
                    scope: this    
                });     
            }    
        },this);            
    },
    
    /***
     * refreshPath
     * cascades down provided node, looking to match node's path with provided pattern.  when it finds a match,
     * it'll reload the node.
     * @param {Ext.tree.TreeNode} node
     * @param {String} node attribute to compare (@see TreeNode::cascade, TreeNode::getPath('attr'))     
     * @param {String} pattern
     */
    refreshPath : function(node, attr, pattern) {                            
        if (node.childrenRendered === true) {
            node.cascade(function(node) {                                                            
                if (node.getPath(attr).match(pattern) && node.isExpanded()) {    
                    console.log('found: ', node.getPath(attr));
                                        
                    this.loader.load(node, function() { node.expand(); });                    
                }  
            },this);    
        }                        
    },
    
    /***
     * reloadOrder
     * reloads a currently open order, first removing the close-tab then calling std onClick method
     * as if it was clicked from teh tree.
     * @param {Object} id
     */
    reloadOrder: function(id){
    
        var tree = this.getLayout().activeItem.items.first();
        var node = tree.getNodeById('Order:' + id);
        var center = Ext.getCmp('page-center');
        var p = center.getComponent('order-view-' + id);
        center.remove(p, true);
        tree.onClick(node, {});
    },
    
    /***
     * processQuery
     * shows query results.
     * @param {Object} rows
     */
    processQuery : function(result) {           
        var center = Ext.getCmp('page-center');
        var panel = center.getComponent('order-search-result');
        if (panel) {
            panel.execute(result);
            center.activate(panel);
        }
        else {
            panel = new Apollo.order.SearchPanel({
                id: 'order-search-result',
                listeners: {
                    open: this.onClickOrder,
                    scope: this
                }                                       
            });
            panel.execute(result);
            center.insert(0, panel);            
            center.activate(panel);  
            panel.doLayout();
            center.doLayout();          
        }
         
    }
});

/***
 * Apollo.order.SearchForm
 */
Apollo.order.SearchForm = Ext.extend(Ext.form.FormPanel, {
    controller: 'order',
    action: 'filter',
    
    title: 'Order-search',
    width: 350,
    frame: true,
    labelAlign: 'right',
    
    role : null,
    
    /***
     * initComponent
     */
    initComponent : function() {
        this.addEvents({
            /***
             * cancel
             * fires when teh form's [cancel] button was press
             */    
             cancel : true,
             
             /***
              * success
              * fires when a query generates a resultset
              * @param {Array} resultset
              */   
             success : true                          
        });
        
        // attach form-listeners        
        this.on('beforeaction', function(form, action) { 
            //Ext.MessageBox.wait('Searching...', 'Please wait');
            App.showSpinner('Searching...'); 
        });
        this.on('actioncomplete', this.onSuccess, this);
        this.on('actionfailed', function(form, action) { App.processResponse(action.result); });
        
        this.on('hide', function() { App.hideStatus(); });
        
        // create buttons
        this.buttons = [
            {text: 'Search', iconCls: 'icon-accept', handler: this.onSearch, scope: this},
            {text: 'Cancel', iconCls: 'icon-cancel', handler: this.onCancel, scope: this}
        ];
        
             
        
        // assemble the filters
        this.items = [           
            this.buildDateFilter(),
            this.buildEmployeeFilter(),
            this.buildStatusFilter(),
            this.buildAirportFilter(),
            this.buildCompanyFilter()                      
            
        ];
        Apollo.order.SearchForm.superclass.initComponent.call(this);
    },
    
    buildEmployeeFilter : function() {
        // build shipper_contact combo		                        
		var account = new Ext.form.ComboBox({
			name: 'account',
            emptyText: 'Select account...',
			tabIndex: 1,
			anchor: '90%',
			hiddenName: 'employee[id]',
            hiddenId: Ext.id(),
			fieldLabel: 'Employee',
			allowBlank: false,
            tpl: RExt.util.TemplateMgr.get('combo-template'),
            itemSelector: 'div.search-item',
			onSelect: function(record, index){	// <-- override ComboBox::onSelect			    
	        	this.setValue(record.data.id);                                
				this.setRawValue(record.data.first + ' ' + record.data.last);                
				this.collapse(); 
            	this.fireEvent('select', this, record, index);
	        },
			mode: 'remote',
			triggerAction: 'all',
			valueField: 'id',
			displayField: 'id',
			store: new Ext.data.Store({
    			proxy: new Ext.data.HttpProxy({
    				url: 'company/get_company_accounts'
    			}),
    			reader: new Ext.data.JsonReader({
                    root: 'data',
                    totalProperty: 'total',
                    id: 0
                }, RExt.data.Account),
    			baseParams: {company_id: 1}
    		})            
		});
        var user = App.getViewState('user');
        var rec = new RExt.data.Account({
            id: user.id,
            first: user.first,
            last: user.last,
            roles: []
        });
        account.store.insert(0, rec);        
        account.on('render', function() {
            account.onSelect(rec, 0);
        });
        
        return new Ext.form.FieldSet({
            title: 'Created-by',
            checkboxToggle: true,
            checkboxName: 'filter[employee]',
            collapsed: true,
            autoHeight: true,
            items: account
        });         
    },
    
    buildDateFilter : function() {
        return new Ext.form.FieldSet({
            title: 'Date',
            autoHeight: true,
            checkboxToggle: true,
            checkboxName: 'filter[date]',
            items: [{                    
                layout: 'column',                    
                labelWidth: 30,
                items: [{
                    columnWidth: 0.5,   
                    layout: 'form',                     
                    items: new Ext.form.DateField({
                        name: 'date[start]',
        				tabIndex: 1,
                        value : new Date(),
                        fieldLabel: 'Start',
                        allowBlank: false,
                        format: 'm/d/Y'
                    })    
                }, {
                    columnWidth: 0.5,
                    layout: 'form',
                    items: new Ext.form.DateField({
                        name: 'date[end]',
                        value: new Date(),
        				tabIndex: 1,
                        fieldLabel: 'End',
                        allowBlank: false,
                        format: 'm/d/Y'
                    })    
                }]    
            }]
        });    
    },
    
    buildStatusFilter : function() {
        return new Ext.form.FieldSet({
            title: 'Order-status',
            checkboxToggle: true,
            checkboxName: 'filter[shipping_status]',            
            collapsed: true,
            autoHeight: true,
            items: new Ext.form.ComboBox({
                hideLabel: true,
                emptyText: 'Select status...',
                hiddenName:'shipping_status[id]',
                allowBlank: false,
                store: new Ext.data.SimpleStore({
                    fields: ['value', 'name'],
                    data : Apollo.order.Util.getShippingStatusData(),
                    id : 0
                }),                    
                displayField:'name',
                valueField: 'value',
                mode: 'local',
                triggerAction: 'all',
                selectOnFocus:true,
                anchor: '90%'
            })    
        });    
    },
    
    buildAirportFilter : function() {
        return new Ext.form.FieldSet({
            title: 'Airport',
            checkboxToggle: true,                
            checkboxName: 'filter[airport]',
            collapsed: true,
            autoHeight: true,
            items: [{
                layout: 'column',
                items: [{
                    layout: 'form',
                    columnWidth: 0.5,                        
                    items: {
                        xtype: 'ux-radiogroup',
                        tabIndex: 1,
                        horizontal: true,
                        hideLabel: true,
                        name: 'location',
                        radios: [{
                            value: 'origin',
                            checked: true,
                            boxLabel: 'Origin'
                        }, {
                            value: 'destination',
                            boxLabel: 'Destination'
                        }]
                    }
                }, {
                    layout: 'form',
                    columnWidth: 0.5,
                    items: new Ext.form.TextField({
                        fieldLabel: 'Airport',
                        allowBlank: false,
                        hideLabel: true,
                        name: 'airport[iso]',
                        tabIndex: 1                        
                    })
                }]
            }]    
        });    
    },
    
    buildCompanyFilter : function() {
        // create fields
        var combo = new RExt.company.CompanyCombo({
            hiddenName: 'company[id]',
            fieldLabel: 'Company',
            domain: RExt.company.Util.getDomainByName('client'),
            hideLabel: true  
        });
        
        var domainGroup = new Ext.ux.RadioGroup({
            xtype: 'ux-radiogroup',
            fieldLabel: 'Type',
            tabIndex: 1,
            horizontal: true,
            hideLabel: true,
            name: 'role',                                           
            radios:[{
                value: 'shipper',
                checked:true,
                boxLabel:'Shipper',
                listeners: {
                    check: onSelectDomain                    
                }
            }, {
                value: 'consignee',
                boxLabel:'Consignee', //optional
                checked: false,
                listeners: {
                    check: onSelectDomain                    
                }
            }, {
                value: 'carrier',
                boxLabel:'Carrier',
                checked: false,
                listeners: {
                    check: onSelectDomain                    
                }
            }, {
                value: 'agent',
                boxLabel: 'Carting-agent',
                checked: false,
                listeners: {
                    check: onSelectDomain                    
                }
            }]
        });
        function onSelectDomain(field, checked) {
            if (checked == true) {
                this.role = field.value;
                combo.setDomain(RExt.company.Util.getDomainByName((field.value == 'shipper' || field.value == 'consignee')?'client':field.value));                                                                                
            }            
        }   
        return new Ext.form.FieldSet({
            title: "Company",  
            layout: 'form',     
            collapsed: true,
            checkboxToggle: true,      
            checkboxName: 'filter[company]',
            autoHeight: true,
            items: [
                domainGroup,
                combo                                                                                                                     
            ]
        });   
    },
    
    
    // private onSearch
    onSearch : function(btn, ev) {  
        if (this.isValid()) {
            App.hideStatus();
            this.form.submit({
                url: this.controller + '/' + this.action,
                params: {
                    role: this.role
                }
            });
        }        
    },
    
    /***
     * isValid
     * validate the search form.  considered invalid of all filters fieldsets are off.
     */
    isValid : function() {
        var valid = this.form.isValid();
        if (valid === false) {         
            App.setStatus(App.STATUS_ERROR, 'Your form contains invalid fields');
            return false;        
        }      
        var fs = this.findByType('fieldset');
        var off = 0;
        for (var n=0,len=fs.length;n<len;n++) { if (fs[n].collapsed === true) { off++; } }
        valid = (off != fs.length) ? true : false;
        if (valid === false) {
            App.setStatus(App.STATUS_ERROR, 'You must apply at least one filter');            
        }
        return valid;
    },
    
    
    // private process
    onSuccess : function(form, action) {
        //Ext.MessageBox.hide();
        App.hideSpinner();
        res = action.result;      
        if (res.success === true && res.data.total > 0) {
            App.setAlert(App.STATUS_OK, res.msg);
            this.fireEvent('success', res.data);
            this.fireEvent('cancel');
        }
        else {
            App.setAlert(App.STATUS_NOTICE, res.msg);
        }
    },
    
    // private onCancel
    onCancel : function() {        
        this.fireEvent('cancel');
    }
});

/***
 * Apollo.order.SearchPanel
 * Panel for showing search-results.  controls a DataView
 */
Apollo.order.SearchPanel = Ext.extend(Ext.Panel, {
    controller: 'order',
    action: 'filter',
    criteria: {},
    cls: 'order-search-result',
    title: 'Order search results',
    iconCls: 'icon-magnifier',
    layout: 'fit',
    closable: true,
    autoScroll: true,
    
    
    initComponent : function() {
        this.addEvents({
            /***
              * open
              * fires when the user wishes to open an order in View (most likey the result of a dblclick)
              * @param {Integer} order id
              * @param {Boolean} isQuote              
              */                  
              open : true    
        });
        
        // create view's record def.
        var Order = Ext.data.Record.create([
            {name: 'id'},            
            {name: 'bill_number', type: 'string'},
            {name: 'created_by'},
            {name: 'status'},
            {name: 'shipper'},
            {name: 'consignee'}  
        ]);
        
        // build shipper ComboBox
        var store = new Ext.data.Store({
            reader: new Ext.data.JsonReader({
                root: 'data.rs',
                totalProperty: 'data.total',
                id: 'id'
            }, Order),
            proxy: new Ext.data.HttpProxy({
                url: this.controller + '/' + this.action
            }),
        });
                        
        this.tbar = new Ext.PagingToolbar({
            store: store,
            pageSize: 10
        });
        
        // create view template
        
        
        // create view
        var view = new Ext.DataView({
            id: this.id + '_view',
            store: store,
            tpl: RExt.util.TemplateMgr.get('order-search-template'),
            cls: 'x-grid3 r-dataview',
            autoWidth: true,
            autoHeight: true,
            multiSelect: true, 
            autoScroll: true,                                  
            height: 200,
            autoScroll: true,            
            overClass:'x-grid3-row-over',
            itemSelector:'div.x-grid3-row',
            selectedClass: 'x-grid3-row-selected',
            emptyText: '<h2 style="margin:5px;">No Results</h2>',
            listeners: {                
                dblclick: function(view, index, node) {
                    this.fireEvent('open', view.store.getAt(index).data.id);    
                },
                scope: this
            }
        });                                                
        this.items = view;
        
        Apollo.order.SearchPanel.superclass.initComponent.call(this);
    },
    
    /***
     * execute
     * @param {Object} data
     */
    execute : function(data) {                
        try {
            var view = this.getComponent(this.id + '_view');
            var store = view.store;
            store.load({
                params: {
                    limit: this.getTopToolbar().pageSize,
                    start: 0
                }
            });
        } 
        catch (e) {
            App.handleException(this, e);
        }   
    }
});
