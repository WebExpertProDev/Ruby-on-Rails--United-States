/***
 * @class RExt.Menubar
 * @extends Ext.Toolbar
 * Creates / manages an application menu.
 *
 * @author Chris Scott <christocracy@gmail.com>
 * @param {String} container
 * @param {Array} buttons
 * @param {Object} config
 *
 */
RExt.Menubar = function(container, buttons, config) {

    // render the incoming buttons array into Ext objects via the RExt factory
    RExt.buildToolbarItems(this, buttons);

    // off to Ext.Toolbar
	RExt.Menubar.superclass.constructor.apply(this, arguments);

}
Ext.extend(RExt.Menubar, Ext.Toolbar, {

    /***
     * onClick
     * this is the default menu-handler for a Menubar.  it does a document.location switch.
     * provide your own custom behaviour by overriding this class and adding your own handlers to do whatver
     * you wish.
     *
     * @param {Object} btn
     * @param {Object} ev
     */
	onClick : function(btn, ev) {
        document.location = btn.path;
	}
});