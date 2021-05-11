class AddSystemLog < ActiveRecord::Migration
    def self.up
        say "Create table system_log.", true
        create_table :system_log do |t|
            t.integer :id, :null => false
            t.integer :system_log_type_id, :null => false, :default => 1
            t.integer :loggable_id, :null => false
            t.string :loggable_type, :null => false                                    
            t.string :verb, :null => true, :limit => 23
            t.string :subject, :null => false
            t.text :msg, :null => false
            t.integer :created_by, :null => false
            t.timestamps
        end
    end

    def self.down
        drop_table :system_log
    end
end
