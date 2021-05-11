class AddColumnVerbOrderLog < ActiveRecord::Migration
  def self.up
      
      if (!OrderLog.column_names.include?("verb"))
        add_column :order_log, :verb, :string, :null => true, :limit => 11
        change_column :order_log, :msg, :text, :null => false
      end
  end

  def self.down
      
  end
end
