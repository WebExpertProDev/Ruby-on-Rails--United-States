class AddOrderTypeDoc < ActiveRecord::Migration
    
    def self.up
        say "Create table role_field.", true
        create_table :order_type_doc, :force => true do |t|
            t.integer :id, :null => false
            t.integer :order_type_id, :null => false
            t.integer :template_id, :null => false
        end
        
        
        
    end
    
    def self.down
        drop_table :order_type_doc    
    end
end