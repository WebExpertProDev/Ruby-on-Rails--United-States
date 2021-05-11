class CompanySalesAccount < ActiveRecord::Base
    
    belongs_to :company
    belongs_to :account
    
    def to_h
        attributes.merge({
            :name => self.account.first.capitalize + ' ' + self.account.last.capitalize,
            :company => self.account.company.name.capitalize
        })  
    end
            
    def on_edit
        attributes.merge({
            :name => self.account.first.capitalize + ' ' + self.account.last.capitalize,
            :company => self.account.company.name.capitalize
        })    
    end
    
    ##
    # cost
    # calculates sales-commission based upon incoming line-items from an invoice.
    # @param {Invoice} the invoice
    # @return Money
    # @raises InvalidSalesAgentError
    #
    def cost(invoice)
                
        # get total commissionable revenu from Invoice
        revenu = invoice.commissionable_revenu
                                                        
        # total * commission (eg: 100 * 50% / 100 equals 50)        
        Money.new(revenu.cents * self.rate / 100)     
    end
    
    def rate
        # get the sales-agent role.
        ar = account.account_role.find_by_identifier('vendor.sales_agent')
        
        # raise exception if this account hasn't the role 'vendor.sales_agent'
        raise InvalidSalesAgentError.new('Invalid sales agent (no role) ' + account.id.to_s + ', company: ' + account.company.name) if !account.has_role?('vendor.sales_agent')
                        
        # raise exception if this sales-agent has no commision field
        raise InvalidSalesAgentError.new("AccountRole #{ar.id} has no commision field") if !ar.respond_to?('commission')
        
        ar.commission.to_f
    end
    
    ##
    # @class InvalidSalesAgent
    # raised if a company-sales-account does not have the role "vendor-sales_agent"
    #
    class InvalidSalesAgentError < StandardError
        
    end
    
end
