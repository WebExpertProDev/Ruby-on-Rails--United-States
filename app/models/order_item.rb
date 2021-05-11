class OrderItem < ActiveRecord::Base
    belongs_to :order, :class_name => 'Order', :foreign_key => 'order_id'
    
    liquid_methods :pieces, :length, :width, :height, :weight
    
    def to_a
        return [self.id, self.pieces, self.length, self.width, self.height, self.weight]
    end
end
