class AddColumnInvoiceAmount < ActiveRecord::Migration
  def self.up
    add_column :invoice, :amount_cents, :decimal, :precision => 11, :scale => 2, :default => 0 if !Invoice.column_names.include?("amount_cents")  
  end

  def self.down
  end
end
