class AddOrderLogType < ActiveRecord::Migration
    
    def self.up
       say "Create table order_log_type.", true
       create_table :order_log_type, :force => true do |t|
           t.column :id, :integer, :null => false
           t.column :name,      :string,       :null => false
           t.column :label,     :string,       :null => false
       end
       
       
       
    end
   
    def self.down
       drop_table :order_log_type
    end
   
end
