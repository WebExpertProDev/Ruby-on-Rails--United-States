class ChangeColumnOrdersBillNumberInteger < ActiveRecord::Migration
  def self.up
      change_column :orders, :bill_number, :integer, :null => true
  end

  def self.down
  end
end
