class OrderEntity < ActiveRecord::Base

    belongs_to :order, :class_name => 'Order', :foreign_key => 'order_id'
    belongs_to :type, :class_name => 'OrderTypeEntity', :foreign_key => 'order_type_entity_id'
    belongs_to :account, :class_name => 'Account', :foreign_key => 'account_id'
    belongs_to :company, :class_name => 'Company', :foreign_key => 'company_id'
    belongs_to :location, :class_name => "CompanyLocation", :foreign_key => "company_location_id"    
    has_many :costs, :class_name => "OrderEntityCost", :source => :order_entity_cost
    
    # use Tobias' Money class
    composed_of :cost, :class_name => "Money",  :mapping => %w(cost_cents cents) do |v|
        Money.new(v.to_f*100)
    end
    
    ###
    # liquid_methods
    #
    liquid_methods :date_in, :date_out, :attn, :type, :company, :location, :account, :costs
    
    ###
    # callbacks
    #
    def before_create
        if location.nil?
            raise RException.new('no location set ')
        end
    end
    
    ###
    # create
    # mix date/time fields together
    #
    def self.create(param)
        
        # mix the date / time fields together into 1 column
        param["date_in"] = '' if param["date_in"] == nil
        param["date_out"] = param["date_in"] if param["date_out"] == nil
        
        param["date_in"] += ' ' + param.delete("time_in") if param["time_in"] != nil 
        param["date_out"] += ' ' + param.delete("time_out") if param["time_out"] != nil
                
        super
    end         
    
    ###
    # before_destroy 
    # AR callback
    # Don't allow deleting an OrderEntity if it has costs attached
    #
    def before_destroy
        if (self.costs.count > 0)
            raise RException.new("This order has cost-items attached to it -- You must first delete those costs before you can delete this order")
        end
    end
    
    def self.prepare_attributes(param)                
        if (!param["time_in"].nil? && !param["time_out"].nil?)
            if (!param["date_in"].nil? && param["date_out"].nil?)
                din = param["date_in"]                                
                param["date_in"] = din + ' ' + param.delete("time_in")
                param["date_out"] = din + ' ' + param.delete("time_out")      
            elsif (!param["date_in"].nil? && !param["date_out"].nil?)
                 param["date_in"] = param["date_in"] + ' ' + param.delete("time_in")
                 param["date_out"] = param["date_out"] + ' ' + param.delete("time_out")        
            end
            
        end
                
        return param         
    end
    
    ###
    # update_attributes
    # override to pre-process date attributes    
    # @param {Hash}
    #
    def update_attributes(attributes)        
       
        attributes = OrderEntity.prepare_attributes(attributes)        
        super
    end
    
    ###
    # to_h
    #
    def to_h
        
        today = Date.today                                        
        data = {
            :id => self.id,
            :role => self.type.name,
            :date_in => self.date_in,#.strftime("%m/%d/%Y"),                                    
            :date_out => self.date_out,#.strftime("%m/%d/%Y"),            
            :attn => self.attn,   
            :cost => self.cost,
            :location => self.location.to_h,
            :company => self.company.to_h,
            :domain => {:id => self.company.domain.id, :name => self.company.domain.label}
        }
        data[:account] = self.account.contact.merge({:id => self.account.id}) if (!self.account.nil?)
        data[:departure] = self.date_in.strftime("%B %d, %Y") + ', ' + self.date_in.strftime("%H:%M") + " (#{(self.date_in.to_date - today).to_i.to_s} days)" if (self.date_in != nil)
        data[:arrival] = self.date_out.strftime("%B %d, %Y") + ', ' + self.date_out.strftime("%H:%M") + " (#{(self.date_out.to_date - today).to_i.to_s} days)" if (self.date_out != nil)
        
        return data        
    end
    
    ###
    # to_search_result
    # formats an Entity for appearing in search result
    #
    def to_search_result
        row = self.attributes        
        row.delete("order_id")  
        row["name"].capitalize! if !row["name"].nil?
        row["date_in"] = OrderEntity.format_pretty_date(self.attributes["date_in"])
        row["date_out"] = OrderEntity.format_pretty_date(self.attributes["date_out"])                
        row
    end
    
    ###
    # format_pretty_date
    # formats a date with duration from today
    #
    def self.format_pretty_date(date)
        dt = date.to_date
        duration = dt - Date.today
        if duration == 0
            duration = 'today'            
        elsif (duration == 1)
            duration = 'tomorrow'
        elsif duration == -1
            duration = 'yesterday'
        elsif duration > 1
            duration = duration.to_s + ' days from now'
        else 
            duration = duration.abs.to_s + ' days ago'
        end    
        dt.strftime("%B %d, %Y (#{duration})")
    end
        
        
end
