/***
 * a Resistor Page object;
 * @author chris scott
 *
 * used for managing a particular page's layout.
 *
 */

RExt.Page = Ext.extend(Ext.Viewport, {

    layout: 'border',

    initComponent : function() {
        Application.setPage(this);
        var regions = this.getRegions();

        if (typeof(this.items) == 'undefined') {
            this.items = regions;
        }
        else if (Ext.isArray(this.items)) {
            for (var n=0,len=regions.length;n<len;n++) {
                this.items.push(regions[n]);
            }
        }
        else {
            this.items = [this.items];
            for (var n=0,len=regions.length;n<len;n++) {
                this.items.push(regions[n]);
            }
        }

        RExt.Page.superclass.initComponent.call(this);
    },

    /***
     * getRegions
     * default Page regions.  override to provide your own.
     * NB:  you should prefix each region with "page-"
     * @return {Array}
     */
    getRegions : function(param) {
        return [
            {
                id: 'page-north',
                layout: 'fit',
                region: 'north',
                contentEl: 'header',
                height: 60,
                cls: 'r-page-north'
            },
            {
                id: 'page-west',
                layout: 'fit',
                region: 'west',
                width: 200,
                split: true,
                cls: 'r-page-west'
            },
            {
                id: 'page-center',
                xtype: 'tabpanel',
                deferredRender: false,
                autoScroll: true,
                region: 'center',
                header: false,
                border: true,
                autoDestroy: true,
                tabPosition: 'top',
                cls: 'r-page-center'
            }
         ];
    },

    /***
     * onLoad
     */
    onLoad : function() {
        // nothing.
    }

});