class TransactionType < ActiveRecord::Base
    
    def to_h
        {:id => id, :name => name}
    end
    
    def to_a
        [id, name]
    end
    
end
