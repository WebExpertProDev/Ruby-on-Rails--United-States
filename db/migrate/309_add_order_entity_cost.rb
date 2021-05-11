class AddOrderEntityCost < ActiveRecord::Migration

    def self.up
        say "Create table order_entity_cost", true
            create_table :order_entity_cost do |t|
                t.column :id, :integer, :null => false
                t.column :order_entity_id,          :integer,       :null => false
                t.column :shipping_cost_id,         :integer,       :null => false
                t.decimal :cost_cents, :precision => 11, :scale => 2, :default => 0, :null => false
                t.column :when,                     :date,          :null => false
            end

    end

    def self.down
        say "Dropping table order_entity_cost", true
        drop_table :order_entity_cost
    end

end
