class ChangeColumnOrderRevenuValue < ActiveRecord::Migration
  def self.up
    change_column :order_revenu, :value, :float, :null => false
  end

  def self.down
  end
end
