/***
 * Ext blank image url
 */
Ext.BLANK_IMAGE_URL = "javascripts/ext-2.0/resources/images/default/s.gif";

/***
 * console.log fix for machines not running firebug.
 *
 */
if (typeof(console) == 'undefined') {
    var console = {
        log: function() {},
        info: function() {},
        warn: function() {},
        error: function() {},
        time: function() {}
    };
}
else if (typeof(console.log) == 'undefined') {
    console.log = function() {};
}

/***
 * setup namespaces
 *
 */
Ext.namespace(
    "RExt",
    "RExt.component",
    "RExt.util",
    "RExt.grid",
    "RExt.tree",
    "RExt.data",
    "RExt.form",
    "RExt.layout",
    "RExt.menu",
    "RExt.state",
    "RExt.sys"
);


/**
 * RExt.Error
 * @param {String} message, Human-readable description of the error
 * This is an exception class.  the constructor simply creates an instance of javasript core Exception class Error.
 * You may define your own custom extensions with Ext.extend.
 * eg:  MyError = Ext.extend(RExt.Error, {});
 * throw new MyError('wtf?');
 * @usage var e = new RExt.Error
 */
RExt.Error = function(msg) { this.error = new Error(msg); }
RExt.Error.prototype = {
    getMessage : function() { return this.error.message; },
    getName: function() { return this.error.name},
    getConstructor : function() { return this.error.constructor; }
}

RExt.grid.Builder = function() {
    return {
        /**
         * prepareColumnModel
         * evals renderer
         * @param {Object} cols
         */
        prepareColumnModel : function(cols) {
            for (var n=0,len=cols.length;n<len;n++) {
                if (typeof(cols[n].renderer) != 'undefined') {
                    cols[n].renderer = eval(cols[n].renderer);
                }
            }
            return cols;
        }
    }
}();

/***
 * RExt.util.Builder
 * A collection of methods for building Ext components
 * @author Chris Scott
 */
RExt.util.Builder = function() {
    return {

        /***
         * buildField
         * build a field wiht supplied prefix and field config
         * @param {String} prefix, used the build the fieldname:  prefix[param.name]
         * @param {Object} param the field object from database
         */
        buildField : function(prefix, param) {
            var cfg = param.config;

            cfg.name = prefix + '[' + param.id + ']';
            cfg.allowBlank = (param.required == true) ? false : true;
            cfg.fieldLabel = param.label;

            cfg = Ext.applyIf({
                anchor: '90%',
                tabIndex: 1
            },cfg)

            var field = null;

            switch (param.field_type) {
                case 'string':
                    field = new Ext.form.TextField(cfg);
                    break;
                case 'number':
                case 'integer':
                    field = new Ext.form.NumberField(cfg);
                    break;
                case 'date':
                    field = new Ext.form.DateField(cfg);
                    break;
                case 'combo':
                    alert('Not yet implemeneted');
                    break;
                default:
                    field = new Ext.form.TextField(cfg);
                    break;

            }
            return field;
        },

        /***
         * applyInlineEditors
         * does a DomQuery on supplied element looking for elements of class ".x-form-inline-field" and creates
         * appropriate inline-editor constructor to it.
         * NB:  the structure of your field id is VERY important.  it must be of the form:
         * controller-[any-thing-else-]-model-fieldname-id
         *
         * eg:  company-view-company-name-32
         * eg:  order-view-account-first-3
         *
         * the "model" does not necessarily correspond to the actual ActiveRecord class.  there's a switch on the server
         * which will map this name to an actual AR class.
         *
         * in your html, you create a field like so:
         * <textarea id="order-view-company-description-<%=company.id%>" class="x-field-inline-field"><%=company.description%></textarea>
         *
         * this method will find that field via DomQuery and apply the Ext.form.InlineTextArea constructor to it.
         * @param {Ext.Component} sender, the owner of the components you wish to apply editors to.
         * @param {Ext.Element} the el you wish to query for editors.
         * @return {Array} the fields added.
         */
        applyInlineEditors : function(sender, el) {

            var list = el.query('.' + Ext.form.InlineTextField.prototype.inlineClass);

            //console.log("Application::applyInlineEditors ", Ext.form.InlineTextField.prototype.inlineClass, ",", list);
            var fields = [];
            for (var n=0,len=list.length;n<len;n++) {
                var el = Ext.fly(list[n]);

                var path = list[n].id.split('-');
                var controller = path.shift();
                var id = path.pop();
                var name = path.pop();
                var model = path.pop();

                //console.log('controller: ', controller, ', tag: ', list[n].tagName, ', type: ', list[n].type, ', alt: ', list[n].alt);

                // default cfg
                var cfg = {
                    name: 'field[' + name + ']',
                    applyTo: list[n],
                    plugins: new RExt.plugins.InlineField({
                        saveOnlyOnChange : true,
                        url: '/' + controller + '/update_field/' + id,
                        method: 'POST',
                        success : onSuccess,
                        failure : onFailure,
                        params: {
                            model: model
                        }
                    })
                };


                // get extended params from html alt tag.  convert it to JSON
                if (list[n].getAttribute("alt")) {
                    var alt = list[n].getAttribute('alt');
                    if (!alt.match(/^{.*}$/)) { alt = '{' + alt + '}'; }
                    cfg = Ext.applyIf(cfg, Ext.decode(alt));
                    if (list[n].value) {
                        cfg.value = list[n].value;
                    }
                    list[n].alt = '';
                }
                switch (list[n].tagName) {
                    case 'TEXTAREA':
                        var field = new Ext.form.TextArea(Ext.apply({
                            grow: true,
                            growMin: 60,
                            growMax: 200,
                            allowBlank: false,
                            width: sender.body.getWidth()
                        }, cfg));
                        fields.push(field);
                        break;

                    case 'INPUT':
                        if (list[n].type == 'text') {
                            if (el.hasClass('number')) {
                                fields.push(new Ext.form.NumberField(cfg));
                            }
                            else {
                                fields.push(new Ext.form.TextField(cfg));
                            }
                        }
                        break;
                }
            }

            function onSuccess(conn, response, options) {
                var res = Ext.decode(conn.responseText);
                if (typeof(sender.onInlineEditComplete) == 'function') {
                    sender.onInlineEditComplete(res);    // <-- call sender's onInlineEditComplete method if exists.
                }
                App.processResponse(res);
            }
            function onFailure(conn, response, options) {
                App.setAlert(false, conn.statusText);
            }

            // apply default callback functions to setAlert
            if (fields.length > 0) {

                // listen to sender's destroy event and destroy all the editors.
                sender.on('destroy', function() {
                    for (var n=0,len=fields.length;n<len;n++) {
                        Ext.destroy(fields[n]);
                    }
                });
            }
            return fields;
        }
    };
}();

