
/***
 * @class RExt.Panel 
 * A class for rendering a fancy TabPanel from existing markup.
 * does a DomQuery to search for .x-tab and attaches those to TabPanel
 * @author Chris Scott
 * @extends Ext.Panel
 *
 */
RExt.Panel = function(param) {
	var cfg = {
		header: true,
		frame: true
	};
        
    // if renderTo or contentEl are present, search for items/tabs in the content.
    if (typeof(param.renderTo) != 'undefined' || typeof(param.contentEl) != 'undefined') {        
		var items = this.buildItems(param);                
		if (items) { cfg.items = items; }
	}
	// *super*
    RExt.Panel.superclass.constructor.call(this, Ext.apply(cfg, param));
    
    // however, if renderTo && contentEl ARE undefined, then try rendering a template.
    // the XTemplate should be defined in extended class.  RExt.Panel provides NO DEFAULT TEMPLATE.
	if (typeof(cfg.renderTo) == 'undefined' && typeof(cfg.contentEl) == 'undefined') {        
		this.on('render', function() { this.renderTemplate(); },this);      
	}        
};
Ext.extend(RExt.Panel, Ext.Panel, {
           
    /***
     * tpl
     * pointer to XTemplate instance.
     */
    tpl : null,
    
    /***
     * editors
     * inline editors created by App.applyInlineEditors
     * [Array]
     */      
    editors : [],
    
    /***
     * tabPanelHeight [200]
     * hight of nested TabPanel
     * @param {Object} cfg
     */
    tabPanelHeight: 200,
    
    initComponent : function() {
        RExt.Panel.superclass.initComponent.apply(this, arguments);
        
        this.addEvents({
            /***
             * @event build
             * fires after the Panel has been completely built.
             */
            'ready' : true,
            
            /***
             * @event rendertemplate
             * fires after the contenttemplate has been rendered
             */
            'rendertemplate' : true,
            
            /***
             * @event update
             * fires when an entity panel was updated
             */
            'update' : true
        });
        
        // fire the 'ready' event.
        if (typeof(this.renderTo) != 'undefined') {
            this.on('render', function() {
                this.fireEvent('ready', this);    
            },this);
        }
        else {
            this.on('rendertemplate', function() {
                this.fireEvent('ready', this);
            });
        }
        
    },
    
	/***
	 * buildItems
	 *
	 */
	buildItems : function(cfg) {
		var el = typeof cfg.renderTo == "string" ? Ext.get(cfg.renderTo) : cfg.renderTo;
		if (typeof(el) == 'undefined') {
			el = typeof cfg.contentEl == "string" ? Ext.get(cfg.contentEl) : cfg.contentEl;
		}
		if (typeof(el) == 'undefined') {
			alert('RExt.Panel::buildItems() -- could not find contentEl or renderTo -- no el found');
			return false;
		}
		var tabs = this.findTabs(el);        
		return (tabs != false) ? {
			xtype: 'rtabpanel',
			deferredRender: false,
			height: cfg.tabPanelHeight,
			autoWidth: true,
            
			activeTab: 0,
			border: true,
			plain: true,
			items: tabs
		} : null;

	},

	/***
	 * findTabs
	 * search dom for tabs ".x-tab"
	 */
	findTabs : function(el) {
		var tabs = [];
		var list = el.query('.x-tab');
		for (var n=0,len=list.length;n<len;n++) {
			tabs.push({
				title: list[n].title,
				autoWidth: true,
				autoHeight: true,
				contentEl: list[n],
				bodyStyle: 'padding:5px 10px 5px 10px',
				border: false,
				autoScroll: true
			});
		}
        return false;
		//return tabs.length > 0 ? tabs : false;
	},

	/***
	 * onRender
	 * overrides Ext.Panel
	 * simply add class 'r-panel'
	 * @param {Object} ct
	 * @param {Object} position
	 */
	onRender : function(ct, position) {
		RExt.Panel.superclass.onRender.apply(this, arguments);
		this.el.addClass('r-panel');
	},
    
    /***
     * compile
     * compile data for an XTemplate
     * create a data hash for XTemplate to consume.    
     * @return {Hash || false} in your extended class, you may return false to cancel template render
     */
    compile : function() {
        return { 
            textarea_tag: 'textarea'   //<-- special hack for using textarea tags within template
        };            
    },
    
    /***
     * renderTemplate
     * if this compile() method returns false, cancel template render.  this is sometimes required in your
     * extension.
     * @param {Boolean} overwrite [false]
     */
    renderTemplate : function(overwrite) {                
        if (typeof(overwrite) == 'undefined') {
            overwrite = false;
        } 
        var method = (overwrite == false) ? 'append' : 'overwrite';
                                                            
        var data= this.compile();
        
        if (data) {    // <-- render template only if compile returned data.             
            if (method == 'overwrite') {
                if (this.items instanceof Ext.util.MixedCollection) {
                    this.items.each(function(i){                    
                        this.remove(i, true);                    
                    }, this);
                }                               
            }   
        
            // render template                                
            RExt.util.TemplateMgr.get(this.tpl)[method](this.body, data);
                                                        
            // apply inline editors.
            this.editors = App.applyInlineEditors(this, this.body);                                   
            
            // remove all child items when method is overwrite.
            if (method == 'overwrite') {                               
                this.build();      // <-- build & doLayout()
                this.doLayout();
            }
            else {                 // <-- just build
                this.build();
            }                        
            this.fireEvent('rendertemplate', this);     
        }                                                                
    },
    
    /***
     * build
     * build panels.  returns an RExt.TabPanel by default.
     * @return {RExt.TabPanel || null}
     */
    build : function() {
        var tabs = this.findTabs(this.body);  
                              
		return (tabs) ? this.add(new RExt.TabPanel({		
			deferredRender: false,
			height: this.tabPanelHeight,
			autoWidth: true,            
			activeTab: 0,
			border: true,			
			items: tabs})
        ) : null;                                     		        
    },
    
    /***
     * onInlineEditComplete
     * called when an inline editor has retured success
     * method can be over-ridden to provide custom-handling.
     * @param {Object} {field, response}
     */  
     onInlineEditComplete : function(param) { },
     
});
Ext.reg('rpanel', RExt.Panel);

/***
 * @class RExt.TabPanel
 * @constructor
 * @author Chris Scott
 * @extends Ext.TabPanel
 * @param {Object} param
 */
RExt.TabPanel = function(param) {
    var cfg = {
        autoTabs: false,
        renderTo: null,
        applyTo: null
    };
    Ext.apply(cfg, param);

    if (cfg.applyTo !== null) {
        if (cfg.autoTabs == true) {
            cfg.items = this.findTabs(cfg.applyTo);
        }
        cfg.applyTo = null;
    }
    RExt.TabPanel.superclass.constructor.call(this, cfg);
};
Ext.extend(RExt.TabPanel, Ext.TabPanel, {

    /***
	 * findTabs
	 * search dom for tabs ".x-tab"
	 */
	findTabs : function(el) {
        el = typeof el == "string" ? Ext.get(el) : el;

		var tabs = [];
		var list = el.query('.x-tab');
		for (var n=0,len=list.length;n<len;n++) {
			tabs.push({
				title: list[n].title,
				autoWidth: true,
				autoHeight: true,
				contentEl: list[n],
				bodyStyle: 'padding:5px 10px 5px 10px',
				border: false,
				autoScroll: true
			});
		}        
		return tabs.length > 0 ? tabs : false;
	}

});
Ext.reg('rtabpanel', RExt.TabPanel);