Ext.namespace("Apollo.company");


/***
 * @class Apollo.company.Manager
 *
 * @param {Object} param
 */
Apollo.company.Manager = function(param){

    // create el if not exists.
    var ct = Ext.get(param.id);
    if (!ct) {
        ct = document.createElement('div');
        ct.id = param.id;
        document.body.appendChild(ct);
    }
        
    Apollo.company.Manager.superclass.constructor.call(this, Ext.apply({
        el: Ext.get(ct.id),
        tbar: [{
            text: 'New',
            iconCls: 'icon-add',
            menu: RExt.company.Util.getCompanyDomainMenu(this.onNewCompany, this)
        }]
    }, param));
    
    // create root node.
    var root = new Ext.tree.AsyncTreeNode({
        text: 'Companies',
        draggable: false, // disable root node dragging
        id: 'source'
    });
    this.setRootNode(root);
    //root.expand();
    
    // attach click event
    this.on('click', this.onClick, this, {});
    
    // private   
}
Ext.extend(Apollo.company.Manager, Ext.tree.TreePanel, {
    
    controller: 'company',
    actions: {
        
    },
    
    /**
     * initComponent
     * @param {Object} node
     * @param {Object} ev
     */
    initComponent : function() {
        // attach company dropdown editor to app's toolbar. 
        App.onReady(function() {                 
            App.getToolbar().add(                
                new RExt.company.CompanyCombo({
                    id: 'application_company_combo',
                    allowBlank: true,
                    emptyText: 'Edit company',
                    width: 250,
                    listeners: {
                        select: function(combo, rec, index) { 
                            this.onClickCompany(rec.data.id); 
                            combo.setValue('');
                        },
                        scope: this
                    }                    
                })                    
            );
        },this);
        
        Apollo.company.Manager.superclass.initComponent.call(this);
            
    },
    
    /***
     * onClick
     * tree clicks
     * @param {Object} node
     * @param {Object} ev
     */
    onClick: function(node, ev){
    
        var path = node.id.split(':');
        var id = path.pop();
        var model = path.pop();
        if (typeof(model) == 'undefined') { // <-- click on tree-root?  just return
            return false;
        }
        var controller = model.toLowerCase();
        
        var center = Ext.getCmp('page-center');
        var p = center.getComponent(controller + '-view-tab-' + id);
        
        if (p) {
            return center.activate(p);
        }
        
        switch (controller) {
            case 'company':
                this.onClickCompany(id);
                break;
        }
    },
    
    /**
     * onClickCompany
     * @param {Object} item
     * @param {Object} ev
     */
    onClickCompany : function(id) {
        
        //Ext.MessageBox.wait('Please wait...', 'Loading company');
        App.showSpinner('Loading...');
        el = Ext.getBody().createChild({
            tag: 'div',
            id: this.controller + '-view-tab-' + id
        });
        document.body.appendChild(el.dom);
        
        um = el.getUpdateManager();
        um.update({
            url: this.controller + '/view/' + id,
            method: 'POST',
            scripts: true,
            timeout: 20,
            text: 'Loading...',
            nocache: false,
            callback: function(){
                var view = new Apollo.company.View({
                    id: this.controller + '-view-tab-' + id
                });
                center.add(view).show();                        
                                                                
                Application.getPage().doLayout();
                                        
                //Ext.MessageBox.hide();
                App.hideSpinner();
                
                
            },
            scope: this
        });
                    
    },
    
    /***
     * onNewCompany
     * @param {Object} item
     * @param {Object} ev
     */
    onNewCompany: function(item, ev){
        var domain = RExt.company.Util.loadDomain(item.domain_id);
        
        var fpanel = Ext.getCmp('company_form');
        
        fpanel.showInsert();
        fpanel.setDomain(domain);
                
        fpanel.on('actioncomplete', function(form, action){
            if (typeof(action.result) == 'object') {
                if (action.result.success == true) {
                    fpanel.hide();
                    var node = this.getNodeById('Domain:' + domain.id);
                }
            }
        }, this);
    }
});

