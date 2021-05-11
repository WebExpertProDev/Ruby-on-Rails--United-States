Ext.namespace('RExt.company');

// create a simple observable to hand back when loadDomain is called.  when loadDomain's
// ajax request has completed, it'll fire events through this "receipt" object.
RExt.company.DomainLoadRequest = function(domain) {

    this.domain = domain || null;  // <-- use this as a flag to determine teh response type.

    this.addEvents({
        /***
         * @event loadnull
         * fired when Ext.Ajax.request has completed and the requested domain has been loaded
         * @param {Object} domain
         */
        "load" : true
    });
};
Ext.extend(RExt.company.DomainLoadRequest, Ext.util.Observable);

/***
 * RExt.company.Util
 * generic company utilitiy singleton.  used for managing domain data and other stuff
 * most important, you can query company domains with this thing.
 * var domain = RExt.company.Util.loadDomain(id)  // <-- will check cache -- if not exists there, will query server for it.
 * var domain = RExt.company.Util.getDomainById(id) // <-- will check its cache only
 * var domain = RExt.company.Util.getDomainByName(name)  // <-- same as above.
 * @author Chris SCott
 */
RExt.company.Util = function() {

    var url = '/company/on_new';

    // collection of domains, indexed by name
    var domains = new Ext.util.MixedCollection();

    return {

        /***
         * addDomains
         * @param {Array} data from ActiveRecord
         */
        addDomains : function(data) {
            for (var n=0,len=data.length;n<len;n++) {
                data[n].roles = null;
                domains.add(data[n].name, data[n]);
            }
        },

        /***
         * getDomainByName
         * @param {Object} name
         */
        getDomainByName : function(name) {
            return domains.get(name);
        },

        /***
         * getDomainById
         * @param {Object} id
         */
        getDomainById : function(id) {
            return domains.find(function(d) {
                return (d.id == id) ? true : false
            })
        },

        /***
         * cacheRoles DEPRECATED
         * put an item with updated data (ie: loaded-roles) back into domain collection.
         * @param {Object} domain
         */
        cacheRoles : function(domain) {
            if (domains.containsKey(domain.name)) {
                domains.replace(domain.name, domain);
            }
            else {
                alert('RExt.company.Util::setDomain -- could not locate domain in collection : ' + domain.name);
            }
        },

        /***
         * cacheDomain SAME AS ABOVEV...BETTER NAME
         * put an item with updated data (ie: loaded-roles) back into domain collection.
         * @param {Object} domain
         */
        cacheDomain : function(domain) {
            if (domains.containsKey(domain.name)) {
                domains.replace(domain.name, domain);
            }
            else {
                alert('RExt.company.Util::setDomain -- could not locate domain in collection : ' + domain.name);
            }
        },

        /***
         * addDomainMenu
         * @param {Object} data
         */
        addDomainMenu : function(data) {
            this.menuData = data;
        },

         /***
         * getCompanyDomainMenu
         * returns a recursive list of company domains for use as a dropdown menu
         */
        getCompanyDomainMenu : function(handler, scope) {
            var list = this.menuData;
            var items = buildMenuItems(0, list);
            function buildMenuItems(parent_id, list) {
                var items = [];
                for (var t=0,lent=list.length;t<lent;t++) {
                    var d = list[t];
                    if (d.parent_id == parent_id) {
                        var item = {text: d.label, domain_id: d.id};
                        var children = buildMenuItems(d.id, list);
                        if (children.length > 0) {
                            item.menu = {
                                items: children
                            };
                        }
                        else {
                            item.handler = handler;
                            item.scope = scope;
                        }
                        items.push(item);
                    }
                }
                return items;
            }
            return new Ext.menu.Menu({
                items: items
            });
        },

        /***
         * loadDomain
         * @private
         * if roles don't exist in local role-cache, ask server for this domain's roles on domain_id || domain name (type).
         * the domain-role cache should be moved to RExt.company.Util
         * @param {Int} id
         * @return {Ext.Ajax.Request}
         */
        loadDomain : function(id) {
            var domain = this.getDomainById(id);
            if (domain.roles != null) {
                return domain;
            }
            var domain_url = url + '/' + id;    // <-- url defined in constructor.

            App.showSpinner('Initializing');

            // create receipt to return to caller.  receipt has 1 event -- load -- fired when ajax requestcomplete fire.
            // receipt 'load' event has one param -- the domain you requested.
            var receipt = new RExt.company.DomainLoadRequest();

            var request = Ext.Ajax.request({
                url: domain_url,
                method: 'GET',
                text: 'Initializing...',
                success: function(conn, response, options){
                    var res = Ext.decode(conn.responseText);

                    // if a new domain obect was sent in response, use that instead.
                    if (typeof(res.data.domain) == 'object') { this.domain = res.data.domain; }

                    var domain = res.data.domain;
                    domain.roles = res.data.roles;
                    domain.fields = res.data.fields;

                    this.cacheDomain(domain);

                    receipt.fireEvent('load', domain);
                    App.hideSpinner();
                },
                failure: function(conn, response, options){
                    console.error('RExt.company.Util -- loadDomain failure! ', conn, ', ', response, ', ', options);
                    App.hideSpinner();
                },
                scope: this
            });
            return receipt;
        },

        /***
         * loadDomainById
         * alias for loadDomain
         * @param {Object} id
         */
        loadDomainById : function(id) {
            return this.loadDomain(id);
        },

        /***
         * loadDomainByName
         * same as above but loads by name instead of id
         * @param {string} name
         */
        loadDomainByName : function(name) {
            var domain = this.getDomainByName(name);
            if (domain) {
                return this.loadDomain(domain.id);
            }
        },

        /***
         * styleizeRoles
         * attaches css-class version of role.identifier to each entityRole.  (entityRole is either account_role or company_role)
         * @param {Object} roles
         * @param {Object} entityRoles
         * @return {Object} entityRoles with attached cls param.
         */
        styleizeRoles : function(roles, entityRoles) {
            for (var n=0,len=entityRoles.length;n<len;n++) {
                entityRoles[n].cls = roles[entityRoles[n].id].cls;
            }
            return entityRoles;
        }
    }
}();

/***
 * RExt.company.AccountRecord
 * use for views and combos
 */
RExt.data.Account = Ext.data.Record.create([
    {name: 'id', mapping: 0},
    {name: 'first', mapping: 1},
    {name: 'last', mapping: 2},
    {name: 'roles', mapping: 3}
]);
/***
 * RExt.company.Record
 * use for Views and Combos
 */
RExt.data.Company = Ext.data.Record.create([
    {name: 'id', mapping: 0},
    {name: 'name', mapping: 1},
    {name: 'roles', mapping: 2},
    {name: 'domain_id', mapping: 3}
]);

/***
 * RExt.data.Location
 * Location record for combos and dataviews.
 */
RExt.data.Location = Ext.data.Record.create([
    {name: 'id'},
    {name: 'name'},
    {name: 'country'},
    {name: 'region'},
    {name: 'city'},
    {name: 'airport'},
    {name: 'is_primary'},
    {name: 'is_billing'},
    {name: 'form'}
]);


/***
 * RExt.company.CompanyCombo
 * @param {Object} param
 */
RExt.company.CompanyCombo = Ext.extend(RExt.form.ComboBoxAdd, {
    domain: null,

    // id of the CompanyForm available via Ext.getCmp
    form_id: 'company_form',
    company_id: null,
    controller: 'company',
    actions : {
        load: 'search',
        insert: 'insert_company'
    },
    tplId : 'combo-template',

    // Ext params
    emptyText: 'Select company...',
    shadow: false,
    tabIndex: 1,
    anchor: '90%',
    hiddenId: Ext.id(),
    fieldLabel: 'Company',
    allowBlank: false,
    mode: 'remote',
    triggerAction: 'all',
    valueField: 'id',
    displayField: 'name',
    pageSize: 10,
    itemSelector: 'div.search-item',

    initComponent: function(){

        this.store = new Ext.data.Store({
            proxy: new Ext.data.HttpProxy({
                url: this.controller + '/' + this.actions.load
            }),
            reader: new Ext.data.JsonReader({
                root: 'data',
                totalProperty: 'total',
                id: 0
            }, RExt.data.Company),
            baseParams: {
                domain_id: null,
                company_id : null
            }
        });

        // listen to [+] button
        this.on('add', this.onAdd, this);

        // call setDomain if domain was provided in constructor.  this sets the proxy url
        if (this.domain != null) { this.setDomain(this.domain); }

        this.tpl = RExt.util.TemplateMgr.get(this.tplId);
        RExt.company.CompanyCombo.superclass.initComponent.call(this);
    },

    /***
     * setDomain
     * @param {Object} d
     * set the combo's associated domain
     */
    setDomain : function(d) {
        this.domain = d;
        this.store.baseParams.domain_id = d.id;
        // change the url of proxy.  this requires using private vars of proxy.
        this.store.proxy.conn.url = this.controller + '/' + this.actions.load + '_' + d.name;
        this.reset();
    },

    /***
     * setCompanyId
     * @param {Integer} company_id
     */
    setCompanyId : function(id) {
        this.company_id = id;
        this.store.baseParams.company_id = id;
    },

    // onSelect
    onSelect: function(record, index){ // <-- override ComboBox::onSelect
        this.setValue(record.data.id);
        this.setRawValue(record.data.name);
        this.collapse();
        this.fireEvent('select', this, record, index);
    },

    reset : function() {
        RExt.company.CompanyCombo.superclass.reset.call(this);
        this.lastQuery = null;
        this.store.removeAll();
    },

    onAdd : function(param) {
        var fpanel = this.getForm();
        fpanel.setDomain(this.domain);
        fpanel.showInsert();

        fpanel.on('actioncomplete', function(form, action) {
    		if (typeof(action.result) != 'undefined') {
                var res = action.result;
    			var rec = this.insert(0, res.data.company);
                fpanel.hide();
    		}
	    },this);
    },

    onEdit : function(rec) {
        var fpanel = this.getForm();
        if (fpanel) {
            var domain = RExt.company.Util.loadDomainById(rec.data.domain_id);
            fpanel.setDomain(domain);
            fpanel.load(rec.data.id);
            fpanel.showUpdate();
            fpanel.on('actioncomplete', function(form, action){
                if (action.type == 'submit') {
                    var res = action.result;
                    if (res.success == true) {
                        fpanel.hide();
                    }
                }
            });
        }
        else {
            console.error("CompanyCombo::onEdit could not find company_form");
        }
    },

    getForm : function() {
        return Ext.getCmp(this.form_id);
    }
});

