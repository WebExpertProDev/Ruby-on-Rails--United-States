class AddColumnOrderRevenuConfig < ActiveRecord::Migration
  def self.up
      add_column :order_revenu, :config, :string, :null => false, :default => {} if !OrderRevenu.column_names.include?("config")
  end

  def self.down
  end
end
