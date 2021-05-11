class AddShippingCost < ActiveRecord::Migration
  def self.up
        say "Create table shipping_cost.", true
        create_table :shipping_cost do |t|
            t.column :id, :integer, :null => false
            t.column :name,   :string, :null => false
            t.column :protected, :boolean, :null => false, :default => false
        end
        

    end

    def self.down
        drop_table :shipping_cost
    end
end