/***
 * RExt.util.TemplateMgr
 * Manages XTemplate instances that can be shared among all components of the app.
 * @author Chris Scott
 *
 */
RExt.util.TemplateMgr = function() {

    // compiled template Collection
    var templates = new Ext.util.MixedCollection();
    return {
        add : function(id, tpl) {
            tpl.__initialized = false
            templates.add(id, tpl);
        },

        /***
         * get
         * return a compiled template instance.  if not exists, create and compile it.
         * @param {String} id (element id of your template <textarea id="id"></textarea>
         */
        get : function(id, methods) {
            var tpl = templates.get(id);
            methods = methods || {};
            if (!tpl) {
                // add template member functions.  see XTemplate docs
                methods = Ext.applyIf({
                    isDefined : function(param) {
                        return (typeof(param.account) != 'undefined') ? true : false;
                    }
                },methods);

                var el = Ext.getDom(id);
                if (!el) {
                    alert('RExt.util.TemplateMgr could not locate your requested template "' + id + '"');
                    return false;
                }
                var html = el.value || el.innerHTML;
                tpl = templates.add(id, new Ext.XTemplate(Ext.util.Format.trim(html).replace(/[\n\t\r]+/, ''), methods));
                tpl.compile();
            }
            else if (tpl.__initialized === false) {
                Ext.applyIf(tpl, methods);
                tpl.__initialized = true;
            }
            return tpl;
        },
        debug : function() { return templates; },

        /***
         * getDuration
         * returns formatted duration from date to now
         * @param {Object} from
         * @return {String} formatted time-duration
         */
        getDuration: function(from) {
            var from = new Date(from);
            var today = new Date();
            // convert milliseconds -> days.
            var elapsed = from.getElapsed(today) * 1.15740741 * Math.pow(10, -8);
            var dur = ((from - today) < 1) ? elapsed*-1 : elapsed;
            elapsed = Math.round(elapsed);
            if (dur == 0) {
                return 'today';
            }
            else if (dur == -1) {
                return 'yesterday';
            }
            else if (dur == 1) {
                return 'tomorrow';
            }
            else if (dur > 1) {
                return elapsed + ' days';
            }
            else {
                return elapsed + ' days ago';
            }
        }
    };
}();


