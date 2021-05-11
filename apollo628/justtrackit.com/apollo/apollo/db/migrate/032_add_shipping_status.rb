class AddShippingStatus < ActiveRecord::Migration
  def self.up
        say "Create table shipping_status.", true
        create_table :shipping_status do |t|
            t.column :id, :integer, :null => false
            t.column :name,   :string, :null => false
        end
        
    end

    def self.down
        drop_table :shipping_status
    end
end
