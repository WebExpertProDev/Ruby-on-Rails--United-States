class AddSystemRevenu < ActiveRecord::Migration
    def self.up
        create_table :system_revenu do |t|
            t.integer :id, :null => false            
            t.string :name, :null => false
            t.string :label, :null => false
            t.string :invoice_label, :null => false
        end
        
        
        
    end

    def self.down
        drop_table :system_revenu
    end
end