/***
 * @class RExt.Application
 *
 * A Resistor Software Application object.  all ajax requests / responses are piped through
 * the application.
 * @author chris scott
 *
 *
 */

Ext.namespace('RExt.Application');
(function(){
    Ext.apply(RExt.Application, {

        /***
         * response status codes.  more to come.  exception only for now.
         */
        STATUS_EXCEPTION : 'EXCEPTION',
        STATUS_VALIDATION_ERROR : "VALIDATION_ERROR",
        STATUS_ERROR: "ERROR",
        STATUS_NOTICE: "NOTICE",
        STATUS_OK: "OK",
        STATUS_HELP: "HELP",

        /** message icons **/
        ICON_ERROR :  'icon-error',
        ICON_OK :     'icon-accept',
        ICON_NOTICE : 'icon-information',
        ICON_HELP : 'icon-help',

        /**
         * True if the browser is in strict mode
         * @type Boolean
         */
        Version: '2.0-alpha1',

        /***
         * the global ID separator
         * can be overridden in your own config.js.  be sure to include your config.js BEFORE any RExt framework
         *
         */
        ID_SEP : '_',

        /***
         * page
         * pointer to RExt.Page
         */
        page : null,

        /***
         * toolbar
         * The application's toolbar.  App does not create this itself, rather, it's set by your own application
         * via Application.registerToolbar.  you may retrieve this toolbar via Application.getToolbar()
         */
        toolbar : null,

        /***
         * default alert message
         */
        alertMessage: '',

        /***
         * statusLocked
         * {Boolean} whether the header-status panel is locked or not (experimental)
         */
        statusLocked : false,

        /***
         * msgTask
         * queue for Application.setAlert messages
         */
        msgTask : new Ext.util.DelayedTask(this.checkMessageQueue, this),

        /***
         * zOffset
         * incremented / decremented by RExt.form.Popup on show/hide
         */
        zOffset : 1,

        /***
         * run
         * execute the application singleton
         *
         */
        run : function() {

            // antenna for firing events from
            var Antenna = function() {
                this.addEvents({
                    /**
                     * @event ready
                     * fires after Ext.onReady
                     */
                    "ready" : true,

                    /***
                     * @event load
                     * fires after Ext.onLoad
                     */
                    "load" : true,

                    /***
                     * @event statusfree
                     * @param {Ext.Panel} status panel
                     * fires when the header's status panel is free to be written upon.
                     */
                    "statusfree" : true
                });
            };
            Ext.extend(Antenna, Ext.util.Observable);
            this.antenna = new Antenna();

            /***
             * initialize Ext.QuickTips
             * do we really want this globally turned on?
             */
            Ext.QuickTips.init();

            // listen to onDocumentReady event
            Ext.onReady(this._onInit, this, true);

            // listen to window load event.
            Ext.EventManager.on(window, 'load', this._onLoad, this, {});


            this._initStateManager();
        },

        /**
         * onReady
         * use this method just as Ext.onReady.  Fires after the App has done it's initial configuration (after App._onInit)
         * @param {Object} method
         * @param {Object} scope
         */
        onReady : function(method, scope) {
            this.antenna.on('ready', method, scope);
        },

        /**
         * onLoad
         * use this method just as Ext.onReady.  fires after Ext.EventManager.on(window, 'load'...) after App._onLoad
         * @param {Object} method
         * @param {Object} scope
         */
        onLoad : function(method, scope) {
            this.antenna.on('load', method, scope);
        },

        /***
         * _initStateManager
         * @private
         */
        _initStateManager : function() {

            /*
             * set days to be however long you think cookies should last
             */
            var days = '';        // expires when browser closes
            if(days){
                var date = new Date();
                date.setTime(date.getTime()+(days*24*60*60*1000));
                var exptime = "; expires="+date.toGMTString();
            } else {
                var exptime = null;
            }

            var cp = new Ext.state.CookieProvider({
                path: '/',
                   expires: exptime,
                   domain: null,
                   secure: false
            });
            Ext.state.Manager.setProvider(cp);

            this.timer = new Ext.util.DelayedTask();

            /*** @private ***/
            this.dialogs = {
                basic: null,
                layout: null
            };
        },

        /***
         * createDialog
         * builds a dialog and attaches buttons [insert][update][close]
         * only Application should attach buttons to a dialog for app security.
         *
         * @param {Object} param
         */
        createDialog : function(param) {

        },


        /***
         * _onInit
         * @private
         */
        _onInit : function() {

            // create the msgBox container.  used for App.setAlert
            this.msgCt = Ext.DomHelper.insertFirst(document.body, {id:'msg-div'}, true);
            this.msgCt.setStyle('position', 'absolute');
            this.msgCt.setStyle('z-index', 9999);
            this.msgCt.setWidth(300);

            // create container for status msgs.  used for App.setStatus
            this.statusCt = Ext.DomHelper.insertFirst(document.body, {id:'app-status'}, true);
            this.statusCt.setStyle('position', 'absolute');
            this.statusCt.setStyle('z-index', 9999);
            this.statusCt.setWidth(600);
            this.statusQueue = [];

            // default dashboard component 'header-status'
            this.dashboard = this.dashboard || 'header-status';

            Application.antenna.fireEvent('ready');

        },

        /***
         * _onLoad
         * @private
         */
        _onLoad : function() {
            var loading = Ext.get('loading');
            this.loading = loading;
            if (loading) {
                setTimeout(function(){
                    loading.fadeOut({
                        remove: false
                    });
                }, 250);
            }
            Application.antenna.fireEvent('load');
        },

        getDialog : function(name) {
            if (typeof(name) == 'undefined') {
                name = 'basic';
            }
            var dialog = this.dialogs.basic;
            dialog.reset();
            return dialog;
        },

        /***
         * registerToolbar
         * @param {Ext.Toolbar} tb
         * Your custom application can register the main toolbar with the App.  the toolbar can be registered in your
         * own app.js like so:
         * App.onReady(function() {
         *     App.registerToolbar(Ext.getCmp('page-north').getBottomToolbar());
         * });
         * @param {Object} tb
         */
        registerToolbar : function(tb) {
            this.toolbar = tb;
        },
        /***
         * getToolbar
         * @return {Ext.Toolbar}
         * returns the registered toolbar
         */
        getToolbar : function() { return this.toolbar; },

        /***
         * buildMessageBox
         */
        buildMessageBox : function(title, msg) {
            switch (title) {
                case true:
                    title = App.STATUS_OK;
                    break;
                case false:
                    title = App.STATUS_ERROR;
                    break;
            }
            return [
                '<div class="msg">',
                '<div class="x-box-tl"><div class="x-box-tr"><div class="x-box-tc"></div></div></div>',
                '<div class="x-box-ml"><div class="x-box-mr"><div class="x-box-mc"><h3 class="r-icon-text ' + App._decodeStatusIcon(title) + '">', title, '</h3>', msg, '</div></div></div>',
                '<div class="x-box-bl"><div class="x-box-br"><div class="x-box-bc"></div></div></div>',
                '</div>'
            ].join('');
        },

        /***
         * buildMessageBox
         */
        buildStatusBox : function(status, title, msg) {
            return [
                '<div class="msg">',
                '<div class="x-box-tl"><div class="x-box-tr"><div class="x-box-tc"></div></div></div>',
                '<div class="x-box-ml"><div class="x-box-mr"><div class="x-box-mc"><h3 style="float:left;" class="r-icon-text ' + App._decodeStatusIcon(status) + '"><span class="title">', title, '</span></h3><div style="float:right;" class="x-tool x-tool-close"></div><div style="clear:both;height:0">&nbsp;</div><span class="msg">', msg, '</span></div></div></div>',
                '<div class="x-box-bl"><div class="x-box-br"><div class="x-box-bc"></div></div></div>',
                '</div>'
            ].join('');
        },

        // private
        _decodeStatusIcon : function(status) {
            iconCls = '';
            switch (status) {
                case true:
                case App.STATUS_OK:
                    iconCls = App.ICON_OK;
                    break;
                case App.STATUS_NOTICE:
                    iconCls = App.ICON_NOTICE;
                    break;
                case false:
                case App.STATUS_ERROR:
                    iconCls = App.ICON_ERROR;
                    break;
                case App.STATUS_HELP:
                    iconCls = App.ICON_HELP;
                    break;
            }
            return iconCls;
        },

        /***
         * setViewState, alias for Ext.state.Manager.set
         * @param {Object} key
         * @param {Object} value
         */
        setViewState : function(key, value) {
            Ext.state.Manager.set(key, value);
        },

        /***
         * getViewState, aliaz for Ext.state.Manager.get
         * @param {Object} cmd
         */
        getViewState : function(key) {
            return Ext.state.Manager.get(key);
        },

        /***
         * adds a message to queue.
         * @param {String} msg
         * @param {Bool} status
         */
        addMessage : function(status, msg) {
            var delay = 3;    // <-- default delay of msg box is 1 second.
            if (status == false) {
                delay = 5;    // <-- when status is error, msg box delay is 3 seconds.
            }
            // add some smarts to msg's duration (div by 13.3 between 3 & 9 seconds)
            delay = msg.length / 13.3;
            switch (delay) {
                case delay < 3:
                    delay = 3;
                    break;
                case delay < 3:
                    delay = 5;
                    break;
                case delay > 9:
                    delay = 9;
                    break;
                default:
                    delay = 3;
            }
            this.msgCt.alignTo(document, 't-t');
            Ext.DomHelper.append(this.msgCt, {html:this.buildMessageBox(status, String.format.apply(String, Array.prototype.slice.call(arguments, 1)))}, true).slideIn('t').pause(delay).ghost("t", {remove:true});
        },

        showWait : function(verb, msg) {
            Ext.MessageBox.wait(verb, msg);
        },

        /*** count of simultaneous showSpinner calls ***/
        loading_count : 0,

        /***
         * showSpinner
         * @param {String} msg ['Loading']
         */
        showSpinner: function(msg) {

            this.loading_count++;
            console.log('showSpinner: ', this.loading_count);
            //var loading = Ext.get('loading');
            var el = this.loading.child('.loading-indicator');
            if (el) {
                msg = msg || 'Loading';
                el.dom.innerHTML = msg + '...';
            }
            if (!this.loading.isVisible()) {
                this.loading.fadeIn();
            }
        },
        /***
         * hideSpinner
         */
        hideSpinner : function() {
            /*
            this.loading_count--;
            console.log('hideSpinner: ', this.loading_count);
            if (this.loading_count == 0) {
                Ext.get('loading').fadeOut();
            }
            */
           this.loading.fadeOut();
        },

        /***
         * update
         * handles server-response errors from ajax response.  relays on to calling object
         * when succcss === true
         * @param {Ext.UpdateManager}
         * @param {Object} ajax config for UpdateManager::update
         * @see Ext docs
         */
        update : function(um, param) {
            var cb = param.callback;
            var scope = param.scope;

            // hijack the callback to come here instead.
            param.callback = function(el, success, response, options) {
                if (this.validateResponseType('json', response)) {  // <-- could be an Exception response here
                    this.processResponse(Ext.decode(response.responseText));
                }
                cb.call(scope, el, success, response, options);
            };
            param.scope = App;
            um.update(param);
        },

        /***
         * request
         * Wrapper for Ext.Ajax.request.  handles server failures; passess response off to calling object
         * when success === true
         * @param {Object} param
         */
        request : function(param) {
            var scope = param.scope;
            var cb = param.success;        // <-- user success callback
            var cbfail = param.failure;    // <-- user failure callback. NOTE: failure here means success: false

            // hi-jack the response to come here first.  call cb only when success is true.
            param.scope = this;
            param.success = function(conn, response, options) {
                //Ext.MessageBox.hide();
                App.hideSpinner();
                if (this.validateResponseType('json', conn)) {
                    var res = Ext.decode(conn.responseText);
                    this.processResponse(res);
                    if (res.success == true && typeof(cb) == 'function') {
                        cb.call(scope, res);
                    }
                    else if (res.success === false && typeof(cbfail) == 'function') {
                        cbfail.call(scope, res);
                    }
                }
                else {
                    Ext.MessageBox.alert('Error', 'Expected json but received ' + conn.getResponseHeader['Content-Type'] + ' instead. ' + conn.responseText);
                }
            };
            param.failure = function(conn, response, options) {
                Ext.MessageBox.alert('Error', conn.statusText);
            };
            var req = Ext.Ajax.request(param);
        },

        /***
         * processResponse
         * @param {Object} res
         */
        processResponse : function(res) {
            //Ext.MessageBox.hide();
            App.hideSpinner();

            // following check will allow for both an RResponse or a form action
            if (typeof(res.form) == 'object') { res = res.result;}
            if (typeof(res.actions) != 'undefined' && res.actions.length) {    //<-- actions found in response
                for (var i=0,len=res.actions.length;i<len;i++) {
                    var a = res.actions[i];
                    var cmp = Ext.getCmp(a.component_id);
                    if (cmp && typeof(cmp.doAction) == 'function') {
                        cmp.doAction(a);
                    }
                }
            }
            if (res.status == this.STATUS_EXCEPTION) {
                this.handleServerException(res);
            }
            else if (res && res.msg.length) {
                this.setAlert(res.success, res.msg);
            }
            return res;
        },

        /***
         * handleServerException
         * process an exception response from server
         * @param {Object} res
         */
        handleServerException : function(res) {
            Ext.MessageBox.alert('Application Error', res.msg);
        },

        /***
         * handleException
         * handles a client-side exception.  if you have an exception raised anywhere in your js and don't know
         * what to do, send it to App.handleExcpetion
         * @param {Object} e
         */
        handleException : function(sender, e) {
            if (e instanceof RExt.Error) {
                console.error('App received an exception from ', sender, ', e: ', e.getMessage());
            }
            else {
                console.error('App received an exception from ', sender, ', e: ', e);
            }
        },

        /***
         * validateResponseType
         * validates an ajax response to see if it's the type you expected.
         * @param {String} expected ('json' || 'html')
         * @param {Object} response
         */
        validateResponseType : function(expected, response) {
            var match = false;
            var ctype = response.getResponseHeader['Content-Type'];

            switch (expected) {
                case 'json':
                    match = ctype.match(/^application\/json;/);
                    break;
                case 'html':
                    match = ctype.match(/^text\/html;/);
                    break;
                default:
                    alert('Application::validateResponseType -- unknown response type: "' + expected + '"');
            }
            if (!match) {  // <-- if response-type is not what expected, check to see if there's a json response
                if (ctype.match(/^application\/json;/)) {
                    Application.processResponse(Ext.decode(response.responseText));
                }
            }
            return match;
        },

        /***
         * setAlert
         * show the message box.  Aliased to addMessage
         * @param {String} msg
         * @param {Bool} status
         */
        setAlert : function(status, msg) {
            this.addMessage(status, msg);
        },

        /***
         * setStatus
         * sends a msg to the header's status panel.  This panel does not hide.
         * @param {String} status.  should be one of App's STATUS constants.  maps to an iconCls
         * @param {String} The msg title
         * @param {String} The msg body
         */
        setStatus : function(status, title, msg) {
            if (this.statusCt.first()) {
                var el = this.statusCt.first();
                var tquery = el.query('span.title');
                if (tquery.length > 0 && tquery[0].innerHTML.length == title.length) {
                    // same title as before.  update the msg (same length, anyway...just return.  don't queue)
                    el.query('span.msg')[0].innerHTML = msg;
                    return el.slideIn('t');
                }
                else {
                    this.statusQueue.push(el);
                    el.enableDisplayMode();
                    el.hide();
                    Ext.getBody().appendChild(el);  // <-- hide queued el hidden on body
                }
            }
            this.statusCt.alignTo(document, 't-t');
            var ct = Ext.DomHelper.append(this.statusCt, {html:this.buildStatusBox(status, title, msg)}, true).slideIn('t');

            // listen to [x] button
            Ext.fly(ct.query('.x-tool-close')[0]).on('click', function(node, ev) { this.statusCt.first().ghost('t', {remove:true});}, this);
            return ct;
        },

        /***
         * hideStatus
         * hides the status-box
         */
        hideStatus : function() {
            var el = this.statusCt.first();
            if (el) {
                el.ghost('t', {remove: true,scope: this,callback: function() {
                    this._checkStatusQueue();
                }});
            }
            else this._checkStatusQueue();
        },

        // private check msg queue.  any previously hidden msgs?  show 1st in queue.
        _checkStatusQueue : function() {
            if (this.statusQueue.length) {
                // DO NOT CHANGE THESE 3 LINES
                var q = this.statusQueue.pop();
                this.statusCt.appendChild(q);
                q.slideIn('t');
            }
        },

        getStatusPanel : function() {
            return this.dashboard;
        },

        /**
         * setUser
         * stores the current user's account info in Ext cookie.
         * @see Application.setViewState
         * @param {Object} account
         */
        setUser : function(account) {
            this.setViewState('user', account);
        },

        /**
         * getUser
         * returns current users account-info from Ext cookie
         * @param {Object} account
         */
        getUser : function() { return this.getViewState('user'); },

        /**
         * registerDashboard
         * Registers a panelId as the application's dashboard.  this component will be returned when following method
         * App.getDashboard is called.
         * @param {Number} panelId
         */
        registerDashboard : function(panelId) {
            this.dashboard = panelId;
        },

        /***
         * getDashboard
         * returns the dashboard panel.  probably located in page-north
         */
        getDashboard : function() {
            return Ext.getCmp(this.dashboard);
        },

        /***
         * clearDashboard
         * clears the dashboard
         */
        clearDashboard : function() {
            this.dashboard.body.dom.innerHTML = '';
        },

        /***
         * setPage
         * called by RExt.Page constructor.
         * Page informs Application about itself
         * @param {RExt.Page} page
         */
        setPage : function(page) {
            this.page = page;
        },

        /***
         * getPage
         * returns the current page object.
         */
        getPage : function() {
            return this.page;
        },

        onActionFailed : function(sender, action) {
            this.setAlert(false, action.result.msg);
        },

        /***
         * applyInlineEditors
         * does a DomQuery on supplied element looking for elements of class ".x-form-inline-field" and creates
         * appropriate inline-editor constructor to it.
         * NB:  the structure of your field id is VERY important.  it must be of the form:
         * controller-[any-thing-else-]-model-fieldname-id
         * @see RExt.util.Builder.applyInlineEditors
         */
        applyInlineEditors : function(sender, el) {
            return RExt.util.Builder.applyInlineEditors(sender, el);
        }
    });
})();

