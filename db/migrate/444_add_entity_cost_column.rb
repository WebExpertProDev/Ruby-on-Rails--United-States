class AddEntityCostColumn < ActiveRecord::Migration
    def self.up
        add_column :order_entity, :cost, :float if !OrderEntity.column_names.include?("cost")
    end

    def self.down
    
    end
end
