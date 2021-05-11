class ShippingCommodity < ActiveRecord::Base
    
    liquid_methods :name
    
    ###
    # to_a
    # return a list of order_commodity as array [id,name]
    #
    def self.to_a
        return self.find(:all, :order => "name").collect {|row| [row.id, row.name]}
    end

end
