
/***
 * RExt.View
 * A basic class for rending an Ext.MasterTemplate
 * @param {Object} ct, where to render to template
 * @param {Object} tpl, *the* template
 * @param {Object} config, stuff
 *
 */
RExt.View = function(tpl, config) {
    RExt.View.superclass.constructor.call(this, null);
    Ext.apply(this, config);
    Ext.ComponentMgr.register(this);

    this.template = new Ext.XTemplate.from(tpl);
    this.template.compile();
};
Ext.extend(RExt.View, Ext.util.Observable, {

    /***
     * render
     * render the view with supplied data.
     * @param {Ext.Element} el
     * @param {Object} data
     */
    render : function(el, data) {
        // not yet sure how to make a generic renderer for this class.
    }
});
