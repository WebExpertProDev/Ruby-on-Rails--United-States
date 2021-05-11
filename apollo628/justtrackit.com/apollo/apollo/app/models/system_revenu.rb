class SystemRevenu < ActiveRecord::Base
    
    def to_h
        {:id => id, :name => name, :label => label, :invoice_label => invoice_label}
    end
end
