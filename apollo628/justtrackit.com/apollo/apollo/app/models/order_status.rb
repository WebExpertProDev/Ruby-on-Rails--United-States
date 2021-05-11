class OrderStatus < ActiveRecord::Base
   
    def to_h
        data = self.attributes
        data["label"].capitalize!
        data
        
    end
end