/***
 * Run the app.
 * NB:  this line MUST appear after sys.Dialog since it references it.
 * create some shortcuts to RExt.Application
 */
RExt.Application.run();
var Application = RExt.Application;
var App = Application;


/***
 * Ext.form.FieldSet
 * @author Chris Scott
 * Override Ext.form.FieldSet to add enable/disable functionality to child-fields to improve form-validation
 *
 */
Ext.override(Ext.Panel, {

    /***
     * disableFields
     * queries this component recursively for Ext.form.Fileds.  disables them.
     * @author Chris Scott
     */
    disableFields : function() {
        var fields = this.findBy(function(i) {
            return (i instanceof Ext.form.Field) ? true : false;
        });
        //console.log('disableFields: ', fields);
        for (var n=0,len=fields.length;n<len;n++) {
            fields[n].disable();
        }
    },

    /***
     * enableFields
     * queries this component for Ext.form.Fields.  enables them.
     * @author Chris Scott
     */
    enableFields : function() {
        var fields = this.findBy(function(i) {
            return (i instanceof Ext.form.Field) ? true : false;
        });
        //console.log('enableFields: ', fields);
        for (var n=0,len=fields.length;n<len;n++) {
            fields[n].enable();
        }
    },

    /**
     * Disable this component.
     * @param disableFields [false]
     * @return {Ext.Component} this
     * @author Chris Scott
     */
    disable : function(disableFields){
        disableFields = disableFields || false;
        if (disableFields == true) {
            this.disableFields();
        }
        if(this.rendered){
            this.onDisable();

        }
        this.disabled = true;
        this.fireEvent("disable", this);
        return this;
    },



    /**
     * Enable this component.
     * @param {Boolean} enableFields [false]
     * @return {Ext.Component} this
     * @author Chris Scott
     */
    enable : function(enableFields){
        enableFields = enableFields || false;
        if (enableFields == true) {
            this.enableFields();
        }
        if(this.rendered){
            this.onEnable();
        }
        this.disabled = false;
        this.fireEvent("enable", this);
        return this;
    }

});

