class Invoice < ActiveRecord::Base
    liquid_methods :total, :order, :created_by, :created_at, :items
    
    belongs_to :order
    belongs_to :status, :class_name => "InvoiceStatus", :foreign_key => "invoice_status_id"    
    belongs_to :created_by, :class_name => "Account", :foreign_key => "created_by"
    has_many :items, :class_name => "InvoiceItem", :source => :invoice_item, :dependent => :destroy
    has_many :payables, :class_name => "InvoicePayable", :source => :invoice_payable, :include => [:company], :dependent => :destroy
    has_many :transactions, :class_name => "InvoiceTransaction", :source => :invoice_transaction, :dependent => :destroy
        
    has_many :log, :class_name => "SystemLog", :order => "#{SystemLog.table_name}.created_at DESC", :as => :loggable, :include => [:log_type, :created_by], :dependent => :destroy
    
    # compose cost from Money class
    composed_of :amount, :class_name => "Money",  :mapping => %w(amount_cents cents) do |v|        
        Money.new(v.to_f*100)
    end
    
    ##
    # @class Adjustment
    # This is a class representing an Adjustment on either InvoiceItem or InvoicePayable.  each of those models
    # have a serialized column called "adjustments" which contain an array of these simple Adjustment instances.
    # Adjust is id'ed on Time.to_i
    #
    class Adjustment
        attr_accessor :amount, :reason, :commissionable, :invoiceable, :invoice_item
        attr_reader :id
        
        def initialize(config)
            @invoice_item = nil
            @id = Time.now.to_i
            @amount = Money.new(config[:amount].to_f * 100)
            @reason = config[:reason]
            @commissionable = config[:commissionable] || false
            @invoiceable = config[:invoiceable] || false    
        end     
        
        def to_h
            {:id => @id, :amount => @amount, :reason => @reason, :commissionable => @commissionable, :invoiceable => @invoiceable}
        end
    end
    
    ###
    # callbacks
    # 

    ###
    # before_create
    # attach invoice-status of "new" to newly created invoices
    #
    def before_create        
        self.status = InvoiceStatus.find_by_name('new')          
    end
    
    ###
    # after_create
    # build list of polymorphic InvoiceItems from EntityCost and OrderRevenu
    #
    def after_create
                
        # Rape the order for costs.
        order.children.each do |route|
            route.entities.find(:all, :include => []).each do |e|
                # create Payable for each OrderEntity
                payables.create({
                    :invoice_id => id,
                    :payable => e,
                    :cost => e.cost,
                    :updated_by => created_by
                })
                # create InvoiceItems (receivables)
                e.costs.find(:all, :include => [:type]).each do |c|
                    # InvoiceItem to Client
                    items.create(
                        :invoice_id => id,
                        :invoiceable_id => c.id,
                        :invoiceable_type => c.class.to_s,
                        :name => c.type.name,
                        :cost => c.cost                        
                    )
                    # copy OrderCosts as a Payables as well
                    payables.create({
                        :invoice_id => id,
                        :payable => c,
                        :cost => c.cost, 
                        :updated_by => created_by
                    })
                end
            end
        end
        
        # 2. create InvoiceItem form list of OrderRevenu         
        order.revenus.each do |r|
            items.create(
                :invoice_id => id,
                :invoiceable_id => r.id,
                :invoiceable_type => r.class.to_s,
                :name => r.item.invoice_label,
                :cost => r.calculate(order.total_cost, order.total_entity_cost)
            )                        
        end   
                
        # 3. create Payables from CompanySalesAccounts (ie: commissions)
        order.bill_to.sales_agents.each do |sa|
            payables.create({
                :invoice_id => id,
                :payable_type => sa.class.to_s,
                :payable_id => sa.id,
                :cost => sa.cost(self),
                :rate => sa.rate,
                :updated_by => created_by
            })
        end                
        self.amount = self.total
        save
    end
    
    ##
    # find_by_bill_number
    # convenience method to find Invoices by associated Order.bill_nubmer
    #
    def self.find_by_bill_number(ids, *params)
        raise RException.new("Invoice#find_by_bill_number, @param must be of type Integer or Array.  given #{ids.class.to_s}") if !(ids.class != Array || ids.class != Fixnum)     
    
        j = "LEFT OUTER JOIN #{Order.table_name} ON #{Order.table_name}.id = #{Invoice.table_name}.order_id"
        macro = nil         
        if ids.class == Array
            c = "#{Order.table_name}.bill_number IN(#{ids.join(',')})"
            macro = :all
        else
            c = "#{Order.table_name}.bill_number = #{ids}"
            macro = :first
        end
        Invoice.find(macro, :joins => j, :conditions => c)
    end
    
    ##
    # total
    # calculate total invoice amount including adjustments
    # @return Money
    # 
    def total
        t = Money.new(0)
        self.items.each do |ii| 
            t += ii.cost 
        end           
        t
    end
    
    ##
    # amount_due
    # calculate total amount due including past transactions
    # @return Money
    #
    def amount_due
        t = total
        self.transactions.each do |tr|
            t -= tr.amount
        end
        t
    end
    
    ##
    # order_cost
    # @return {Money} the total of all OrderEntity costs
    # 
    def order_cost
        ttl = Money.new(0)
        payables.each do |p|
            ttl += p.cost if p.payable_type == "OrderEntity" || p.payable_type == "OrderEntityCost"
        end        
        ttl        
    end
    
    ##
    # commissionable_revenu
    # returns the total commissionable revenu for this invoice.  applies adjustments from both InvoiceItem and InvoicePayable
    # @return {Money}
    # 
    def commissionable_revenu
        total_invoice = self.total
        total_costs = self.order_cost
        
        # subtract insurance, apply adjustments.
        self.items.each do |ii|
            # remove insurance from commissionable total.  only CORP get insurance revenu.            
            total_invoice -= ii.cost if (ii.invoiceable_type == "OrderRevenu" && (ii.invoiceable.item.name == 'insurance' || ii.invoiceable.item.name == 'fuel_security_surcharge'))                                                       
            
            # apply InvoiceItem adjustments
            total_invoice -= ii.noncommissionable_adjustment                                            
        end
        
        # apply InvoicePayable adjustments
        self.payables.each do |ip|
            total_costs -= ip.noncommissionable_adjustment    
        end
        
        total_invoice - total_costs                
    end
    
    ##
    # update_commissions
    # returns a list of InvoicePayable of type CompanySalesAccount there were updated.
    # @return {Array InvoicePayable}
    #
    def update_commissions
        rs = []
        self.payables.each do |p|             
            if p.payable_type == "CompanySalesAccount"
                new_cost = p.payable.cost(self)
                if p.cost != new_cost
                    p.cost = new_cost
                    p.save!
                    rs << p
                end                
            end
        end
        rs
    end
    
    ##
    # last_invoiced_date
    # @return {Date}
    #
    def last_invoiced_date
        last = log.collect {|l| l}.find {|l| l.log_type.name == 'notification' && l.subject.upcase == 'INVOICE SENT'}
        (!last.nil?) ? last.created_at : false 
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
        ids = []
                        
        # 1. date, shipping_status, employee filter
        if (!criteria[:date].nil? || !criteria[:employee].nil?)
                        
            # conditions array
            c = []
            
            # filter: date
            c.push("#{Invoice.table_name}.created_at BETWEEN '#{Date.parse(criteria[:date][:start])}' AND '#{Date.parse(criteria[:date][:end])}'") if (!criteria[:date].nil?)
                                    
            # filter: employee
            c.push("#{Invoice.table_name}.created_by = #{criteria[:employee][:id]}") if (!criteria[:employee].nil?)
            
            rs = Invoice.find(:all, :conditions => c.join(" AND "), :select => "#{Invoice.table_name}.id")
            
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
                
        joins = "LEFT OUTER JOIN #{Account.table_name} AS a ON a.id = #{Invoice.table_name}.created_by"              
        joins += " LEFT OUTER JOIN #{Order.table_name} AS o ON o.id = #{Invoice.table_name}.order_id"
        joins += " LEFT OUTER JOIN #{Company.table_name} AS bill_to ON bill_to.id = o.bill_to_id"
        joins += " LEFT OUTER JOIN #{InvoiceStatus.table_name} AS s ON s.id = #{Invoice.table_name}.invoice_status_id"
                
        conditions = "#{Invoice.table_name}.id IN(#{ids.join(',')})"
                
        # first get the orders
        rs = Invoice.find(:all,             
            :conditions => conditions,
            :joins => joins,
            :select => "#{Invoice.table_name}.id, #{Invoice.table_name}.created_at, #{Invoice.table_name}.order_id, o.bill_number, o.bill_to_id, bill_to.name AS bill_to_name, s.name AS invoice_status, a.first AS account_first, a.last AS account_last",
            :order => "#{Invoice.table_name}.created_at DESC",
            :limit => limit,
            :offset => offset
        )
                
        # now get a list of all associated entities (shipper, consignee)
        joins = "LEFT OUTER JOIN #{Company.table_name} AS c ON #{OrderEntity.table_name}.company_id = c.id"
        joins += " LEFT OUTER JOIN #{CompanyLocation.table_name} AS l ON l.id = #{OrderEntity.table_name}.company_location_id"
        joins += " LEFT OUTER JOIN #{Airport.table_name} AS ap ON ap.id = l.airport_id"
        joins += " LEFT OUTER JOIN #{OrderTypeEntity.table_name} AS ote ON ote.id = #{OrderEntity.table_name}.order_type_entity_id"        
        entities = OrderEntity.find(:all,
            :select => "#{OrderEntity.table_name}.order_id, c.name AS name, ap.iso AS airport, ote.name AS role, #{OrderEntity.table_name}.date_in, #{OrderEntity.table_name}.date_out",
            :joins => joins,
            :conditions => "#{OrderEntity.table_name}.order_id IN(#{rs.collect{|i|i.order_id}.join(',')})"            
        )
        
        # finally, attach order-entities to the order rs       
        return rs.collect {|i|                
            {
                :id => i.id,   
                :order_id => i.order_id,
                :bill_number => i.bill_number, 
                :bill_to_id => i.bill_to_id,
                :bill_to_name => i.bill_to_name,
                :status => i.invoice_status, 
                :total => i.total,
                :amount_due => i.amount_due,
                :created_by => {:first => i.account_first.capitalize, :last => i.account_last.capitalize},
                :shipper => entities.find {|e| (e.order_id == i.order_id && e.role == 'shipper') ? true : false}.name,
                :consignee => consignee = entities.find { |e| (e.order_id == i.order_id && e.role == 'consignee') ? true : false}.name                
            }
        }              
    end
    
    ##  
    # recalculate
    # recalculate the invoice's cached amount
    #
    def recalculate
        self.amount = self.total
        save!
    end
    
    ###
    # calculate_payables
    # synchronizes payables with invoice_item costs.  recalculates sales-agent commissions
    # 
    def calculate_payables
        ###
          #
         # 
         #
         
         #
        raise RException.new("Invoice.calculate_payables:  IS THIS OBSOLETE?")
         #
         #
        payables.each do |p|
            case p.payable_type
                when "InvoiceItem"   
                    if p.cost != p.payable.cost
                        p.cost = p.payable.cost
                        p.save!
                    end
                when "CompanySalesAccount"
                    p.cost = p.payable.cost(items)
                    p.save!
            end
        end
    end
end
