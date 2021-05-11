class AddShippingMethod < ActiveRecord::Migration
    def self.up

        say "Create table shipping_method.", true
        create_table("shipping_method") do |t|
            t.column :id, :integer, :null => false
            t.column :name,   :string, :null => false
        end
        
    end

    def self.down
        drop_table :shipping_method
    end
end
