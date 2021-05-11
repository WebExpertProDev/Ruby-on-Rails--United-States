class BillingMethod < ActiveRecord::Base
    
    liquid_methods :name
    
    ###
    # to_a
    # returns a list of billing_method as an array [id, name]
    #
    def self.to_a
        return self.find(:all, :order => "name").collect {|m| [m.id, m.name, m.label]}
    end
end
