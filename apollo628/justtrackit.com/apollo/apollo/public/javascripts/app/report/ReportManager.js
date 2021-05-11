Ext.namespace('Apollo.report');
  
/**
 * Apollo.report.Manager
 * @author Chris Scott
 */
Apollo.report.Manager = Ext.extend(Ext.Panel, {
    controller: 'report',
    region: 'west',
    width: 250,
    collapsible: true,
    split: true,
        
    initComponent : function() {
        this.items = this.buildView();
        Apollo.report.Manager.superclass.initComponent.call(this);
    },
             
    /***
     * getView
     * @return {Ext.DataView}
     */
    getView : function() {
        return this.getComponent(this.id + '_report_view');
    },
    
    buildView : function() {
        
        // create view's record def.
        var Report = Ext.data.Record.create([
            {name: 'id'},
            {name: 'name'},
            {name: 'label'}         
        ]);
        
        // build shipper ComboBox
        var store = new Ext.data.Store({
            proxy: new Ext.data.HttpProxy({
                url: this.controller + '/list',                                  
            }),
            reader: new Ext.data.JsonReader({
                root: 'data',
                totalProperty: 'total',
                id: 'id'
            }, Report),
            baseParams: {limit: 20}                                   
        });
        store.load();
        
        // create view template
        var tpl = new Ext.XTemplate(
    		'<tpl for=".">',
                '<div id="report-{id}" class="x-grid3-row">',    		                      
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
            itemSelector:'div.x-grid3-row',
            selectedClass: 'x-grid3-row-selected',
            emptyText: '<h2>No reports</h3>',
            listeners: {
                dblclick : this.onSelect,
                scope: this
            }
        });
        return view;
    },
            
    /***
     * onSelect
     * an order node on tree was clicked.
     * @param {Object} id
     * @param {Boolean} isQuote
     */
    onSelect: function(sender, index, node, ev){
        
        var rec = sender.getRecord(node);
        
        var elementId = 'report-view-' + rec.data.id;
        
        var center = Ext.getCmp('page-center');
        var p = center.getComponent(elementId);
        
        // panel already open?  activate and  return
        if (p) {
            return center.activate(p);
        }        
        App.showSpinner('Loading');
                        
        var el = Ext.getBody().createChild({
            tag: 'div',
            id: elementId
        });
        document.body.appendChild(el.dom);
        
        um = el.getUpdateManager();
        App.update(um, {
            url: '/report/view/' + rec.data.id,
            method: 'POST',
            scripts: true,
            timeout: 20,
            text: 'Loading...',
            nocache: false,
            callback: function(conn, success, response, options){
                if (!App.validateResponseType('html', response)) {
                    delete el; // <-- remove the el or have memory-leak
                    Ext.get(elementId).remove();
                    el.remove();
                    return false;
                }  
                var cfg = {
                    id: elementId,
                    cls: 'order-view'                             
                };                   
                var view = new Apollo.report.View(cfg);                                                                                       
                /***
                 * @event destroy
                 * destroy the load-tab element.  was a memory leak.  NB:  ref to el must first be deleted.
                 *
                 */
                view.on('destroy', function(){
                    delete el;
                    Ext.get(elementId).remove();
                });
                center.add(view).show();
                App.getPage().doLayout();                
                App.hideSpinner();
            },
            scope: this
        });
                                                                                                
    }       
});

/**
 * Apollo.report.View
 * A class to handles a report-view action
 * @author Chris Scott  
 */
Apollo.report.View = Ext.extend(Ext.Panel, {
    layout: 'border',
    margins: '5 5 5 5',   
    simple: true,
     
    closable: true,
    title: 'Report',
    iconCls: 'icon-application-view_columns',
    
    initComponent : function() {
        this.report = new Apollo.Report();
        this.title = this.report.getLabel();
        
        this.items = this.build();
        Apollo.report.View.superclass.initComponent.call(this);
    },
    
    build : function() {
        return [
            new Apollo.report.Grid({
                region: 'center',
                report: this.report               
            }), 
            new Apollo.report.Properties({
                region: 'east',                
                width: 200,
                split: true,
                report: this.report         
            })
        ];
    }
});

