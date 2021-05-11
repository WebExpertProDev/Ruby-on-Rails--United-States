class InvoiceItem < ActiveRecord::Base
    liquid_methods :invoiceable, :name, :cost
            
    belongs_to :invoice
    belongs_to :invoiceable, :polymorphic => true
    serialize :adjustments
    
    # use Tobias' Money class
    composed_of :cost, :class_name => "Money",  :mapping => %w(cost_cents cents) do |v|        
        Money.new(v.to_f*100)
    end
    
    def after_save
        invoice.recalculate    
    end
    
    ##
    # adjustment
    # Returns adjustment total for this item
    # @return {Money}
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
    # to_h
    #
    def to_h
        {
            :id => id, 
            :type => invoiceable_type, 
            :class_name => self.class.to_s,
            :name => name, 
            :cost => cost,              
            :adjustment => self.adjustment,
            :adjustments => self.adjustments 
        }
    end
    
    ###
    # adjust
    # adjust an invoice-item's cost
    # @param {Hash || Invoice::Adjustment
    # if data is of type Invoice::Adjustment, this method was called by InvoicePayable to apply an adjustment to the InvoiceItem
    #
    def adjust(data) 
        adj = data
        if (data.kind_of?(Hash))
            data["commissionable"] = (!data["commissionable"].nil? && data["commissionable"] == 'on') ? true : false
            adj = Invoice::Adjustment.new(data)
        end
                
        self.adjustments << adj.to_h       
        self.cost += adj.amount
        
        return (self.save!) ? adj : false                                        
    end
    
    ##
    # unadjust
    # reverse an invoice-adjustment
    # @param {Integer} id
    #
    def unadjust(id)            
        adj = self.adjustments.find {|ia| ia[:id] == id}   
        #raise RException.new('id: ' + id.to_s + ', ' + self.adjustment.to_yaml)        
        #raise RException.new("Could not find InvoiceItem adjustment to remove, id: #{id} " + self.adjustments.to_yaml) if adj.nil?
        
        if !adj.nil?
            self.cost -= adj[:amount]
            self.adjustments.delete(adj)
            self.save!
            return adj
        else
            return false
        end
    end
    
end
