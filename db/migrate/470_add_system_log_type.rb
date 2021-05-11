class AddSystemLogType < ActiveRecord::Migration
    def self.up
       say "Create table system_log_type.", true
       create_table :system_log_type, :force => true do |t|
           t.column :id, :integer, :null => false
           t.column :name,      :string,       :null => false
           t.column :label,     :string,       :null => false
           t.string :icon, :null => true
       end
       
       
    end
   
    def self.down
       drop_table :system_log_type
    end
end
