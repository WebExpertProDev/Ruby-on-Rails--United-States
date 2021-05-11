Ext.namespace('RExt.sys');
/***
 * @class RExt.sys.Form
 * @extends Ext.form.FormPanel
 * A basic system form extension.  handles [insert] & [update] buttons, including methods for
 * showing  / hiding them.  all sorts of other goodies.
 * @param {Object} param
 *
 * @event 'actioncomplete' relays to this.form
 * @event 'actionfailed'  realays to this.form
 * @event 'beforeaction' relay to this.form
 */
RExt.sys.Form = Ext.extend(Ext.form.FormPanel, {
                
    /***
     * @cfg {String} labelAlign [right]
     */
    labelAlign: 'right',

    /***
     * @param monitorValid [true]
     */
    monitorValid: true,

    /***
     * @config useDialog [false]
     * RExt.sys.Form
     * true to have this form build and add itself to a dialog for form popups.
     */
    useDialog : false,

    /***
     * 
     */
    dialogConfig : {},

     /***
     * @config dialog reference.  set when useDialog is set to true
     * RExt.sys.Form
     */
    dialog : null,

    /***
     * @config modal.  default modal to true.
     * RExt.sys.Form
     * applies only when useDialog: true.  trasmitted to dialog config.
     */
    modal: true,

    /***
     * shadow [true]
     * RExt.sys.Form
     * applies only when useDialog: true.  trasmitted to dialog config.
     */
    shadow: true,

    /***
     * autoFocus [true]
     * RExt.sys.Form
     * automatically focus the first field on a form.
     */
    autoFocus: true,

    /***
     * key
     * RExt.sys.Form
     * represents the database pk/fk that this form is associated with.  if key is NOT NULL, it will be
     * appended to the url in sys.Form::getHandler (eg: /controller/action/key)
     */
    key : null,

    /**
     * @cfg {String} controller
     * the name of the server controller to build urls from
     */
    contorller: '',
    
    /**
     * @cfg {Object} actions
     * A hash of verbs mapped to server actions.
     * eg: {"insert" : 'insert_this', "update" : 'update_that', "delete" : "delete_that"}         
     */
    actions: {
        "insert" : "",
        "update" : "",
        "delete" : ""
    },

    /***
     * formName
     * RExt.sys.Form
     * eg: company[fieldName] (company is formName)
     */
    formName: null,
    
    /**
     * @cfg {Boolean} deletable
     * whether this form should include a "delete" button [false]     
     */
    deletable: false,
    
    /***
     * statusCt
     * @property {Ext.Element} [null] the rendered status msg container, retrieved from App.getStatus     
     */
    statusCt : null,
    
    /**
     * defaultTitle
     */
    defaultTitle : '',
    /***
     * initComponent     
     * 
     */
    initComponent : function() {        
        
        this.defaultTitle = this.title;
                        
        // create the form-buttons
        var buttons = [
            {id: this.id + '_btn_insert', text: 'Insert', iconCls: 'icon-accept', tabIndex: 1, formBind: (this.monitorValid) ? true : false},
            {id: this.id + '_btn_update', text: 'Update', iconCls: 'icon-accept', tabIndex: 1, formBind: (this.monitorValid) ? true : false},
            {id: this.id + '_btn_delete', text: 'Delete', iconCls: 'icon-delete', tabIndex: 1},
            {id: this.id + '_btn_cancel', text: 'Close', iconCls: 'icon-cancel', tabIndex: 1, handler: this.onCancel, scope: this}
        ];

        // attach buttons to form only if the form will not be attached to a dialog.
        if (this.useDialog !== true) {
            this.buttons = buttons;                       
        }
        else {
            this.initDialog(buttons);   
                     
            // proxy the dialog's show/hide events onto this panel
            this.relayEvents(this.dialog, ['show', 'hide']);
        }
                
        // add events
        this.addEvents({

            setvalues : true,

            /***
             * @event reset
             * fires when teh form is reset
             * @param {object} this
             */
            reset : true,

            /***
             * @event cancel
             * fired when the form's cancel or close button is pressed.
             * @param {RExt.sys.Form} this
             */
            cancel: true,
            
            /**
             * @event delete
             * fired when the form's delete action has completed successfully
             * @param {Object} response
             */
            "delete" : true,
            
            /***
             * @event init
             * fired when form init is called
             */
            init : true,

            /***
             * @event beforesubmit
             * fired during the BasicForm's 'beforeaction' event.  use this to attach params to the form-request
             * @param {Ext.form.BasicForm} form
             * @parma {Ext.form.Action} action
             */
            beforesubmit: true,

            /***
             * @validate
             * fires when the form is being validated.  return false to fail the form's validation
             * @param {Ext.form.BasicForm)
             */
            validate : true,

            /***
             * @event ready
             * might be deprecated.
             */
            ready : true

        });

        // listen to show/hide events.  primarily for forms on Popup.
        this.on('show', function() {
            this.fireEvent('init', this);                        
        });
        
        // reset form key and hide status-panel when form is hidden.  VERY NB!
        this.on('hide', function() {  
            this.stopMonitoring();    // <-- STOP form validation-polling         
            App.hideStatus();        // <-- HIDE status-panel      
            this.key = null;          // <-- NULLIFY form-key        
        });
        
        // super
        RExt.sys.Form.superclass.initComponent.apply(this, arguments);

    },
       
    /***
     * labelAlign [right]
     */
    labelAlign: 'right',

    /***
     * monitorValid [true]
     */
    monitorValid: true,

    /***
     * useDialog [false]
     * RExt.sys.Form
     * true to have this form build and add itself to a dialog for form popups.
     */
    useDialog : false,

    /***
     * dialogConfig
     */
    dialogConfig : {},

     /***
     * dialog reference.  set when useDialog is set to true
     * RExt.sys.Form
     */
    dialog : null,

    /***
     * modal.  default modal to true.
     * RExt.sys.Form
     * applies only when useDialog: true.  trasmitted to dialog config.
     */
    modal: true,

    /***
     * shadow [true]
     * RExt.sys.Form
     * applies only when useDialog: true.  trasmitted to dialog config.
     */
    shadow: true,

    /***
     * autoFocus [true]
     * RExt.sys.Form
     * automatically focus the first field on a form.
     */
    autoFocus: true,

    /***
     * key
     * RExt.sys.Form
     * represents the database pk/fk that this form is associated with.  if key is NOT NULL, it will be
     * appended to the url in sys.Form::getHandler (eg: /controller/action/key)
     */
    key : null,

    /***
     * RExt.sys.Form
     * insertUrl
     * insert action url
     */
    insertUrl : null,

    /***
     * updateUrl
     * RExt.sys.Form
     * update action url
     */
    updateUrl : null,

    /***
     * formName
     * RExt.sys.Form
     * eg: company[fieldName] (company is formName)
     */
    formName: '',

    /***
     * initDialog
     * when useDialog is set to true, sys.Form will call this method to create its dialog
     * @param {Array} buttons     
     */
    initDialog : function(buttons) {
        
        this.defaultTitle = this.title;
        
        this.dialog = new Ext.Window(Ext.apply({
            title: this.title,
            layout: 'fit',
            autoScroll: true,            
            border: false,
            iconCls: this.iconCls || '',
            frame: true,
            shadow: false,
            modal: false,            
            constrain: true,           
            closeAction: 'hide',
            buttonAlign: 'center',
            buttons: buttons,
            listeners: {
                show: function(d) {
                    d.el.setStyle('overflow', 'auto');                    
                }                
            },
            items: this.buildDialog()
        },this.dialogConfig));

        // if monitorValid is on, we need to wire-up the dialog's buttons to take advantage of formBind
        // and auto-disable / enable based upon state of form validation.
        if (this.monitorValid === true) {

            // listen to clientvalidation event with teh ***SCOPE OF THE DIALOG***
            this.on('clientvalidation', function(form, valid){
                if (this.buttons) {
                    for (var i = 0, len = this.buttons.length; i < len; i++) {
                        var btn = this.buttons[i];
                        if (btn.formBind === true && btn.disabled === valid) {
                            btn.setDisabled(!valid);
                        }
                    }
                }
            },this.dialog);
        }
    },
    
    /***
     * getKey
     * @return {Integer} db-key this form is associated with
     */
    getKey : function() { return this.key; },
    
    /***
     * setKey     
     * @param {Object} v
     * associates this form with a db-record key.  this key is used to build urls (ie: controller/action/key)
     */
    setKey : function(v) { this.key = v; },
        
    /***
     * @desc setTitle
     * override setTitle to relay to dialog when useDialog == true
     * @param {String} title
     * @param {String} [iconCls]
     */
    setTitle : function(title, iconCls) {
        iconCls = iconCls || '';
        if (this.useDialog === true) {
            this.dialog.setTitle(title, iconCls);
        }
        else {
            RExt.sys.Form.superclass.setTitle.apply(this,arguments);
        }
    },

    /***
     * buildDialog
     * called during initDialog.  the return array will be attached as the dialog's items
     * returns [this] by default.  override to return custom list of panels.
     * @return {Array}
     */
    buildDialog : function() {
        return this;
    },

    /***
     * init
     * no-impl.  meant to be over-ridden.  use this method to show/hide fieldsets.
     */
    init : function() { },

    /***
     * setValues
     * provide a higher-level method for setValues.  setValues is a method of BasicForm
     */
    setValues : function(data) {        
        if (!this.formName) {
            this.form.setValues(data);
            return true;
        }
        values = {};
        if (this.formName) {
            for (var key in data) {
                values[this.formName + '[' + key + ']'] = data[key];
            }
        }
        this.form.setValues(values);
    },

    /***
     * formify
     * @author Chris Scott
     * pre-compiles a form-hash for use in form.setValues
     * @param {Object} data
     * @param {String} rootPrefix, the prefix to append to all non-object values (eg: rootPrefix[foo])
     * @param {Array} [key] optional list of extra data keys to formify.
     * eg:
     * var data = {    // <-- with the folling complex datastructure, we can use formify to produce a flat structure suitable for BasicForm::setValues
     *     company: {
     *         id: 23,
     *         name: 'foo',
     *
     *         city: {
     *             id: 234,
     *             name: 'Brandon'
     *         }
     *     }
     *
     *     var formData = fpanel.formify(entity, 'company', {city: true});
     *     // produces the following data-structure, suitable for sending to BasicForm::setValues:
     *     {
     *         company[id]: 23,
     *         company[name]: 'foo',
     *         city[id]: 234,
     *         city[name]: 'Brandon'
     *     }
     *
     */
    formify : function(data, rootPrefix, keys) {
        keys = keys || [];

        var output = {};
        for (var k in data) {
            if (typeof(data[k]) != 'object') {
                output[rootPrefix + '[' + k + ']'] = data[k];
            }
            else if(keys[k] === true) {  // <-- iterate nested data, as requested in @param keys
                var nested = data[k];
                for (var _k in nested) {
                    if (typeof(nested[_k]) != 'object') {
                        output[k + '[' + _k + ']'] = nested[_k];
                    }
                }
            }
        }
        return output;
    },

    /***
     * build
     * override.  this method is called in the constructor.  you should return a panel / array of panels
     * which will be attached to an Ext.Panel's items collection.
     */
    build : function() {
        return this.items;
    },

    /***
     * reset
     * reset the form.
     */
    reset : function() {
        this.startMonitoring();
        this.form.purgeListeners();
        this.form.reset();
        this.fireEvent('reset', this);
        
        var title = ((this.verb == 'insert') ? 'New' : 'Edit') + ' ' + this.defaultTitle;
        this.setTitle(title);
        
        if (this.autoFocus == true && this.form.items.getCount() > 0) {
            var form = this.form;            
            setTimeout(function() {
                var item = form.items.find(function(i) {                    
                    return (i.disabled == false && i.inputType != 'hidden') ? true : false;
                });                                
                if (item) {                     
                    item.el.dom.select();                      
                    item.focus();
                }
            }, 250);
        }
    },
   
    /***
     * getHandler
     * return the form handler method.
     * pressed submit button is disabled if isValid and validation-monitoring is temporarily disabled.
     * form-validation is turned back on in actioncomplete & actionfailed.
     * @param {String} url the name of the controller/action to execute
     */
    getHandler : function(action) {                
        var url = this.urlFor(action);
        return (typeof(url) != null) ? function(btn, ev) {            
            this.activeButton = btn;
            temp_url = url;
            if (this.key != null) {
                temp_url += '/' + this.key;
            }
            var form = this.getForm();            
            this.activeButton = btn;
            if (action == 'delete') {
                this.onDelete();       
            }
            else if (this.isValid()) {
                this.stopMonitoring();   // <-- stop monitoring for validation during request.
                btn.disable();           // <-- disable button to prevent multiple submits                
                form.submit({url: temp_url, params: this.getParams()});
            }
        } : alert('RExt.sys.Form::getHander() url = ' + url + ' -- did you set your insertUrl / updateUrl?');
    },
    
    /***
     * urlFor
     * @param {String} action
     * @return {String} url
     * given an action name, returns an url based upon controller/action
     */
    urlFor : function(action) {        
        return (this.controller != null && typeof(this.actions) == 'object') ? this.controller + '/' + this.actions[action] : alert('Chris broke your code.  Each sys.Form needs controller and actions defined now.  RExt.sys.Form::urlFor (' + this.id + ') controller is null');         
    },
    
    /***
     * isValid
     * override to provide your own custom validation but don't forget to call super.
     * @return {Boolean}
     */
    isValid : function() {
        var valid = (this.form.isValid() && this.fireEvent('validate'));

        if (valid) { 
            App.hideStatus();                         
            return true; }    // <-- if true, fuck off immediately.

        var invalid = this.getInvalidFields();  // <-- {fields : [Ext.form.Field], names: [String]}
        if (invalid.fields.length) {
            App.setStatus(App.STATUS_ERROR, 'Your form contains invalid fields', invalid.names.join(', '));                        
        }
        return false;

    },

    /***
     * getInvalidFields
     * returns an object containing  a list of invalid fields along with a list of corresponding fieldLabels
     * @return {Object} fields, names
     */
    getInvalidFields : function() {
        var list = {
            fields : [],
            names : []
        };
        this.form.items.each(function(i) {
            if (i.validate() == false) {
                list.fields.push(i);
                list.names.push(i.fieldLabel);
            }
        });
        return list;
    },

    /***
     * getParams
     * add optional params to form submit.
     */
    getParams : function() {
        return {};
    },

    /***
     * on
     * override on; relay BasicForm events on to BasicForm
     * @param {Object} event
     * @param {Object} method
     * @param {Object} scope
     */
    on : function(event, method, scope) {
        switch (event) {
            case 'actioncomplete':
                this.form.on(event, method, scope);
                break;
            case 'actionfailed':
                this.form.on(event, method, scope);
                break;
            case 'beforeaction':
                this.form.on(event, method, scope);
                break;
            default:
                // else super
                RExt.sys.Form.superclass.on.apply(this, arguments);
        }
    },

    /***
     * showInsert
     * show form's [insert] button.
     * @param {String} action ["insert"], the action to perform.  you might send it "validate" as well.
     */
    showInsert : function(action) {  
        this.verb = 'insert';      
        this.insertUrl = this.urlFor(action || 'insert');        
        this.reset();
        this.applyResponseHandlers();
        this.showButton('insert');
        if (this.useDialog === true) {
            this.showDialog({
                verb: 'insert'
            });            
        }
    },

    /***
     * showUpdate
     * show form's [update] button
     * @param {Object} param
     */
    showUpdate : function(action) {
        this.verb = 'update';
        this.updateUrl = this.urlFor(action || 'update');        
        this.reset();
        this.applyResponseHandlers();
        this.showButton('update');
        if (this.useDialog === true) {
            this.showDialog({
                verb: 'update'
            });            
        }
    },

    // private
    showDialog : function(param) {
        if (this.request ) {
            function onReady(){
                this.dialog.show();                                
            }
            this.un('ready', onReady, this);
            this.on('ready', onReady, this);
        }
        else {
            this.dialog.show();                       
        }
    },
    
    /***
     * hide
     */
    hide : function() {                  
        if (this.useDialog == true) {
            this.dialog.hide();
        }
        else {
            RExt.sys.Form.superclass.hide.apply(this, arguments);
        }
    },

    /***
     * applyResponseHandlers
     * adds automatic form event-handlers to do stuff like Application.setAlert for you.
     *
     */
    applyResponseHandlers : function() {
        if (this.hasListener('delete')) {
            this.events['delete'].clearListeners();
        }
        /*
        if (this.hasListener('cancel')) {
            this.events['cancel'].clearListeners();
        }
        */
        
        this.form.removeListener('actioncomplete', this.doActionComplete, this);
        this.form.removeListener('actionfailed', this.doActionFailed, this);
        this.form.removeListener('beforeaction', this.doBeforeAction, this);

        this.form.on('actioncomplete', this.doActionComplete, this);
        this.form.on('actionfailed', this.doActionFailed, this);
        this.form.on('beforeaction', this.doBeforeAction, this);
        
        
    },

    doBeforeAction : function(form, action) {
        App.showSpinner((action.type == 'submit')?'Saving':'Loading');        
        this.fireEvent('beforesubmit', form, action);
        //if (!Ext.MessageBox.isVisible()) {            
            //Ext.MessageBox.wait((action.type == 'submit')?'Saving':'Loading', 'Please wait...');
            
        //}
    },

    doActionComplete : function(form, action) {
        //Ext.MessageBox.hide();
        App.hideSpinner();
        if (typeof(action.result) != 'undefined') {
            App.processResponse(action.result);                       
        }
        if (this.activeButton != null) {
            this.activeButton.enable();
            this.activeButton = null;
        }
        this.startMonitoring();    // <-- restart form validation-monitor
    },

    doActionFailed : function(form, action) {
        form.isValid();
        if (this.activeButton != null) {
            this.activeButton.enable();
            this.activeButton = null;
        }
        this.startMonitoring();     // <-- restart form validation-monitor

        //Ext.MessageBox.hide();
        App.hideSpinner();
        if (typeof(action.result) != 'undefined' && action.result.msg) {
            App.processResponse(action.result);            
            if (typeof(action.result.data.fields) != 'undefined') {
                var fields = action.result.data.fields;
                for (var n=0,len=fields.length;n<len;n++) {
                    var f = form.findField('company[' + fields[n] + ']');
                    if (f) {
                        f.reset();
                        f.markInvalid();
                    }
                }
            }
        }
    },

    /***
     * showButton
     * @private
     * @param {Object} id
     * NOTE: the button.id is VERY important here due to "this.getHandler(this[id.split('_').pop() + 'Url'])".
     *       if you change the button.id, you're not going to get a handler.
     * if useDialog === true, the buttons will come from teh dialog.
     */
    showButton : function(action) {
        id = this.id + '_btn_' + action;        
        var buttons = (this.useDialog === true) ? this.dialog.buttons : this.buttons;
        if (!buttons || typeof(buttons) == 'undefined') { return false; }
        for (var n=0,len=buttons.length;n<len;n++) {
            var btn = buttons[n];
            if (btn.id == id) {
                btn.purgeListeners();
                btn.setHandler(this.getHandler(action), this);
                btn.enable();
                btn.show();
            }           
            else if (btn.id == this.id + '_btn_delete') {                
                if (this.deletable === false) {
                    btn.disable();
                    btn.hide();
                }
                else {
                    btn.purgeListeners();
                    btn.setHandler(this.getHandler("delete"), this);
                    btn.enable();
                    btn.show();    
                }
            }
            else if (btn.id != this.id + '_btn_close' && btn.id != this.id + '_btn_cancel') {
                btn.disable();
                btn.hide();
            }
        }
    },

    /***
     * getButton
     * @param {Object} id
     */
    getButton : function(id) {
        if (!this.buttons) { return false; }
        var found = false;
        var n = 0;
        var len = this.buttons.length;
        while (n < len && !found) {
            if (this.buttons[n].id == id) {
                found = this.buttons[n];
            }
            n++;
        }
        return found;
    },

    /***
     * onCancel
     * cancel-button handler
     * @param {Object} btn
     * @param {Object} ev
     */
    onCancel : function(btn, ev) {        
        this.stopMonitoring();
        if (this.useDialog == true) {
            this.dialog.hide();
        }
        this.fireEvent('cancel', this);
    },
    
    /**
     * onDelete
     * delete button handler
     */
    onDelete : function() {
        Ext.MessageBox.confirm('Confirm', 'Delete ' + this.controller + '?', function(btn) {                
            if (btn == 'yes') {       
                App.request({
                    url: temp_url,                            
                    method: 'POST',
                    success: function(res){                                
                        this.fireEvent('delete', res);
                    },
                    scope: this                           
                });                                                    
            }
        },this);                    
    },
    
    /***
     * maximize
     * maximize the window if useDialog == true
     */
    maximize : function() {        
        if (this.useDialog == true) { 
            this.dialog.maximize(); 
        }
        else {
            alert('Apollo.order.HWB Error -- maximize called but useDialog is false');
        }
    },
    
    /***
     * findField
     * searchs the BasicForm by appending formName onto incoming field-name param
     * @param {String} field-name
     * @param {Boolean} prefixFormName [true], whether to prefix the form-name onto the supplied field
     * @return {Ext.form.Field}
     */
    findField : function(name, prefixFormName) {
        prefixFormName = prefixFormName || true;
        if (this.formName != null && prefixFormName === true) {
            name = this.formName + '[' + name + ']';
        }
        return this.form.findField(name);    
    }
});