/***
 * Ext.form.FieldSet
 * override onCollapse / onExpand to disable/enable child form-fields
 * @author: Chris Scott
 *
 */
Ext.override(Ext.form.FieldSet, {

    /***
     * onCollapse
     * disable child-fields when this is a checkbox toggle
     * @param {Object} doAnim
     * @param {Object} animArg
     */
    onCollapse : function(doAnim, animArg){
        if(this.checkbox){
            this.checkbox.dom.checked = false;
            this.disableFields();
        }
        this.afterCollapse();
    },

    /***
     * onExpand
     * enable child fields when this is checkBoxToggle
     * @param {Object} doAnim
     * @param {Object} animArg
     */
    onExpand : function(doAnim, animArg){
        if(this.checkbox){
            this.checkbox.dom.checked = true;
            this.enableFields();
        }
        this.afterExpand();
    }
});

Ext.MessageBox = Ext.apply(Ext.MessageBox, {
    fade : function(duration) {
        this.getDialog().hide();
        return this;
    }
});

/***
 * Override
 * add a method to get selected row from a EditorGrid
 *
 */
Ext.override(Ext.grid.CellSelectionModel, {
    getSelected: function() {
        if (this.selection) {
            return this.selection.record;
        }
    }
});


/***
 * Ext.form.ComboBox::onEnable
 * ComboBox has no implementation of onEnable.  when a combo is enabled and it uses a hiddenField,
 * the hiddenField will remain disabled.
 *
 * @author Chris Scott
 */
