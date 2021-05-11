class AddInvoicePayable < ActiveRecord::Migration
  def self.up
      create_table :invoice_payable do |t|
          t.integer :id, :null => false
          t.integer :invoice_id, :null => false
          t.integer :company_id, :null => false
          t.string  :payable_type, :null => false
          t.integer :payable_id, :null => false
          t.string :name, :null => false
          t.decimal :cost_cents, :precision => 8, :scale => 2, :null => false
          t.float :rate
          t.text    :adjustments, :null => true            
          t.boolean :paid, :null => false, :default => false
          t.timestamp :paid_date, :null => true          
          t.integer :updated_by, :null => false
          
          t.timestamps
      end
  end

  def self.down
      drop_table :invoice_payable
  end
end