Apollo.report.Printer = Ext.extend(Ext.Window, {
    frame: true,
    title: 'Docuement Printer',
    maximized : true,
    maximizable: true,
    height: 600,
    width: 800,
    closeAction: 'hide',
    
    initComponent : function() {
        this.on('render', function() {
            this.build();  
            
            /***
             * @event resize
             * @param {Object} wnd
             * @param {Object} w
             * @param {Object} h
             */
            this.on('resize', function(wnd, w, h) {
                this.iframe.height = this.body.getHeight() - 5;        
            },this);  
                                                      
        },this);        
                          
        
        Apollo.report.Printer.superclass.initComponent.call(this);
    },
    
    show : function(url) {
        
        Apollo.report.Printer.superclass.show.call(this);
        this.iframe.src = url;
            
    },
    
    build : function() {       
        // build iframe
        var iframe = document.createElement('iframe');
        iframe.scrolling = 'auto';
        iframe.width = '100%';            
        iframe.name = Ext.id();
        iframe.frameBorder = 'no';                
        this.iframe = iframe;
        
        this.body.dom.appendChild(iframe);
        this.iframe.height = this.body.getHeight() - 5;      
            
        
             
    }  
});

/**
 * Apollo.report.Grid
 * This is the actual report's grid
 * @author Chris Scott
 * 
 */

Apollo.report.Grid = function(param) {
        
    param.cm = new Ext.grid.ColumnModel(param.report.getColumns());
    param.store = new Ext.data.Store({
        reader: new Ext.data.ArrayReader(
            {id: 'id'}, Ext.data.Record.create(param.report.record)    
        )
    });    
    
    Apollo.report.Grid.superclass.constructor.call(this, param);
};
Ext.extend(Apollo.report.Grid, Ext.grid.GridPanel, {
    controller: "report",
    actions: {
        execute: 'execute2',
        print: 'print'
    },
    layout: 'fit',
    title: "Grid",
    frame: false,
    bodyStyle: 'background-color: #fff;padding:5px;border:1px solid #8db2e3;border-top:0',
    margins: '0 5 0 0',    
    
    // protected
    initComponent : function() {
        this.tbar = this.buildToolbar();
        console.log('rec: ', new this.store.recordType({id: 1, payable_type: 'foo', payable_id: 'pid'}));
        
        Apollo.report.Grid.superclass.initComponent.call(this);
    },
    
    // private
    buildToolbar : function() {
        return [
            {text: 'Run', iconCls: 'icon-application-lightning', handler: this.onExecute, scope: this}, '-',
            {text: 'Edit', iconCls: 'icon-pencil', handler: this.onEdit, scope: this}, '-', 
            {text: 'Print', iconCls: 'icon-printer', handler: this.onPrint, scope: this}, '-'            
        ];
    },
    
    // private
    onEdit : function(btn, ev) {            
        var popup = Ext.getCmp('criteria_popup');
        var fpanel = popup.getFormPanel();
        fpanel.setKey(this.report.id);        
        fpanel.showUpdate();         
        fpanel.on('actioncomplete', function(form, action) {
            if (action.result.success === true) {                
                this.report.setCriteria(action.result.data.criteria);
                this.report.setColumns(action.result.data.columns);
                popup.hide();                
                this.reconfigure(
                    new Ext.data.Store({
                        reader: new Ext.data.ArrayReader(
                            {id: 'id'}, Ext.data.Record.create(this.report.record)    
                        )
                    }),
                    new Ext.grid.ColumnModel(this.report.getColumns())
                );
                
                
            }    
        },this);     
        popup.show(btn.el);  
        fpanel.load(this.report);      
    },
    
    // private
    onExecute : function(btn, ev) {
        App.request({
            url: this.controller + '/' + this.actions.execute + '/' + this.report.id,
            success : function(res) {
                this.store.loadData(res.data);    
            },
            scope: this
        }) 
    },
    
    onPrint : function(btn, ev) {
        var wnd = Ext.getCmp('report_printer');
        wnd.show(this.controller +'/' + this.actions.print + '/' + this.report.id);     
    }
});