Ext.override(Ext.form.ComboBox, {
    onEnable : function() {
        Ext.form.ComboBox.superclass.onEnable.apply(this, arguments);
        if(this.hiddenField){
            this.hiddenField.disabled = false;
        }
    },
    /***
     * restrictHeight
     * bug in ext-2.0.2 assumes shadow exists on Combo
     */
    restrictHeight : function(){
        this.innerList.dom.style.height = '';
        var inner = this.innerList.dom;
        var pad = this.list.getFrameWidth('tb')+(this.resizable?this.handleHeight:0)+this.assetHeight;
        var h = Math.max(inner.clientHeight, inner.offsetHeight, inner.scrollHeight);
        var ha = this.getPosition()[1]-Ext.getBody().getScroll().top;
        var hb = Ext.lib.Dom.getViewHeight()-ha-this.getSize().height;
        var space = Math.max(ha, hb, this.minHeight || 0)-pad-2;

        /** BUG FOX FOR SHADOW **/
        if (this.shadow === true) { space-=this.list.shadow.offset; }

        h = Math.min(h, space, this.maxHeight);

        this.innerList.setHeight(h);
        this.list.beginUpdate();
        this.list.setHeight(h+pad);
        this.list.alignTo(this.el, this.listAlign);
        this.list.endUpdate();
    }
});

