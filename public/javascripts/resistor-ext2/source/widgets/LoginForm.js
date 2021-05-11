/***
 * RExt.LoginForm
 * @desc A general class for submitting login info to server and handling response.  success responses
 * get redirected via javascript document.location = '/controller/action'
 * @author Chris Scott
 * @param {Object} param
 */

RExt.LoginForm = Ext.extend(Ext.form.FormPanel, {

    /***
     * build
     * @return {Array} fields
     */
    initComponent : function() {

        // add a ready event.
        this.addEvents({
            'ready' : true,   // <-- fired when login is on-screen and visible
            'center': true    // <-- fired when login el is re-centered due to window-resize
        });

        this.renderTo = document.body;

        this.keys = {
            key: 13, // or Ext.EventObject.ENTER
            fn: this.onLogin,
            scope: this
        },
        this.buttons = [
            {text: 'Login', handler: this.onLogin, scope: this}
        ];

        this.items = [
            new Ext.form.TextField({
                name: 'username',
                allowBlank: false,
                fieldLabel: 'Username'
            }),
            new Ext.form.TextField({
                name: 'password',
                allowBlank: false,
                fieldLabel: 'Password',
                inputType: 'password'
            })
        ];

        // listen to form-events
        this.on('actioncomplete', this.doLogin, this, {});
        this.on('actionfailed', this.handleFailure, this, {});
        Application.onLoad(this.onLoad, this);

        // super
        RExt.LoginForm.superclass.initComponent.call(this);
    },

    /***
     * @cfg {String} url [/auth/login]
     * default login url
     */
    url: '/auth/authenticate',

    /***
     * @cfg {String} cls css-cass
     * @desc cls.  hide form initially.  onLoad center the el then show it with fadeIn
     */
    cls: 'x-hidden',

    /***
     * @cfg {String/Boolean} [false] resistorLogo path to resistor-software logo
     * @desc provide url to resistor-logo and LoginForm will create an img element automatically.
     */
    resistorLogo: null,

    /***
     * @cfg {String} [null] path to a client logo
     */
    logo: null,

    /***
     * various other default config...
     */
    iconCls: 'icon-key',
    labelWidth: 75,
    autoShow: true,
    frame:true,
    title: 'Account Login',
    bodyStyle:'padding:5px 5px 0',
    width: 330,
    defaults: {width: 200},
    defaultType: 'textfield',
    labelAlign: 'right',

    /***
     * onLoad
     * center the form; center on windowresize event.
     *
     */
    onLoad : function() {

        if (!this.rendered == true) {
            this.on('render', this.doShow, this);
        }
        else {
            this.doShow();
        }
    },

    doShow : function() {
        var el = this.getEl();
        el.center();

        // create resistor logo if resistorLogo was supplied.
        if (this.resistorLogo) {
            el.createChild({
                tag: 'a',
                href: 'http://www.resistorsoftware.com'
            }).createChild({
                tag: 'img',
                src: this.resistorLogo
            });
        }
        el.fadeIn({
            duration: 0.5,
            callback: function(){
                this.fireEvent('ready', this);
            },
            scope: this
        });

        // listen to window resize for auto-centering
        Ext.EventManager.onWindowResize(function(){
            el.center();
            this.fireEvent('center', this)
        }, this);
    },

    /***
     * onLogin
     *
     */
    onLogin : function(btn, ev) {
        if (this.form.isValid()) {
            this.form.submit({url: this.url, waitMsg: 'Authenticating...'});
        }
        else {
            Application.setAlert(App.STATUS_ERROR, 'Form is invalid');
        }
    },

    /***
     * doLogin
     * @param {Object} form
     * @param {Object} action
     */
    doLogin : function(form, action) {
        if (typeof(action.result) != 'object') {
            return this.handleFailure(form, action);
        }
        else if (action.result.success == false) {
            this.handleFailure(form, action);
        }
        else {
            var res = action.result;
            if (res.success == true) {
                App.setUser(res.data.account);
                this.getEl().switchOff({
                    callback: function(){
                        App.showSpinner('Logging in');
                        window.location = res.data.url;
                    }
                });
            }
            else {
                App.setAlert(App.STATUS_ERROR, res.msg);
            }
        }
    },

    /***
     * handleFailure
     * handle form failure
     */
    handleFailure : function(form, action) {
        if (typeof(action.result) == 'object') {
            Application.setAlert(action.result.success, action.result.msg);
        }
        else {
            Application.setAlert(App.STATUS_ERROR, 'An unknown error occurred');
        }
    }
});