/**
 * Apollo.report.Properties
 * Manages simple user-specified report props, like start / end date.
 * @author Chris Scott
 */
Apollo.report.Properties = Ext.extend(Ext.FormPanel, {
   controller: 'report',
   actions: {
       update: 'update'
   },
   split: true,
   collapsible: true,   
   layout: 'form',
   labelAlign: 'top',
   title: "Properties",
   frame: true,
   
   initComponent : function() {
       this.buttons = [{text: 'Update', handler: this.onUpdate, scope: this}, {text: 'Cancel'}];
       this.items = this.build();
       Apollo.report.Properties.superclass.initComponent.call(this);
   },
   
   build : function() {
       return [
           {xtype: 'textfield', fieldLabel: 'Model', value: this.report.getModel()},
           {xtype: 'datefield', fieldLabel: 'Start date'},
           {xtype: 'datefield', fieldLabel: 'End date'}           
       ];
   },
   
   onUpdate : function(btn, ev) {
       this.form.submit({url: this.controller + '/' + this.actions.update + '/' + this.report.id});
   }
});

/**
 * Apollo.report.CriteriaForm
 * This component should only be used by someone who knows SQL.  it's a quick and dirty way of defining
 * ActiveRecord query params :joins, :select, :conditions.  presents a form with 3 text-areas.
 * @author Chris Scott
 */
Apollo.report.CriteriaForm = Ext.extend(RExt.sys.Form, {
    layout: 'accordion',
    controller: 'report',
    hideLabels: true,
    formName: 'report',
    frame: true,
    defaults: {style: 'margin-bottom: 5px'},
    actions: {
        update : 'update_criteria'
    },
    layoutConfig: {
        activeOnTop: true
    },
    width: 800,
        
    initComponent : function() {
        this.items = this.build();
        Apollo.report.CriteriaForm.superclass.initComponent.call(this);
    },
    
    build : function() {
        return [{
            xtype: 'panel',
            layout: 'form', 
            hideLabels: true,
            autoHeight: true,            
            frame: true,
            title: 'Conditions',            
            items: [{
                xtype: 'textarea',
                name: 'report[conditions]',                
                anchor: '100%',
                growMin: 150,
                growMax: 200,
                grow: true
            }]
            
        },{
            xtype: 'panel', 
            layout: 'form',
            hideLabels: true,
            frame: true,
            autoHeight: true,
            title: 'Joins',
            items: [{
                xtype: 'textarea',
                name: 'report[joins]',
                anchor: '100%',
                grow: true,
                growMin: 150,
                growMax: 200          
            }]
        },{
            xtype: 'panel',
            layout: 'form',
            hideLabels: true,
            frame: true,
            autoHeight: true,
            title: 'Select',
            items: [{
                xtype: 'textarea',
                name: 'report[select_columns]',
                anchor: '100%',
                grow: true,
                growMin: 150,
                growMax: 200    
            }]    
        }, {
            xtype: 'panel',             
            layout: 'form',
            hideLabels: true,
            frame: true,
            autoHeight: true,
            title: 'Columns',
            items: [{
                xtype: 'textarea',
                name: 'report[columns]',
                anchor: '100%',
                grow: true,
                growMin: 150,
                growMax: 200
            }]
        }, {
            xtype: 'panel',
            layout: 'form',
            hideLabels: true,
            frame: true,
            autoHeight: true,
            title: 'Ordering',
            items: [{
                xtype: 'textarea',
                name: 'report[order_by]',
                anchor: '100%',
                grow: true,
                growMin: 150,
                growMax: 200    
            }]
        }];
    },
    
    /**
     * load
     * @param {Apollo.Report} report object
     */
    load : function(report) {
        var c = report.getCriteria();
        console.log(c);
        var data = {};
        data[this.formName + '[joins]'] = c.joins;
        data[this.formName + '[conditions]'] = c.conditions;
        data[this.formName + '[select_columns]'] = c.select_columns;
        data[this.formName + '[columns]'] = c.columns;
        data[this.formName + '[order_by]'] = c.order_by;
                                       
        this.form.setValues(data);    
    }
});
