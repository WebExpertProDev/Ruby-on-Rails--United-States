class AddOrderEntityDomainValue < ActiveRecord::Migration

    def self.up
       say "Create table order_entity_domain_value.", true
       create_table :order_entity_domain_value do |t|
           t.column :id, :integer, :null => false
           t.column :order_entity_id,      :integer,       :null => false
           t.column :domain_field_id,      :integer,       :null => false
           t.column :value,                :string,        :null => true
       end
    end
    def self.down
       drop_table :order_entity_domain_value
   end
end

