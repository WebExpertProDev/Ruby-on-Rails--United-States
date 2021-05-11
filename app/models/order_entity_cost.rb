class OrderEntityCost < ActiveRecord::Base

    belongs_to :entity, :class_name => 'OrderEntity', :foreign_key => 'order_entity_id', :include => [:account]
    belongs_to :type, :class_name => 'ShippingCost', :foreign_key => 'shipping_cost_id'
    
    has_one :invoice_item, :as => :invoiceable
    
    # use Tobias' Money class
    composed_of :cost, :class_name => "Money",  :mapping => %w(cost_cents cents) do |v|
        Money.new(v.to_f*100)
    end
    
    liquid_methods :cost, :when, :type
    
    ###
    # to_h
    # convert to hash
    # @return {Hash}
    # *ATTENTION: note attr "cost_type" -- cost seemed to be reserved??  the data only showed in
    # GRID when I changed it.
    #
    def to_h
        data = self.attributes    
        data[:cost] = cost  #<-- don't forget the composed_of field
        data[:company] = self.entity.company.name
        data[:type] = self.type.name
        data[:order_id] = self.entity.order.id

        return data
    end

    ###
    # to_grid_record
    # convert invoming AR record into array
    # @param OrderEntityCost, c
    #
    def self.to_grid_record(c)
        return [c.id, c.entity_id, c.order_id, c.cost, c.company, c.when.to_s, c.cost_type]
    end
end
