Ext.namespace('Apollo.accounting', 'Apollo.invoice');

/***
 * Apollo.accounting.Manager
 * Accounting management tree
 * @author Chris Scott
 *
 */
Apollo.accounting.Manager = Ext.extend(Ext.Panel, {
    
    /***
     * Manager default config
     * 
     */
    viewUrl: '/accounting/view',
    title: 'Accounting Manager',
    layout: 'fit',    
    frame: false,
    border: true,
                  
    /***
     * build
     * @param {Object} param
     */
    initComponent : function(param) {
        
        var view = this.build();
        view.on('dblclick', this.onClickReport);
        
        this.items = view;
        
        
        // create advanced-search popup        
        var popup = new RExt.form.Popup({
            id: 'search_popup',
            shadow: false,                    
            form: new Apollo.accounting.SearchForm({
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
                    emptyText: 'Invoice or HWB number?',
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
                    
                }),'-'                           
            );     
        },this);
                                                             
        Apollo.accounting.Manager.superclass.initComponent.call(this);  
        
    },
    
    /***
     * build
     * @return {Ext.DataView}
     */
    build : function() {
        // create view's record def.
        var Report = Ext.data.Record.create([
            {name: 'id', mapping: 'id'},
            {name: 'name', mapping: 'name'},
            {name: 'label', mapping: 'label'},
            {name: 'model', mapping: 'model'},
            {name: 'document', mapping: 'document'}
        ]);
        
        // build shipper ComboBox
        var store = new Ext.data.Store({
            reader: new Ext.data.ArrayReader({id: 'id'}, Report),
            baseParams: {}
        });
        store.loadData(Apollo.invoice.Util.getReports());
        
        // create view template
        var tpl = new Ext.XTemplate(
    		'<tpl for=".">',
                '<div id="report-{id}" class="report x-grid3-row">',    		                      
                '    <div class="x-grid3-cell-inner"><span class="name">{label}</span></div>',                              
                '</div>',
            '</tpl>'
    	);
        
        // create view
        var view = new Ext.DataView({
            id: this.id + '_report_view',
            store: store,
            tpl: tpl,
            cls: 'x-grid3',
            autoWidth: true,
            multiSelect: true, 
            autoScroll: true,            
            deleted: [],           
            height: 200,
            autoScroll: true,            
            overClass:'x-grid3-row-over',
            itemSelector:'div.report',
            selectedClass: 'x-grid3-row-selected',
            emptyText: '<h2>No reports available</h2>'
        });                                                
        return view;
    },
    
    /***
     * getView
     * @return {Ext.DataView}
     */
    getView : function() {
        return this.items.first();
    },
    
    onSearchBillNumber : function(key, ev) {
        if (key == Ext.EventObject.ENTER) {
            try {
                var field = Ext.getCmp(ev.target.id);
                if (!field.getValue()) { return false; }
                this.onClickInvoice(field.getValue());
                field.reset();
            }
            catch(e) {
                App.handleException(this, e);
            }            
        }      
    },
    
    /***
     * processQuery
     * shows query results.
     * @param {Object} rows
     */
    processQuery : function(result) {                            
        var center = Ext.getCmp('page-center');
        var panelId = (result.type == 'receivable') ? 'search-result-receivables' : 'search-result-payables';
        var panel = center.getComponent(panelId);
        if (panel) {
            panel.execute(result);
            center.activate(panel);
        }
        else {
            if (result.type == 'receivable') {
                panel = new Apollo.invoice.ReceivablesGrid({
                    id: 'invoice-search-result',
                    listeners: {
                        open: this.onClickInvoice,
                        scope: this
                    }                                       
                });             
            }
            else if (result.type == 'payable') {
                panel = new Apollo.invoice.PayablesGrid({
                    id: panelId                    
                });
            }
                
            panel.execute(result);
            center.insert(0, panel);            
            center.activate(panel);  
            panel.doLayout();
            center.doLayout();          
        }
         
    },
    	    
	/***
	 * onClick
	 * tree clicks
	 * @param {Object} node
	 * @param {Object} ev
	 */
	onClick : function(node, ev) {
		var path = node.id.split(':');
        var id = path.pop();
        var object = path.pop();
        
        switch (object) {
            case 'Order':
                this.onClickOrder(id);
                break;
        } 
		
	},
    
    /***
     * onClickInvoice
     * an order node on tree was clicked.
     * @param {Object} id
     */
    onClickInvoice : function(id) {
        var center = Ext.getCmp('page-center');
		var p = center.getComponent('invoice-view-tab-' + id);

		if (p) {
            return center.activate(p);
        }
		Ext.MessageBox.wait('Please wait...', 'Loading invoice');

		var el = Ext.getBody().createChild({tag:'div', id:'invoice-view-tab-' + id});
		document.body.appendChild(el.dom);

		um = el.getUpdateManager();
		um.update({
			url: this.viewUrl + '/' + id,
			method: 'POST',
			scripts: true,
			timeout: 20,
			text: 'Loading...',
			nocache: false,
			callback: function(conn, response, options) {                               
                if (!App.validateResponseType('html', options)) {
                    delete el; // <-- remove the el or have memory-leak
                    Ext.get('invoice-view-tab-' + id).remove();
                    el.remove();                     
                    return false;
                }
                                                                                                                                
				var view = new Apollo.invoice.View({
                    id: 'invoice-view-tab-' + id                    
                });
                /***
                 * @event destroy
                 * destroy the load-tab element.  was a memory leak.  NB:  ref to el must first be deleted.
                 * 
                 */
                view.on('destroy', function() {  
                    delete el;               
                    Ext.get('invoice-view-tab-' + id).remove();                                       
                });                
				center.add(view).show();                
				App.getPage().doLayout();
				Ext.MessageBox.hide();
			},
			scope: this
		});   
    },
    
    /**
     * onClickReport
     * @param {Ext.DataView}
     * @param {Number} index 
     * @param {HTMLElement} node
     * @param {Ext.EventObject} ev 
     */
    onClickReport : function(view, index, node, ev) {
        var rec = view.store.getAt(index);
           
        var center = Ext.getCmp('page-center');
        var panelId = 'report-' + rec.data.id;
        
        var panel = center.getComponent(panelId);
        if (panel) {
            panel.execute({});
            center.activate(panel);
        }
        else {
            if (rec.data.model == 'InvoicePayable') {
                panel = new Apollo.accounting.PayablesReport({
                    id: panelId,
                    title: rec.data.label + ' Report',                    
                    report: rec        
                });                             
            }                                                    
            panel.execute({});
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
Apollo.accounting.SearchForm = Ext.extend(Ext.form.FormPanel, {
    controller: 'accounting',
    action: 'filter',
    
    title: 'Invoice-search',
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
        
        // Receivable / Payable status fieldsets.  want to have ptrs here because of listeners on radios.
        var statusReceivable = this.buildReceivableStatusFilter();
        var statusPayable = this.buildPayableStatusFilter();
        
        // assemble the filters
        this.items = [{
            xtype: 'ux-radiogroup',
            tabIndex: 1,
            horizontal: true,
            hideLabel: true,
            name: 'type',
            radios: [{                
                value: 'receivable',
                checked: true,
                boxLabel: 'Receivables',
                listeners: {
                    check: onCheckType,
                    scope: this
                }
            }, {
                value: 'payable',
                boxLabel: 'Payables',
                listeners: {
                    check: onCheckType,
                    scope: this
                }
            }]
        },
            this.buildDateFilter(),
            statusReceivable,
            statusPayable,
            this.buildEmployeeFilter(),                       
            this.buildCompanyFilter()                      
            
        ];
        // check-handler for payable/receivable radios.  Toggles their corresponding "status" fieldsets (each have their own)
        function onCheckType(field, checked) {            
            if (field.value == 'receivable') {
                if (checked == true) {                    
                    statusReceivable.show();
                }
                else {
                    statusReceivable.collapse();
                    statusReceivable.hide();
                }
            }
            else {
                if (checked == true) {                    
                    statusPayable.show();
                }
                else {
                    statusPayable.collapse();
                    statusPayable.hide();
                }
            }                
        }
        
        // super
        Apollo.accounting.SearchForm.superclass.initComponent.call(this);
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
    
    // statusFilter
    buildReceivableStatusFilter : function() {
        return new Ext.form.FieldSet({
            id: this.id + '_receivable_status',
            title: 'Status',
            autoHeight: true,
            checkboxToggle: true,
            collapsed: true,
            checkboxName: 'filter[status]',
            labelWidth: 70,
            listeners: {
                expand : function(fs) {
                    // reset the [x] late checkbox to unchecked.
                    var late = this.form.findField('status[late]');
                    late.setValue(false); 
                        
                },
                scope: this               
            },
            items: [                
                new Ext.form.ComboBox({  
                    name: 'status[type]',
                    fieldLabel: 'Status',                      
                    store: new Ext.data.SimpleStore({
                        fields: ['id', 'name'],                
                        id : 'id',
                        data: Apollo.invoice.Util.getInvoiceStatus()
                    }),       
                    width: 100,
                    listWidth: 100,     
                    displayField:'name',
                    valueField: 'id',
                    value: 'new',
                    mode: 'local',
                    triggerAction: 'all',
                    selectOnFocus:true                    
                }),
                {
                    layout: 'column',
                    items: [{
                            layout: 'form',                            
                            items: new Ext.form.Checkbox({                                
                                name: 'status[late]',
                                fieldLabel: "Late",
                                listeners: {
                                    check : function(field, checked) {
                                        var status = this.form.findField('status[type]');
                                        var days = this.form.findField('status[late_days]');
                                        if (checked == true) {
                                            status.disable();  
                                            days.enable();  
                                        }
                                        else {
                                            status.enable();    
                                            days.disable();
                                        }
                                    },
                                    scope: this
                                }
                            })
                        },{
                            layout: 'form', 
                            columnWidth: 1.0, 
                            labelWidth: 40,                          
                            items: new Ext.form.NumberField({
                                name: 'status[late_days]',                                
                                value: 30,
                                disabled: true,
                                fieldLabel: 'Days',
                                width: 50
                            })    
                        }                                                
                    ]
                }
            ]    
        });  
    },
    
    // statusFilter
    buildPayableStatusFilter : function() {
        return new Ext.form.FieldSet({
            id: this.id + '_payable_status',
            title: 'Status',
            autoHeight: true,
            hidden: true,
            checkboxToggle: true,
            collapsed: true,
            checkboxName: 'filter[payable_status]',
            labelWidth: 70,            
            items: [                
                new Ext.form.Checkbox({
                    name: 'payable_status[paid]',
                    fieldLabel: 'Paid?'
                })
            ]    
        });  
    },
    
    buildDateFilter : function() {
        return new Ext.form.FieldSet({
            title: 'Date',
            autoHeight: true,
            checkboxToggle: true,
            collapsed: true,
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
                    
    buildCompanyFilter : function() {
        // create fields   
        console.log('domain client: ', RExt.company.Util.getDomainByName('client'));                     
        return new Ext.form.FieldSet({
            title: "Company",  
            layout: 'form',     
            collapsed: true,
            checkboxToggle: true,      
            checkboxName: 'filter[company]',
            autoHeight: true,
            items: [
                new RExt.company.CompanyCombo({
                    hiddenName: 'company[id]',
                    fieldLabel: 'Company',
                    domain: RExt.company.Util.getDomainByName('client'),
                    hideLabel: true  
                })                                                                                                                   
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

/**
 * Apollo.invoice.ReceivablesGrid
 * Search-results for receivables (invoices)
 * @param {Object} param
 */
Apollo.invoice.ReceivablesGrid = function(param){
    
    var sm = new Ext.grid.CheckboxSelectionModel();
    
    // shared reader
    var reader = new Ext.data.ArrayReader({}, [
       {name: 'company'},
       {name: 'price', type: 'float'},
       {name: 'change', type: 'float'},
       {name: 'pctChange', type: 'float'},
       {name: 'lastChange', type: 'date', dateFormat: 'n/j h:ia'},
       {name: 'industry'},
       {name: 'desc'}
    ]);
    
    // create view's record def.
    var Invoice = Ext.data.Record.create([
        {name: 'id'},            
        {name: 'bill_number', type: 'string'},
        {name: 'bill_to_id'},
        {name: 'bill_to_name', type: 'string'},
        {name: 'created_by'},
        {name: 'status'},
        {name: 'total'},
        {name: 'amount_due'},
        {name: 'shipper'},
        {name: 'consignee'}  
    ]);
    
    // build shipper ComboBox
    param.store = new Ext.data.Store({
        reader: new Ext.data.JsonReader({
            root: 'data.rs',
            totalProperty: 'data.total',
            id: 'id'
        }, Invoice),
        proxy: new Ext.data.HttpProxy({
            url: this.controller + '/' + this.action
        }),
    });
            
    param.cm = new Ext.grid.ColumnModel([
        sm,
        {id:'bill_number',header: "Bill Number", width: 100, sortable: true, dataIndex: 'bill_number'},
        {header: "Invoice Total", width: 100, sortable: true, dataIndex: 'total', render: Ext.util.Format.usMoney},
        {header: "Amount due", width: 100, sortable: true, dataIndex: 'amount_due', renderer: Ext.util.Format.usMoney},
        {header: "Status", width: 100, sortable: true, dataIndex: 'status'},        
        {header: "Shipper", width: 200, sortable: true, dataIndex: 'shipper'},
        {header: "Consignee", width: 200, sortable: true, dataIndex: 'consignee'}        
    ]);
    param.sm = sm;               
    
    Apollo.invoice.ReceivablesGrid.superclass.constructor.call(this, param);
};
Ext.extend(Apollo.invoice.ReceivablesGrid, Ext.grid.GridPanel, {
    controller: 'accounting',
    action: 'filter',
       
    frame:true,
    title:'Receivables',        
    closable: true,
    iconCls: 'icon-money-add',    
    initComponent : function() {
        this.addEvents({
            /***
              * open
              * fires when the user wishes to open an order in View (most likey the result of a dblclick)
              * @param {Integer} order id
              * @param {Boolean} isQuote              
              */           
        });
        
        // attach dbl-click handler to rows to execute edit action.
        this.on('dblclick', this.onEdit, this);
        
        this.tbar = new Ext.PagingToolbar({
            store: this.store,
            pageSize: 10,
            items: [
                '-',
                {text: 'Payments', iconCls: 'icon-money-add', handler: this.onAddPayments, scope: this},'-',
                {text: 'Edit', iconCls: 'icon-pencil', handler: this.onEdit, scope: this}              
            ]
        });        
        Apollo.invoice.ReceivablesGrid.superclass.initComponent.call(this);
    },
    
    /***
     * execute
     * @param {Object} data
     */
    execute : function(data) {                
        try {            
            this.store.load({
                params: {
                    limit: this.getTopToolbar().pageSize,
                    start: 0
                }
            });
        } 
        catch (e) {
            App.handleException(this, e);
        }   
    },
    
    onEdit : function(btn, ev) {
        var selected = this.getSelectionModel().getSelected();
        this.fireEvent('open', selected.data.bill_number);    
        
    },
    
    /**
     * onAddPayments
     * pay multiple invoices with 1 transaction.  all selected rows MUST have the same bill_to_id
     * @param {Object} btn
     * @param {Object} ev
     */
    onAddPayments : function(btn, ev) {                  
        var rs = this.getSelectionModel().getSelections();
        if (rs.length == 0) {
            return App.setAlert(App.STATUS_NOTICE, "No records selected");            
        }
        
        // get bill_to_id of 1st selected row.  all others rows must match, otherwise inform user of error.
        var bid = rs[0].data.bill_to_id;        
        for (var n=0,len=rs.length;n<len;n++) {
            if (rs[n].data.bill_to_id != bid) {
                return App.setStatus(App.STATUS_ERROR, "Error", "To pay multiple invoices with one transaction, all bill-to must be the same.");
            }            
        }
        
        var popup = Ext.getCmp('transaction_popup');
        var fpanel = popup.getFormPanel();        
        fpanel.showInsert();
        
        // @event actioncomplete.  remove rows associated with successful transactions.
        fpanel.on('actioncomplete', function(form, action) {
            popup.hide();
            var rs = action.result.data.transactions;
            for (var n = 0, len = rs.length; n < len; n++) {
                this.store.remove(this.store.getAt(this.store.find('id', rs[n].invoice_id)));
            }               
        }, this);     
        popup.show(btn.el);         
        fpanel.addInvoices(rs);            
    },
    
    //doAddPayments
    // remove corresponding rows from grid when transactions complete
    doAddPayments : function(form, action) {                        
            
    }
    
});

/**
 * Apollo.invoice.PayablesGrid
 * Search-results for receivables (invoices)
 * @param {Object} param
 */
Apollo.invoice.PayablesGrid = function(param){        
    var summary = new Ext.grid.GroupSummary();
    
    var sm = new Ext.grid.CheckboxSelectionModel();
            
    // create view's record def.
    var Invoice = Ext.data.Record.create([
        {name: 'id'},     
        {name: 'company'},
        {name: "bill_number"},    
        {name: 'name'},           
        {name: 'cost', type: 'float'},
        {name: 'paid'},
        {name: 'updated_at'}
    ]);
            
    // build shipper ComboBox
    param.store = new Ext.data.GroupingStore({
        groupField: 'company',
        reader: new Ext.data.JsonReader({
            root: 'data.rs',
            totalProperty: 'data.total',
            id: 'id'
        }, Invoice),
        proxy: new Ext.data.HttpProxy({
            url: this.controller + '/' + this.actions.filter
        }),
        sortInfo: {
            field: 'company',
            direction: "ASC"
        }   
    });
    
    param.view = new Ext.grid.GroupingView({
        forceFit: false,
        showGroupName: false,
        enableNoGroups: false, // REQUIRED!
        hideGroupedColumn: true
    });
    
    param.plugins = summary;
           
    param.cm = new Ext.grid.ColumnModel([
        sm, {
            header: "Company", 
            dataIndex: 'company'
        }, {
            header: "Bill number",
            width: 100,
            sortable: true,
            dataIndex: 'bill_number'                
        }, {
            header: "Name", 
            width: 200, 
            sortable: true, 
            dataIndex: 'name',
            summaryRenderer: function(v, params, data){            
                return 'Total';  //((v === 0 || v > 1) ? '(' + v +' Tasks)' : '(1 Task)');
            } 
        }, {
            header: "Cost", 
            width: 100, 
            sortable: true, 
            dataIndex: 'cost', 
            renderer: Ext.util.Format.usMoney,
            summaryType: 'sum',
            summaryRender: Ext.util.Format.usMoney
        }, {
            header: "Paid",
            width: 100,
            sortable: true,
            dataIndex: 'paid'            
        }, {
            header: "Last updated",
            width: 100,
            sortable: true,
            dataIndex: 'updated_at',
            renderer: function(v) {
                return new Date(v).format("F j Y");
            }
        }        
    ]);
    param.sm = sm;               
    
    Apollo.invoice.PayablesGrid.superclass.constructor.call(this, param);
};
Ext.extend(Apollo.invoice.PayablesGrid, Ext.grid.GridPanel, {
    controller: 'accounting',
    actions: {
        update: 'pay',
        filter: 'filter'       
    },       
    frame:true,
    title:'Payables',      
    closable: true,  
    iconCls: 'icon-money-delete',
        
    initComponent : function() {
        this.addEvents({
            /***
              * open
              * fires when the user wishes to open an order in View (most likey the result of a dblclick)
              * @param {Integer} order id
              * @param {Boolean} isQuote              
              */           
        });
        
        // attach dbl-click handler to rows to execute edit action.
        this.on('dblclick', this.onEdit, this);
        
        this.tbar = new Ext.PagingToolbar({
            store: this.store,
            pageSize: 20,
            items: [
                '-',
                {text: 'Pay Selected', iconCls: 'icon-money-add', handler: this.onPay, scope: this},'-'                              
            ]
        });  
       
        // super      
        Apollo.invoice.PayablesGrid.superclass.initComponent.call(this);
    },
    
    /***
     * execute
     * @param {Object} data
     */
    execute : function(data) {                
        try {            
            this.store.load({
                params: {
                    limit: this.getTopToolbar().pageSize,
                    start: 0
                }
            });
        } 
        catch (e) {
            App.handleException(this, e);
        }   
    },
        
    /**
     * onPay
     * pay multiple invoices with 1 transaction.  all selected rows MUST have the same bill_to_id
     * @param {Object} btn
     * @param {Object} ev
     */
    onPay : function(btn, ev) {                  
        var rs = this.getSelectionModel().getSelections();
        if (rs.length == 0) {
            return App.setAlert(App.STATUS_NOTICE, "No records selected");            
        }
        var ids = [];
        for (var n=0,len=rs.length;n<len;n++) {
            ids.push(rs[n].data.id);
        }
        App.request({
            url: this.controller + '/' + this.actions.update,
            params: {
                payables: Ext.encode(ids)
            },
            success : function(res) {
                for (var n=0,len=rs.length;n<len;n++) {
                    var rec = rs[n];
                    this.store.remove(rec);
                }
                this.view.refresh();
            },
            scope: this
        });  
    },
    
    //doAddPayments
    // remove corresponding rows from grid when transactions complete
    doAddPayments : function(form, action) {                        
            
    }
    
});

/**
 * Apollo.accounting.PayablesReport
 */
Apollo.accounting.PayablesReport = Ext.extend(Apollo.invoice.PayablesGrid, {
    
    controller: 'report',
    actions: {
        filter: 'execute',
        pay: 'pay'
    },
    report : null,
    
    // initComponent
    initComponent : function() {
        // re-set the proxy's url
        this.store.proxy.conn.url = this.controller + '/' + this.actions.filter + '/' + this.report.data.id
        
        // super
        Apollo.accounting.PayablesReport.superclass.initComponent.call(this);       
                
    },
    
     /***
     * execute
     * @param {Object} data
     */
    execute : function(param) {                                        
        try {            
            this.store.load({
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



/**
 * Apollo.system.Log
 */
Apollo.system.Log = Ext.extend(Ext.Panel, {
    
    controller: null,
    actions : {},
        
    border: true,        
    frame: true,
    layout: 'fit',
	title: 'Log',
    iconCls: 'icon-comments',
    bodyStyle: 'padding: 0px;',
    autoScroll: true,
                    
    initComponent : function() {
                        
        var logFilter = new Ext.form.ComboBox({                        
            store: new Ext.data.SimpleStore({
                fields: ['id', 'name'],                
                id : 'id'
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
        
        this.tbar = [
            {iconCls: 'icon-add', handler: this.onInsert, scope: this}, '-', 
            'Filter: ', logFilter, '-'
        ];
        
        this.items = this.build();
                                                                
        Apollo.system.Log.superclass.initComponent.call(this);
    },
    
    // protected
    build : function() {
        var Log = Ext.data.Record.create([{
            name: 'id'
        }, {
            name: 'created_at',
            type: 'string'
        }, {
            name: 'created_by',
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
            name: 'type'            
        }]);        
                                 
        var tpl = new Ext.XTemplate(
        '<tpl for=".">', 
            '<div id="system-log-{id}" class="system-log-entry x-grid3-row">',
                '<div class="hd">', 
                    '<h3><img src="javascripts/ext-2.0/resources/images/default/s.gif" class="x-panel-inline-icon {[values.type.icon]}"/>{subject}</h3>', 
                    '<div class="stats"><span class="author">{created_by}</span>, <span class="timestamp">{created_at}</span></div>', 
                '</div>',
                '<div class="bd">{msg}</div>',
                '<div class="ft"></div>',
            '</div>', 
        '</tpl>');
        
        return new Ext.DataView({
            store: new Ext.data.Store({
                reader: new Ext.data.JsonReader({
                    id: 'id',
                    root: 'data'
                }, Log),
                baseParams: {}
            }),
            tpl: tpl,
            
            cls: 'x-grid3 r-dataview',  
            style: 'border: 1px solid #8db2e3;',          
            autoWidth: true,
            autoHeight: true,
            multiSelect: true,                        
            deleted: [],                                              
            overClass:'x-grid3-row-over',
            itemSelector:'div.x-grid3-row',
            selectedClass: 'x-grid3-row-selected',
            emptyText: '<h2>No logs</h2><h3 class="icon-information r-icon-text">No log entries created yet.</h3>',                                                            
            prepareData: function(data){                    
                return data;
            }
        });
    },
    
    /**
     * loadData
     * @param {Array}      
     */
    loadData : function(data) {
        this.getView().store.loadData({
            data: data
        });    
    },
    
    /**
     * getView
     * @return {Ext.DataView}
     */
    getView : function() {
        return this.items.first();
    },
    
    getPopup : function() {
        var popup = Ext.getCmp('system_log_popup') || new RExt.form.Popup({
            id: 'system_log_popup',
            form: new Apollo.system.LogForm({
                id: 'system_log_form',
                controller: this.controller                   
            })    
        });       
        return popup;     
    },
    
    onInsert : function(btn, ev) {                
        var popup = this.getPopup();
        var fpanel = popup.getFormPanel();
        fpanel.setKey(this.key);
        fpanel.showInsert();
        fpanel.on('actioncomplete', function(form, action) {
            if (action.result.success == true) {
                this.doInsert(action.result);
                popup.hide();
            }    
        },this);
        popup.show(btn.el);            
    },
    
    doInsert: function(res){
        if (res.success == true) {
            var view = this.getView();
            view.store.add(new view.store.recordType(res.data.log));
        }
        else {
            throw new Error('system.Log::doInsert called with an unsuccessful response');
        }
    },
    
    /***
     * doAction
     * performs an action from a successful AJAX response
     * @param {Object} RResponse
     */
    doAction : function(res) {
        switch (res.verb) {
            case 'insert':
                this.doInsert(res);
                break;            
        }
    }                
});

/***
 * Apollo.system.LogForm
 * A form for creating custom order-logs
 * @author Chris Scott
 *
 */
Apollo.system.LogForm = Ext.extend(RExt.sys.Form, {
    /** controller /actions **/
    controller: null,
    actions: {
        insert : 'insert_log'
    },
    
    layout: 'form',
    iconCls: 'icon-user-comment',
    width: 400,
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
        Apollo.system.LogForm.superclass.initComponent.call(this);
    }
});
