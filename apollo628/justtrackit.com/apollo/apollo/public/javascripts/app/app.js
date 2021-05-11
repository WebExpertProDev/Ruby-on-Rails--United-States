/***
 * create "Apollo" namespace
 */
Ext.namespace('Apollo', 'Apollo.order', 'Apollo.system');

// turn on QTips
Ext.QuickTips.init();

// turn on validation errors beside the field globally
Ext.form.Field.prototype.msgTarget = 'qtip';

/**
 * Apollo.Header
 * Generic application header for Page's north
 */
Apollo.Header = Ext.extend(Ext.Panel, {

    id: 'page-north',
    region: 'north',
    layout: 'fit',
    margins: '5 5 5 5',
    contentEl: 'header',
    cls: 'r-page-north',
    height: 100,
    
    initComponent : function() {
        
        /***
         * register north's toolbar as teh App toolbar
         */
        this.on('render', function() {                                    
            App.registerToolbar(this.getBottomToolbar());            
        });        
        
        this.items = {
            layout: 'column',
            border: false,
            items: [{
                contentEl: 'header',
                width: 200,
                border: false
            
            }, {
                id: 'header-status',
                height: 70,
                border: false,
                header: false,
                frame: false,
                columnWidth: 1.0,
                html: '<div id="header-status-ct"></div>'
            }]
        };
        
        this.bbar = [new Ext.Toolbar.Button({
            text: 'Application',
            iconCls: 'icon-application-cascade',
            menu: Apollo.MainMenu.build()
        })];
    
        Apollo.Header.superclass.initComponent.call(this);
    }
});

/**
 * Apollo.Footer
 * A generic application footer with resistor-logo
 */
Apollo.Footer = Ext.extend(Ext.Panel, {
    id: 'page-south',
    region: 'south',
    contentEl: 'footer',
    frame: false,
    header: false,
    border: true,
    layout: 'fit',
    height: 25
});

/**
 * Apollo.Center
 */ 
 Apollo.Center = Ext.extend(Ext.TabPanel, {
    id: 'page-center',
    xtype: 'tabpanel',
    deferredRender: false,
    autoScroll: true,                
    region: 'center',
    margins: '0 5 5 0',
    minTabWidth: 120,
    resizeTabs: true,
    enableTabScroll: true,
    header: false,
    border: true,
    style: 'border-top:0',
    frame: false,
    autoDestroy: true,
    tabPosition: 'top',
    cls: 'r-page-center'
});
            
Apollo.Page = Ext.extend(RExt.Page, {
    
    /***
     * initComponent
     */
    initComponent : function() {               
        Apollo.Page.superclass.initComponent.call(this);         
        
    },
    
     /***
     * getRegions
     * default Page regions.  override to provide your own.
     * NB:  you should prefix each region with "page-"
     * @return {Array}
     */
    getRegions : function(param) {
        return [
            new Apollo.Header({}),
            new Apollo.Center(),          
            new Apollo.Footer()
            
         ];
    }
});