/**    
 * @desc An extension of Ext.menu.BaseItem for containing a FormPanel in a dropdown Ext.menu.Menu
 * @author Chris Scott
 * @param {Object} param
 */
RExt.menu.PanelItem = function(param) {
    // fix change in api -- no longer a FormItem -- it's a general PanelItem.
    if (typeof(param.form) == 'object') {
        param.panel = param.form;
        delete param.form;
    }
    if (typeof(param.panel) == 'undefined') {
        alert('RExt.menu.PanelItem::constructor -- you must supply a panel to constructor');
        return false;
    }

    // add a close button to form.  listen to events from it.  raise 'deactivate'.
    // parent Popup is listening for this event.        
    if (typeof(param.panel.tools) == 'undefined') {
        param.panel.tools = [];
    }
    param.panel.tools.push({id:'close', handler: function() { this.fireEvent('deactivate', this); }, scope: this});
    

    // *super
    RExt.menu.PanelItem.superclass.constructor.apply(this, arguments);

};
Ext.extend(RExt.menu.PanelItem, Ext.menu.BaseItem, {
    itemCls : "r-menu-form-item",

    /***
     * hideOnClick
     * don't auto-hide menu item when clicked.
     */
    hideOnClick: false,

    /***
     * onRender
     * override BaseItem::onRender
     */
    onRender : function() {
        // build domNode
        var s = document.createElement("span");
        s.className = this.itemCls;
        this.el = s;

        // super
        RExt.menu.PanelItem.superclass.onRender.apply(this, arguments);
                        
        // render form
        this.panel.render(this.el);     
        
           
    }
});

