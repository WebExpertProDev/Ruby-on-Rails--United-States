/***
 * Apollo.company.View
 *
 */
Apollo.company.View = function(param) {

    this.company = new Apollo.Company();

    Apollo.company.View.superclass.constructor.call(this, Ext.apply({
        items : this.build(),    	
		header: true,
		border: false,
		closable: true,
		title: 'Company: ' + this.company.name
    }, param));

};
Ext.extend(Apollo.company.View, Ext.Panel, {
        
    /***
     * onDelete
     * @param {Ext.data.Record} rec
     * 
     */
    onDelete : function(rec) {
        Ext.MessageBox.wait('Please wait', 'deleting...');
        Ext.Ajax.request({
            url: '/company/delete_account/' + rec.data.id,
            method: 'POST',
            success: function(conn, response, options) {
                Ext.MessageBox.hide();
                res = Ext.decode(conn.responseText);
                Application.setAlert(res.msg, res.success);
                if (res.success == true) {
                    rec.store.remove(rec);   
                }
            },
            failure: function(conn, response, options) {
                Ext.MessageBox.hide();
                console.log('failure: ', conn, ', response:', repsonse);    
            }
        });   
    },
    
    /***
     * build
     */
    build : function() {
                                             
        var form = new Apollo.company.CompanyForm({
            id: 'company_form_' + this.company.id,            
            title: 'Company',      
            deletable: true,          
            shadow: false,
            header: false,  
            modal: false,  
            closable: false,            
            frame: true,                               
            useDialog: false,
            monitorValid: false                                            
        });                              
                                                                                                                           
        form.on('render', function() {
            var data = this.company.data;
            setTimeout(function() {
                form.setValues(data);
            },200);    
        },this); 
        
        form.setKey(this.company.id);                                                                                      
        form.showUpdate();   
        form.on('delete', function(res) {
            // remove this View from the Page.
            Ext.getCmp('page-center').remove(this);
        },this);
        
        form.setDomain(this.company.getDomain());
        
        
        this.form = form;
                                                  
        return form;
    },
    
    afterRender: function(){
        Apollo.company.View.superclass.afterRender.apply(this, arguments);
        console.log('View afterrneder');
    }
});
