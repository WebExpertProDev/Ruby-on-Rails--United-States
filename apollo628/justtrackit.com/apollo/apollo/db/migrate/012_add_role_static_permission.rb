class AddRoleStaticPermission < ActiveRecord::Migration
    def self.up

        say "Add relation table role <---> static_permission", true
        create_table :role_static_permission do |t|
            t.column :id, :integer, :null => false
            t.column :role_id,                      :integer, :null => false
            t.column :static_permission_id,         :integer, :null => false
        end

        say "Add indexes on 'role_static_permission'", true
        add_index :role_static_permission, [ :role_id, :static_permission_id ], :unique => true
    end

    def self.down
        ActiveRecord::Base.transaction do
            
            drop_table :role_static_permission
        end
    end
end