/***
 * @class Apollo.company.CompanyForm
 * @extends RExt.company.Form2
 * @author Chris Scott
 */
Apollo.company.CompanyForm = Ext.extend(RExt.company.Form, {
        
    /***
     * initComponent
     */
    initComponent: function(){
                    
        this.plugins = [];
        
        this.plugins.push(new Apollo.company.PropertiesPanel({
            title: "Company Properties",
            formName: 'company',
            id: this.id + '_properties',
            region: 'left'
        }));
        
        // roles
        this.plugins.push(new Apollo.company.CompanyRolesPanel({
            id: this.id + '_roles',
            domain: this.domain,
            region: 'accordion'            
        }));
        
        // accounts
        this.plugins.push(new RExt.company.AccountPanel({
            id: this.id + '_accounts',
            domain: this.domain,
            region: 'accordion'
        }));
        
        // locations
        this.plugins.push(new RExt.company.LocationPanel({
            id: this.id + '_locations',
            region: 'left'               
        }));
        
        // billing
        this.plugins.push(new Apollo.company.BillingPanel({
            id: this.id + '_billing',
            domain: this.domain,
            region: 'accordion',
            title: 'Billing',
            header: true,
            layout: 'form'
        }));
                
        if (this.domain == null) {
            // sales-agents
            this.plugins.push(new Apollo.company.SalesAgentPanel({
                id: this.id + '_agents',
                domain: this.domain,
                region: 'accordion'
            }));
        }
        
        // domain panel
        this.plugins.push(new RExt.company.DomainPanel({
            id: this.id + '_domain',
            domain: this.domain,
            region: 'accordion',
            title: 'Domain Fields',
            header: true,
            frame: true
        }));
                
        // set the items                  
        this.items = [{
            region: 'left',
            title: 'Left Column'            
        }, {
            region: 'accordion',
            title: 'Accordion Title',
        }];        
                       
        // super
        Apollo.company.CompanyForm.superclass.initComponent.call(this);
    },
    
    /***
     * setValues
     * populate form values
     * @param {Object} company
     */
    setValues : function(company) {                        
        var fdata = this.formify(company, 'company', {cc: true, billing_address: true});                              
        this.fireEvent('setvalues', company);                                                               
        this.form.setValues(fdata);                                                         
    }
});

/***
 * @class Apollo.company.CompanyRolesPanel  
 * @extends RExt.company.RolesPanel
 * simply validate role-fields when domain is carrier -- ensure user selects a carrier domain.
 */
Apollo.company.CompanyRolesPanel = Ext.extend(RExt.company.RolesPanel, {
    /***
     * initComponent     
     */
    initComponent : function() {
        Apollo.company.CompanyRolesPanel.superclass.initComponent.call(this);    
        
        /***
         * @event validate
         */
        this.on('validate', function() {
            var valid = true;
            if (this.domain.name == 'carrier') {  //<-- if this is a carrier, make damn sure user selected a carrier-role!    
                valid = false;                                       
                for (var id in this.domain.roles.company) {
                    var field = this.parent.form.findField('roles[' + id + ']');
                    if (field.getValue() === true) {
                        valid = true;
                    }
                }
                
                // if user didn't select a carrier-role, form is invalid.
                if (valid === false) {
                    Ext.MessageBox.alert('Error', 'You must specify at least one role for a carrier (eg: Ground, Air Commercial, Air Freight)');                    
                }                                
            }
            return valid;
        },this);        
    } 
});

/***
 * @class Apollo.company.PropertiesPanel
 */
