class InvoiceController < ApplicationController
            
    def insert_transaction           
        res = RResponse.new
        res.data[:transactions] = []
        
        # multiple transaction?
        rs = Invoice.find((params["invoices"].nil?) ? params[:id] : JSON.parse(params["invoices"]), :include => [:order])
        
        # if we're dealing with just a single Invoice here, put it into an array for convenience of 
        # the following loop.        
        rs = [rs] if rs.kind_of?(ActiveRecord::Base)
        
        # total incoming $.  if applying to multiple invoices, the total of all invoices must == this number.  
        # this is the totalamount the client is *giving* to CORP.   we'll iterate all invoices and calculate invoice_amount.
        # once complete, client_amount MUST EQUAL invoice_total or an exception is raised.        
        client_amount = Money.new(params["transaction"]["amount"].to_f * 100)   #<-- convert to String -> Float -> cents
        invoice_total = Money.new(0)
        
        # if multiple transactions, make sure that all invoices correspond to the same bill-to and that the total
        # of all invoices matches the client_amount above.  arbitrarily choose the 1st record's bill-to to sample all others against.
        b2id = rs.first.order.bill_to_id
        rs.each do |i|                    
            raise RException.new("To pay multiple invoices in one transaction, all bill-to companies must be the same") if i.order.bill_to_id != b2id
            raise RException.new("The invoice attached to bill-number #{i.order.bill_number} seems to have been paid already (amount-due: #{i.amount_due}, status: #{i.status.name})") if (i.amount_due.cents == 0)
            
            # raise exceptions if InvoiceStatus is anything BUT "invoiced"
            case i.status.name
                when "paid"
                    raise RException.new("The invoice attached to bill-number #{i.order.bill_number} appears to have already been paid (amount-due: #{i.amount_due})")
                when "new"
                    raise RException.new("It appears that invoice attached to bill-number #{i.order.bill_number} has not been transmitted to the client yet, since its status is listed as '#{i.status.name}'.") if i.status.name == 'new'
            end                                   
            invoice_total += i.amount_due
        end
                
        # raise exception if client_amount is NOT EQUAL invoice_total.  this may be made more intelligent.
        raise RException.new("Transaction amount (#{client_amount}) does not equal to total invoice amount (#{invoice_total}).  You may need to apply adjustments to one or more of the invoices.") if client_amount != invoice_total
        
        # shields up, here we do...        
        form = params["transaction"]                        
        rs.each do |i|   
            client_amount -= i.amount_due
            
            form["invoice_id"] = i.id
            form["amount"] = i.amount_due
            form["created_by"] = self.current_user.account
            form["updated_by"] = self.current_user.account
            
            t = InvoiceTransaction.create(form)
            
            if (!t.id.nil?) 
                i.reload
                # tag invoice as PAID with status-change.
                i.status = InvoiceStatus.find_by_name('paid') if i.amount_due.cents == 0
                
                LOG.info("--------------------- invoice/insert_transaction is DISABLED FOR TESTING")
                ####################
                # DISABLED WHILE TESTING                
                #i.save!
                ####################                
                t.destroy
                
                # log it
                SystemLog.create(
                    :log_type => SystemLogType.find_by_name('comment'),
                    :loggable_id => i.id,
                    :loggable_type => 'Invoice',
                    :subject => "Transaction",
                    :msg => "Amount: #{form['amount']}",
                    :created_by => self.current_user.account
                )    
                
                res.data[:transactions] << t.to_h                
            end
        end
        
        # raise Exception if total number of scheduled transactions != total successful transactions        
        if rs.length != res.data[:transactions].length
            raise RException.new("#{rs.length.to_s} transaction(s) where scheduled to be processed but #{(rs.length - res.data[:transactions].length).to_s} failed.  All transactions have been cancelled.")
        else        
            # all is good :)
            res.success = true
            res.msg = 'Transaction success'
            respond(res)
        end
    end
    
    def delete_transaction
        res = RResponse.new
        InvoiceTransaction.destroy(params[:id])   
        res.msg = 'Deleted transaction'
        res.success = true
        respond(res)
    end
            
    ##
    # insert_adjustment
    #
    def add_adjustment
        # security-check: blow up if class_name is anything other'n InvoiceItem || InvoicePayable
        raise RException.new("Invalid PeerClass #{params["class_name"]}") if !(params["class_name"] == "InvoiceItem" || params["class_name"] == "InvoicePayable")

        res = RResponse.new
        
        peer = params["class_name"].constantize        
        item = peer.find(params[:id])
        adj = item.adjust(params["adjustment"])
        if (adj.invoiceable && !adj.invoice_item.nil? && peer == InvoicePayable)
            res.add_action(RAction.new({
                :component_id => 'item_grid_' + item.invoice_id.to_s,
                :verb => 'insert',
                :data => {:item => adj.invoice_item.to_h}
            }))
        end
        # have to update commissions if this a commissionable adjustment
        if (adj.commissionable)
            item.invoice.update_commissions.each do |p|
                res.add_action(RAction.new({
                    :component_id => 'payables_' + p.invoice_id.to_s,
                    :verb => 'update',
                    :data => {:item => p.to_h}
                }))
            end
        end
        res.msg = "Added invoice adjustment"
        res.data[:adjustment] = adj.to_h
        res.data[:item] = item.to_h
        
        res.success = true
        
        respond(res)
    end
           
    ###
    # delete_adjustmnent
    #
    def delete_adjustment
        # security-check: blow up if class_name is anything other'n InvoiceItem || InvoicePayable
        raise RException.new("Invalid PeerClass #{params["class_name"]}") if !(params["class_name"] == "InvoiceItem" || params["class_name"] == "InvoicePayable")
        
        res = RResponse.new
        
        peer = params["class_name"].constantize        
        item = peer.find(params["item_id"])
        if adj = item.unadjust(params[:id].to_i)
            if (adj[:commissionable] == true)
                # add update-actions for Commissions
                item.invoice.update_commissions.each do |p|
                    res.add_action(RAction.new({
                        :component_id => 'payables_' + p.invoice_id.to_s,
                        :verb => 'update',
                        :data => {:item => p.to_h}
                    }))
                end
            end
        
            res.success = true
            res.data[:item] = item.to_h
            if (!adj[:invoice_item].nil?)
                res.add_action(RAction.new({
                    :component_id => 'item_grid_' + item.invoice_id.to_s,
                    :verb => 'delete',
                    :data => {:item => adj[:invoice_item].to_h}
                }))                             
            end
            res.msg = "Removed invoice adjustment"
        end
        respond(res)
    end
    
    ##
    # update_payable
    # 
    def update_payable
        res = RResponse.new        
        payable = InvoicePayable.find(params[:id])
        payable.write_attribute(params["field"], params["value"])
        res.success = payable.save!
        res.msg = "Updated payable, set #{params["field"]} to #{params["value"]}" if res.success == true
        respond(res)
    end
            
    def insert_log
        res = RResponse.new
        
        log = SystemLog.create(
            :log_type => SystemLogType.find_by_name('comment'),
            :loggable_id => params[:id],
            :loggable_type => 'Invoice',
            :subject => params["log"]["subject"],
            :msg => params["log"]["msg"],
            :created_by => self.current_user.account
        )
            
        res.success = true
        res.data[:log] = log.to_h
        res.msg = 'insert_log'
        
        respond(res)
    end
    
    def preview       
        @tpl = Template.find(params["template_id"])                   
        output = @tpl.render_by_model_id(params[:id], 'print', 'www.freightoperations.com:8080')
        render(:text => output, :layout => false)        
    end
    
    ###
    # transmit
    # sends the invoice
    #
    def transmit
        tpl = Template.find(params["template_id"])
        tpl.load(params[:id])
                
        tpl.object.status = InvoiceStatus.find_by_name('invoiced')
        tpl.object.save!
                                        
        #Notification.deliver_invoice_email(self, tpl)
        Notification.deliver_invoice_fax(self, tpl)
                        
        log = SystemLog.create({    
            :log_type => SystemLogType.find_by_name('notification'),
            :loggable_id => params[:id],
            :loggable_type => 'Invoice',
            :subject => 'Invoice sent',
            :msg => 'Invoiced client',            
            :created_by => self.current_user.account          
        })
        
        action = RAction.new(
            :component_id => 'log_' + tpl.object.id.to_s,
            :msg => 'Inserted log',
            :verb => 'insert',
            :data => {:log => log.to_h},
            :success => true
        )       
        res = RResponse.new
        res.add_action(action)
        res.data[:status] = tpl.object.status.name                        
        res.success = true
        res.msg = 'Transmitted invoice ' + " pdf2html success: "
        respond(res)        
    end
end
