class OrderTypeEntity < ActiveRecord::Base

    belongs_to :order_type, :class_name => 'OrderType', :foreign_key => 'order_type_id'
    belongs_to :domain, :class_name => 'Domain', :foreign_key => 'domain_id'
    
    ###
    # liquid_methods
    #
    liquid_methods :name, :label, :domain
        
end