RExt.company.AccountCombo = Ext.extend(RExt.form.ComboBoxAdd, {
    controller: 'company',
    actions : {
        load: "get_company_accounts",
        insert : "insert_account"
    },
    form_id: 'account_popup',

    company_id : null,
    name: 'contact',
    shadow: false,
    emptyText: 'Select contact...',
	tabIndex: 1,
	anchor: '90%',
    hiddenId: Ext.id(),
	fieldLabel: 'Contact',
	allowBlank: false,
    itemSelector: 'div.search-item',
    mode: 'remote',
	triggerAction: 'all',

    initComponent : function() {
        this.tpl = RExt.util.TemplateMgr.get('combo-template'),
        this.store = new Ext.data.Store({
    		proxy: new Ext.data.HttpProxy({
    			url: this.controller + '/' + this.actions.load
    		}),
    		reader: new Ext.data.JsonReader({
                root: 'data',
                totalProperty: 'total',
                id: 0
            }, RExt.data.Account),
    		baseParams: {company_id: null},
            listeners: {
                // auto-select 1st record on-load
                load: function(store, rs, options) { if (rs.length > 0) { this.onSelect(rs[0], 0); } },
                scope: this
            }
    	});
        this.on('add', this.onAdd, this);

        RExt.company.AccountCombo.superclass.initComponent.call(this);

    },

    reset : function() {
        RExt.company.AccountCombo.superclass.reset.call(this);
        this.lastQuery = null;
        this.store.removeAll();
    },

	onSelect: function(record, index){	// <-- override ComboBox::onSelect
    	this.setValue(record.data.id);
		this.setRawValue(record.data.first + ' ' + record.data.last);
		this.collapse();
    	this.fireEvent('select', this, record, index);
    },

    /***
     * setDomain
     * @param {Object} domain
     * domain_id is automatically attached to query params.
     */
    setDomain : function(d) {
        this.domain = d;
        this.store.baseParams.domain_id = d.id;
        this.reset();
    },

    /***
     * setCompanyId
     * sets the combo's companyid.  company id is automatically added to query params
     * @param {Integer} id
     */
    setCompanyId : function(id) {
        this.company_id = id;
        this.store.baseParams.company_id = id;
        this.reset();
        this.doQuery('', true);
    },

    onAdd : function(param) {
        var popup = Ext.getCmp(this.form_id);
        try {
            var fpanel = popup.getFormPanel();

            fpanel.setDomain(this.domain);
            fpanel.setKey(this.company_id);
            fpanel.showInsert();
            popup.show(param.button);
            fpanel.on('actioncomplete', function(form, action) {
                var res = action.result;
                if (res.success == true) {
                    var rec = this.insert(0, res.data.account);
                    this.onSelect(rec, 0);
                    popup.hide();
                }

            },this);
        }
        catch (e) {
            Application.handleException(this, e);
        }
    },

    /***
	 * onAddContact
	 * called by comboBoAdd
	 * @param {Object} ev
	 */
	onAddContact : function(ev) {

		this.contactField = ev.field;
		var companyField = null;

		if (this.contactField.name == 'shipper_contact') {
			companyField = this.form.findField('shipper[company_id]');
		}
		else if (this.contactField.name == 'consignee_contact') {
            companyField = this.form.findField('consignee[company_id]');
			//companyField = Ext.getCmp('hwb_consignee_id');
		}
        if (!companyField) {
            alert('Application error HWB::onAddContact().  could not find company field');
            return false;
        }
		var cid = companyField.getValue();
		if (!cid) {	// <-- no shipper or consignee selected, so no company_id.  can't insert a contact with no company selected.
			return Ext.MessageBox.alert('Notice', 'To add a new contact, first select a ' + companyField.fieldLabel + ' to add *to*');
		}
		var popup = Ext.getCmp('account_popup');
		var panel = popup.getFormPanel();

		panel.setKey(cid);
        panel.insertUrl = 'company/add_account';
        var domain = RExt.company.Util.loadDomainByName('client');
        panel.setDomain(domain);
		panel.showInsert();
		popup.show(ev.button);
        panel.on('actioncomplete', this.doInsertContact, this);

	},
	/***
	 * doInsertContact
	 * @param {Object} form
	 * @param {Object} action
	 */
	doInsertContact : function(form, action) {
		if (typeof(action.result) != 'undefined') {
			var popup = Ext.getCmp('account_popup');
			popup.hide();

			var combo = this.contactField;
			var rec = combo.insert(0, action.result.data.account);
            combo.onSelect(rec, 0);
		}
	}


});

//new RExt.form.ComboBoxAdd({
/***
 * RExt.company.LocationCombo
 *
 */
RExt.company.LocationCombo = Ext.extend(RExt.form.ComboBoxAdd, {
    controller: 'company',
    actions : {
        load: 'get_locations'
    },
    company_id : null,
    shadow: false,
    emptyText: 'Select location...',
	tabIndex: 1,
	anchor: '90%',
    name: 'location',
	hiddenName: 'company[location_id]',
    hiddenId: Ext.id(),
    pageSize: 5,
	fieldLabel: 'Location',
	allowBlank: false,
	mode: 'remote',
	triggerAction: 'all',
	valueField: 'id',
	displayField: 'airport',

    initComponent : function() {

        this.addEvents({
            /***
             * @event insert
             * @param {RExt.form.ComboBoxAdd} this
             * @param {RExt.data.Location} record}
             * fires when a new location was successfully added to the database
             */
            'insert' : true
        });

        this.store = new Ext.data.Store({
    		proxy: new Ext.data.HttpProxy({
    			url: this.controller + '/' + this.actions.load
    		}),
    		reader: new Ext.data.JsonReader({
                root: 'data',
                totalProperty: 'total',
                id: 'id'
            }, RExt.data.Location),
    		baseParams: {company_id: null},
            listeners: {
                load: function(store, rs, options) {
                    if (rs.length > 0) {
                        var index = store.findBy(function(i) { return (i.data.is_primary == true) ? true : false;});
                        if (index >= 0) {
                            this.setValue(store.getAt(index).data.id);
                        }
                    }
                },
                scope: this
            }
    	});

        // respond to [+] button.
        this.on('add', this.onAdd, this);

        RExt.company.LocationCombo.superclass.initComponent.call(this);
    },

    reset : function() {
        RExt.company.LocationCombo.superclass.reset.call(this);
        this.lastQuery = null;
        this.store.removeAll();
    },

    setCompanyId : function(id) {
        this.company_id = id;
        this.store.baseParams.company_id = id;
        this.reset();
        this.doQuery('', true);
    },

    onAdd : function(param) {
        var popup = this.getPopup();
        var fpanel = popup.getFormPanel();
        fpanel.setKey(this.company_id);
        fpanel.showInsert();
        fpanel.on('actioncomplete', function(form, action) {
            var res = action.result;
            if (res.success == true) {
                var rec = this.insert(0, res.data.location);
                this.fireEvent('insert', this, rec);
                popup.hide();
            }
        },this);
        popup.show(param.button);

    },

    getPopup : function() {
        var popup = Ext.getCmp('location_popup');
        if (!popup) {
            popup = new RExt.form.Popup({
                id: 'location_popup',
                shadow: false,
                actsAsDialog: true,
            	form: new RExt.company.LocationForm({
                    id: 'location_form'
                })
            });
        }
        return popup;
    }
});

