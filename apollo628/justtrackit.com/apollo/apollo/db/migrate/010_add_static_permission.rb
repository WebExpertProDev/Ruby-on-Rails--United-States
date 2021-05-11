class AddStaticPermission < ActiveRecord::Migration
    def self.up

        say "Create table 'static_permission'.", true
        create_table :static_permission do |t|
            t.column :id, :integer, :null => false
            t.column :created_at,        :timestamp, :null => false
            t.column :updated_at,       :timestamp, :null => false
            t.column :identifier,           :string,    :limit => 100, :null => false
        end
        say "Add indexes on table 'static_permission'.", true
        add_index :static_permission, :identifier

    end

    def self.down
        drop_table :static_permission
    end
end
