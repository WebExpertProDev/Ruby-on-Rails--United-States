class AddSystemRevenuType < ActiveRecord::Migration
    def self.up
        create_table :system_revenu_type do |t|
            t.integer :id, :null => false
            t.string :name, :limit => 25
        end
        
        
    end

    def self.down
    
    end
end
