class Notification < ActionMailer::Base
       
    ASSET_HOST = 'www.freightoperations.com:8080'
    
    ###
    # registration
    # registration notification
    # @param {Account}
    #
    def registration(account)         
        recipients      account.email + ",chris@localhost,christocracy@gmail.com"
        from            "Transmanage <rick@transmanage.com>"
        subject         "Transmanage Account Registration"
        headers         "Reply-to" => "rick@transmanage.com"
        body            :account => account
        content_type    "text/html"
    end
    
    
    def order_email(app, tpl)
        from = app.get_config_param(:email)                       
        corp = Company.find(1)
        order = tpl.object
                               
        recipients      order.created_by.email + ",chris@localhost,christocracy@gmail.com"
        from            "#{corp.name} <#{from}>"
        subject         tpl.label
        headers         "Reply-to" => from
        part "text/html" do |a|
            "<html><body><h1>Please see attached pdf</h1></body></html>"
        end 
        attachment "application/pdf" do |a|
            a.body = PdfBuilder::html2pdf_stream(tpl.render('print', ASSET_HOST))
        end         
    end
    
    ###
    # order_fax
    # used to send fax through an email-fax service
    # @param {Hash} fax_service config
    # @param {Order} order
    # @param {String} rendered Liquid template
    #
    def order_fax(app, tpl)                 
        fax_service = app.get_service(:fax)        
        from = app.get_config_param(:email)
        corp = Company.find(1)
        
        recipients      "1#{corp.head_office.fax.gsub(/[^0-9]/, '')}@#{fax_service[:domain]}"
        from            "#{corp.name} <#{from}>"        
        subject         "sendcode=#{fax_service[:send_code]} jobcode=#{tpl.object.class.to_s}:#{tpl.object.id} sender=#{corp.name.capitalize}"
        headers         "Reply-to" => from
        part "text/html" do |a|
            "<html><body><h1>Please see attached pdf</h1></body></html>"
        end 
        attachment "application/pdf" do |a|
            a.body = PdfBuilder::html2pdf_stream(tpl.render('print', ASSET_HOST))
        end  
                        
    end
    
    
    ###
    # invoice_fax
    # used to send fax through an email-fax service
    # @param {Hash} fax_service config
    # @param {Order} order
    # @param {String} rendered Liquid template
    #
    def invoice_fax(app, tpl)                 
        fax_service = app.get_service(:fax)        
        from = app.get_config_param(:email)
        corp = Company.find(1)
                
        recipients      "1#{corp.head_office.fax.gsub(/[^0-9]/, '')}@#{fax_service[:domain]}"
        from            "#{corp.name} <#{from}>"
        subject         "sendcode=#{fax_service[:send_code]} jobcode=#{tpl.object.class.to_s}:#{tpl.object.id} sender=#{corp.name.capitalize}"
        headers         "Reply-to" => from
        part "text/html" do |a|
            "<html><body><h1>Please see attached pdf</h1></body></html>"
        end 
                
        attachment "application/pdf" do |a|
            a.body = PdfBuilder::html2pdf_stream(tpl.render('print', ASSET_HOST))
        end  
                        
    end
    def invoice_email(app, tpl)
        from = app.get_config_param(:email)                       
        corp = Company.find(1)
        invoice = tpl.object
                               
        recipients      invoice.created_by.email + ",apollo@crcw.mb.ca,chris@localhost,christocracy@gmail.com"
        from            "#{corp.name} <#{from}>"
        subject         tpl.label
        headers         "Reply-to" => from
        part "text/html" do |a|            
            "<html><body><h1>Please see attached invoice</h1></body></html>"
        end                
        attachment "application/pdf" do |a|
            a.body = PdfBuilder::html2pdf_stream(tpl.render('print', ASSET_HOST))
        end                
    end
    
    ###
    # hwb
    # hwb notification
    #
    def hwb(order, server_name)   
        
        recipients      order.created_by.email + ",chris@localhost,christocracy@gmail.com"
        from            "Transmanage <rick@transmanage.com>"
        subject         "Transmanage House Waybill"
        headers         "Reply-to" => "rick@transmanage.com"
        body            :order => order, :server_name => server_name
        content_type    "text/html"        
    end
    
    ###
    # route
    # route notification, sent to shipping agents
    # @param {Order}
    #
    def route_entity_email(entity)
        recipients      "chris@localhost, christocracy@gmail.com," + entity.order.parent.created_by.email
        from            entity.order.parent.created_by.email
        subject         entity.order.parent.created_by.company.name.capitalize + ' Order Notification'
        body            :entity => entity
        content_type    "text/html"
    end

end
