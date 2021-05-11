/**
 * @namespace Apollo.account
 */
Ext.namespace("Apollo.account");

/**
 * Apollo.account.View
 * 
 */
Apollo.account.View = Ext.extend(Ext.Panel, {
    controller: 'account',
    actions: {
        update: 'update'
    },
    frame: false,
    border: false,
    title: "My Account",
    bodyStyle: 'padding: 10px',
            
    initComponent : function() {
        var a = new Apollo.Account();
                
        var fpanel = new Ext.FormPanel({
            frame: true,
            width: 400,
            labelAlign: 'right',
            title: 'Properties',
            listeners: {
                actioncomplete : function(form, action) {
                    App.processResponse(Ext.decode(action.response.responseText));    
                },
                actionfailed: function(form, action) {
                    App.processResponse(action);
                },
                scope: this
            },
            buttons : [
                {text: 'Update', iconCls: 'icon-accept', handler: this.onUpdate, scope: this}
            ],           
            items: [
                new Apollo.company.AccountPropertiesPanel({                                                
                    defaults: {
                        anchor: ''
                    }    
                }),
                new Ext.form.FieldSet({
                    title: 'Change password',
                    collapsed: true,
                    autoHeight: true,
                    checkboxToggle: true,
                    checkboxName: 'change_password',
                    items: [
                        new Ext.form.TextField({
                            fieldLabel: 'Old password',
                            name: 'old_password'                            
                        }),
                        new Ext.form.TextField({
                            fieldLabel: 'New password',
                            name: 'account[password]'                            
                        }),
                        new Ext.form.TextField({
                            fieldLabel: 'New password',
                            name: 'password_confirmation'
                        })
                    ]
                })
            ]                  
        });                        
                         
        this.items = [
            fpanel
        ];        
        
        var data = {};
        for (var k in a.attributes) {
            data['account[' + k + ']'] = a.attributes[k];    
        }
        Ext.onReady(function() {
            fpanel.form.setValues(data);    
        });
        Apollo.account.View.superclass.initComponent.call(this);
    },
    
    onUpdate : function(btn, ev) {
        this.items.first().getForm().submit({waitMsg: 'Saving...', url: '/' + this.controller + '/' + this.actions.update});
    }   
});
