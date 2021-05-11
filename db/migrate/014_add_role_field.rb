class AddRoleField < ActiveRecord::Migration

    def self.up
        say "Create table role_field.", true
        create_table :role_field do |t|
            t.column :id, :integer, :null => false
            t.column :role_id, :integer, :null => false
            t.column :name, :text, :null => false
            t.column :label, :text, :null => false
            t.column :required, :boolean, :null => false, :default => true
            t.column :config, :text, :null => false            
            t.column :field_type, :string, :null => false
        end                                     
        
    end

    def self.down
        drop_table :role_field
    end

end
