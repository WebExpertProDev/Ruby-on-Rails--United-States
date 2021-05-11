class AddColumnInvoicePayableRate < ActiveRecord::Migration
  def self.up
      add_column :invoice_payable, :rate, :float if !InvoicePayable.column_names.include?("rate")
  end

  def self.down
  end
end