Ext.namespace('RExt.Toolbar');
/***
 * RExt.Toolbar.PopupButton
 * @desc
 * A special extension of Ext.Button for showing an RExt.form.Popup.  it's raison d'etre is to
 * re-arrange where the button's click-event occurs.  in the default Ext.Button, it's fired *after*
 * the menu is shown, which is a problem when you want to show/hide things on a menu popup.  this
 * class overrides onClick and fires click *before* menuShow()
 * you should use to show the appropriate button [insert] or [update]
 * @author Chris Scott
 * @param {Object} param
 *
 */
RExt.Toolbar.PopupButton = function(param) {
    // super
    RExt.Toolbar.PopupButton.superclass.constructor.apply(this, arguments);

    // add handlers to set/unset ignoreNextClick property when popup is shown/hidden.
    this.on('menushow', function(btn, menu) {
        if (btn.ignoreNextClick != true) {
            btn.ignoreNextClick = true;
        }
        return false;
    });
    this.on('menuhide', function(btn, menu) {
        btn.ignoreNextClick = false;
    });
};
Ext.extend(RExt.Toolbar.PopupButton, Ext.Toolbar.Button, {

    /***
     * onClick
     * override Ext.Button::onClick,
     * @param {Object} e
     */
    onClick : function(e){
        if(e){
            e.preventDefault();
        }
        if(e.button != 0){
            return;
        }
        this.menu.toFront();
        
        if(!this.disabled){

            if (!this.ignoreNextClick) {    // <-- chris adds this
                if(this.handler){
                    this.el.removeClass("x-btn-over");
                    this.handler.call(this.scope || this, this, e);
                }
                this.fireEvent("click", this, e); // <-- Chris: fire click-event first, before showMenu
            }
            if(this.enableToggle && (this.allowDepress !== false || !this.pressed)){
                this.toggle();
            }
            if(this.menu && !this.ignoreNextClick){
                this.showMenu();
            }

        }
    },

    /**
     * Show this button's menu (if it has one)
     */
    showMenu : function(){
        if(this.menu){
            this.ignoreNextClick = true;    // <-- chris adds "ignoreNextClick" to prevent menu-show twice.

            if (this.menu.hidden == false) {    // <-- if !hidden, the menu is opened from another button already.  hide first.
                this.menu.hide();
            }
            this.menu.purgeListeners();    // <-- purge previous listeners on this popup.  listen only to the latest button to show it.
            this.menu.on("show", this.onMenuShow, this);
            this.menu.on("hide", this.onMenuHide, this);

            this.menu.show(this.el, this.menuAlign);
        }
        return this;
    },

    /**
     * Hide this button's menu (if it has one)
     */
    hideMenu : function(){
        if(this.menu){
            this.ignoreNextClick = false;    // <-- return ignoreNextClick to ground-state.
            this.menu.hide();
        }
        return this;
    }
});

