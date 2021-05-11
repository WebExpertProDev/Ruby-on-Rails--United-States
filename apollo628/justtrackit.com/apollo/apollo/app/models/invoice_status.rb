class InvoiceStatus < ActiveRecord::Base
    
    def to_a
        [id, name]
    end
end
