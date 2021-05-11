class OrderRevenu < ActiveRecord::Base
    belongs_to :order
    belongs_to :item, :class_name => "SystemRevenu", :foreign_key => :system_revenu_id
    belongs_to :type, :class_name => "SystemRevenuType", :foreign_key => :system_revenu_type_id
    
    ###
    # config column contains Ext.form.Field configuration
    #
    serialize :config
    
    def to_h
        {:id => id, :item => item.to_h, :type => type.to_h, :value => value, :config => config}            
    end
    
    ###
    # calculate
    # calculates this revenu-item's total value based upon its type and order-cost
    # @param {Float} total_cost, total cost of order
    # @param {Float} total_entity_cost, the cost of all entities only (carrier, agents, etc)
    # @return {Float}
    #
    def calculate(total_cost = nil, total_entity_cost = nil)
        total_cost = order.total_cost if total_cost.nil?
        total_entity_cost = order.total_entity_cost if total_entity_cost.nil?
        
        multiplicand = nil
        amount = nil     
        # determine the multiplicand of calculation.
        case item.name
            when "markup", "fuel_security_surcharge"
                multiplicand = total_cost                                                        
            when "insurance"
                if (order.declared_value.nil? || order.declared_value == 0)
                    raise RException.new("Tried to apply declared-value insurance but this order has no declared-value defined")
                end
                multiplicand = order.declared_value                           
        end
        
        # sanity-check multiplicand.  it would be nil if not trapped by switch above.
        raise RException.new("Error calculating revenu-item") if multiplicand.nil?
        
        # feed the multiplicand through the type-switch now.  the multiplier is this record's value.  a revune-item
        # can either be percentage, fee or multiplier-based.
        case type.name
            when "percentage" # <-- eg: markup / fuel_security_surcharge
                amount = multiplicand / 100 * self.value
            when "fee"
                amount = self.value
            when "multiplier"   # <-- eg: insurance
                amount = multiplicand * self.value                                                         
        end
                                
        # sanity-check multiplicand was applied
        raise RException.new("Error applying multiplicand to revenue-item") if amount.nil?
        
        # when the item is "markup" return total_cost + amount; otherwise, just the amount
        return (item.name == 'markup') ? total_entity_cost + amount : amount
        
    end
end
