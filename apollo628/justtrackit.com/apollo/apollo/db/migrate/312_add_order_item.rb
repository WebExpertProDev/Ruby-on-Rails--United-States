class AddOrderItem < ActiveRecord::Migration

     def self.up
        say "Create table order_item.", true
        create_table :order_item do |t|
            t.column :id, :integer, :null => false
            t.column :order_id,     :integer,       :null => false, :references => '"order"'
            t.column :pieces,       :integer,       :null => false
            t.column :length,       :float,         :null => false
            t.column :width,        :float,         :null => false
            t.column :height,       :float,         :null => false
            t.column :weight,       :float,         :null => true
            t.column :value,        :float,         :null => true

        end

    end

    def self.down
        drop_table :order_item
    end

end