Apollo.company.PropertiesPanel = Ext.extend(RExt.form.Component, {
    frame: false,
    border: false,
    header: false,
    
    autoHeight: true,
    
    initComponent: function(){
    
        var formName = this.formName;
        
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
            anchor: '90%'            
        });
        
        // create airport combo
        var airport = regionMgr.renderAirport({
            anchor: '87%',
            name: 'airport',
            hiddenName: formName + '[airport_id]'
        });
        
        // sew them all together with RegionMgr::associate
        regionMgr.associate(comboCountry, comboRegion, comboCity, airport);
                
        this.on('setvalues', function(data) {
            /*
            var rec = new comboRegion.store.recordType(data.region);
            comboRegion.store.insert(0, rec);
            
            var rec = new comboCity.store.recordType(data.city);
            comboCity.store.insert(0, rec);
            
            var rec = new airport.store.recordType(data.airport);
            airport.remoteValid = true;
            airport.store.insert(0, rec);
            */
            
        },this);
        
        // details fieldset
        var details = {
            iconCls: 'icon-building',
            layout: 'form',
            autoHeight: true,
            xtype: 'fieldset',
            title: 'Details',    
            defaultType: 'textfield',        
            items: [{
                xtype: 'textfield',
                name: formName + '[name]',
                tabIndex: 1,
                fieldLabel: 'Name',
                allowBlank: false,
                anchor: '98%'
            },{
                xtype: 'textfield',
                name: formName + '[description]',
                tabIndex: 1,
                fieldLabel: 'Notes',
                allowBlank: true,
                anchor: '98%'
            }, {
                name: formName + '[www]',
                tabIndex: 1,
                fieldLabel: 'Url',
                emptyText: 'http://',
                anchor: '98%'                
            }, {
                name: formName + '[username]',
                tabIndex: 1,
                emptyText: 'vendor/client login',
                fieldLabel: 'Username'                
            }, {
                name: formName + '[password]',                
                tabIndex: 1,
                fieldLabel: 'Password'                
            }]            
        };        
        this.items = [details];
        
        Apollo.company.PropertiesPanel.superclass.initComponent.apply(this, arguments);
    }
});


    
/***
 * @class Apollo.company.BillingPanel
 *
 */