/***
 * @class RExt.company.Form
 * @constructor
 * @extends RExt.form.AccordionForm
 * new version of RExt.company.Form
 * So simple.
 * @author Chris Scott
 */
RExt.company.Form = Ext.extend(RExt.form.AccordionForm, {

    /**
     * controller & actions
     */
     controller: 'company',
     actions: {
         insert: 'insert',
         update: 'update',
         "delete" : 'delete'
     },

    /***
     * domain ptr
     */
    domain: null,

    /***
     * initComponent
     */
    initComponent : function() {

        // super
        RExt.company.Form.superclass.initComponent.call(this);

        // was there a domain in constructor?  if so, call setDomain so that its roles/fields are ensured to be loaded
        if (this.domain != null) {
            this.setDomain(this.domain);
        }

        // add events.
        this.addEvents({
            /***
             * @event setdomain
             * fired when setDomain method is called.  form plugins can listen to this event and react accordingly
             * @param {Object} this
             * @param {Object} domain
             */
            'setdomain': true,

            /***
             * @event setcompanyid
             * fired when teh company id is set on this form.  plugins can listen and react accordingly.
             * @param {Object} this
             * @param {Integer} company_id
             */
             'setcompanyid': true
        });

        // listen to beforesubmit and add the domain_id.  before submit is defined why up in sys.Form
        this.on('beforesubmit', function(form, action) {
            action.options.params.domain_id = this.getDomainId();
        });

        this.on('setdomain', function(sender, domain) {
            this.defaultTitle = domain.label;
        });

    },

    /***
     * setDomain
     * @param {Object || RExt.company.DomainLoadRequest} domain.  when given a LoadRequest, it means that the domains are currently
     * being retrieved from server (ie: an AJAX request is underway).  the load request will fire its 'load' event only when ready.
     * setDomain fires its own event 'setdomain' when a valid domain is retrieved.  all form plugins are listening for the 'setdomain'
     * event so they can post-process themselves (eg: enable/disable) based upon the domain.
     */
    setDomain : function(domain) {
        if (typeof(domain.roles) != 'undefined' && domain.roles == null) {
            domain = RExt.company.Util.loadDomain(domain.id);
        }
        if (domain instanceof RExt.company.DomainLoadRequest) {  // <-- a LoadRequest -- not a domain!!  wait for load to finish.
            domain.on('load', function(domain){
                this.domain = domain;
                this._applyDomain();
            }, this);
        }
        else {    // <-- a valid, loaded domain object.  good to go.
            this.domain = domain;
            this._applyDomain();
        }
    },

    // private.  used by above setDomain.  for ensuring event 'setdomain' is fired only once the component has been rendered.
    _applyDomain : function() {
        if (this.rendered == false) {
            this.on('render', function() {
                this.fireEvent('setdomain', this, this.domain); // <-- plugins are listening to this event.
            });
        }
        else {
            this.fireEvent('setdomain', this, this.domain); // <-- plugins are listening to this event.
        }
    },

    getDomainId : function() {
        return this.domain.id;
    },

    /***
     * setKey
     * alias for setCompanyKId
     * @param {Object} v
     */
    setKey : function(v) { this.setCompanyId(v); },

    /***
     * setCompanyId
     * set the "key" param and fires the 'setcompanyid' event.  this is particularly useful for AccountForm's CompanyPanel,
     * which is shown / hidden based upon 3 states of id: [integer || 0 || null]
     */
    setCompanyId : function(id) {
        this.key = id;
        this.fireEvent('setcompanyid', this, id);
    },
    getCompanyId : function() { return this.key; },

    /***
     * load
     */
    load: function(id){
        App.showSpinner();
        this.setKey(id);
        this.form.load({
            url: '/company/on_edit_company/' + id,
            method: 'GET',
            success: onSuccess,
            failure: onFailure,
            scope: this,
            params: {}
        });
        function onSuccess(form, action){
            App.hideSpinner();
            var res = action.result;
            if (typeof(res) != 'undefined' && res.success == true) {
                this.setValues(res.data.company);
            }
        }
        function onFailure(form, action) {
            App.hideSpinner();
            App.setAlert(App.STATUS_ERROR, 'An unknown error occurred at RExt.company.Form::load');
        }
    }
});


/***
 * RExt.company.AccountPanel
 * Implementation of RExt.form.Component plugin
 * creates a DataView and toolbar for add/removing accounts from a company.
 * @author Chris Scott
 *
 */
