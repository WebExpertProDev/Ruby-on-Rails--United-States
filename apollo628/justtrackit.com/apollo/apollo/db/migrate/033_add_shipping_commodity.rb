class AddShippingCommodity < ActiveRecord::Migration
  def self.up
        say "Create table shipping_commodity.", true
        create_table :shipping_commodity do |t|
            t.column :id, :integer, :null => false
            t.column :name,   :string, :null => false
        end
        
    end

    def self.down
        drop_table :shipping_commodity
    end
end