Apollo.company.BillingPanel = Ext.extend(RExt.form.Component, {

    iconCls: 'icon-money',
    layout: 'form',
    frame: true,
    style: 'margin-bottom: 5px',
    title: 'Billing',
    autoHeight: true,
    autoWidth: true,
    defaultType: 'textfield',
    labelWidth: 100,
    formName: 'company',
    
    /***
     * initComponent
     */
    initComponent: function(){
        var method = this.buildBillingMethod();
                
        this.items = method;
        
        /***
         * @event setdomain
         * @param {Object} sender
         * @param {Object} domain
         */
        this.on('setdomain', function(sender, domain){    
                                            
            var fs_credit = method.getComponent(this.id + '_fs_credit');
            fs_credit.disable(true);
            fs_credit.hide();                        
            switch (domain.name) {
                case 'client':
                    method.enable(true);
                    method.show();
                    fs_credit.disable(true);
                    fs_credit.hide();
                    break;
                default:
                    method.disable(true);
                    method.hide();                                        
            }
        }, this);
        
        /***
         * @event reset
         * collapse billing fieldset by default
         */
        this.on('reset', function() {
            if (this.rendered == true) {
                // address used to be here.
            }    
        },this);
        
        Apollo.company.BillingPanel.superclass.initComponent.call(this);
    },
    
    /***
     * buildBilling
     */
    buildBillingMethod: function(){
    
        var comboBillingMethod = new Ext.form.ComboBox({
            name: 'company_billing_method_id',
            hiddenName: this.formName + '[billing_method_id]',
            tabIndex: 1,
            width: 100,
            listWidth: 100,
            fieldLabel: 'Billing method',
            allowBlank: false,            
            forceSelection: true,
            triggerAction: 'all',
            displayField: 'label',
            valueField: 'id',
            emptyText: 'Select...',
            mode: 'local',
            store: new Ext.data.SimpleStore({
                'id': 0,
                fields: ['id', 'name', 'label'],
                data: Apollo.order.Util.getBillingMethods()
            })
        });
        /***
         * @event select
         * show/hide credit-fieldset
         * @param {Object} field
         * @param {Object} record
         * @param {Object} index
         */
        comboBillingMethod.on('select', function(field, record, index){
            // NOTE: check disabled here -- the fs may be disabled!!!                         
            if (comboBillingMethod.disabled == false && record.data.name == 'credit') {
                fs_credit.show();
                fs_credit.enable(true);
            }
            else {
                fs_credit.disable(true);
                fs_credit.hide();
            }
        });
        
        /***
         * @event setvalues
         * @param {Object} data
         */
        this.on('setvalues', function(data) { 
            var form = this.parent.form;           
            comboBillingMethod.setValue(data.billing_method_id);            
            var rec = comboBillingMethod.store.getById(comboBillingMethod.getValue());
            comboBillingMethod.fireEvent('select', comboBillingMethod, rec, 0);      
            
            if (typeof(data.cc) != 'undefined') {
                var dt = new Date(data.cc.expiry);
                var cc_mm = form.findField('cc[month]');
                cc_mm.setValue(dt.format("m"));
                
                var cc_yy = form.findField('cc[year]');
                cc_yy.setValue(dt.format("Y"));
            }
            
            if (data.bill_to_company_address === false) {
                var fs = this.getComponent(this.id + '_billing_address');
                var city = form.findField('billing_address[city_id]');
                city.store.insert(0, new city.store.recordType(data.billing_address.city));                
                fs.expand(true);
            }      
        },this);
        
        // build cc months 01 - 12 for Combo.[ [1], [2]...[12] ]     
        months = [];                
        for (var n=0,len=12;n<len;n++) {(n<9) ? months.push(['0' + (n + 1)]) : months.push([n+1]); }
        
        // build credit-card fieldset
        var fs_credit = new Ext.form.FieldSet({
            iconCls: 'icon-creditcards',
            id: this.id + '_fs_credit',
            layout: 'form',
            title: 'Credit Information',
            autoHeight: true,
            autoWidth: true,
            defaultType: 'textfield',
            labelWidth: 75,
            maskDisabled: true,
            style: 'margin-top: 10px',
            listeners: {
                show: function() { this.doLayout(); }    
            },
            items: [
                new Ext.form.ComboBox({
                    name: 'system_cc_id',
                    tabIndex: 1,
                    width: 100,
                    listWidth: 100,
                    hiddenName: 'cc[system_cc_id]',
                    fieldLabel: 'Type',
                    value: 1, // <-- set default cc_id to 1.  
                    allowBlank: false,
                    forceSelection: true,
                    triggerAction: 'all',
                    displayField: 'name',
                    valueField: 'id',
                    mode: 'local',
                    store: new Ext.data.SimpleStore({
                        fields: ['id', 'name'],
                        data: Apollo.order.Util.getCreditCardTypes()
                    })
                }), 
                new Ext.form.TextField({
                    name: 'cc[num]',
                    fieldLabel: 'Credit card#',
                    anchor: '88%',
                    tabIndex: 1,
                    allowBlank: false,
                    vtype: 'cc'
                }), 
                new Ext.form.TextField({
                    name: 'cc[pin]',
                    allowBlank: false,
                    fieldLabel: 'PIN',
                    width: 60,
                    tabIndex: 1
                }), 
                new Ext.Panel({
                    layout: 'column',                              
                    items: [
                        new Ext.Panel({
                            width: 140,           
                            border: true,                            
                            layout: 'form',                    
                            items: new Ext.form.ComboBox({
                                hiddenName: 'cc[month]',
                                tabIndex: 1,
                                width: 25,                        
                                fieldLabel: 'Month',
                                allowBlank: false,
                                forceSelection: true,
                                triggerAction: 'all',
                                displayField: 'value',
                                valueField: 'value',
                                mode: 'local',
                                store: new Ext.data.SimpleStore({
                                    fields: ['value'],
                                    data: months
                                })
                            })   
                        }), {
                            columnWidth: 1.0,
                            layout: 'form', 
                            labelWidth: 40,
                            border: true,                   
                            items: new Ext.form.ComboBox({
                                hiddenName: 'cc[year]',
                                tabIndex: 1,
                                width: 25,                        
                                fieldLabel: 'Year',
                                allowBlank: false,
                                forceSelection: true,
                                triggerAction: 'all',
                                displayField: 'name',
                                valueField: 'value',
                                mode: 'local',
                                store: new Ext.data.SimpleStore({
                                    fields: ['value', 'name'],
                                    data: Apollo.order.Util.getCreditCardExpiryDates()
                                })
                            })   
                        }
                    ]    
                })
            ]
        });
        
             
        return new Ext.Panel({
            id: this.id + '_accounting',
            layout: 'form',
            border: false,
            header: false,
            items: [comboBillingMethod, fs_credit]
        });
    }    
});