/**
 * @class RExt.form.Popup
 * @desc
 * An implementation of Ext.menu.Menu for creating a popup form.
 * I've added a bunch of methods from Ext.Window related to z-indexing and Window mgmt.
 * Popup registers itself with teh global Ext.WindowMgr and has methods toFront(), toBack(), etc.
 * @extends Ext.menu.Menu
 * 
 *
 * @param {Object} param
 */
RExt.form.Popup = function(param) {
    // ref to FormPanel
    if (typeof(param.form) != 'undefined' && typeof(param.form.form) != 'undefined') {
        this.form = param.form;
        
        // auto-hide popup on form's cancel button.
        this.form.on('cancel', function(){ // <-- this might break if a form doesn't have 'cancel' event as sys.Form does.
            this.hide();
        }, this);

        var formItem = new RExt.menu.PanelItem({
            form: param.form
        });

        // listen to 'close' events from form.  close popup when.
        formItem.on('deactivate', function(item){
            this.hide();
        }, this);

        // build the items
        param.items = [formItem];
    }

    // super
    RExt.form.Popup.superclass.constructor.call(this, param);
    
    // add a click-handler to form.  call bringToFront when the popup is clicked.   
    this.form.on('render', function() {
        this.form.getEl().on('click', function(ev, node){
            if (node.type != 'button') {
                this.toFront();
            }
        },this);    
    },this);    
    
    Ext.ComponentMgr.register(this);

    if (this.actsAsDialog == true) {
        Ext.menu.MenuMgr.unregister(this);
    }

    // register popup with Ext.WindowMgr.  copied from Ext.Window
    this.manager = Ext.WindowMgr;
    this.manager.register(this);

};
Ext.extend(RExt.form.Popup, Ext.menu.Menu, {

    /***
     * form ptr
     */
    form : null,

    /***
     * zIndex
     * starting zIndex of popups
     */
    zIndex : 15000,

    /***
     * destroyable [false]
     * set true to make this popup destroyalbe
     */
    destroyable: false,

    /***
     * autoFocus
     */
    autoFocus : true,
    
    shadow: false,
    
    /***
     * actsAsDialog [true]
     * when true, Popup will unregister itself form Ext.menu.MenuMgr, preventing document-clicks from
     * auto-hiding the popup.  this disables the "dropdown menu-like behaviour".
     * false will give it the normal behaviour of menu-item.
     */
    actsAsDialog: true,

    /**
     * Brings this window to the front of any other visible windows (from Ext.Window)
     * @return {Ext.Window} this
     */
    toFront : function(){
        if(this.manager.bringToFront(this)){
            this.focus();
        }
        return this;
    },

    /**
     * Sends this window to the back of (lower z-index than) any other visible windows (from Ext.Window)
     * @return {Ext.Window} this
     */
    toBack : function(){
        this.manager.sendToBack(this);
        return this;
    },

    /**
     * @copied from Ext.Window
     * Makes this the active window by showing its shadow, or deactivates it by hiding its shadow.  This method also
     * fires the activate or deactivate event depending on which action occurred.
     * @param {Boolean} active True to activate the window, false to deactivate it (defaults to false)
     */
    setActive : function(active){
        if(active){
            this.fireEvent('activate', this);
        }else{
            this.fireEvent('deactivate', this);
        }
    },

    // private (from Ext.Window)
    // z-index is managed by the WindowManager and may be overwritten at any time
    setZIndex : function(index){
        this.el.setZIndex(++index);
        index += 5;
        this.lastZIndex = index;
    },

    /***
     * getFormPanel
     * return {Ext.FormPanel} return the contained FormPanel
     *
     */
    getFormPanel : function() {
        return this.form;
    },

    /***
     * show
     */
    show: function(){

        // *super*
        RExt.form.Popup.superclass.show.apply(this, arguments);
        
        // try FF cursor fix action
        this.el.setStyle('overflow', 'auto');
                    
        // fireEvent 'show' on the attached form to allow it to initialize itself.
        this.form.fireEvent('show', {});

        this.toFront();
        
        this.form.el.setStyle('overflow', 'auto');
        if (this.autoFocus) {
            var task = new Ext.util.DelayedTask();
            task.delay(100, function(){
                var form = this.getFormPanel().form;
                if (form.items.getCount() > 0) {
                    var field = form.items.find(function(f){
                        return (f.disabled == false && f.hidden == false && f instanceof Ext.form.TextField) ? true : false;
                    });
                    if (field) {
                        field.focus();
                    }
                }
            },this);
        }
    },

    /***
     * hide
     *
     */
    hide : function() {
        RExt.form.Popup.superclass.hide.apply(this, arguments);
        RExt.form.Popup.zOffset--;    // <-- decrement Application.zOffset
        this.form.fireEvent('hide', {});

    },
    
    
    /***
     * render
     * override Ext.menu.Menu::render
     * disable the Ext.menu.MenuNav object because it short-circuits key-navigation on form-fields.
     * key-nav is unnecessary for Popup forms.
     * @author Chris Scott
     */
    render : function(){
        if(this.el){
            return;
        }
        var el = this.el = this.createEl();

        //this.keyNav = new Ext.menu.MenuNav(this);    // <-- disable keynav

        if(this.plain){
            el.addClass("x-menu-plain");
        }
        if(this.cls){
            el.addClass(this.cls);
        }
        // generic focus element
        this.focusEl = el.createChild({
            tag: "a", cls: "x-menu-focus", href: "#", onclick: "return false;", tabIndex:"-1"
        });
        var ul = el.createChild({tag: "ul", cls: "x-menu-list"});
        ul.on("click", this.onClick, this);
        ul.on("mouseover", this.onMouseOver, this);
        ul.on("mouseout", this.onMouseOut, this);
        this.items.each(function(item){
            var li = document.createElement("li");
            li.className = "r-form-popup-item";    // <-- disable item cssclass.  it prevents text-selection on form-items
            ul.dom.appendChild(li);
            item.render(li, this);
        }, this);
        this.ul = ul;
        this.autoWidth();

        this.el.addClass('r-form-popup');        
    },

    /***
     * destroy
     * implement destroy method for popup.
     * only destroy if config option "destroyable" is true.  default false.
     * also use the destroy method to close open-popups.
     */
    destroy : function() {
        if(this.manager){
            this.manager.unregister(this);
        }
        if (this.destroyable == true) {
            Ext.ComponentMgr.unregister(this);
            this.removeAll();
        }
        if (this.hidden == false) {
            this.hide();
        }
    }
});
/***
 * zOffset
 * static property to ensure that when a popup is shown, it gets highest current z-index
 * zOffset is decremented when a popup is hidden
 */
