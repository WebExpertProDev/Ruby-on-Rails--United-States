class AddOrderTypeEntity < ActiveRecord::Migration

    def self.up
        say "Create table order_type_entity", true
        create_table :order_type_entity, :force => true do |t|
            t.column :id, :integer, :null => false
            t.column :order_type_id,     :integer,       :null => false
            t.column :domain_id,        :integer,       :null => false
            t.column :name,             :string,        :null => false
            t.column :label,            :string,         :null => false
        end

        

        
        

    end

    def self.down
        drop_table :order_type_entity
    end

end
