class AddInvoiceItem < ActiveRecord::Migration
    def self.up
        create_table :invoice_item do |t|
            t.integer :id, :null => false
            t.integer :invoice_id, :null => false
            t.integer :invoiceable_id, :null => false
            t.string :invoiceable_type, :null => false
            t.string :name, :null => false
            t.decimal :cost_cents, :precision => 11, :scale => 2, :null => false            
            t.text   :adjustments, :null => false, :default => []            
            t.integer :updated_by, :null => true                        
        end
    end

    def self.down
        drop_table :invoice_item
    end
end