RExt.form.Popup.zOffset = 1;

/**
 * @class RExt.form.Component 
 * @descmeant to be used as a baseclass for creating form-fieldset/component plugins.
 * You may listen to any of the relayed-events "beforesubmit", "reset", "init" and "setdomain"
 * @author Chris Scott
 */
RExt.form.Component = Ext.extend(Ext.Panel, {

    domain : null,
    autoHeight: true,
    layout: 'form',
    frame: true,

    /***
     * init
     * called automatically by Ext framework
     * @param {Ext.form.FormPanel} fpanel
     */
    init : function(fpanel) {        
        // listen to teh following events when fired by teh parent FormPanel.  you may listen to any of these via on('eventname', ...)
        this.relayEvents(fpanel, ['show', 'hide', 'beforesubmit', 'validate', 'reset', 'init', 'setdomain', 'setvalues']);

        // save a ptr -> BasicForm, for convenience.        
        this.parent = fpanel;                
                
        // this is a bit tricky.  this.region must correlate with fpanel::get[RegionName]
        // eg:  if region is 'accordion', FormPanel must have method getAccordion, which will return a Panel
        var method = 'get' + this.region.charAt(0).toUpperCase() + this.region.substr(1, this.region.length-1);
        if (typeof(fpanel[method] == 'function')) {            
            fpanel[method]().add(this);
        }
        else {
            fpanel.add(this);
        }
        
    }      
});

