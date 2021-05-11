
/**
 * @namespace Apollo.invoice
 */
Ext.namespace("Apollo.invoice");

/**
 * Apollo.invoice.View
 */
Apollo.invoice.View = Ext.extend(Ext.Panel, {
    controller: 'accounting',
    
    closable: true,
    frame: false,        		
    layout: 'border',    
    iconCls: 'icon-package',
    border: true,
    
    dashTpl : 'invoice-dashboard-template',
                    
    /***
     * initComponent
     */        
    initComponent : function() {        
        this.invoice = new Apollo.Invoice();
        
        this.title = this.invoice.getOrder().bill_number;
                      
        this.items = this.build();
        
        this.tbar = this.buildToolbar();
                               
        Apollo.invoice.View.superclass.initComponent.call(this);
        
        this.on('activate', this.renderDashboard, this);
        this.on('deactivate', function(){
            App.clearDashboard()
        });
        
    },
    
    // private.  renders dashboard template on page-north
    renderDashboard : function() {            
        try {    
            RExt.util.TemplateMgr.get(this.dashTpl).overwrite(App.getDashboard().body, this.invoice);
        }
        catch(e) {
            App.handleException(this, e);
        }                         
    },
    
    /***
     * buildToolbar
     */
    buildToolbar : function() {
        var docs = Ext.getCmp('document_mgr');
        var invoice = docs.findByName('invoice');
        
        return [
            {text: 'Invoice', iconCls: 'icon-page-go', name: invoice.name, handler: this.onInvoice, scope: this}, '-'            
        ]    
    },                
    
    onReport : function(btn, ev) {
        App.request({
            url: this.controller + '/report',
            success : function(res) {
                console.log('res: ', res);
            }
        });
    },
         
    /***
     * build
     */
    build : function() {
                                              
        return [
            new Ext.TabPanel({
                cls: 'r-tab-panel-view',
                frame: false,
                header: false,
                border: false,
                plain: true,    
                autoScroll: true,                           
                deferredRender: false,
                minTabWidth: 120,
                resizeTabs: true,                
                region: 'center',                
                items: [
                    new Apollo.invoice.ItemGrid({                          
                        id: 'item_grid_' + this.invoice.id, 
                        region: 'center',
                        invoice : this.invoice,                                            
                        listeners : {
                            render : function(g) {                    
                                g.store.loadData(this.invoice.getItems().getRange());
                            },  
                            calculate : function() {
                                this.renderDashboard();
                            },       
                            scope: this
                        }           
                    }),     
                    new Apollo.invoice.Payables({
                        id: "payables_" + this.invoice.id,
                        title: 'Payables',
                        invoice: this.invoice,
                        listeners: {
                            render: function(p) {
                                p.store.loadData(this.invoice.getPayables().getRange());
                            },
                            scope: this
                        }  
                    }),                                                                                       
                    new Apollo.invoice.Transactions({
                        id: 'transactions_' + this.invoice.id,
                        invoice: this.invoice                            
                    }),
                    new Apollo.invoice.Log({
                        id: 'log_' + this.invoice.id,
                        key: this.invoice.id,
                        controller: 'invoice',
                        listeners : {
                            render : function(p) {
                                p.loadData(this.invoice.getLog());
                            },
                            scope: this
                        } 
                    })                    
                ],                
                style: 'padding:5px',
                activeTab: 0       
            }),
            new Apollo.invoice.ClientPanel({
                id: 'client_panel_' + this.invoice.id,   
                title: 'Client',    
                invoice: this.invoice,                        
                frame: false,  
                border: false,
                collapseMode: 'mini',                                                                                           
                style: 'border-top:0, border-right:0',
                region: 'east',
                split: true,
                width: 250                                    
            })           
        ];         
                              
        return items;
    },
            
    onInvoice : function(btn, ev) {
        var docs = Ext.getCmp('document_mgr');
        docs.preview(btn, this.invoice.id, [], function(res) {
            this.invoice.setStatus(res.data.status);    
        },this);
                    
    }
});


/***
 * Apollo.order.ItemGrid
 * GroupGrid for handling Invoice LineItems
 *  
 */
