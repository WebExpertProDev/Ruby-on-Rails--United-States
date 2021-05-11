class AddDomainAccountRole < ActiveRecord::Migration

    def self.up

        say "Add relation domain_account_role", true
        create_table :domain_account_role, :force => true do |t|
            t.column :id, :integer, :null => false
            t.column :domain_id,       :integer, :null => false
            t.column :role_id,       :integer, :null => false
        end

        say "Add indexes on 'domain_account_role'", true
        add_index :domain_account_role, [ :domain_id, :role_id ], :unique => true

        say "Adding Foreign key relations to ensure these keys exist.", true
        
        
        
        
        
    end

    def self.down
        
        drop_table :domain_account_role

    end
end