/**
 * @class RExt.form.AccordionForm 
 * 
 * @desc A basic 2-column-layout for forms.  left should hold your main form; right is an accordion to contain plugins.
 * STILL A BIT RAW
 * @author Chris Scott 
 */
RExt.form.AccordionForm = Ext.extend(RExt.sys.Form, {

    layout: 'column',
    autoWidth: false,
    autoHeight: false,
    leftWidth: 0.6,
    accordionWidth: 0.4,

    // some pointers to layout elements.  left is "left column", accordion is the...accordion.
    accordion : null,
    left: null,

    /***
     * initComponent
     */
    initComponent : function() {

        var left = new Ext.Panel({
            id: this.id + '_column_left',                        
            frame: false,
            layout: 'fit',
            title: 'Untitled Left',
            header: false,
            //margins: '5 5 5 5',
            columnWidth: this.leftWidth,
            style: 'margin-right:5px',
            labelWidth: 75
        });

        var accordion = new Ext.Panel({
            id: this.id + '_column_right',
            layout: 'accordion',
            border: false,
            //margins: '5 5 5 0',
            columnWidth: this.accordionWidth,
            header: false,
            title: 'Untitled Accordion',
            frame: false,
            layoutConfig: {
                fill: true,
                titleCollapse: true,
                activeOnTop: true,
                animate: false,
                fill: true
            }
        });

        if (typeof(this.items) != 'undefined') {
            for (var n = 0, len = this.items.length; n < len; n++) {
                var i = this.items[n];
                if (typeof(i.region) != 'undefined') {
                    if (i.region == 'left') {
                        i = Ext.apply(left, i);

                    }
                    else
                        if (i.region == 'accordion') {
                            i = Ext.apply(accordion, i);
                        }
                }
            }
        }
        this.items = [left, accordion];

        RExt.form.AccordionForm.superclass.initComponent.apply(this, arguments);
    },

    /***
     * getLeftColumn
     * @return {Ext.Panel}
     */
    getLeft : function() {
        if (this.left == null) {
            this.left = this.getComponent(this.id + '_column_left');
        }
        return this.left;
    },

    /***
     * getAccordion
     * @return {Ext.Panel}
     */
    getAccordion : function() {
        if (this.accordion == null) {
            this.accordion = this.getComponent(this.id + '_column_right');
        }
        return this.accordion;
    }
});