/***
 * @class Apollo.company.SalesAgentPanel
 *
 */
Apollo.company.SalesAgentPanel = Ext.extend(RExt.form.Component, {

    iconCls: 'icon-building',
    frame: true,
    style: 'margin-bottom: 5px',
    id: this.id + '_agents',
    layout: 'fit',
    autoHeight: true,
    title: 'Sales Agents',
    
    /***
     * initComponent
     */
    initComponent: function(){
    
        var view = this.build();
        
        /***
         * @event setdomain
         * @param {Object} sender
         * @param {Object} domain
         */
        this.on('setdomain', function(sender, domain){
            this.domain = domain;
            switch (domain.name) {
                case 'client':
                    this.enable();
                    this.show();
                    break;
                default:
                    this.disable();
                    this.hide();
            }
        });
        
        /***
         * @event setvalues
         * @param {Object} data
         */
        this.on('setvalues', function(data) {
                     
            var list = [];
            for (var n=0,len=data.agents.length;n<len;n++) {
                list.push(new view.store.recordType(data.agents[n]));        
            }
            view.store.add(list);                 
        },this);
        
        /***
         * @event reset
         * clear the store
         */
        this.on('reset', function() {
            view.store.removeAll();
            view.store.deleted = [];    
        });
        
        this.items = view;
        Apollo.company.SalesAgentPanel.superclass.initComponent.call(this);
    },
    
    /***
     * init
     * plugin init, called by framework
     */
    init: function(fpanel){
        Apollo.company.SalesAgentPanel.superclass.init.apply(this, arguments);
        fpanel.on('beforesubmit', function(form, action){
            var view = this.items.first();
            var data = {
                deleted: view.deleted,
                added: []
            };
            
            // agents                
            view.store.each(function(r){
                if (typeof(r.data.id) == 'undefined') { // <-- records with no id are NEW and need to be inserted on server.
                    data.added.push({
                        account_id: r.data.account_id,
                        commission: r.data.commission
                    });
                }
            });
            action.options.params.agents = Ext.encode(data);
        }, this);
    },
    
    /***
     * build
     */
    build: function(){
        // create view's record def.
        var Agent = Ext.data.Record.create([{
            name: 'id',
            type: 'integer'
        }, {
            name: 'account_id',
            type: 'integer'
        }, {
            name: 'company_id',
            type: 'integer'
        }, {
            name: 'name',
            type: 'string'
        }, {
            name: 'company',
            type: 'string'
        }]);
        
        // build shipper ComboBox
        var store = new Ext.data.Store({
            reader: new Ext.data.ArrayReader({
                record: 'agent'
            }, Agent),
            baseParams: {}
        });
        
        // create view template
        var tpl = new Ext.XTemplate('<tpl for=".">', '<div id="company-sales_agent-{id}" class="sales-agent x-grid3-row">', '    <h2>{name}</h2>', '    <p>{company}</p>', '</div>', '</tpl>');
        
        // create view
        var view = new Ext.DataView({
            id: this.id + '_agent_view',
            store: store,
            tpl: tpl,
            cls: 'x-grid3',
            multiSelect: true,
            deleted: [], // <-- custom deleted array        
            height: 200,
            overClass: 'x-grid3-row-over',
            itemSelector: 'div.sales-agent',
            selectedClass: 'x-grid3-row-selected',
            style: 'padding: 5px',
            emptyText: '<h2>No sales-agents added</h2><h3 class="icon-information r-icon-text">You may add any number of sales-agents to this company</h2>'
        });
        
        // expense form
        var popup = new RExt.form.Popup({
            id: 'sales_agent_popup',
            actsAsDialog: true,
            autoFocus: false,
            shadow: false,
            form: new Apollo.company.SalesAgentForm({
                id: 'sales_agent_form',
                title: 'Add Sales-agent'
            })
        });
        var popupBtn = new RExt.Toolbar.PopupButton({
            text: 'Add sales-agent',
            iconCls: 'icon-add',
            menu: popup,
            handler: function(btn, ev){
                var fpanel = popup.form;
                fpanel.showInsert();
                fpanel.on('beforeaction', function(form, action){
                    // short-cct submit and return false and simulate an 'actioncomplete' event.                                                           
                    action.result = {
                        success: true,
                        data: form.getValues(),
                        msg: ''
                    };
                    form.fireEvent('actioncomplete', form, action);
                    return false;
                }, this);
                fpanel.on('actioncomplete', function(form, action){
                    var res = action.result;
                    if (typeof(res) == 'object') {
                        if (res.success == true) {
                            var company = form.findField('company_id');
                            var account = form.findField('account_id');
                            
                            var data = res.data;
                            data.name = account.getRawValue();
                            data.company = company.getRawValue();
                            
                            view.store.insert(0, new Agent(data));
                            
                            popup.hide();
                        }
                    }
                }, this);
            },
            scope: this
        });
        
        // set toolbar
        this.tbar = [popupBtn, {
            text: 'Remove',
            iconCls: 'icon-delete',
            handler: function(btn, ev){
                var rs = view.getSelectedRecords();
                if (rs.length > 0) {
                    var rec = rs[0];
                    
                    if (typeof(rec.data.id) != 'undefined') {
                        view.deleted.push(rec.data.id);
                    }
                    view.store.remove(rec);
                }
            }
        }];
        
        return view;
    }
});

