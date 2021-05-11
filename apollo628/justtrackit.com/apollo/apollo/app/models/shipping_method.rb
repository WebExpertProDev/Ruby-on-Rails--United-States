class ShippingMethod < ActiveRecord::Base
    
    liquid_methods :name
    
    def self.to_a
        return self.find(:all, :order => "name").collect {|method| [method.id, method.name]}
    end
    
    def to_h
        return {:id => self.id, :name => self.name}
    end
end