/***
 * Ext.form.Radio fix
 * 2008-2-28
 * http://extjs.com/forum/showthread.php?p=112848#post112848
 *
 */
Ext.override(Ext.form.Radio, {
    getGroupValue : function(){
    	var p = this.el.up('form') || Ext.getBody();
        return p.child('input[name='+this.el.dom.name+']:checked', true).value;
    },

    // private
    onClick : function(){
    	if(this.el.dom.checked != this.checked){
    		var p = this.el.up('form') || Ext.getBody();
			var els = p.select('input[name='+this.el.dom.name+']');
			els.each(function(el){
				if(el.dom.id == this.id){
					this.setValue(true);
				}else{
					Ext.getCmp(el.dom.id).setValue(false);
				}
			}, this);
		}
    }

});

Ext.override(Ext.form.TimeField, {

    initComponent : function(){
        Ext.form.TimeField.superclass.initComponent.call(this);

        if(typeof this.minValue == "string"){
            this.minValue = this.parseDate(this.minValue);
        }
        if(typeof this.maxValue == "string"){
            this.maxValue = this.parseDate(this.maxValue);
        }

        if(!this.store){
            var min = this.parseDate(this.minValue);
            if(!min){
                min = new Date('03/10/2008').clearTime();
            }
            var max = this.parseDate(this.maxValue);
            if(!max){
                max = new Date('03/10/2008').clearTime().add('mi', (24 * 60) - 1);
            }
            var times = [];
            var fuck = 0;
            while(min <= max){

                times.push([min.dateFormat(this.format)]);
                min = min.add('mi', this.increment);
                if (fuck++ > 100) {
                    //console.error('fucked 100 times');
                    //min = max + 1;
                }
            }
            this.store = new Ext.data.SimpleStore({
                fields: ['text'],
                data : times
            });
            this.displayField = 'text';
        }
    }
});

/**
 * RExt.LinkButton
 * An extension of Ext.Button to provide href attribute.  simply adds an href config param to Ext.Button.  when clicked, the button
 * will set document.location = this.href
 * xtype linkbutton
 * @author Chris Scott
 */
RExt.LinkButton = Ext.extend(Ext.Button, {
    initComponent : function() {
        if (this.href && typeof(this.handler) != 'function') { this.handler = function(btn, ev) { window.location = this.href; } }
    }
});
// register linkbutton xtype
Ext.reg('linkbutton', RExt.LinkButton);
