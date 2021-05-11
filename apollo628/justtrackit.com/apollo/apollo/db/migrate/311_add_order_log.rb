class AddOrderLog < ActiveRecord::Migration
  def self.up
        say "Create table order_log.", true
        create_table :order_log do |t|
            t.column :id, :integer, :null => false
            t.column :order_log_type_id, :integer, :null => false, :default => 1
            t.column :order_id, :integer, :null => false, :references => '"order"'
            t.column :account_id, :integer, :null => false
            t.column :created_at, :timestamp, :null => false
            t.column :updated_at, :timestamp, :null => false
            t.column :verb, :string, :null => true, :limit => 23
            t.column :subject, :string, :null => true
            t.column :msg, :text, :null => false
        end
    end

    def self.down
        drop_table :order_log
    end
end
