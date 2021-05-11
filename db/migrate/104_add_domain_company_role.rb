class AddDomainCompanyRole < ActiveRecord::Migration

    def self.up

        say "Add relation domain_company_role", true
        create_table :domain_company_role, :force => true do |t|
            t.column :id, :integer, :null => false
            t.column :domain_id,       :integer, :null => false
            t.column :role_id,       :integer, :null => false
        end

        say "Add indexes on 'domain_company_role'", true
        add_index :domain_company_role, [ :domain_id, :role_id ], :unique => true

        say "Adding Foreign key relations to ensure these keys exist.", true
                
        

    end

    def self.down
        
        drop_table :domain_company_role

    end
end

