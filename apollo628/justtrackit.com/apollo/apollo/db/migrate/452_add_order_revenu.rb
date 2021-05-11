class AddOrderRevenu < ActiveRecord::Migration
    def self.up
        create_table :order_revenu do |t|
            t.integer :id, :null => false
            t.integer :order_id, :null => false
            t.integer :system_revenu_id, :null => false
            t.integer :system_revenu_type_id, :null => false
            t.float :value, :null => false
            t.string :config, :null => false, :default => {}
        end
    end

    def self.down
        drop_table :order_revenu
    end
end
