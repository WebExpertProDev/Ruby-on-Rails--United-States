class AddOrderStatus < ActiveRecord::Migration
    
    def self.up
       say "Create table order_status.", true
       create_table :order_status do |t|
           t.column :id, :integer, :null => false
           t.column :name,      :string,       :null => false
           t.column :label,     :string,       :null => false
       end
       
       
       
       
    end
    def self.down
       drop_table :order_status
   end
   
end
