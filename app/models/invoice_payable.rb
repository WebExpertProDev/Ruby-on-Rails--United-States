class InvoicePayable < ActiveRecord::Base
           
    belongs_to :invoice
    belongs_to :company, :include => [:billing_address]
    belongs_to :payable, :polymorphic => true            
    belongs_to :updated_by, :class_name => "Account", :foreign_key => "updated_by"
    
    serialize :adjustments
  
    # compose cost from Money class
    composed_of :cost, :class_name => "Money",  :mapping => %w(cost_cents cents) do |v|        
        Money.new(v.to_f*100)
    end
                       
    def to_h 
        {
            :id => id,         
            :name => name, 
            :type => payable_type, 
            :class_name => self.class.to_s,
            :company => company.name, 
            :invoice_id => invoice_id, 
            :paid => paid, 
            :cost => cost,
            :adjustment => self.adjustment,
            :adjustments => self.adjustments.collect { |a| a }
        }
    end
                
    ##
    # company
    # Since Payable is polymorphic, it can be associated with any of 3 tables:  OrderEntity, OrderEntityCost or CompanySalesAccount
    # For convenience, company_id is included in invoice_payable table even though its accessible via joins through the polymorphic relation.
    # This is for better performance.
    #
    def before_create
        select = "#{Company.table_name}.id"
        
        # serialized adjustments.  initialize the array.
        self.adjustments = []
        
        case payable_type
            when "OrderEntityCost"                   
                j = "LEFT OUTER JOIN #{OrderEntity.table_name} AS oe ON oe.company_id = #{Company.table_name}.id"
                j += " LEFT OUTER JOIN #{OrderEntityCost.table_name} AS oec ON oec.order_entity_id = oe.id"
                c = "oec.id = #{payable_id}"                
                self.company_id = Company.find(:first, :select => select, :conditions => c, :joins => j).id
                self.name = payable.type.name
            when "OrderEntity"
                j = "LEFT OUTER JOIN #{OrderEntity.table_name} AS oe ON oe.company_id = #{Company.table_name}.id"
                c = "oe.id = #{payable_id}"
                self.company_id = Company.find(:first, :select => select, :conditions => c, :joins => j).id
                self.name = payable.type.label + ' charge'  #<-- OrderTypeEntity.label [Pickup Agent, Carrier, Delivery-agent, etc]
            when "CompanySalesAccount"
                j = "LEFT OUTER JOIN #{Account.table_name} AS a ON a.company_id = #{Company.table_name}.id"
                j += " LEFT OUTER JOIN #{CompanySalesAccount.table_name} AS csa ON csa.account_id = a.id"
                c = "csa.id = #{payable_id}"
                self.name = "Commission"
                self.company_id = Company.find(:first, :select => select, :conditions => c, :joins => j).id              
        end
    end
    
    def after_save
        invoice.recalculate
    end
    
    ##
    # adjustment
    #
    def adjustment
        total = Money.new(0)
        self.adjustments.each do |a| total += a[:amount] end
        total
    end
    
    ##
    # noncommissionable_adjustment
    # A special version of adjustment for returning only the non-commissionalbe adjustment (ie: those adjustments where :commissionable => false
    # @return Money
    #
    def noncommissionable_adjustment
        total = Money.new(0)
        self.adjustments.each do |a| 
            total += a[:amount] if a[:commissionable] == false 
        end
        total
    end
    
    ###
    # adjust
    # adjust an invoice-item's cost
    #
    def adjust(data) 
        # blow up if no amount or reason have been submitted
        raise RException.new("Undefined adjustment amount") if data["amount"].nil?
        raise RException.new("You must provided an adjustment reason") if data["reason"].nil?
        
        data["commissionable"] = (!data["commissionable"].nil? && data["commissionable"] == 'on') ? true : false
        data["invoiceable"] = (!data["invoiceable"].nil? && data["invoiceable"] == 'on') ? true : false   
        
        # create the adjustment helper class
        adj = Invoice::Adjustment.new(data)       
        
        # User selected "[x]Apply to invoice" on adjustment form.  This adjustment will be applied to both teh Payable AND Invoice
        # THIS IS CLEVER BUT TRICKY since if adjusting a vendor cost, we have to hide the client-adjustment in the all-encompassing
        # "Freight Charge" InvoiceItem        
        if (adj.invoiceable)  
            iitem = get_invoice_item
            
            # blow up if we didn't find a corresponding invoice item to apply adjustment to
            raise RException.new("Failed to find invoice-item to apply adjustment to") if iitem.nil?        
            
            # tricky here.  we've just loaded the InvoiceItem corresponding to this Payable.  Since the user selected [x] "apply to 
            # invoice" for this Payable adjustment, we're going to apply the adjustment to client as well.        
            adj.invoice_item = iitem
            iitem.adjust(adj)
        end
            
        self.adjustments << adj.to_h       
        self.cost += adj.amount
        
        return (self.save!) ? adj : false                                        
    end
    
    ##
    # unadjust
    # 
    def unadjust(id)  
        adj = self.adjustments.find {|ia| ia[:id] == id}
        raise RException.new("Could not find Payable-adjustment to remove " + self.adjustments.to_yaml) if adj.nil?
        self.transaction do                                 
            self.cost -= adj[:amount]
            self.adjustments.delete(adj)
                    
            if (adj[:invoiceable] == true)            
                iitem = get_invoice_item
                raise RException.new("Failed to find invoice-item to remove adjustment from") if iitem.nil?
                iitem.unadjust(adj[:id]) 
                adj[:invoice_item] = iitem
            end
        end
        return (self.save!) ? adj : false        
    end
    
    private
    
    ##
    # get_invoice_item
    # load the corresponding client InvoiceItem to which this payable is related
    # @return {InvoiceItem || nil}
    #
    def get_invoice_item
        item = nil
        case self.payable_type
            when "OrderEntityCost"  # <-- This case is easy
                c = "invoiceable_id = #{self.payable_id} AND invoiceable_type = '#{self.payable_type}'"
                item = invoice.items.find(:first, :conditions => c)                    
            when "OrderEntity"  # <-- trickier...have to append adjustment to OrderRevenu "markup" item.                
                j = "LEFT OUTER JOIN #{SystemRevenu.table_name} AS sr ON sr.id = #{OrderRevenu.table_name}.system_revenu_id"
                c = "sr.name = 'markup' AND #{OrderRevenu.table_name}.order_id = #{invoice.order.id}"                                            
                revenu = OrderRevenu.find(:first, :conditions => c, :joins => j)                    
                item = invoice.items.find(:first, :conditions => "invoiceable_id = #{revenu.id} AND invoiceable_type = 'OrderRevenu'")                                                                               
        end        
        item  
            
    end
    
    ###
    # prepare_filter
    # @param {Hash} criteria
    ###
    # prepare_filter
    # @param {Hash} criteria    
    # @return {Array} order ids
    # This is the initial hit from an order-filter.  this first part simply return the set of order-ids that match the 
    # user's filter params.  this set of ids will be cached in the session and used as an IN(ids.join(',')) condition for 
    # the actual presentation query to follow
    # 
    #
    def self.prepare_filter(criteria)
        
        LOG.info(criteria.to_yaml)
        
        ids = []
                        
        # 1. date, employee or payable_status filters
        if (!criteria[:date].nil? || !criteria[:employee].nil? || !criteria[:payable_status].nil?)
            
            j = "LEFT OUTER JOIN #{Invoice.table_name} AS i ON i.id = #{self.table_name}.invoice_id"
            
            # conditions array
            c = []
            
            # filter: date?
            c.push("i.created_at BETWEEN '#{Date.parse(criteria[:date][:start])}' AND '#{Date.parse(criteria[:date][:end])}'") if (!criteria[:date].nil?)
                                    
            # filter: employee?
            c.push("i.created_by = #{criteria[:employee][:id]}") if (!criteria[:employee].nil?)
            
            # filter: payable_type?
            c.push("#{self.table_name}.payable_type = '#{criteria[:payable_type]}'") if !criteria[:payable_type].nil? 
            
            # filter: payable_status?
            if !criteria[:payable_status].nil?
                c.push("#{self.table_name}.paid = #{ (criteria[:payable_status][:paid] == 'on') ? true : false}")
            else
                c.push("#{self.table_name}.paid = false")
            end
            
            rs = self.find(:all, :joins => j, :conditions => c.join(" AND "), :select => "#{self.table_name}.id")
            
            # if no orders in this date-range, no point in doing any more filters.  just return false.
            return false if (rs.length == 0) 
            
            # generate a list of order-ids on the filters date, shipping_status and employee
            ids = rs.collect {|o| o.id}             
        end
                
        # 2. Company Filter.
        if (!criteria[:company].nil?)
            j = ""; c = ""; s = "";                                                                       
            
            j = "LEFT OUTER JOIN #{Order.table_name} AS o ON o.id = #{Invoice.table_name}.order_id"
            c = "o.bill_to_id = #{criteria[:company][:id]}"
            c += " AND #{Invoice.table}.id IN (#{ids.join(',')})" if ids.length > 0
            s = "#{Invoice.table_name}.id"             
            ids = Invoice.find_by_sql("SELECT DISTINCT #{s} FROM #{Invoice.table_name} #{j} WHERE #{c}").collect{|i| i.id} 
            return false if ids.length == 0                        
        end
                                                                            
        return (ids.length > 0) ? ids.uniq : false
                                                    
    end
    
    ###
    # filter
    # The actual presentation query.
    # @param {Array} order-ids
    # @param {Integer} limit
    # @param {Integer} offset    
    #
    def self.filter(ids, limit = nil, offset = nil)
                                                        
        conditions = "#{self.table_name}.id IN(#{ids.join(',')})"
                
        # first get the orders
        rs = self.find(:all,             
            :conditions => conditions,            
            :include => [{:invoice => [:order]}, :company],
            :limit => limit,
            :offset => offset
        )                        
        
        # finally, attach order-entities to the order rs       
        return rs.collect {|i|                
            data = {
                :id => i.id,
                :payable_type => i.payable_type,
                :company => i.company.name + "<br />#{i.company.billing_address.city.name}, #{i.company.billing_address.region.iso}, #{i.company.billing_address.country.iso}, zip: #{i.company.billing_address.zip}, phone: #{i.company.billing_address.phone1}<br />accountant: #{i.company.accountant.first} #{i.company.accountant.last}, phone: #{i.company.accountant.phone}, email: #{i.company.accountant.email}",   
                :cost => i.cost,
                :paid => i.paid,
                :name => i.name,
                :company_id => i.company_id,
                :updated_at => i.updated_at,
                :bill_number => i.invoice.order.bill_number
            }
            # append sales-agent name if this Payable is CompanySalesAccount
            data[:name] += " (#{i.payable.account.first} #{i.payable.account.last})" if (i.payable_type == 'CompanySalesAccount') 
            data
            
        }              
    end
    
            
end

