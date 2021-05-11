class AddInvoiceTransaction < ActiveRecord::Migration
  def self.up
      create_table :invoice_transaction do |t|
          t.integer :id, :null => false
          t.integer :transaction_type_id, :null => false
          t.integer :invoice_id, :null => false
          t.integer :transaction_method_id, :null => false          
          t.integer :method_number
          t.timestamp :method_date          
          t.decimal :amount_cents, :precision => 11, :scale => 2, :default => 0
          t.string :comment
          t.integer :created_by, :null => false
          t.integer :updated_by, :null => false          
          t.timestamps
          
      end
  end

  def self.down
      drop_table :invoice_transaction
  end
end
