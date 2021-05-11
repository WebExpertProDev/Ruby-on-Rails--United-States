class AddInvoice < ActiveRecord::Migration
    def self.up
        create_table :invoice do |t|
            t.integer :id, :null => false
            t.integer :order_id, :null => false
            t.integer :invoice_status_id, :null => false
            t.text :comment, :null => true
            t.integer :created_by, :null => false
            t.decimal :amount_cents, :precision => 11, :scale => 2, :default => 0
            t.timestamps
            
        end
    end

    def self.down
        drop_table :invoice
    
    end
end
