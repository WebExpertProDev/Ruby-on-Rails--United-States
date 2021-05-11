class AddAccountRole < ActiveRecord::Migration
    def self.up

        say "Add relation table role <---> account", true
        create_table :account_role, :force => true do |t|
            t.column :id, :integer, :null => false
            t.column :role_id,            :integer, :null => false
            t.column :account_id,         :integer, :null => false
            t.column :field_value,         :string,  :null => true
            t.column :created_at,         :date,    :null => false
            t.column :updated_at,         :date,    :null => false
        end

        say "Add indexes on 'account_role'", true
        add_index :account_role, [ :role_id, :account_id ], :unique => true
                
    end

    def self.down
   
        drop_table :account_role
    end
end
