class AddInvoiceStatus < ActiveRecord::Migration
    def self.up
        create_table :invoice_status do |t|
            t.integer :id, :null => false
            t.string :name, :null => false            
        end
                
        
    end

    def self.down
        drop_table :invoice_status
    end
end