/***
 * @class Apollo.company.SalesAgentForm
 *
 */
Apollo.company.SalesAgentForm = Ext.extend(RExt.sys.Form, {

    /***
     * default params
     */
    iconCls: 'icon-money',
    title: 'Add Sales-agent',
    frame: true,
    width: 320,
    height: 170,
    autoHeight: false,
    labelWidth: 85,
    labelAlign: 'right',
    controller: 'company',
    actions: {
        insert: 'insert',
        update: 'update'
    },
        
    companyForm: null,
    
    /***
     * initComponent
     *
     */
    initComponent: function(){
    
        
        this.on('render', function() {
            
            this.companyForm = new Apollo.company.CompanyForm({
                id: 'sales_agency_form',
                title: 'New Sales-agency',
                header: false,                
                dialogConfig: {
                    width: 750,
                    height: 520
                },
                autoWidth: true,
                style: 'z-index: 20000',
                closable: true,
                formName: 'company',
                frame: true,
                simple: true,
                modal: true,
                shadow: false,
                useDialog: true,
                domain: true
            });
            this.companyForm.on('render', function() {
                var domain = RExt.company.Util.loadDomainByName('sales_agency');
                if (!domain) {
                    alert('Apollo.company.SalesAgentForm::initComponent -- could not load domain "sales_agency"');
                    return false;
                }
                this.companyForm.setDomain(domain);
            },this);
            
        },this);
                
        var domain = RExt.company.Util.getDomainByName('sales_agency');
        var company = new RExt.company.CompanyCombo({
            name: 'sales_agency',
            hiddenName: 'company_id',
            fieldLabel: 'Sales-agency',
            form_id: 'sales_agency_form'    //<-- the id to find Form with Ext.getCmp(form_id) when [+] is pressed. 
        });        
        company.setDomain(domain);
        company.reset = function(){
            this.lastQuery = null;
            RExt.form.ComboBoxAdd.superclass.reset.apply(this, arguments);
        };
                
                
        // @event select
        // when a new shipper is selected, make sure to reset shipperContact
        company.on('select', function(param){
            contact.reset();
            contact.lastQuery = null;
            contact.setCompanyId(company.getValue());
            contact.doQuery('', true);
        });
                
        var contact = new RExt.company.AccountCombo({
            name: 'sales_agency_contact',
            emptyText: 'Select contact...',            
            hiddenName: 'account_id'           
        });
        contact.reset = function(){
            this.lastQuery = null;
            RExt.form.ComboBoxAdd.superclass.reset.apply(this, arguments);
        };
                          
        this.items = [company, contact];
        Apollo.company.SalesAgentForm.superclass.initComponent.call(this);
    }
});