Apollo.invoice.ItemGrid = function(param){

    var fm = Ext.form
                
    
    var summary = new Ext.grid.GroupSummary();
    
    // the column model has information about grid columns
    // dataIndex maps the column to the specific data field in
    // the data store (created below)
    var cm = new Ext.grid.ColumnModel([{
        id: 'type',
        dataIndex: 'type'        
    }, {
        id: 'name',
        header: "Name",
        dataIndex: 'name',
        width: 200,
        summaryRenderer: function(v, params, data){            
            return 'Total';//((v === 0 || v > 1) ? '(' + v +' Tasks)' : '(1 Task)');
        }               
    }, {
        id: 'adjustment',
        header: 'Adjustments',
        dataIndex: 'adjustment',
        summaryType: 'sum',
        summaryRenderer: Ext.util.Format.usMoney,
        width: 60,
        renderer: Ext.util.Format.usMoney    
    }, {
        id: 'cost',
        header: "Cost",
        dataIndex: 'cost',
        summaryType: 'sum',
        summaryRenderer: Ext.util.Format.usMoney,
        width: 60,
        renderer: Ext.util.Format.usMoney    
    }]);
    
    // by default columns are sortable
    cm.defaultSortable = true;
    
    // type so we can add records dynamically
    var Item = Ext.data.Record.create([{
        name: 'id',
        mapping: 'id'        
    }, {
        name: 'class_name',
        type: 'string',
        mapping: 'class_name'
    }, {
        name: 'type',        
        type: 'string',
        mapping: 'type'
    }, {
        name: 'name',
        type: 'string',
        mapping: 'name'   
    }, {
        name: 'adjustment',
        type: 'float',
        mapping: 'adjustment'
    }, {
        name: 'adjustments',
        mapping: 'adjustments'       
    }, {
        name: 'cost', 
        mapping: 'cost',       
        type: 'float'
    }]);
    
    // create the Data Store
    // entity_cost_id, entity_id, order_id, amount, company, when, type
    var ds = new Ext.data.GroupingStore({
        proxy: new Ext.data.MemoryProxy([]),
        reader: new Ext.data.ArrayReader({
            id: 'id'
        }, Item),
        groupField: 'type',
        sortInfo: {
            field: 'cost',
            direction: "ASC"
        },
        listeners : {
            load : function(store, rs) {                                
                var cdata = this.view.getColumnData();
                var total_costs = summary.calculate(store.query('type', 'OrderEntityCost').getRange(), cdata);
                var total_revenu = summary.calculate(store.query('type', 'OrderRevenu').getRange(), cdata);
                                                                                                                         
                store.add(new Item({
                    id: 'total_costs',
                    type: "Grand Total",
                    name: 'Total costs',
                    cost: total_costs.cost,
                    adjustment: total_costs.adjustment
                }));
                store.add(new Item({
                    id: 'total_revenu',
                    type: "Grand Total",
                    name: 'Total revenue',
                    cost: total_revenu.cost,
                    adjustment: total_revenu.adjustment
                }));
            },
            scope: this
        }
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
    Apollo.invoice.ItemGrid.superclass.constructor.call(this, param);
                
};
Ext.extend(Apollo.invoice.ItemGrid, Ext.grid.GridPanel, {
    
    controller: 'invoice',
    actions: {
        insert: null,
        update: 'update_item',
        'delete' : 'delete_item',
    },
    
    title: "Line-items",                            
    iconCls: 'icon-money',
    region: 'center', 
    border: true,    
    
       
    /*bodyStyle: 'border:1px solid #8db2e3;border-top:0',*/
    enableColLock: false,
    autoExpandColumn: 'name',
            
    initComponent : function() {        
        this.addEvents({
            /**
             * @event calculate
             * fires when the grid is recalculated
             */
            'calculate' : true            
        })
        
        this.on('rowdblclick', this.onEdit, this);
                        
        // super
        Apollo.invoice.ItemGrid.superclass.initComponent.call(this);    
    },
        
    /**
     * onEdit     
     * @param {Grid} this, 
     * @param {Number} rowIndex, 
     * @param {Ext.EventObject} e 
     */ 
     onEdit : function(grid, index, ev) {                 
         var rec = this.store.getAt(index); 
         if (rec.data.type == "Grand Total") { return false; }
                    
         var adjMgr = Ext.getCmp('adjustments');         
         adjMgr.adjust(rec);
         
         var grid = adjMgr.getGrid();
         adjMgr.on('adjust', function(param) {                          
             rec.beginEdit();
             rec.set('cost', parseFloat(param.res.data.item.cost));
             rec.set('adjustments', param.res.data.item.adjustments);
             rec.set('adjustment', parseFloat(param.res.data.item.adjustment));             
             rec.endEdit();
             rec.commit(); 
             this.calculate();                         
         },this);                                                       
     },                  
        
    /***
     * getTotalCost
     */
    getTotalCost : function() {
        var total = 0;
        this.store.each(function(rec) { total += rec.data.cost; });
        return total;    
    },
    
    /***
     * getTotal
     * @alias getTotalCost
     */
    getTotal : function() {
        return this.getTotalCost();
    },
    
    /**
     * calculate
     * recalculates the grid summary
     */
    calculate : function() {
        var summary = this.plugins;
        var cdata = this.view.getColumnData();
        var total_costs = summary.calculate(this.store.query('type', 'OrderEntityCost').getRange(), cdata);
        var total_revenu = summary.calculate(this.store.query('type', 'OrderRevenu').getRange(), cdata);
                        
        var costs = this.store.getAt(this.store.find('id', 'total_costs'));
        costs.beginEdit();
        costs.set('cost', total_costs.cost);
        costs.endEdit();
                
        var revenu = this.store.getAt(this.store.find('id', 'total_revenu'));
        revenu.beginEdit();
        revenu.set('cost', total_revenu.cost);
        revenu.endEdit();
        
        this.store.commitChanges();  
        
        this.invoice.setTotal(total_costs.cost + total_revenu.cost);                                                                                                
        this.fireEvent('calculate');           
    },
    
    /**
     * doAction
     * implement doAction to recieve requests as a result of something happening on PayableGrid
     * @param {Object} res
     */
    doAction : function(res) {           
        var index = this.store.find('id', res.data.item.id);        
        var rec = this.store.getAt(index);                             
        switch (res.verb) {
            case 'insert':
                rec.beginEdit();                
                rec.set('cost', parseFloat(res.data.item.cost));
                rec.set('adjustments', res.data.item.adjustments);
                rec.set('adjustment', parseFloat(res.data.item.adjustment));
                rec.endEdit();
                rec.commit();
                break;
            case 'delete':
                rec.beginEdit();                
                rec.set('cost', parseFloat(res.data.item.cost));
                rec.set('adjustments', res.data.item.adjustments);
                rec.set('adjustment', parseFloat(res.data.item.adjustment));
                rec.endEdit();
                rec.commit();
                break;
        }        
        this.calculate();                                     
         
    }
    
});


/**
 * Apollo.invoice.ClientPanel
 * displays the details of bill-to company for this invoice.
 */
Apollo.invoice.ClientPanel = Ext.extend(Ext.Panel, {
    invoice : null,
    title : 'Client',
    tplId : 'invoice-client-template',
    cls: 'r-panel',
            
    initComponent : function() {
        this.on('render', this.renderTemplate, this);
                
        Apollo.invoice.ClientPanel.superclass.initComponent.call(this);        
    },
    
    renderTemplate : function() {
        console.log('getClient(): ', this.invoice.getClient());
        var tpl = RExt.util.TemplateMgr.get(this.tplId);
        tpl.overwrite(this.body, this.invoice);
            
    }
});

/**
 * Apollo.invoice.Log
 * 
 */
Apollo.invoice.Log = Ext.extend(Apollo.system.Log, {
    
    
});

/**
 * Apollo.invoice.Transactions
 * 
 */
Apollo.invoice.Transactions = Ext.extend(Ext.Panel, {
    controller: 'invoice',
    actions: {
        update : 'update_transaction',
        'delete' : 'delete_transaction'
    },
    title: 'Transactions',
    iconCls: 'icon-book-open',
    frame: true,
    border: true,
    layout: 'fit',
    autoScroll: true,
    tplId : 'invoice-transaction-template',
    
    initComponent : function() {
        this.items = this.build();
                        
        // build toolbar
        this.tbar = [
            {tooltip: 'Add transaction', iconCls: 'icon-add', handler: this.onInsert, scope: this}, '-',
            {tooltip: 'Edit account', iconCls: 'icon-pencil', handler: this.onEdit, scope: this}, '-',
            {tooltip: 'Delete account', iconCls: 'icon-delete', handler: this.onDelete, scope: this}, '-'
        ];                    
        Apollo.invoice.Transactions.superclass.initComponent.call(this);                        
    },
    
    build : function() {        
        // create view's record def.
        var Transaction = Ext.data.Record.create([
            {name: 'id'},
            {name: 'type'},
            {name: 'method'},            
            {name: 'method_number'},
            {name: 'method_date'},  
            {name: 'created_by'},          
            {name: 'created_at'},
            {name: 'updated_by'},
            {name: 'updated_at'},
            {name: 'amount', type: 'float'},
            {name: 'comment'}          
        ]);
                
        // build shipper ComboBox
        var store = new Ext.data.Store({
            reader: new Ext.data.JsonReader({
                root: 'data'
            }, Transaction),
            baseParams: {}
        });
                        
        // create view
        var view = new Ext.DataView({
            id: 'transaction_view_' + this.id,
            store: store,
            tpl: RExt.util.TemplateMgr.get(this.tplId),
            cls: 'x-grid3 r-dataview',  
            style: 'border: 1px solid #8db2e3;',          
            autoWidth: true,
            autoHeight: true,
            multiSelect: true, 
            autoScroll: true,            
            deleted: [],                                              
            overClass:'x-grid3-row-over',
            itemSelector:'div.x-grid3-row',
            selectedClass: 'x-grid3-row-selected',
            emptyText: '<h2>No transactions</h2><h3 class="icon-information r-icon-text">This invoice has no tranactions created</h3>'            
        });    
        view.store.loadData({
            data: this.invoice.getTransactions()            
        });                                                            
        return view;    
    },
    
    onInsert : function(btn, ev) {               
        var popup = Ext.getCmp('transaction_popup');
        var fpanel = popup.getFormPanel();
        fpanel.setKey(this.invoice.id);
        fpanel.showInsert();
        fpanel.on('actioncomplete', function(form, action) {
            if (typeof(action.result) == 'object') {
                var res = action.result;
                if (res.success == true) {
                    var view = this.getView();
                    var record = new view.store.recordType(res.data.transaction);
                    view.store.add(record);  
                    popup.hide();                                      
                }
            }    
        },this);
        
        fpanel.setTitle('New invoice transaction');
        popup.show(btn.el);
        
    },
    
    // onEdit
    onEdit : function(btn, ev) {
        App.setAlert(App.STATUS_NOTICE, 'Editing transactions is not yet implemented');
    },
    
    // onDelete
    onDelete : function(btn, ev) {
        var view = this.items.first();       
        var rs = view.getSelectedRecords();
        if (rs.length == 0) {
            return this.onUnselected();    
        }                           
              
        var rec = rs[0];
        if (rec.data.id != null) {
            // if record has an id, it must exist in db.  confirm with user that they wish to delete form db.
            Ext.MessageBox.confirm('Confirm', 'Delete transaction?', function(btn) {
                if (btn == 'yes') {                        
                    App.request({
                        url: this.controller + '/' + this.actions['delete'] + '/' + rec.data.id,
                        method: 'POST',
                        success: function(res) {
                            if (res.success == true) {
                                view.store.remove(rec);
                            }    
                        },
                        scope: this
                    });            
                }
            },this);                                
        }        
    },
    
    /**
     * getView
     * returns a reference to the Ext.DataView
     * @return {Ext.DataView}      
     */
    getView : function() { return this.items.first(); },
    
    getTotal : function() {
        var total = 0.0;
        this.items.first().store.each(function(r) { total += r.data.value; });
        return Ext.util.Format.usMoney(total);
    },
    
    onUnselected : function() {
        App.setAlert(App.STATUS_NOTICE, 'Select a record');
    }
});

/**
 * Apollo.invoice.TransactionForm
 * 
 */
Apollo.invoice.TransactionForm = Ext.extend(RExt.sys.Form, {
    controller: 'invoice',
    actions: {
        insert : 'insert_transaction',
        update : 'update_transaction'   
    },
    invoices: [],
    
    frame: true,
    labelWidth: 60,
     
    initComponent : function() {
        this.items = this.build();
        this.on('hide', function() { 
            App.hideStatus(); 
            
            // clear invoices.
            this.invoices = [];
        });        
        Apollo.invoice.TransactionForm.superclass.initComponent.call(this);
    },
    
    /***
     * addInvoices
     * This form can handle applying a transaction to multiple invoices simultaneously.  this is the method to 
     * add all the associated invoices for this transaction.
     * @param {Array} Ext.data.Record
     */
    addInvoices : function(rs) {        
        this.invoices = rs;
        var list = [];
        for (var n=0,len=rs.length;n<len;n++) {
            list.push(rs[n].data.bill_number);
        }
        App.setStatus(App.STATUS_NOTICE, "This transaction will apply to the following " + rs.length + " invoices:", list.join(', '));
          
    },
    
    // if this is transaction will apply multiple invoices, send the invoice pks in POST params.
    getParams : function() {
        if (this.invoices.length == 0) {
            return false;
        }
        else {
            var pks = [];
            for (var n=0,len=this.invoices.length;n<len;n++) {
                pks.push(this.invoices[n].data.id);                    
            }
            return {invoices: Ext.encode(pks)};
        }
    },
    
    build : function() {
        
        var fs_cheque = new Ext.form.FieldSet({            
            layout: 'column',
            style: 'padding:0;margin-bottom:0', 
            border: false,
            autoHeight: true,              
            labelWidth: 60,                                           
            items: [{
                columnWidth: 0.5,                
                layout: 'form',  
                labelAlign: 'right',                      
                items: [
                    new Ext.form.NumberField({
                        name: 'transaction[method_number]',
                        fieldLabel: 'Number',
                        width: 100
                    })    
                ]   
            }, {
                columnWidth: 0.5, 
                labelWidth: 50,                                               
                labelAlign: 'right',
                layout: 'form',
                items: [                            
                    new Ext.form.DateField({
                        name: 'transaction[method_date]',
                        fieldLabel: 'Date'
                    })
                ] 
            }],
            listeners: {
                render: function(fs) {
                    fs.disable(true);
                    fs.hide();
                },
                show: function(fs) {
                    fs.doLayout();
                }
            }             
        });
        
        return [            
            new Ext.form.FieldSet({
                title: 'Transaction',
                labelAlign: 'right',
                autoHeight: true,
                items: [                                 
                    new Ext.form.ComboBox({	                
                        emptyText: 'Select...',
    					tabIndex: 1,
    					width: 100,
    					listWidth: 100,                    
    	                hiddenName: 'transaction[transaction_type_id]',                    
    	                fieldLabel: 'Type',
    	                allowBlank: false,
    					triggerAction: 'all',
    	                displayField: 'name',
    	                valueField: 'id',
    	                mode: 'local',
    	                store: new Ext.data.SimpleStore({
    	                    fields: ['id', 'name'],
    	                    data: Apollo.invoice.Util.getTransactionTypes()
    	                }),
                        value: 'payment',
                        listeners : {
                            // set the default value on render.
                            render : function(combo) {                                                                                    
                                var record = combo.store.getAt(combo.store.find('name', combo.getValue()));
                                combo.setValue(record.data.id);                                                                                      
                            }
                        }
    	            }),
                    
                    new Ext.form.ComboBox({	                
                        emptyText: 'Select...',
    					tabIndex: 1,
    					width: 100,
    					listWidth: 100,                    
    	                hiddenName: 'transaction[transaction_method_id]',                    
    	                fieldLabel: 'Method',
    	                allowBlank: false,
    					triggerAction: 'all',
    	                displayField: 'name',
    	                valueField: 'id',
                        value: 'creditcard',
    	                mode: 'local',
    	                store: new Ext.data.SimpleStore({
    	                    fields: ['id', 'name'],
    	                    data: Apollo.invoice.Util.getTransactionMethods()
    	                }),
                        listeners : {                        
                            // set the default value on render.
                            render : function(combo) {                                                                                    
                                var record = combo.store.getAt(combo.store.find('name', combo.getValue()));
                                combo.setValue(record.data.id);                                                                                      
                            },                   
                            select : function(combo, rec, index) {
                                if (rec.data.name == 'cheque') {
                                    fs_cheque.enable(true);
                                    fs_cheque.show();
                                }
                                else {
                                    fs_cheque.disable(true);
                                    fs_cheque.hide();
                                }
                            }
                        }
    	            }),
                    fs_cheque,                
                    new Ext.form.NumberField({
                        fieldLabel: 'Amount',
                        name: 'transaction[amount]',
                        allowNegative: false,
                        width: 70                   
                    }),                            
                    new Ext.form.TextArea({
                        fieldLabel: 'Comments',
                        name: 'transaction[comment]',
                        anchor: '98%',
                        grow: true,
                        growMin: 50,
                        growMax: 150
                    })
                ]    
            })
        ];    
    } 
});

/***
 * Apollo.order.Payables
 *  
 */
Apollo.invoice.Payables = function(param){

    var fm = Ext.form
    
    var summary = new Ext.grid.GroupSummary();
    
    // the column model has information about grid columns
    // dataIndex maps the column to the specific data field in
    // the data store (created below)
    var cm = new Ext.grid.ColumnModel([{   
        id: 'company',
        header: "Company",
        dataIndex: 'company'             
    }, {
        id: 'name',
        header: "Description",
        dataIndex: 'name',
        width: 200                          
    }, {
        id: 'adjustment',
        header: "Adjustment",
        dataIndex: 'adjustment',
        summaryType: 'sum',
        width: 60,
        renderer: Ext.util.Format.usMoney,
        editor: new Ext.form.NumberField({})
    }, {
        id: 'cost',
        header: "Cost",
        dataIndex: 'cost',
        summaryType: 'sum',        
        width: 60,        
        renderer: Ext.util.Format.usMoney          
    }, {
        id: 'paid',
        header: 'Paid?',
        dataIndex: 'paid',
        width: 50,
        editor: new Ext.form.Checkbox()       
    }]);
    
    // by default columns are sortable
    cm.defaultSortable = true;
    
    // The Record
    var Item = Ext.data.Record.create([{
        name: 'id',
        mapping: 'id'        
    }, {
        name: 'class_name',
        type: 'string',
        mapping: 'class_name'
    }, {
        name: 'name',
        type: 'string',
        mapping: 'name'        
    }, {
        name: 'type',
        type: 'string',
        mapping: 'payable_type'
    },{
        name: 'company',
        type: 'string',
        mapping: 'company'
    }, {
        name: 'cost', 
        mapping: 'cost',       
        type: 'float'
    }, {
        name: 'adjustment',
        mapping: 'adjustment',
        type: 'float'    
    }, {
        name: 'adjustments',
        mapping: 'adjustments'        
    }, {
        name: 'reason',
        mapping: 'reason',
        type: 'string'
    }, {
        name: 'transferable',
        mapping: 'transferable'           
    }, {
        name: 'paid',
        mapping: 'paid'        
    }]);
    
    // create the Data Store
    // entity_cost_id, entity_id, order_id, amount, company, when, type
    var ds = new Ext.data.GroupingStore({
        groupField: 'company',
        proxy: new Ext.data.MemoryProxy([]),
        reader: new Ext.data.ArrayReader({
            id: 'id'
        }, Item),        
        sortInfo: {
            field: 'cost',
            direction: "ASC"
        }        
    });
            
    param.cm = cm;
    param.ds = ds;
    
    // GroupingView
    param.view = new Ext.grid.GroupingView({
        forceFit: true,
        showGroupName: false,
        enableNoGroups: false, // REQUIRED!
        hideGroupedColumn: true
    });
    
    param.plugins = summary;    
    
    // *super*
    Apollo.invoice.Payables.superclass.constructor.call(this, param);
                
};
Ext.extend(Apollo.invoice.Payables, Ext.grid.EditorGridPanel, {
    
    controller: 'invoice',
    actions: {
        insert: null,
        update: 'update_payable'      
    },
    
    title: "Line-items",                            
    iconCls: 'icon-money-delete',
    region: 'center', 
    border: true,                   
    enableColLock: false,
    autoExpandColumn: 'company',
    
    // initComponent        
    initComponent : function() {   
        
        // before edit handler.  some cells cannot be edited  
        this.on('beforeedit', this.onBeforeEdit, this);
        
        // define a validation handler for cell-edits.  complex validation for this grid.     
        this.on('validateedit', this.onEdit, this);
                                                       
        // super
        Apollo.invoice.Payables.superclass.initComponent.call(this);    
    },
    
    /**
     * onBeforeEdit
     * Don't allow edits on CompanySalesAccount since their costs are determined automatically 
     * based upon the revenu of an invoice.
     * @param {Object}
     *     grid - This grid
     *     record - The record being edited
     *     field - The field name being edited
     *     value - The value for the field being edited.
     *     row - The grid row index
     *     column - The grid column index
     *     cancel - Set this to true to cancel the edit or return false from your handler.
     */          
     onBeforeEdit : function(param) {
         if (param.record.data.type == 'CompanySalesAccount' && param.field == 'adjustment') {
             App.setAlert(App.STATUS_NOTICE, param.record.data.type + ' ' + param.field + ' cannot be adjusted.  This value is auto-calculated');
             return false;
         }   
         else if (param.field == 'adjustment') {
             this.onEdit(param);
             return false;
         } 
     },
        
    /**
     * onEdit
     * @param {Object} param
     *     grid - This grid
     *     record - The record being edited
     *     field - The field name being edited
     *     value - The value being set
     *     originalValue - The original value for the field, before the edit.
     *     row - The grid row index
     *     column - The grid column index
     *     cancel - Set this to true to cancel the edit or return false from your handler.
     */ 
     onEdit : function(param) {
         var rec = param.record;                 
         if (param.field == 'adjustment') {                                                                   
             var adjMgr = Ext.getCmp('adjustments');         
             adjMgr.adjust(rec);  
             adjMgr.on('adjust', function(param) {
                 rec.beginEdit();
                 rec.set('cost', parseFloat(param.res.data.item.cost));
                 rec.set('adjustments', param.res.data.item.adjustments);
                 rec.set('adjustment', parseFloat(param.res.data.item.adjustment));             
                 rec.endEdit();
                 rec.commit();                                              
             },this);                                                                                                                                     
         }
         else {
             // regular Ajax request to change other fields (ie: paid?)
             App.request({
                 url: this.controller + '/' + this.actions.update + '/' + rec.data.id,
                 params: {
                     field: param.field,
                     value: param.value    
                 },
                 success : function(res) {
                     console.info('success: ', rec); 
                     rec.commit();   
                 },
                 failure : function(res) {
                     rec.reject();
                 }
             })    
         }                      
     },
     
     /**
      * doAction
      * @param {Object} res
      */
     doAction : function(res) {         
         var rec = this.store.getAt(this.store.find('id', res.data.item.id));                                    
         rec.beginEdit();
         rec.set('cost', parseFloat(res.data.item.cost));
         rec.set('adjustments', res.data.item.adjustments);
         rec.set('adjustment', parseFloat(res.data.item.adjustment));             
         rec.endEdit();
         rec.commit();  
     }          
});

/**
 * Apollo.invoice.Adjustments
 * Adjustments popup.
 */
Apollo.invoice.Adjustments = Ext.extend(Ext.Window, {
    controller: 'invoice',
    actions: {
        insert: null,
        update: 'update_adjustment',
        "delete" : "delete_adjustment"   
    },    
    layout : 'fit',
    height: 300,
    width: 300,
    frame: true,
    title: 'Adjustments',
    iconCls: 'icon-money',
    closeAction: 'hide',
    shadow: false,
    modal: true,
    buttonAlign: 'center',
                 
    initComponent : function() {
        
        this.addEvents({
            /**
             * @event adjust
             * fires when a new adjustment is added.  gives a chance for underlying Grid to update
             */
            adjust : true,            
            unadjust : true
        });
        
        this.items = [            
            new Apollo.invoice.AdjustmentGrid({
                region: 'center',
                listeners: {
                    "delete" : function(param) {
                        this.fireEvent('adjust', param.res);
                    },
                    scope: this
                }
            })
        ];
        
        this.tbar = [
            {text: 'Add', iconCls: 'icon-add', handler: this.onAdd, scope: this}, '-',
            {text: 'Delete', iconCls: 'icon-delete', handler: this.onDelete, scope: this}, '-' 
        ];
        
        this.buttons = [
            {text: 'Close', iconCls: 'icon-cancel', handler: function(btn, ev) { this.hide();}, scope: this}
        ]
        Apollo.invoice.Adjustments.superclass.initComponent.call(this);
    },
           
    /**
     * adjust
     * loads the AdjustmentManager with a Payable or LineItme for adjusting
     * @param {Object} record
     */
    adjust : function(record) {
        this.record = record;  
        this.setTitle('Adjust "' + record.data.name + '"');                                              
        var grid = this.getGrid();
        grid.init(record);
        this.show();                                                  
    },
    
    /**
     * onAdd
     * [add] button-handler
     * @param {Object} btn
     * @param {Object} ev
     */
    onAdd : function(btn, ev) {                        
        var popup = Ext.getCmp('adjustment_popup');
        var fpanel = popup.form;
        fpanel.showInsert();
        fpanel.setKey(this.record.data.id);
        fpanel.init(this.record);
        fpanel.on('actioncomplete', function(form, action) {
            var grid = this.getGrid();
            var rec = new grid.store.recordType(action.result.data.adjustment);
            grid.store.add(rec);
            this.fireEvent('adjust', {
                res: action.result,
                record: this.record
            });  
            popup.hide();  
        },this);                     
        popup.show(btn.el);    
    },
    
    /**
     * onDelete
     * [Delete] button-handler
     * @param {Object} btn
     * @param {Object} ev
     */
    onDelete : function(btn, ev) {
        var grid = this.getGrid();
        var selected = grid.getSelectionModel().getSelected();         
        App.request({
            url: this.controller + '/' + this.actions['delete'] + '/' + selected.data.id,
            params: {
                class_name : this.record.data.class_name,
                item_id : this.record.data.id
            },
            success : function(res) {                
                grid.store.remove(selected);                
                this.fireEvent('adjust', {
                    res: res,
                    record: selected
                });                                
            },
            failure : function(res) {
                console.log('failure: ', res);
            },
            scope: this
        })         
    },
    
    // private.  override on to clear listeners on 'adjust' method.
    on : function(event, handler, scope) {                    
        if (event == 'adjust' && this.hasListener('adjust')) {
            this.events['adjust'].clearListeners();    
        }
        Apollo.invoice.Adjustments.superclass.on.apply(this, arguments);         
    },
    
    getForm : function() { return Ext.getCmp('adjustment_popup'); },
    getGrid : function() { return this.items.last(); }
    
});

/**
 * Apollo.invoice.AdjustmentGrid
 */
Apollo.invoice.AdjustmentGrid = function(param){

    var fm = Ext.form
           
    // the column model has information about grid columns
    // dataIndex maps the column to the specific data field in
    // the data store (created below)
    var cm = new Ext.grid.ColumnModel([{                   
        id: 'amount',
        header: "Amount",
        dataIndex: 'amount',                
        width: 60,        
        renderer: Ext.util.Format.usMoney          
    }, {
        id: 'invoiceable',
        header: 'Invoiceable',
        dataIndex: 'invoiceable'         
    }, {
        id: 'commissionable',
        header: 'Commissionable',
        dataIndex: 'commissionable'
    }]);
    
    // by default columns are sortable
    cm.defaultSortable = true;
    
    // The Record
    var Item = Ext.data.Record.create([{
        name: 'id',
        mapping: 'id'        
    }, {
        name: 'amount', 
        mapping: 'amount',       
        type: 'float'
    }, {
        name: 'invoiceable',
        mapping: 'invoiceable',
        type: 'boolean'
    }, {
        name: 'commissionable',
        mapping: 'commissionable',
        type: 'boolean'
    }]);
    
    // create the Data Store
    // entity_cost_id, entity_id, order_id, amount, company, when, type
    var ds = new Ext.data.Store({
        proxy: new Ext.data.MemoryProxy([]),
        reader: new Ext.data.ArrayReader({
            id: 'id'
        }, Item),        
        sortInfo: {
            field: 'amount',
            direction: "ASC"
        }        
    });
            
    param.cm = cm;
    param.ds = ds;
              
    // *super*
    Apollo.invoice.AdjustmentGrid.superclass.constructor.call(this, param);
                
};
Ext.extend(Apollo.invoice.AdjustmentGrid, Ext.grid.GridPanel, {
        
    header: false,               
       
    /*bodyStyle: 'border:1px solid #8db2e3;border-top:0',*/
    enableColLock: false,
    autoExpandColumn: 'amount',
    
    // private        
    initComponent : function() {  
    
        this.addEvents({
            /**
             * @event delete
             * fires when a row is successfully deleted
             * @param {Object} res the RResponse from server
             * @param {Ext.data.Record} record           
             */
            "delete" : true
        });
        
        
                                                      
        // super
        Apollo.invoice.AdjustmentGrid.superclass.initComponent.call(this);    
    },
    
    init : function(record) {
        if (record.data.class_name == 'InvoiceItem') {
            this.getColumnModel().setHidden(1, true);            
        }
        else {
            this.getColumnModel().setHidden(1, false);
        }
        this.store.removeAll();        
        this.store.loadData(record.data.adjustments);
        this.record = record;      
    }        
});


/**
 * Apollo.invoice.AdjustmentForm
 * A confirmation form to fill-out when adjusting a payable's cost
 */
Apollo.invoice.AdjustmentForm = Ext.extend(RExt.sys.Form, {
    id: 'adjustment_form',
    header: false,
    frame: true,
    controller: 'invoice',    
    actions: {
        insert : 'add_adjustment'
    },
    title: 'Adjustment options',        
    useDialog: false,    
    labelWidth: 120, 
    labelAlign: 'top',
    bodyStyle: 'padding: 10px',    
    
    /**
     * initComponent
     */ 
    initComponent : function() {
        this.on('render', function() {
            this.form.on('actioncomplete', function(form, action) {
                form.reset();
            });    
        });                     
        this.items = [            
            new Ext.form.NumberField({
                fieldLabel: 'Amount',
                name: 'adjustment[amount]',
                allowBlank: false,
                readOnly: false                
            }),
            new Ext.form.TextField({
                fieldLabel: 'Reason for adjustment',
                anchor: '100%',
                name: 'adjustment[reason]',
                allowBlank: false              
            }),
            new Ext.form.FieldSet({
                id: 'fs_apply_invoice',
                checkboxToggle: true,
                collapsed: true,
                title: 'Apply to client invoice?',
                autoHeight: true,
                checkboxName: 'adjustment[invoiceable]',
                items: [
                    new Ext.form.Checkbox({
                        hideLabel: true,                        
                        name: 'adjustment[apply_markup]',
                        boxLabel: 'Apply markup?'
                    })
                ]
            }),            
            new Ext.form.Checkbox({
                hideLabel: true,
                name: 'adjustment[commissionable]',
                boxLabel: 'Apply adjustment to sales-agent commisions?'
            })
        ];
        Apollo.invoice.AdjustmentForm.superclass.initComponent.call(this);
    },
    
    getParams : function() {
        return {
            class_name : this.record.data.class_name
        }    
    },
    
    /**
     * init
     * @param {Ext.data.Record
     * 
     */
    init : function(rec) {  
        this.record = rec;      
        this.setKey(rec.data.id);
        this.form.reset();
        var fs = this.getComponent('fs_apply_invoice');
        fs.collapse();   
        if (rec.data.class_name == 'InvoiceItem') {
            fs.hide();
        }  
        else {
            fs.show();
        }        
    }
});