RExt.company.AccountPanel = Ext.extend(RExt.form.Component, {


    iconCls: 'icon-group',
    cls: 'account-panel',
    tabIndex: 1,
    autoScroll: true,
    frame: true,
    style: 'margin-bottom: 5px',
    title: 'Contacts',

    /** controller & actions **/
    controller: 'company',
    actions: {
        validate : 'validate_account',
        update : 'update_account',
        insert: 'insert_account',
        'delete' : 'delete_account'
    },

    /***
     * initComponent
     */
    initComponent : function() {

        var view = this.build();

        /***
         * @event setvalues
         * @param {Object} data
         */
        this.on('setvalues', function(data) {
            var list = [];
            for (var n=0,len=data.accounts.length;n<len;n++) {
                data.accounts[n].roles = RExt.company.Util.styleizeRoles(this.parent.domain.roles.account, data.accounts[n].roles);
                list.push(new view.store.recordType(data.accounts[n]));
            }
            view.store.add(list);
        },this);

        /***
         * @event reset
         * reset the store
         */
        this.on('reset', function() {
            view.store.removeAll();
            view.deleted = [];
        },this);

        var popup = Ext.getCmp('account_popup');
		var btnAccount = new RExt.Toolbar.PopupButton({
			tooltip: 'Create new account',
			menu : popup,
            iconCls: 'icon-add'
		});

        /***
         * @event click
         * @param {Object} btn
         * @param {Object} ev
         */
		btnAccount.on('click', this.onInsert, this);

        // set toolbar
        this.tbar = [
            btnAccount, '-',
            {tooltip: 'Edit account', iconCls: 'icon-pencil', handler: this.onEdit, scope: this}, '-',
            {tooltip: 'Delete account', iconCls: 'icon-delete', handler: this.onDelete, scope: this}, '-'
        ];

        // return the fieldset
        this.items = view;

        this.on('setdomain', function(sender, domain) {
            this.domain = domain;
            switch (domain.name) {
                default:
                    this.enable(true);
            }

        },this);

        RExt.company.AccountPanel.superclass.initComponent.call(this);
    },

    /***
     * onInsert
     * @param {Object} btn
     * @param {Object} ev
     */
    onInsert : function(btn, ev) {
        var view = this.getView();
        var popup = Ext.getCmp('account_popup');
		var panel = popup.getFormPanel();
        panel.setDomain(this.domain);

        // if the parent form's key is null (ie: it DOES NOT exist in db), use 'validate' action instead of 'insert'
        if (this.parent.getKey() == null) {
            popup.form.setKey(0); // <-- NB: setKey to zero will hide the companyCombo which is shown when key == null
            panel.showInsert('validate');
        }
        else {    // <-- parent company exists in db.  do a regular insert on account.
            popup.form.setKey(this.parent.getKey());
            panel.showInsert();
        }
		panel.on('actioncomplete', function(form, action) {
            if (typeof(action.result) == 'object') {
                var res = action.result;
                if (res.success == true) {
                    var data = {};
                    // if server sent back an account id, it was inserted in the db.
                    if (typeof(res.data.account) == 'object' && this.parent.getKey() != null) {
                        data = res.data.account;
                        data.roles = RExt.company.Util.styleizeRoles(this.parent.domain.roles.account, data.roles);
                    }
                    else {
                        var fdata = panel.form.getValues();
                        data = panel.deserialize(fdata);
                        data.form = fdata;
                        data.id = null;
                        data.roles = RExt.company.Util.styleizeRoles(panel.domain.roles.account, data.roles);
                    }
                    view.store.insert(0, new view.store.recordType(data));
                    popup.hide();
                }
            }
        },this);
	},

    /***
     * onEdit
     * edit an account
     * @param {Object} btn
     * @param {Object} ev
     */
    onEdit : function(btn, ev) {
        var view = this.getView();

        var rs = view.getSelectedRecords();
        if (rs.length < 1) {
            return this.onUnselected();
        }
        var rec = rs[0];
        rec.beginEdit();    // <-- start editing the record.

        var popup = Ext.getCmp('account_popup');
        var fpanel = popup.getFormPanel();
        fpanel.setDomain(this.domain);

        // first see if there's a key called "form" on the rec.  if so, this rec hasn't been inserted on server yet.
        // just re-edit it.  easy.
        var data = {};
        if (typeof(rec.data.form) != 'undefined' && rec.data.id == null) {
            data = fpanel.deserialize(rs[0].data.form);
            fpanel.showUpdate('validate');
        }
        else {    // <-- this record has an id.  it exists in db.
            fpanel.setKey(rec.data.id);
            data = rec.data;
            fpanel.showUpdate();
        }

		fpanel.on('actioncomplete', function(form, action) {
            if (typeof(action.result) == 'object') {
                if (action.result.success == true) {
                    var data = fpanel.form.getValues();
                    rec.set('first', data['account[first]']);
                    rec.set('last', data['account[last]']);
                    rec.set('form', data);
                    rec.data.form = data;
                    rec.set('roles', RExt.company.Util.styleizeRoles(this.parent.domain.roles.account, (this.parent.getKey() != null) ? action.result.data.account.roles : fpanel.deserialize(data).roles));
                    rec.endEdit();
                    rec.commit();
                    popup.hide();
                }
            }
        },this);
        popup.show(btn.getEl());
        fpanel.setValues(data);
    },

    /***
     * onDelete
     * @param {Object} btn
     * @param {Object} ev
     */
    onDelete : function(btn, ev) {
        var view = this.getView();
        var rs = view.getSelectedRecords();
        if (rs.length == 0) {
            return this.onUnselected();
        }

        // sanity-check: don't allow deletion of last account of a company (validates on server as well)
        if (this.parent.getKey() > 0 && view.store.getCount() == 1) {
            return App.setAlert(App.STATUS_ERROR, 'You cannot delete the last contact of a company');
        }

        var rec = rs[0];
        if (rec.data.id != null) {
            // if record has an id, it must exist in db.  confirm with user that they wish to delete form db.
            Ext.MessageBox.confirm('Confirm', 'Delete ' + rec.data.first + ' ' + rec.data.last + ' from this company?', function(btn) {
                if (btn == 'yes') {
                    App.request({
                        url: this.controller + '/' + this.actions['delete'] + '/' + rec.data.id,
                        method: 'POST',
                        success: function(res) {
                            if (res.success == true) {
                                view.store.remove(rec);
                            }
                        },
                        scope: this
                    });
                }
            },this);
        }
        else {
            // no record id.  does not exist in db.  just remove from store.
            view.store.remove(rec);
        }
    },

   // private
   onUnselected : function() {
       App.setAlert(App.STATUS_NOTICE, 'You must first select an account');
       return false;
   },

   /***
    * init
    * plugin init, called by framework
    * @param {Ext.form.FormPanel} fpanel
    */
   init : function(fpanel) {
       RExt.company.AccountPanel.superclass.init.apply(this, arguments);
       fpanel.on('beforesubmit', function(form, action) {
           var view = this.getView();
           var data = {
                deleted: view.deleted,
                added: []
            };

            // agents
            view.store.each(function(r){
                if (r.data.id == null) { // <-- records with no id are NEW and need to be inserted on server.
                    data.added.push(r.data.form);
                }
            });
            action.options.params.accounts = Ext.encode(data);
       },this);
    },

    /***
     * build
     * @return {Ext.DataView}
     */
    build : function() {
        // create view's record def.
        var Account = Ext.data.Record.create([
            {name: 'id', type: 'integer'},
            {name: 'first', type: 'string'},
            {name: 'last', type: 'string'},
            {name: 'roles'},
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
                '<div id="company-account-{id}" class="company-account x-grid3-row">',
                '    <div class="x-grid3-cell-inner"><span class="name">{first} {last}</span><span class="roles"><tpl for="roles"><img style="width:16px;height:16px;" class="x-panel-inline-icon role-{[values.cls]}" src="javascripts/ext-2.0/resources/images/default/s.gif"/></tpl></span></div>',
                '</div>',
            '</tpl>'
    	);

        // create view
        var view = new Ext.DataView({
            id: this.id + '_account_view',
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
            itemSelector:'div.company-account',
            selectedClass: 'x-grid3-row-selected',
            emptyText: '<h2>No contacts added</h2><h3 class="icon-information r-icon-text">You may add any number of contacts to this company.</h3>'
        });

        var roles = (this.roles != null) ? this.roles.account : null;

        return view;
    },

    /***
     * getView
     * @return {Ext.DataView}
     */
    getView : function() {
        return this.getComponent(this.id + '_account_view') || false;
    }
});

/***
 * RExt.company.LocationPanel
 * A plugin for managing multiple company locations.
 * @author Chris Scott
 *
 */
RExt.company.LocationPanel = Ext.extend(RExt.form.Component, {

    iconCls: 'icon-world',
    cls: 'locations-panel',
    tabIndex: 1,
    layout: 'anchor',

    frame: false,
    style: 'margin-bottom: 5px',
    title: 'Locations',

    /** controller & actions **/
    controller: 'company',
    actions: {
        update : 'update_location',
        insert: 'insert_location',
        'delete' : 'delete_location'
    },

    // ptr to popup form
    popup : null,

    /***
     * initComponent
     */
    initComponent : function() {

        var view = this.build();

        /***
         * @event setvalues
         * @param {Object} data
         */
        this.on('setvalues', function(data) {
            // set the store's company_id
            view.store.baseParams.company_id = data.id;
            view.store.load();
        },this);

        /***
         * @event reset
         * reset the store
         */
        this.on('reset', function() {
            view.store.removeAll();
            view.deleted = [];
        },this);

        /***
         * @event validate
         * make sure at least one location was created.
         */
        this.on('validate', function() {
            if (this.getView().store.getCount() == 0) {
                App.setStatus(App.STATUS_ERROR, 'Validation-failed', 'You must add at least one company-location');
                return false;
            }
            else {
                return true;
            }
        });

        // return the fieldset
        this.items = view;


        // set toolbar
        this.tbar = [
            {tooltip: 'Add new location', iconCls: 'icon-add', handler: this.onInsert, scope: this}, '-',
            {tooltip: 'Edit location', iconCls: 'icon-pencil', handler: this.onEdit, scope: this}, '-',
            {tooltip: 'Delete location', iconCls: 'icon-delete', handler: this.onDelete, scope: this}, '-',
            {tooltip: 'Set head-office', iconCls: 'icon-asterisk-orange', handler: this.onSetPrimary, scope: this}, '-',
            {tooltip: 'Set billing-address', iconCls: 'icon-creditcards', handler: this.onSetBilling, scope: this}, '-',
            new Ext.app.SearchField({
                store: view.store
            })
        ];

        this.bbar = new Ext.PagingToolbar({
            store: view.store,
            pageSize: 20,
            displayInfo: true,
            displayMsg: 'Locations {0} - {1} of {2}',
            emptyMsg: "No Locations to display"
        });

        RExt.company.LocationPanel.superclass.initComponent.call(this);
    },

    getPopup : function() {
        var popup = Ext.getCmp('location_popup');
        if (!popup) {
            popup = new RExt.form.Popup({
                id: 'location_popup',
                shadow: false,
                actsAsDialog: true,
            	form: new RExt.company.LocationForm({
                    id: 'location_form'
                })
            });
        }
        return popup;
    },

    /***
     * onSetPrimary
     * button-handler.  sets current record as primary location (head office)
     */
    onSetPrimary : function() {
        var view = this.getView();
        var rs = view.getSelectedRecords();
        if (rs.length < 1) {
            return this.onUnselected();
        }
        var rec = rs[0];
        if (rec.data.id !== null) {
            App.request({
                url: this.controller + '/set_primary_location/' + rec.data.id,
                success : function(res) {
                    rec.beginEdit();
                    rec.set('is_primary', true);
                    rec.endEdit();
                    rec.commit();
                    this.updateRoles(rec);
                },
                scope: this
            });
        }
        else {
            console.log('onSetPrimary() -- record not yet in db.  create will handle primary-location');
            this.updateRoles();
        }
    },

    /***
     * onSetBilling
     * button-handler.  set selected record as the billing-address
     */
    onSetBilling : function() {
        var view = this.getView();
        var rs = view.getSelectedRecords();
        if (rs.length < 1) {
            return this.onUnselected();
        }
        var rec = rs[0];
        if (rec.data.id !== null) {
            console.log('onSetPrimary() -- App.update primary location: ', rec);
            App.request({
                url: this.controller + '/set_billing_location/' + rec.data.id,
                success : function(res) {
                    rec.beginEdit();
                    rec.set('is_billing', true);
                    rec.endEdit();
                    rec.commit();
                    this.updateRoles(rec);
                },
                scope: this
            });
        }
        else {
            console.log('onSetBilling() -- record not yet in db.  create will handle billing-location');
            this.updateRoles();
        }
    },

    /***
     * @private updateRoles
     * only one location can be either primary or billing location (a location *can* be both)
     * @param {Ext.data.Record} selected, the record that was just updated.
     */
    updateRoles : function(selected) {
        this.getView().store.each(function(r) {
            r.beginEdit();
            if (r.id != selected.id) {
                if (selected.data.is_billing == true && r.data.is_billing == true) {
                    r.set('is_billing', false);
                }
                if (selected.data.is_primary == true && r.data.is_primary == true) {
                    r.set('is_primary', false);
                }
            }
            r.endEdit();
            r.commit();
        },this);
    },

    /***
     * onInsert
     * @param {Object} btn
     * @param {Object} ev
     */
    onInsert : function(btn, ev) {
        var view = this.getView();
        var popup = this.getPopup();
		var fpanel = popup.getFormPanel();

        popup.show(btn.el);
        fpanel.showInsert();

        // when this is the first location, force the form's isPrimary [x] checkbox to true and disable it.
        if (view.store.getCount() == 0) {
            fpanel.setIsPrimary(true);
            fpanel.setIsBilling(true);
        }
        // case 1: if parent has no key, this is a new company.  trap the request in beforeaction and simply add record to store
        if (this.parent.getKey() === null) {
            fpanel.on('beforeaction', function(form, action){
                data = fpanel.deserialize(fpanel.form.getValues());
                var rec = new view.store.recordType({
                    id: null,
                    country: fpanel.findField('country_id').getRawValue(),
                    region: fpanel.findField('region_id').getRawValue(),
                    city: fpanel.findField('city_id').getRawValue(),
                    airport: fpanel.findField('airport_id').getRawValue(),
                    is_primary: data.roles.is_primary,
                    is_billing: data.roles.is_billing,
                    form: data
                });
                view.store.insert(0, rec);

                view.select(0);
                if (data.is_primary == true) {
                    this.onSetPrimary();
                }
                popup.hide();
                //Ext.MessageBox.hide();
                App.hideSpinner();
                return false;

            }, this);
        }
        // case 2: parent has a key -- this is an existing company.  do insert immediately.
        else {
            fpanel.setKey(this.parent.getKey());
            fpanel.on('actioncomplete', function(form, action) {
                var res = action.result;
                if (res.success == true) {
                    view.store.insert(0, new view.store.recordType(res.data.location));
                    popup.hide();
                }
                else { App.setAlert(App.STATUS_ERROR, 'RExt.company.LocationPanel::onInsert -- Unknown error');}
            },this);
        }
	},

    /***
     * onEdit
     * edit an account
     * @param {Object} btn
     * @param {Object} ev
     */
    onEdit : function(btn, ev) {
        var view = this.getView();

        var rs = view.getSelectedRecords();
        if (rs.length < 1) {
            return this.onUnselected();
        }
        var rec = rs[0];

        var popup = this.getPopup();
        var fpanel = popup.getFormPanel();
        fpanel.setKey(rec.data.id);

        // first see if there's a key called "form" on the rec.  if so, this rec hasn't been inserted on server yet.
        var data = {};
        if (rec.data.id == null) {
            // this case (ie: record not-yet-saved in db is a bit difficult for now.  just disable re-edits)
            return App.setAlert(App.STATUS_NOTICE, 'You cannot edit this record until you save the company -- sorry');
        }
        else {    // <-- this record has an id.  it exists in db.
            fpanel.setKey(rec.data.id);
            App.request({
                url: this.controller + '/' + 'edit_location' + '/' + rec.data.id,
                success: function(res) {
                    fpanel.showUpdate();
                    popup.show(btn.getEl());
                    res.data.location.is_primary = rec.data.is_primary;
                    res.data.location.is_billing = rec.data.is_billing;
                    fpanel.setValues(res.data.location, view.store.getCount());
                    fpanel.on('actioncomplete', doUpdate, this);
                },
                scope: this
            });
        }
        function doUpdate(form, action) {
            if (typeof(action.result) == 'object') {
                if (action.result.success == true) {
                    var data = fpanel.deserialize(fpanel.form.getValues());
                    rec.beginEdit();    // <-- start editing the record.
                    rec.set('country', fpanel.findField('country_id').getRawValue());
                    rec.set('region', fpanel.findField('region_id').getRawValue());
                    rec.set('city', fpanel.findField('city_id').getRawValue());

                    var airport = fpanel.findField('airport_id');
                    if (airport) {
                        rec.set('airport', airport.getRawValue());
                    }
                    rec.set('is_primary', data.roles.is_primary);
                    rec.set('is_billing', data.roles.is_billing);
                    rec.endEdit();
                    rec.commit();
                    if (rec.data.is_primary == true || rec.data.is_billing == true) {
                        view.select(view.store.indexOf(rec));
                        this.updateRoles(rec);
                    }
                    popup.hide();
                }
            }
        }
    },

    /***
     * onDelete
     * @param {Object} btn
     * @param {Object} ev
     */
    onDelete : function(btn, ev) {
        var view = this.getView();
        var rs = view.getSelectedRecords();
        if (rs.length == 0) {
            return this.onUnselected();
        }

        // sanity-check: don't allow deletion of last account of a company (validates on server as well)
        if (this.parent.getKey() > 0 && view.store.getCount() == 1) {
            return App.setAlert(App.STATUS_ERROR, 'You cannot delete the last location of a company');
        }

        var rec = rs[0];
        if (rec.data.id != null) {
            // if record has an id, it must exist in db.  confirm with user that they wish to delete form db.
            Ext.MessageBox.confirm('Confirm', 'Delete location?', function(btn) {
                if (btn == 'yes') {
                    App.request({
                        url: this.controller + '/' + this.actions['delete'] + '/' + rec.data.id,
                        method: 'POST',
                        success: function(res) {
                            if (res.success == true) {
                                var index = view.store.findBy(function(r) { return (r.data.is_primary !== true && r.data.id == res.data.primary_location_id) ? true : false; });
                                if (index >= 0) {
                                    var primary = view.store.getAt(index);
                                    primary.beginEdit();
                                    primary.set('is_primary', true);
                                    primary.commit();
                                    primary.endEdit();
                                }
                                view.store.remove(rec);
                            }
                        },
                        scope: this
                    });
                }
            },this);
        }
        else {
            // no record id.  does not exist in db.  just remove from store.
            view.store.remove(rec);
        }
    },

   // private
   onUnselected : function() {
       App.setAlert(App.STATUS_NOTICE, 'You must first select an account');
       return false;
   },

   /***
    * init
    * plugin init, called by framework
    * @param {Ext.form.FormPanel} fpanel
    */
   init : function(fpanel) {
       RExt.company.LocationPanel.superclass.init.apply(this, arguments);

       // listen to parent form's beforesubmit -- append json-encoded location data.
       fpanel.on('beforesubmit', function(form, action) {
           var view = this.getView();
           var data = {
                deleted: view.deleted,
                added: []
            };

            // locations
            view.store.each(function(r){
                if (r.data.id == null) { // <-- records with no id are NEW and need to be inserted on server.
                    data.added.push(r.data.form);
                }
            });
            action.options.params.locations = Ext.encode(data);
       },this);
    },

    /**
     * build
     * @return {Ext.DataView}
     */
    build : function() {

        // build shipper ComboBox
        var store = new Ext.data.Store({
            proxy: new Ext.data.HttpProxy({
                url: this.controller + '/get_locations',
            }),
            reader: new Ext.data.JsonReader({
                root: 'data',
                totalProperty: 'total',
                id: 'id'
            }, RExt.data.Location),
            baseParams: {limit: 20, company_id: null}
        });

        // create view template
        var tpl = new Ext.XTemplate(this.getTemplate());

        // create view
        var view = new Ext.DataView({
            id: this.id + '_location_view',
            store: store,
            style: 'overflow-x:hidden;overflow-y:auto;',
            tpl: tpl,
            cls: 'x-grid3',
            multiSelect: true,
            deleted: [],
            height: 150,
            overClass:'x-grid3-row-over',
            itemSelector:'div.x-grid3-row',
            selectedClass: 'x-grid3-row-selected',
            emptyText: '<h2>No locations defined</h2><h3 class="icon-error r-icon-text">You must add at least one company location.</h3>'
        });


        return view;
    },

    /**
     * getTemplate
     * Override this to provide your own custom XTemplate html
     * @return {Array}
     */
    getTemplate : function() {
        return ['<tpl for=".">',
            '<div id="company-location-{id}" class="company-location x-grid3-row">',
            '    <div class="x-grid3-cell-inner"><span class="name">{airport}, {city}, {region}, {country} <span class="roles"><tpl if="is_primary"><img class="x-panel-inline-icon role-is_primary" src="javascripts/ext-2.0/resources/images/default/s.gif"/></tpl><tpl if="is_billing"><img class="x-panel-inline-icon role-is_billing" src="javascripts/ext-2.0/resources/images/default/s.gif"/></tpl></span></span></div>',
            '</div>',
        '</tpl>'];
    },

    /***
     * getView
     * @return {Ext.DataView}
     */
    getView : function() {
        return this.getComponent(this.id + '_location_view');
    }
});

/***
 * RExt.company.LocationForm
 *
 */
RExt.company.LocationForm = Ext.extend(RExt.sys.Form, {
    formName: 'location',
    controller: 'company',
    actions: {
        insert : 'insert_location',
        update: 'update_location',
        'delete' : 'delete_location'
    },

    geocoder : null,

    layoutConfig: {
        fill: true,
        titleCollapse: true,
        activeOnTop: false,
        animate: false,
        fill: true
    },
    width: 450,
    frame: true,
    layout: 'accordion',
    title: 'Company Location',
    labelAlign: 'right',

    location: null,

    initComponent : function() {

        this.items = [
            this.buildLocation(),
            this.buildContact()
        ];

        // create tools
        this.tools = [{
		    id:'map',
		    on:{
		        click: function() {
                    var gmap = Ext.getCmp('gmap');
                    if (gmap) { Ext.getCmp('gmap').showLocation(this.location); }
                    else { App.setAlert(App.STATUS_ERROR, 'Google maps component not loaded'); }
                },
                scope: this
		    }
		}];

        // show first accordion-panel on show.
        this.on('show', function() { this.items.first().expand(); },this);

        // create GEO Coder instance;
        if (typeof(google) != 'undefined') {
            this.geocoder = new GClientGeocoder();
        }

        RExt.company.LocationForm.superclass.initComponent.call(this);
    },

    /***
     * getHandler
     * override sys.Form::getHandler to query google geocoder for lat/lng.  this is very tricky
     * @param {Object} url
     * @return {Function}
     */
    getHandler : function(url) {
        if (this.geocoder != null) {
            var scope = this;
            return function(btn, ev) {
                App.showSpinner('Saving');
                // build an address query-string for google GeoCoder
                btn.disable();
                var values = this.form.getValues();
                var address = '';
                var region = this.form.findField(this.formName+'[city_id]').getRawValue().toLowerCase() + ' ' + this.form.findField(this.formName+'[region_id]').getRawValue().toLowerCase() + ' ' + this.form.findField(this.formName+'[country_id]').getRawValue().toLowerCase();
                if (values[scope.formName + '[addr1]']) { address += ' ' + values[scope.formName + '[addr1]']; }
                if (values[scope.formName + '[zip]']) { address += ' ' + values[scope.formName + '[zip]']; }

                // if no specific address was provided, make the airport the address.
                if (address.length == 0) { address = ' ' + this.form.findField(this.formName+'[airport_id]').getRawValue().toLowerCase() }

                // good to go...call google.
                this.geocoder.getLocations(region+address, function(res){
                    if (res.Status.code == 200) {
                        console.info('google gave us a geocode :) ', res);
                        var form = scope.getForm();
                        var latlng = res.Placemark[0].Point.coordinates;
                        form.findField(scope.formName+'[lat]').setValue(latlng[1]);
                        form.findField(scope.formName+'[lng]').setValue(latlng[0]);
                    }
                    else {
                        console.warn('google did NOT give us a geocode :( ', res);
                    }
                    // do not try this at home.  the following is the original button-handler.
                    return RExt.company.LocationForm.superclass.getHandler.call(scope, url).call(scope, btn, ev);
                });
            }
        }
        else {
            return RExt.company.LocationForm.superclass.getHandler.call(this, url);
        }
    },

    buildLocation : function() {
        var formName = 'location';


        var isPrimary = new Ext.form.Checkbox({
            boxLabel: 'head-office?',
            labelSeparator: '',
            name: 'roles[is_primary]'
        });
        var isBilling = new Ext.form.Checkbox({
            boxLabel: 'Billing-address?',
            iconCls: 'icon-money',
            labelSeparator: '',
            name: 'roles[is_billing]'
        });

        // re-enable the isPrimary checkbox on reset.
        this.on('reset', function() { isPrimary.enable(); isBilling.enable(); },this);

        // get region manager
        regionMgr = Ext.ComponentMgr.get('region_manager');

        // init the regionManager with the current form name "company"
        regionMgr.setFormName(formName);

        var comboCountry = regionMgr.renderCountry({
            anchor: '98%',
            tabIndex: 1,
            msgTarget: 'qtip'
        });
        var comboRegion = regionMgr.renderRegion({
            width: 120,
            tabIndex: 1,
            msgTarget: 'qtip',
            anchor: '98%'
        });
        // create city combo
        var comboCity = regionMgr.renderCity({
            queryDelay: 100,
            anchor: '98%'
        });

        // create airport combo
        var airport = regionMgr.renderAirport({
            anchor: '87%',
            name: 'airport',
            hiddenName: formName + '[airport_id]'
        });

        // sew them all together with RegionMgr::associate
        regionMgr.associate(comboCountry, comboRegion, comboCity, airport);

        return new Ext.form.FieldSet({
            id: this.id + '_fs_location',
            iconCls: 'icon-world',
            labelWidth: 60,
            layout: 'form',
            title: 'Address',
            defaultType: 'textfield',
            autoWidth: true,
            autoHeight: true,
            style: 'margin-bottom: 5px',
            items: [
                new Ext.form.Hidden({name: this.formName + '[lat]'}),  // <-- lat/lng hidden fields
                new Ext.form.Hidden({name: this.formName + '[lng]'}),
                new Ext.Panel({
                    labelWidth: 60,
                    layout: 'column',
                    items: [{
                        layout: 'form',
                        columnWidth: 0.5,
                        items: [comboCountry, comboRegion, comboCity, airport]
                    }, {
                        layout: 'form',
                        columnWidth: 0.5,
                        labelWidth: 40,
                        items: [new Ext.form.TextField({
                            name: formName + '[addr1]',
                            tabIndex: 1,
                            fieldLabel: 'Addr1',
                            allowBlank: true,
                            anchor: '95%'
                        }), new Ext.form.TextField({
                            name: formName + '[addr2]',
                            tabIndex: 1,
                            fieldLabel: 'Addr2',
                            allowBlank: true,
                            anchor: '95%'
                        }), new Ext.form.TextField({
                            name: formName + '[zip]',
                            tabIndex: 1,
                            fieldLabel: 'Zip',
                            allowBlank: true,
                            anchor: '87%'
                        }),isPrimary, isBilling]
                    }]
                 }
             )]
        });
    },

    buildContact : function() {
        var formName = 'location';

        return new Ext.form.FieldSet({
            id: this.id + '_fs_contact',
            iconCls: "icon-phone",
            layout: 'form',
            title: 'Contact Information',
            autoHeight: true,
            items: new Ext.Panel({
                layout: 'column',
                autoWidth: true,
                labelWidth: 50,
                items: [{
                    layout: 'form',
                    columnWidth: 0.47,
                    items: [new Ext.form.TextField({
                        name: formName + '[phone1]',
                        tabIndex: 1,
                        fieldLabel: 'Phone1',
                        vtypeText: "Phone field must be of form xxx-xxx-xxxx",
                        vtype: 'phone',
                        allowBlank: true,
                        anchor: '90%'
                    }), new Ext.form.TextField({
                        name: formName + '[phone2]',
                        tabIndex: 1,
                        fieldLabel: 'Phone2',
                        vtype: 'phone',
                        vtypeText: "Phone field must be of form xxx-xxx-xxxx",
                        allowBlank: true,
                        anchor: '90%'
                    }), new Ext.form.TextField({
                        name: formName + '[fax]',
                        tabIndex: 1,
                        fieldLabel: 'Fax',
                        vtype: 'phone',
                        vtypeText: "Phone field must be of form xxx-xxx-xxxx",
                        allowBlank: true,
                        anchor: '90%'
                    })]
                }, {
                    layout: 'form',
                    columnWidth: 0.53,
                    items: [new Ext.form.TextField({
                        name: formName + '[email]',
                        tabIndex: 1,
                        fieldLabel: 'Email',
                        allowBlank: true,
                        anchor: '90%',
                        vtype: 'email',
                        msgTarget: 'qtip'
                    }), new Ext.form.TextField({
                        name: formName + '[www]',
                        tabIndex: 1,
                        fieldLabel: 'www',
                        allowBlank: true,
                        anchor: '90%'
                    })]
                }]
            })
        });
    },

    /***
     * deserialize
     * turns form-data hashed upon the fieldname into standard hash.
     * eg: {location[zip] : "90210"} -> {zip: "90210"}
     * @param {Object} o
     */
    deserialize : function(o) {

        var data = {
            location: {},
            roles: {}
        };
        for (var k in o) {
            m = k.match(/^(.*)\[(.*)\]$/);      // <-- location[attr], roles[attr] -> {roles: {}, location: {} }
            if (m) { data[m[1]][m[2]] = o[k]; }
        }
        // if is_primary and is_billing are disabled, they're default to true
        if (typeof(data.roles.is_primary) == 'undefined') {
            data.roles.is_primary = (this.form.findField('roles[is_primary]').disabled) ? true : false;
        }
        if (typeof(data.roles.is_billing) == 'undefined') {
            data.roles.is_billing = (this.form.findField('roles[is_billing]').disabled) ? true : false;
        }
        for (var k in data.roles) {
            if (data.roles[k] == 'on') {
                data.roles[k] = true;
            }
        }
        return data;
    },

    /***
     * setValues
     * populate form values
     * @param {Object} company
     * @param {Integer} recordCount
     */
    setValues : function(location, recordCount) {
        this.location = location;
        recordCount = recordCount || 0;

        var fdata = this.formify(location, this.formName);

        // set the is_primary checkBox.  this checkbox is not prefixed with "location"
        fdata["roles[is_primary]"] = location.is_primary;
        fdata["foles[is_billing]"] = location.is_billing;
        var isPrimary = this.form.findField('roles[is_primary]');
        var isBilling = this.form.findField('roles[is_billing]');
        if (recordCount <= 1 || location.is_primary == true) {
            fdata["roles[is_primary]"] = true;
            isPrimary.disable();
        }
        else {
            isPrimary.enable();
        }
        if (recordCount <= 1 || location.is_billing == true) {
            fdata["roles[is_billing]"] = true;
            isBilling.disable();
        }
        else {
            isBilling.enable();
        }

        // add records to region combos
        var country = this.findField('country_id');
        var region = this.findField('region_id');
        var city = this.findField('city_id');
        var airport = this.findField('airport_id');

        var rec = new region.store.recordType(location.region);
        region.store.insert(0, rec);

        var rec = new city.store.recordType(location.city);
        city.store.insert(0, rec);

        if (airport) {
            var rec = new airport.store.recordType(location.airport);
            airport.remoteValid = true;
            airport.store.insert(0, rec);
        }

        this.form.setValues(fdata);
    },

    setIsPrimary : function(v) {
        v = v || true;
        var isPrimary = this.form.findField('roles[is_primary]');
        if (v === true) {
            isPrimary.setValue(true);
            isPrimary.disable();
        }
        else {
            isPrimary.setValue(false);
            isPrimary.enable();
        }
    },

    setIsBilling : function(v) {
        v = v || true;
        var field = this.form.findField('roles[is_billing]');
        if (v === true) {
            field.setValue(true);
            field.disable();
        }
        else {
            field.setValue(false);
            field.enable();
        }
    }
});


/***
 * RExt.company.RolesPanel
 *
 */
RExt.company.RolesPanel = Ext.extend(RExt.form.Component, {

    iconCls: 'icon-group-key',
    frame: true,
    cls: 'roles',
    layout: 'form',
    autoHeight: true,
    labelWidth: 110,
    title: 'Roles',
    entity: 'company',

    /***
     * initComponent
     */
    initComponent : function() {

        /***
         * @event setdomain
         * @param {Object} sender
         * @param {Object} domain
         */
        this.on('setdomain', function(sender, domain) {
            this.domain = domain;
            (this.applyRoles(domain)) ? this.enable() : this.disable();
        },this);

        /***
         * @event setvalues
         * @param {Object} data
         */
        this.on('setvalues', function(data) {
            this.setRoleValues(data.roles);
        },this);

        RExt.company.RolesPanel.superclass.initComponent.call(this);
    },

    /***
     * buildFields
     * create the role checkboxes using supplied hash of roles (keyed on role_id)
     * @param {Object} roles
     */
    buildFields : function(domain) {
        var form = this.parent.form;

        // no roles here.  nothing to do.  just return.
        if (domain.roles == null) {
            return null;
        }

        roles = null;
        if (typeof(domain.roles[this.entity]) != 'undefined') {  // <-- company || account
            roles = domain.roles[this.entity];
        }
        else {    // weird...no roles found in either company or account?
            console.warn('RExt.company.RolesPanel::buildFields -- could not find "' + this.entity + '" roles');
            return null;
        }

        // ok, good to go.
        list = []

        // first add role checkboxes
        for (var key in roles) {
            if (key == 'remove') { break; }

            // add any optional role-fields (rare)
            var fields = roles[key].fields;

            var role = null;
            var fid = this.id + '-role-' + key;
            if (!(role = Ext.getCmp(fid))) {
                if (!fields.length) {
                    role = new Ext.form.Checkbox({
                        fieldLabel: roles[key].label,
                        itemCls: 'role-' + roles[key].cls,
                        name: 'roles[' + roles[key].id + ']',
                        checked: (roles[key].checked === true) ? true : false
                    });
                    form.add(role);    // <-- add to BasicForm
                }
                else {
                    role = new Ext.form.FieldSet({
                        id: 'roles[' + roles[key].id + ']',
                        title: roles[key].label ,
                        iconCls: 'role-' + roles[key].cls,
                        autoHeight: true,
                        labelAlign: 'top',
                        checkboxToggle:true,
                        listeners: {
                            expand: function() {
                                this.doLayout();
                            }
                        },
            			checkboxName: 'roles[' + roles[key].id + ']',
                        collapsed: true
                    });
                }
                list.push(role);
            }
            else {    // <-- form was already built and role checkboxes already exist.  just clear value.
                role.setValue((roles[key].checked === true) ? true : false);
            }

            // now build role-fields
            for (var n=0,len=fields.length;n<len;n++) {
                var field = fields[n];
                var role_field = null;
                var fid = this.id + '-role-field-' + field.id;

                if (!(role_field = Ext.getCmp(fid))) {
                    var role_field = RExt.util.Builder.buildField('role_field', field);
                    if (role_field) {
                        if (role instanceof Ext.form.FieldSet) {
                            role.add(role_field);
                        }
                        else {
                            list.push(role_field);
                        }
                        form.add(role_field);
                    }
                }
                else {    // <-- field already exists.  just set the value
                    //role_field.setValue(fields[fkey].value);
                    alert('RExt.company.Form::buildRoleFields -- found an already existing role-field');
                }
            }
        }
        return list;
    },

    /***
     * applyRoles
     * adds roles to your roles fieldset.  assumes your roles fieldset is named this.id + '_roles'
     * this is tricky as fuck.
     */
    applyRoles : function(domain) {
        var form = this.parent.form;
        var fields = this.buildFields(domain);                  // <-- create Ext.form.Fields
        if (fields == null) {
            return false;;
        }

        // first remove old roles
        if (this.items instanceof Ext.util.MixedCollection) {
            this.items.each(function(i){
                if (i instanceof Ext.form.Field) {
                    form.remove(i, true); // <-- remove from BasicForm (see below)
                }
                else
                    if (i.items instanceof Ext.util.MixedCollection) {
                        i.items.each(function(f){
                            form.remove(f, true);
                        }, this);
                    }
                this.remove(i, true); // <-- remove from FieldSet
            }, this);
            if (this.body) {
                this.body.dom.innerHTML = ''; // <-- clear body of left-over field labels
            }
        }

        // now add the new roles / fields.
        for (var n=0,len=fields.length;n<len;n++) {
            this.add(fields[n]);     // <-- add to FieldSet
            if (fields[n] instanceof Ext.form.Field) {
                form.add(fields[n]); // <-- must manually add field to BasicForm in order to wire-up validation
            }
        }
        if (this.rendered == true) {
            this.doLayout();
        }
        return true;
    },

    /***
    * buildRoles
    * company roles
    * @param {Object} roles
    */
    buildRoles : function() {
        var panel = {
            iconCls: 'icon-group-key',
            id: this.id + '_roles',
            cls: 'roles',
            layout: 'form',
            frame: true,
            style: 'margin-bottom: 5px',
            autoHeight: true,
            labelWidth: 110,
            title: 'Roles'
        };
        return panel;
    },

    /***
     * setRoleValues
     * sets the checked value of role-fields
     * @param {Array} roles
     */
    setRoleValues : function(roles) {
        var form = this.parent.form;
        if (typeof(roles) == 'undefined') {
            alert('RExt.company.Form::setRoleValues() -- @param must be instance of array');
            return false;
        }

        // iterate the list of roles and set "checked" where has that role
        for (var n=0,len=roles.length;n<len;n++) {
            var role = roles[n];
            var id = 'roles[' + role.id + ']';

            var field = form.findField(id);
            if (field) {                                                // <-- it's a field
                field.setValue(true);
            }
            else if (field = Ext.getCmp(id)) {    // <-- it's a fieldset.
                field.expand();
            }
            else {
                alert('company.setRoleValues -- could not find role field');
            }
            for (var key in role.values) {    // <-- role-fields
                var field = form.findField('role_field[' + key + ']');
                if (field) {
                    field.setValue(role.values[key]);
                }
                else {
                    alert('Apollo.company.AccountForm::setValues -- could not locate role field ' + role.id + ':' + key);
                }
            }
        }
    }
});


/***
 * RExt.company.DomainPanel
 */
RExt.company.DomainPanel = Ext.extend(RExt.form.Component, {

    iconCls: 'icon-cog',
    layout: 'form',
    labelAlign: 'right',
    frame: true,
    autoHeight:true,
    entity: 'company',

    /***
     * initComponent
     */
    initComponent : function() {

        this.on('setdomain', function(sender, domain) {
            this.domain = domain;
            if (domain.fields != null) {
                if (this.applyFields(domain)) {
                    this.setTitle(domain.name + ' properties');
                    this.enable();
                    this.show();
                }
                else {
                    this.disable(true);
                    this.hide();
                }
            }
            else {
                this.disable(true);
                this.hide();
            }
        },this);

        /***
         * @event setvalues
         *
         */
         this.on('setvalues', function(data) {

             var values = {};
             // apply domain_field values
             var dname = this.domain.name;
             if (typeof(data.domain_values) == 'object') {
                 for (var id in data.domain_values) {
                     values[dname + '[' + id + ']'] = data.domain_values[id];
                 }
                 this.parent.form.setValues(values);
             }
          },this);

        RExt.company.DomainPanel.superclass.initComponent.call(this);
    },

    /***
     * applyFields
     * given a domain, create and add those fields to the form.
     * @param {Object} domain
     */
    applyFields : function(domain) {
        var fields = this.buildFields(domain);
        var form = this.parent.form;

        // first remove old roles (only if component is rendered)
        if (this.items instanceof Ext.util.MixedCollection) {
            this.items.each(function(i){
                if (i instanceof Ext.form.Field) {
                    form.remove(i, true); // <-- remove from BasicForm (see below)
                }
                this.remove(i, true); // <-- remove from FieldSet
            }, this);
            if (this.body) {
                this.body.dom.innerHTML = ''; // <-- clear body of left-over field labels
            }
        }

        for (var n=0,len=fields.length;n<len;n++) {
            this.add(fields[n]);
            form.add(fields[n]);
        }
        this.doLayout();
        return (fields.length > 0) ? true : false;
    },

    /***
     * buildFields
     *
     */
    buildFields : function(domain) {
        var fields = domain.fields;
        var list = [];
        for (var n=0,len=fields.length;n<len;n++) {
            var data = fields[n];
            var field = RExt.util.Builder.buildField(domain.name, data);
            if (field != null) {
                list.push(field);
            }
        }
        return list;
    }
});


/***
 * RExt.company.AccountForm
 *
 */
RExt.company.AccountForm = Ext.extend(RExt.company.Form, {
    autoWidth: false,
    iconCls: 'icon-user',
	labelWidth: 75, // label settings here cascade unless overridden
    labelAlign: 'right',
	width: 460,
	title: 'Contact',
	autoScroll: true,
	defaultType: 'textfield',
    frame: true,
    updateUrl: '/company/update_account',

    /** controller & actions **/
    controller: '/company',
    actions: {
        validate: 'validate_account',
        insert: 'insert_account',
        update: 'update_account'
    },

    initComponent : function() {
        RExt.company.AccountForm.superclass.initComponent.call(this);

        this.on('setdomain', function(sender, domain) {
            this.defaultTitle = domain.label + ' ' + 'contact';
        });
    },

    /***
     * load
     */
    load: function(id){
        App.showSpinner('Loading');
        this.setKey(id);
        this.form.load({
            url: '/company/on_edit_account/' + id,
            method: 'GET',
            success: onSuccess,
            scope: this,
            params: {}
        });
        function onSuccess(form, action){
            App.hideSpinner();
            var res = action.result;
            if (typeof(res) != 'undefined' && res.success == true) {
                this.setValues(res.data.account);
            }
        }
        function onFailure(form, action) {
            App.hideSpinner();
            App.setAlert(App.STATUS_ERROR, 'An unknown error occurred at RExt.company.AccountForm::load');
        }
    },

    /***
     * deserialize
     * reverses what Ext.form.BasicForm::getValues does.  turns a serialized form back into a regular hash
     * that can be used to repopulate the form
     * @param {Object} formHash,
     * eg: {
     *   "account[name]" : "Foo",
     *   "account[phone]" : '555.444.444'
     * }
     * becomes {
     *     name: "Foo",
     *     phone: '555.444.444'
     * }
     */
    deserialize : function(o) {
        var data = {
            roles: []
        };
        var roleValues = {};

        for (var k in o) {
            var m = k.match(/roles\[(.*)\]/);    // <-- roles[x]
            if (m) { data.roles.push({id: m[1], values: {} }); }
            m = k.match(/role_field\[(.*)\]/);   // <-- role_field[x]
            if (m) { roleValues[m[1]] = o[k]; }
            m = k.match(/account\[(.*)\]/);      // <-- account[attr]
            if (m) { data[m[1]] = o[k]; }
        }
        /** this is a super-ugly sol'n to deserialize role_values -- I simply tag them onto the first role,
         * regardless of whether they actually belong to that role.  however, due to the nature of the role-building
         * method of RExt.company.Form, this is perfectly ok -- turns out the role_values can be set independantly of
         * their containing role, since the field can be id'd with its role_field id anyway.  in a way, it's like the
         * 1st role "adopts" the field-values of all the other roles and simply carries them to the form.
         */
        if (data.roles.length) {
            data.roles[0].values = roleValues;
        }
        /***********************************/

        return data;
    },

    /***
     * setValues
     * populate form values
     * @param {Object} company
     */
    setValues : function(account) {
        var fdata = this.formify(account, 'account', {roles: true});
        this.fireEvent('setvalues', account);
        this.form.setValues(fdata);
    }
});

/***
 * RExt.company.AccountLoginPanel
 *
 */
RExt.company.AccountCredentialsPanel = Ext.extend(RExt.form.Component, {

    iconCls: 'icon-key',
    title: 'Login Credentials',
    frame: true,
    labelAlign: 'top',

    /***
     * init
     */
    init : function(parent) {
        // listen to teh following events when fired by teh parent FormPanel.  you may listen to any of these via on('eventname', ...)
        this.relayEvents(parent, ['setcompanyid']);
        RExt.company.AccountCredentialsPanel.superclass.init.apply(this, arguments);

    },

    /***
     * initComponent
     */
    initComponent : function() {

        var credentials = this.buildCredentials();
        //var password = this.buildPassword();

        /***
         * @event render
         */
        this.on('render', function() {
            //this.disable(true);
            //this.hide();
        },this);

        /***
         * @event setcompanyid
         */
        this.on('setcompanyid', function(sender, id) {
            /*
            if (id != null && id > 0) {
                credentials.disable(true);
                credentials.hide();
                password.enable(true);
                password.show();
            }
            else {
                credentials.enable(true);
                credentials.show();
                password.disable(true);
                password.hide();
            }
            */
        },this);

        this.items = [credentials];


        RExt.company.AccountCredentialsPanel.superclass.initComponent.call(this);
    },

    /***
     * buildCredentials
     */
    buildCredentials : function() {
        return new Ext.form.FieldSet({
            id: this.id + '_use_credentials',
            title: 'Username / Password',
            autoHeight: true,
            labelAlign: 'top',
            checkboxToggle:true,
            checkboxName: 'use_credentials',
            listeners: {
                expand: function() {
                    this.doLayout();
                }
            },
            collapsed: true,
            items: [
                new Ext.form.TextField({
                    name: 'account[username]',
                    fieldLabel: 'username',
                    allowBlank: false,
                    hideParent: true,
                    tabIndex: 1,
                    anchor: '93%'
                }),
                new Ext.form.TextField({
                    name: 'account[password]',
                    inputType: 'password',
                    fieldLabel: 'Password',
                    allowBlank: false,
                    tabIndex: 1,
                    anchor: '93%'
                }),
                new Ext.form.TextField({
                    name: 'account[password_confirmation]',
                    inputType: 'password',
                    fieldLabel: 'Confirm',
                    allowBlank: false,
                    anchor: '93%',
                    tabIndex: 1
                })
            ]
        });
    },

    /***
     * buildPassword
     */
    buildPassword : function() {
        return new Ext.form.FieldSet({
            id: this.id + '_fieldset',
            labelAlign: 'top',
            autoHeight: true,
            checkboxToggle: true,
            checkboxName: 'change_password',
            collapsed: true,
            listeners: {
                expand: function() {
                    this.doLayout();
                }
            },
            title: 'Select to change password',
            items: [
                new Ext.form.TextField({
                    name: 'old_password',
                    inputType: 'password',
                    fieldLabel: 'Old password',
                    allowBlank: false,
                    hideParent: true,
                    anchor: '93%',
                    tabIndex: 1
                }),
                new Ext.form.TextField({
                    name: 'new_password',
                    inputType: 'password',
                    fieldLabel: 'New password',
                    allowBlank: false,
                    anchor: '93%',
                    tabIndex: 1
                }),
                new Ext.form.TextField({
                    name: 'new_password_confirmation',
                    inputType: 'password',
                    fieldLabel: 'Confirm',
                    allowBlank: false,
                    anchor: '93%',
                    tabIndex: 1

                })
            ]
        });
    }
});
