Ext.namespace('RExt.template');
/***
 * RExt.template.DocumentMgr
 * manages sending order documents
 * @author Chris Scott
 */
RExt.template.DocumentMgr = Ext.extend(Ext.Window, {
    
    /** Ext.Window config **/
    title: 'Document Manager',
    layout: 'border',
    autoScroll: true,
    maximizable: true,
    modal: false,
    iconCls: 'icon-page',
    frame: true,
    plain: true,
    shadow: false,
    constrain: true,            
    width: 900,
    height: 630,
    closeAction: 'hide',
    buttonAlign: 'center',    
                                
    /***
     * @cfg {String} controller the controller to send actions to     
     */
    controller: null,
    
    /***
     * @cfg {String} previewAction the action to execute when user wishes to preview document
     */
    previewAction : null,
    
    /***
     * @cfg {String} sendAction the action to execute when user clicks [send] button
     */
    sendAction: null,
       
    /*** docs Collection ***/
    docs: [],
    
    /*** doc ptr to currently previewed doc ***/
    doc : null,
    
    /*** order ptr ***/
    pk: null,
    
    // private
    handler : null,
    // private 
    scope: null,
        
    /***
    * initComponnet
    */
    initComponent: function(){
        var docs = this.docs;
        this.docs = new Ext.util.MixedCollection();
        this.docs.addAll(docs);
        
        // build buttons
        this.buttons = [
            {text: 'Send', handler: this.onSend, scope: this}, 
            {text: 'Cancel', handler: function(){ this.hide(); }, scope: this }
        ];
                    
        // build items                        
        this.items = [
            this.buildPreviewPanel(),
            this.buildOptionsPanel()
        ];
        
        // super
        RExt.template.DocumentMgr.superclass.initComponent.call(this);
                                      
    },
    
    /***
     * onCheckChange
     * handler for recipient-menu check-items.  adds/removes recipients from view.
     * @param {Object} item
     * @param {Object} checked
     */
    onCheckChange : function(item, checked) {        
        if (checked === true) {
            this.recipients.store.add(new this.recipients.store.recordType({
                id: item.entity_id,
                name: item.text    
            }), item.entity_id);  
        }
        else {
            var index = this.recipients.store.findBy(function(rec, id) {
                return (rec.data.id == item.entity_id) ? true : false;
            });                        
            this.recipients.store.remove(this.recipients.store.getAt(index));   
        }                    
    },
    
    /***
     * buildOptionsPanel
     * @return {Ext.form.FormPanel     
     */
    buildOptionsPanel : function() {
        this.recipientMenu = new Ext.menu.Menu({
            id: 'recipient_menu'            
        });
        
        // create view's record def.
        var Recipient = Ext.data.Record.create([{
            name: 'id',
            type: 'integer'
        }, {
            name: 'name',
            type: 'string'
        }]);
        
        // build shipper ComboBox
        var store = new Ext.data.Store({
            reader: new Ext.data.JsonReader({
                totalProperty: "results",    
                root: "rows",                
                id: "id"                     
            }, Recipient)
        });
        
        // create view template
        var tpl = new Ext.XTemplate('<tpl for="."><span id="document-recipient-{id}" style="margin-right: 5px;border-bottom:1px dotted blue" class="document-recipient"><strong>{name},</strong></span></tpl>');
        
        // create view
        this.recipients = new Ext.DataView({
            id: this.id + '_recipient_view',
            store: store,            
            tpl: tpl,            
            multiSelect: true,                               
            overClass: '',
            itemSelector: 'span.document-recipient',
            selectedClass: 'span.document-recipient',
            style: 'padding: 5px',
            columnWidth: 1.0,
            emptyText: '<h3 class="icon-information r-icon-text">You may add any number of recipients</h3>'
        });
                                
        return new Ext.Panel({
            id: this.id + '_options',
            title: 'Recipients',
            margins: '5 0 5 0',
            bodyStyle: 'padding:5px',
            collapsible: false,
            items: [{
                layout: 'column',
                border: false,
                items: [{
                    width: 100,
                    border: false,
                    header: false,
                    bodyStyle: 'padding-top:2px',
                    items: [
                        new Ext.Button({
                            text: 'Recipients',
                            iconCls: 'icon-add',
                            menu: this.recipientMenu
                        })
                    ]
                },this.recipients]        
            }],            
            frame: false,
            header: false,            
            region: 'north',            
            labelAlign: 'right',  
            hideLabels: true,                                  
            height: 40              
        });            
    },
    
    /***
     * buildPreviewPanel
     * @return {Ext.Panel
     */
    buildPreviewPanel : function() {
        // build iframe
        var iframe = document.createElement('iframe');
        iframe.scrolling = 'auto';
        iframe.width = '100%';            
        iframe.name = Ext.id();
        iframe.frameBorder = 'no';                
        this.iframe = iframe;
        
        // build Panel
        var preview = new Ext.Panel({
            id: this.id + '_preview',            
            header: false,
            border: false,
            region: 'center'                                                 
        });                            
        /***
         * @event render
         */
        preview.on('render', function() {
            preview.body.dom.appendChild(iframe);
            this.iframe.height = preview.body.getHeight() - 5;                
        },this);        
        /***
         * @event resize
         * @param {Object} wnd
         * @param {Object} w
         * @param {Object} h
         */
        preview.on('resize', function(wnd, w, h) {
            this.iframe.height = preview.body.getHeight() - 5;        
        },this);     
        
        return preview;    
    },
    
    /***
     * findByName
     * @param {String} name
     * @return {Hash} doc-hash     
     * @private
     */
    findByName : function(name) {
        var doc = this.docs.find(function(i) { return (i.name == name) ? true : false; });
        if (!doc) {
            alert('Apollo.order.DocumentMgr could not locate that doc "' + name + '"');
        }
        return doc; 
    },
    
    /***
     * getMenu
     * @param {function} handler
     * @param {Object} scope
     * @return {Array}
     */
    getMenu: function(){
        var items = [];
        this.docs.each(function(i) {            
            items.push({
                text: i.label,
                name: i.name,
                document_id : i.id,
                iconCls: 'icon-page'
            });    
        });     
        return new Ext.menu.Menu({
            items: items
        });
    },
            
    /***
     * preview
     * @param {Ext.form.Item} item
     * @param {Integer} pk of data-model
     * @param {Array} recipients {id, name}
     * @param {Function} handler, call this method after document is sent
     * @param {Ext.Panel} scope
     * preview a docs.  opens a new browser window.  user has to use firefox file->print
     */
    preview: function(item, pk, recipients, handler, scope){
        // save the handler & scope.  call them after [send] success
        this.handler = handler || null;
        this.scope = scope || null;
        
        // show & maximize
        this.show(); 
        this.maximize();  
        
        // set order ptr              
        this.pk = pk;
        
        // set doc ptr
        this.doc = this.findByName(item.name);
        
        // clear current checkitems from recipientMenu       
        this.recipientMenu.items.each(function(i) { this.remove(i, true); },this.recipientMenu);
        
        for (var n=0,len=recipients.length;n<len;n++) {
            // add new recipients to recipientMenu
            this.recipientMenu.add(new Ext.menu.CheckItem({
                text: recipients[n].name,
                entity_id: recipients[n].id,
                listeners: {
                    checkchange: this.onCheckChange,
                    scope: this
                }
            }));
        }
        this.recipients.store.removeAll();
                       
        this.doLayout();
        
        // set iframe src        
        this.setTitle(this.doc.label);
        this.iframe.src = this.controller + '/' + this.previewAction + '/' + pk + '?template_id=' + this.doc.id;                                          
    },
    
    /***
     * onSend
     * @param {Object} btn
     * @param {Object} ev
     */
    onSend : function(btn, ev) {   
        Ext.MessageBox.wait('Transmitting document', 'Please wait...');     
        var list = [];
        this.recipients.store.each(function(rec) {
            list.push(rec.data.id);        
        });                        
        App.request({            
            url: this.controller + '/' + this.sendAction + '/' + this.pk,
            params: {
                template_id : this.doc.id,
                recipients: Ext.encode(list)
            },
            success: function(res) {
                Ext.MessageBox.hide();
                this.hide();
                
                // execute callback if set
                if (this.handler != null && this.scope != null) {
                    this.handler.call(this.scope, res);
                }
            },
            failure : function() {
                Ext.MessageBox.hide();
            },
            scope: this          
        });             
    } 
});