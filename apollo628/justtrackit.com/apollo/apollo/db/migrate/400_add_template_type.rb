class AddTemplateType < ActiveRecord::Migration
    def self.up
        create_table :template_type, :force => true do |t|
            t.integer :id, :null => false
            t.string  :name, :null => false
            t.string  :label, :null => false                           
        end              
        
        
    end
    
    def self.down
        drop_table :template_type
    end
    
    
    
    
    
    
end

