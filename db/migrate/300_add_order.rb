class AddOrder < ActiveRecord::Migration
    def self.up
        say "Create table order.", true
        create_table('"orders"') do |t|
            t.column :id, :integer, :null => false
            t.column :parent_id,            :integer, :null => false, :default => 0, :references => nil
            t.column :bill_number,          :integer, :null => true
            t.column :shipping_status_id,   :integer, :null => false
            t.column :order_type_id,        :integer, :null => false

            # who created this and when?
            t.column :created_by,           :integer, :null => false, :references => :account
            t.column :created_at,           :timestamp, :null => false
            t.column :updated_at,           :timestamp, :null => false

            # billing
            t.column :billing_method_id,    :integer, :null => false
            t.column :bill_to_id,           :integer, :null => false, :references => :company

            # shipment details
            t.string :po, :null => true
            t.column :purpose,              :string, :null => true
            t.decimal :declared_value_cents,      :precision => 11, :scale => 2, :null => false, :default => 0
            t.column :shipping_method_id,   :integer, :null => false
            t.column :dim_factor,           :integer, :null => false, :default => 194
            t.column :pieces,               :integer, :null => false            
            t.column :weight,               :integer, :null => true
            t.column :shipping_commodity_id, :integer, :null => false
            t.column :pickup_locations,     :string, :null => true
            
            # proof of delivery
            t.column :pod_name,             :string, :null => true
            t.column :pod_date,             :timestamp, :null => true
            t.column :pod_updated_at,       :timestamp, :null => true
            
            t.column :order_status_id,      :integer, :null => false, :default => 1
            
        end
    end

    def self.down
        drop_table '"orders"'
    end
end
