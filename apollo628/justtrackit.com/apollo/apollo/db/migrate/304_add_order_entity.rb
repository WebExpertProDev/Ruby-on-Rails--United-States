class AddOrderEntity < ActiveRecord::Migration
  def self.up
      say "Create table order_entity", true
        create_table :order_entity do |t|
            t.column :id, :integer, :null => false
            t.column :order_id,                 :integer,       :null => false, :references => :orders
            t.column :order_type_entity_id,     :integer,       :null => false
            t.column :company_id,               :integer,       :null => false            
            t.column :account_id,               :integer,       :null => true
            t.column :date_in,                  :timestamp,     :null => false
            t.column :date_out,                 :timestamp,     :null => true
            t.column :attn,                     :string,        :null => true
            t.decimal :cost_cents, :precision => 11, :scale => 2, :default => 0           
        end
        
        add_index :order_entity, :date_in
        add_index :order_entity, :date_out
  end

  def self.down
      say "Dropping table order_entity", true
      drop_table :order_entity
  end
end
