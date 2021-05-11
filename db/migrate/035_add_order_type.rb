class AddOrderType < ActiveRecord::Migration
    def self.up
        say "Create table order_route_type.", true
        create_table :order_type do |t|
            t.column :id, :integer, :null => false
            t.column :name,              :string,  :null => false
            t.column :label,              :string,   :null => true
        end

        
        
    end

    def self.down
        drop_table :order_type
    end

end
