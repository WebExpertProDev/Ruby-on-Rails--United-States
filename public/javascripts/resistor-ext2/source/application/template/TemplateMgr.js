Ext.namespace('RExt.template');

/***
 * @class RExt.template.Manager
 * A documents manger
 */

RExt.template.Manager = function(cfg) {  
    var controller = cfg.controller || this.controller;
         
    RExt.template.Manager.superclass.constructor.call(this, Ext.apply({
        id:'docs_manager',                        
        rootVisible:true,
        lines:false,
        autoScroll:true,
        animCollapse:false,
        animate: false,
        collapseMode:'mini',
        loader: new Ext.tree.TreeLoader({
			preloadChildren: true,
			clearOnLoad: false,
            dataUrl: controller + '/list'
		}),
        root: new Ext.tree.AsyncTreeNode({
            text:'Documents',
            id:'root',
            expanded:true            
         }),
        collapseFirst:false
    }));        
};

Ext.extend(RExt.template.Manager, Ext.tree.TreePanel, {
    
    controller : 'template',
    region: 'west',
    width: 200,
    layout: 'fit',
    border: false,
    
    /***
     * initComponent
     */                
    initComponent : function() {
        
        // build form
        var form = new Ext.form.FormPanel({            
            frame: true,            
            labelAlign: 'right',
            labelWidth: 60,
            width: 300,
            title: 'New Template',
            items: [
                new RExt.template.Properties({
                    title: 'Properties',
                    border: false
                })
            ],
            buttons: [
                {text:'Insert', iconCls: 'icon-accept', handler: function(btn, ev) {
                    var f = form.getForm();                    
                    if (f.isValid()) {                                                
                        Ext.MessageBox.wait('Please wait...', 'Saving');                        
                        f.submit({url: this.controller + '/insert'});
                    }                
                },scope:this },
                {text: 'Cancel', iconCls: 'icon-cancel', handler: function(btn, ev) {popup.hide();}}
            ]      
        });
        /***
         * @event actioncomplete
         * @param {Object} conn
         * @param {Object} response
         * @param {Object} action
         */
        form.on('actioncomplete', function(conn, response, action) {
            Ext.MessageBox.hide();
            popup.hide();
                
        },this);
        /***
         * @event actionfailed
         * @param {Object} conn
         * @param {Object} response
         * @param {Object} action
         */
        form.on('actionfailed', function(conn, response, action) {
            Ext.MessageBox.hide();    
        },this);
        
        // build popup
        var popup = new RExt.form.Popup({
            form: form
        });
        
        // build toolbar                
        this.tbar = [
            {text:'New', iconCls: 'icon-add', menu: popup}, '-',
            {text: 'Delete', iconCls: 'icon-delete', handler: this.onDelete, scope: this}, '-'
        ];
                          
        /***
         * @event click
         * send node-click events to OrderManager
         */
    	this.on('click', this.onClick, this, {});
        
        RExt.template.Manager.superclass.initComponent.call(this);
    },
    
    onDelete : function(item, ev) {
        var node = this.getSelectionModel().getSelectedNode();
        if (node) {
            var tree = this;
            Ext.MessageBox.confirm('Confirm', 'Delete template <strong>' + node.text + '</strong>?', function(btn) {                
                if (btn == 'yes') {       
                    App.request({
                        url: tree.controller + '/delete/' + node.id.split(':').pop(),                     
                        method: 'POST',
                        success: function(res){
                            node.remove();
                        }                       
                    });                                                    
                }
            });    
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
        
        console.log('path: ', path);
        
        switch (object) {
            case 'Template':
                this.onClickTemplate(id, node);
                break;
        } 		
	},
    
    /***
     * onClickTemplate
     * @param {Integer} id
     */
    onClickTemplate : function(id, node) {
        var center = Ext.getCmp('page-center');
		var p = center.getComponent('template-view-tab-' + id);

		if (p) {
            return center.activate(p);
        }
		Ext.MessageBox.wait('Please wait...', 'Loading Template');

		var el = Ext.getBody().createChild({tag:'div', id:'template-view-tab-' + id});
		document.body.appendChild(el.dom);

		um = el.getUpdateManager(); 
        
        App.update(um, {
            url: this.controller + '/view/' + id,
			method: 'GET',
			scripts: true,
			timeout: 20,
			text: 'Loading...',
			nocache: false,
			//callback: function(conn, response, options) {                               
            callback: function(el, success, response, options) {                
                if (!App.validateResponseType('html', response)) {
                    delete el; // <-- remove the el or have memory-leak
                    Ext.get('docs-view-tab-' + id).remove();
                    el.remove();                     
                    return false;
                }
                                                                                                                                
				var view = new RExt.template.View({
                    id: 'template-view-tab-' + id,
                    iconCls : node.attributes.iconCls                                   
                });
                /***
                 * @event destroy
                 * destroy the load-tab element.  was a memory leak.  NB:  ref to el must first be deleted.
                 * 
                 */
                
                view.on('destroy', function() {  
                    delete el;               
                    Ext.get('template-view-tab-' + id).remove();                                       
                });
				center.add(view).show();
				App.getPage().doLayout();
				Ext.MessageBox.hide();
			},            
			scope: this 
        });                            
    }
});

/***
 * RExt.template.View
 * @extends {Ext.Panel}
 * configured as a BorderLayout.
 */
RExt.template.View = Ext.extend(Ext.Panel, {
    
    layout: 'border',		   
	closable: true,        
    border: false,
    iconCls: 'icon-page',
    controller: 'template',
        
    /***
     * @cfg {String} updateUrl       
     */
    updateAction: 'update',
    
    /***
     * initComponent
     */    
    initComponent : function() {
        
        // create template instance.
        this.template = new RExt.Template();
        
        this.title = this.template.label;
        
        // build toolbar
        this.tbar = this.buildToolbar();
        
        // build items
        this.items = this.build();        
        
        // super        
        RExt.template.View.superclass.initComponent.call(this);   
         
    },
    
    /***
     * buildToolbar
     * @return {Array}
     */
    buildToolbar : function() {
        return [
            {text: 'Save', iconCls: 'icon-disk', handler: this.onSave, scope: this}, '-',
            {text: 'Render', handler: function() {
                this.showWindow('/docs/show/' + this.template.id);                                
            },scope: this}        
        ];           
    },
    
    /***
     * show
     * @param {String} url
     * @param {String} title
     */
    showWindow : function(url, title) {
        this.window = window.open(url, title, 'width=950,height=750,toolbar=0,modal=yes,location=0,directories=0,status=yes,menubar=yes,scrollbars=yes,copyhistory=0,resizable=yes');            
    },
    
    /***
     * onSave
     * @param {Object} btn
     * @param {Object} ev
     */
    onSave : function(btn, ev) {
        
        var editor = Ext.getCmp(this.id + '-editor');        
        App.request({
			url: this.controller + '/' + this.updateAction + '/' + this.template.id,
            params: {
                content: editor.getValue()    
            },
		   	success: function(res) {												
				if (res.success == true) {
                    console.log('onSave() success');					
				}
		   	}	   	
		});                                               
    },
    
    /***
     * build
     * @return {Array} panels
     */
    build : function() {
                
        var cfg = {
            id: this.id + '-editor',
            value: this.template.content
        }
        /*
        var editor = (this.template.type == 'theme') 
        ? 
            new Ext.form.TextArea(cfg)            
        :
            new RExt.template.Editor(Ext.apply(cfg, {
                theme: this.template.getTheme()
            }));
       */
       var editor = new Ext.form.TextArea(cfg);
           
        var regions = [{
            id: this.id + '-center',
            layout: 'fit',
            region: 'center',            			                       
			plain: true,	            	                       									            
			header: false,
            border: false,
            margins: '5 0 5 5',           
            items: editor                            			
		}, new RExt.template.Options({
            id: this.id + '-east',
            region: 'east',    
            template: this.template,
            split:true,
            bodyBorder: false,
            width: 240,
            minSize: 175,        
            maxSize: 500,
            collapsed: true,
            collapsible: true,
            cmargins:'5 5 5 5',        
        })];
         
        
        return regions;
    }       
});

/***
 * RExt.template.Options
 * an accordion of template-options for teh east of a template view
 * 
 */
RExt.template.Options = Ext.extend(Ext.Panel, {
    layout: 'accordion',
    title: 'Settings',    
    layoutConfig: {
        // layout-specific configs go here
        fill: true,
        titleCollapse: true,
        animate: true,
        activeOnTop: true
    },               
    margins:'5 5 5 0',
     
    template: null, 
           	    				             
    initComponent : function() {
        this.items = this.build();
        RExt.template.Options.superclass.initComponent.call(this);
    },
    
    build : function() {
        
        var items = [];
                        
        // if this template has methods, build a method-tree
        if (this.template.methods) {
            items.push(new RExt.template.TagTree(this.template)); 
        }  
        
        // every template has properties
        items.push(new RExt.template.Form({}));
        
        // build asset mgr if this is a theme.
        if (this.template.type == 'theme') {
            items.push(new RExt.template.Assets({}));
        }                
        return items;
    }
});

/***
 * RExt.template.Editor
 * @extends Ext.form.HtmlEditor
 * @see Ext.form.Editor:
 * "Protected method that will not generally be called directly. It
 * is called when the editor initializes the iframe with HTML contents. Override this method if you
 * want to change the initialization markup of the iframe (e.g. to add stylesheets)."
 * @return (String} html doc
 */
RExt.template.Editor = Ext.extend(Ext.form.HtmlEditor, {
    
    /***
     * getDocMarkup
     * overrides Ext.form.HtmlEditor to return a theme instead of <html><body></body></html>
     */   
    getDocMarkup : function(){        
       
        // there can be problems here with markup.  A certain <meta> tag can break this.       
        var mk = this.theme.replace(/{{content_for_layout}}/, '<div id="content_for_layout"></div>');        
        return mk;   
        
        // original markup returned from Ext.form.HtmlEditor             
        //return '<html><head><style type="text/css">body{border:0;margin:0;padding:3px;height:98%;cursor:text;}</style></head><body></body></html>';
    },
    
    /***
     * getEditorBody
     * override Ext.form.HtmlEditor to return <div id="content_for_layout"></div> instead of <body>
     */
    getEditorBody: function() {                          
        return this.doc.getElementById('content_for_layout') || this.doc.body || this.doc.documentElement;                     
    }       
});

/***
 * RExt.template.Form
 * 
 */
RExt.template.Form = Ext.extend(Ext.form.FormPanel, {
    
    title: 'Properties',
    controller: 'template',
    bodyStyle: 'padding: 5px',
    labelWidth: 75,
    labelAlign: 'top',
    iconCls: 'icon-page-edit',
    updateUrl: 'docs/update_properties',
    border: false,
    frame: false,    
    
    /***
     * initComponent
     */
    initComponent : function() {
        this.items = this.build();                       
        this.tbar = this.buildToolbar();
                             
        RExt.template.Form.superclass.initComponent.call(this);
    },
    
    /***
     * buildToolbar
     */
    buildToolbar : function() {
        return [{
            text: 'Update',
            iconCls: 'icon-disk',
            handler: function(btn, ev){
                if (this.form.isValid()) {
                    this.form.submit({url: this.updateUrl});
                }   
            }
        },'-'];    
    },
    
    /***
     * build teh items
     * @return {Array} items
     */
    build : function() {
        
        		                
        return [
            new RExt.template.Properties({})
        ];
    }               
});

/***
 * RExt.template.Properties
 * A fieldset for managing a template's properties
 * @author Chris Scott
 */
RExt.template.Properties = Ext.extend(Ext.form.FieldSet, {
    
    title: 'General',
    autoHeight: true,
    autoWidth: true,
    
    initComponent : function() {
        this.items = this.build();
        RExt.template.Properties.superclass.initComponent.call(this);    
    },
    
    build : function() {
        var type = new Ext.form.ComboBox({            
	        name: 'type',			
	        hiddenName: 'template[template_type_id]',
	        mode: 'local',
            listWidth: 150,
	        fieldLabel: 'Type',
			triggerAction: 'all',
			forceSelection: true,
	        allowBlank: false,
	        displayField: 'name',
	        valueField: 'id',
	        store: new Ext.data.SimpleStore({
	            fields: ['id', 'name'],
	            data: RExt.template.Util.getTypes()
	        })
	    });
        
        var model = new Ext.form.ComboBox({            
	        name: 'model',			
	        hiddenName: 'template[model]',
	        mode: 'local',
            listWidth: 150,
	        fieldLabel: 'Model',
			triggerAction: 'all',
			forceSelection: true,
	        allowBlank: true,
	        displayField: 'model',
	        valueField: 'model',
	        store: new Ext.data.SimpleStore({
	            fields: ['model'],
	            data: RExt.template.Util.getModels()
	        })
	    });
        
        return [           
            new Ext.form.TextField({
                name: 'template[name]',
                fieldLabel: 'Name',
                allowBlank: false
            }),
            new Ext.form.TextField({
                name: 'template[label]',
                fieldLabel: 'Label',
                allowBlank: false  
            }),
            type,
            model
        ]; 
    }
});

/***
 * RExt.template.TagTree
 * @param {Object} data tree-data from get_liquid_method_tree
 * Creates a tree of available liquid tags / objects
 * 
 */
RExt.template.TagTree = function(tpl) {
    
    // build help-menu
    var menu = new Ext.menu.Menu({
        cls: 'r-form-popup',
        items: [
            new RExt.menu.PanelItem({
                panel: new Ext.Panel({
                    title: 'Help',
                    bodyStyle: 'padding: 5px',                    
                    html: Ext.get('template_help').dom.innerHTML,
                    width: 220,
                    height: 300                                  
                })
            })
        ]    
    });
    
    // build tree                           
    RExt.template.TagTree.superclass.constructor.call(this, {
        id:'method_tree_' + tpl.id,                
        iconCls: 'icon-page-code',
        border: false,
        title: 'Data-tags',
        rootVisible:false,
        lines:false,
        tbar: [
            {text: 'Help', iconCls: 'icon-help', menu: menu}, '-'
        ],        
        autoScroll:true,
        animCollapse:false,
        animate: false,
        collapseMode:'mini',
        loader: new Ext.tree.TreeLoader({
			preloadChildren: true,
			clearOnLoad: false
		}),
        root: new Ext.tree.AsyncTreeNode({
            text:'Template Tags',
            id:'root',
            expanded:true,
            children:tpl.methods
         }),
        collapseFirst:false
    });            
};

Ext.extend(RExt.template.TagTree, Ext.tree.TreePanel, {
                 
    selectClass : function(cls){
        console.log('selectClass ', cls)
    }
});

/***
 * RExt.template.Assets
 * for managing js/css/images on a theme 
 * @author Chris Scott
 * 
 */
RExt.template.Assets = Ext.extend(Ext.Panel, {
    
    autoHeight: false,     
    
    iconCls: 'icon-page-white-code',
    tabIndex: 1,    
    autoHeight: true,            
    frame: false,     
    style: 'margin-bottom;',
    bodyStyle: 'padding: 5px',                             
    title: 'Theme Assets',             
            
    /***
     * initComponent
     */
    initComponent : function() {
                          
        this.items = this.build();
        this.tbar = [
            {text: 'Save', iconCls: 'icon-disk'},'-'
        ];
        
        /*        
        var popup = Ext.getCmp('account_popup');
                
        popup.form.insertUrl = '/company/validate_account';
        
		var btnAccount = new RExt.Toolbar.PopupButton({
			text: 'Add Contact',
			menu : popup,
            iconCls: 'icon-add'
		});
        */
        /***
         * @event click
         * @param {Object} btn
         * @param {Object} ev
         */
        /*
		btnAccount.on('click', function(btn, ev) {
			var panel = popup.getFormPanel();
			                                                                                              
            panel.setDomain(this.domain);
            
            popup.form.setKey(0); // <-- NB: setKey to zero will hide the companyCombo which is shown when key == null
            panel.insertUrl = this.accountValidationUrl;
			panel.showInsert();
            
			// attach a 'beforeaction' listener to short-cct the form POST.
			// we don't POST form here -- we add to MixedCollection
			panel.on('actioncomplete', function(form, action) {
                if (typeof(action.result) == 'object') {
                    if (action.result.success == true) {
                        var data = panel.form.getValues();
                        view.store.insert(0, new view.store.recordType({                            
            				first: data['account[first]'],
            				last: data['account[last]'],
                            form: data
                        }));
                        popup.hide();
                    }
                    else {
                        Application.setAlert(action.result.msg, action.result.status);
                    }
                }     			        
        		return false;  
            },this);
		},this);   
        
        // set toolbar
        this.tbar = [
            btnAccount,
            {text: 'Remove', iconCls: 'icon-delete', handler: function(btn, ev) {
                var rs = view.getSelectedRecords();
                if (rs.length > 0) {
                    var rec = rs[0];
                    if (typeof(rec.data.id) != 'undefined') {
                        view.deleted.push(rec.data.id);
                    }
                    view.store.remove(rs[0]);
                    
                }    
            },scope: this}
        ];                                     
                     
        */                       
        RExt.template.Assets.superclass.initComponent.call(this);
    },
                  
    /***
     * build
     * @return {Ext.DataView}
     */
    build : function() {
        // create view's record def.
        var Account = Ext.data.Record.create([
            {name: 'id'},
            {name: 'first', type: 'string'},
            {name: 'last', type: 'string'},
            {name: 'form'}
        ]);
        
        // build shipper ComboBox
        var store = new Ext.data.Store({
            reader: new Ext.data.ArrayReader({record: 'account'}, Account),
            baseParams: {}
        });
        
        // create view template
        var tpl = new Ext.XTemplate(
    		'<tpl for=".">',
                '<div id="asset-js-{id}" class="asset-js x-grid3-row">',
    		    '    <h3>{name}</h3>',                                
                '</div>',
            '</tpl>'
    	);
        
        // create view
        var jsView = new Ext.DataView({            
            id: this.id + '_js',
            store: store,
            tpl: tpl,
            cls: 'x-grid3',
            multiSelect: true, 
            deleted: [],           
            height: 200,
            style: 'padding:5px',
            overClass:'x-grid3-row-over',
            itemSelector:'div.asset',
            selectedClass: 'x-grid3-row-selected',
            emptyText: '<h2>No javascript assets added</h2><h3 class="icon-information r-icon-text">You may add any number of files to this theme.</h3>'
        });
        var jsPanel = new Ext.Panel({
            frame: false,
            iconCls: 'icon-page-white-code',
            title: "Javascript Assets",
            collapsible: true,
            height: 100,
            style: 'margin-bottom: 5px',
            tbar: [                
                {iconCls: 'icon-add'},'-',
                {iconCls: 'icon-delete'},'-'
            ]
        });
        
        // create cssView
        var cssView = new Ext.DataView({
            tbar: [
                {iconCls: 'icon-disk'},'-',
                {iconCls: 'icon-delete'},'-'
            ],
            id: this.id + '_css',
            store: store,
            tpl: tpl,
            cls: 'x-grid3',
            multiSelect: true, 
            deleted: [],           
            height: 200,
            style: 'padding:5px',
            overClass:'x-grid3-row-over',
            itemSelector:'div.asset',
            selectedClass: 'x-grid3-row-selected',
            emptyText: '<h2>No stylesheet assets added</h2><h3 class="icon-information r-icon-text">You may add any number of files to this theme.</h3>'
        });    
        var cssPanel = new Ext.Panel({
            frame: false,
            iconCls: 'icon-page-white-code-red',
            title: 'Stylesheet Assets',
            collapsible: true,
            height: 100,
            tbar: [
                {iconCls: 'icon-add'},'-',
                {iconCls: 'icon-delete'},'-'
            ]
        })                            
        return [jsPanel, cssPanel]
    }
});