/***
 * @class Apollo.company.AccountForm
 */
Apollo.company.AccountForm = Ext.extend(RExt.company.AccountForm, {
        
    /**
     * @cfg {Boolean} [false] showCredentials
     * wheather to show the credentials panel
     */
    showCredentials : false,
     
    initComponent : function() {
        this.plugins = [];
        
        var p = this.findParentByType('Apollo.company.CompanyForm');
        console.log('parent: ', p);
        
        // properties
        this.plugins.push(new Apollo.company.AccountPropertiesPanel({
            title: "Account Properties",
            formName: 'account',
            id: this.id + '_properties',
            region: 'left'
        }));
        
        // roles
        this.plugins.push(new RExt.company.RolesPanel({
            id: this.id + '_roles',
            domain: this.domain,
            region: 'accordion',            
            entity: 'account'
        }));
        
        // login credential
        if (this.showCredentials === true) {
            this.plugins.push(new RExt.company.AccountCredentialsPanel({
                id: this.id + '_login_credentials',
                domain: this.domain,
                region: 'accordion'
            }));
        }
                                             
        // super                        
        Apollo.company.AccountForm.superclass.initComponent.call(this);
    } 
});

/**
 * @class Apollo.company.AccountPropertiesPanel
 * @constructor
 * @extends RExt.form.Component
 * 
 */
Apollo.company.AccountPropertiesPanel = Ext.extend(RExt.form.Component, {
    
    formName: 'account',    
    autoHeight: true,
    iconCls: 'icon-vcard',
    title: 'Account Information',
    layout: 'form',
    frame: false,
    style: 'margin-top: 5px',
    header: false,
        
            
    /***
     * initComponent
     */
    initComponent : function() {
           
        this.items = [
            new Ext.form.TextField({
                name: 'account[first]',
                fieldLabel: 'First name',
                allowBlank: false,
                tabIndex: 1,
                anchor: '98%'
            }), new Ext.form.TextField({
                name: 'account[last]',
                fieldLabel: 'Last name',
                allowBlank: false,
                tabIndex: 1,
                anchor: '98%'
            }), new Ext.form.TextField({
                name: 'account[description]',
                fieldLabel: 'Notes',
                allowBlank: true,
                tabIndex: 1,
                anchor: '98%'
            }), new Ext.form.TextField({
                name: 'account[phone]',
                fieldLabel: 'Phone',
                allowBlank: true,
                vtype: 'phone',
                vtypeText: "Phone field must be of form xxx-xxx-xxxx",
                width: 100,
                tabIndex: 1
            }), new Ext.form.TextField({
                name: 'account[mobile]',
                fieldLabel: 'Mobile',
                vtype: 'phone',
                vtypeText: "Phone field must be of form xxx-xxx-xxxx",
                allowBlank: true,
                width: 100,
                tabIndex: 1
            }), new Ext.form.TextField({
                name: 'account[fax]',
                fieldLabel: 'Fax',
                vtype: 'phone',
                vtypeText: "Phone field must be of form xxx-xxx-xxxx",
                allowBlank: true,
                width: 100,
                tabIndex: 1
            }), new Ext.form.TextField({
                name: 'account[email]',
                vtype: 'email',
                anchor: '98%',
                msgTarget: 'qtip',
                fieldLabel: 'Email',
                allowBlank: true,
                tabIndex: 1
            })
        ];
            
        Apollo.company.AccountPropertiesPanel.superclass.initComponent.call(this);
    } 
});

