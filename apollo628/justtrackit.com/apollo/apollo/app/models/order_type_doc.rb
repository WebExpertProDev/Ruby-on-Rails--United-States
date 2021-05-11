class OrderTypeDoc < ActiveRecord::Base    
    belongs_to :template
    belongs_to :type, :class_name => 'OrderType', :foreign_key => 'order_type_id'     
end
