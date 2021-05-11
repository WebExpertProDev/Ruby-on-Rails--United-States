class AddCompanyRole < ActiveRecord::Migration

    def self.up

        say "Add table company_role", true
        create_table :company_role do |t|
            t.column :id, :integer, :null => false
            t.column :role_id,            :integer, :null => false
            t.column :company_id,         :integer, :null => false
            t.column :field_value,         :string,  :null => true
            t.column :created_at,         :date,    :null => false
            t.column :updated_at,         :date,    :null => false
        end

        say "Add indexes on 'company_role'", true
        add_index :company_role, [ :role_id, :company_id ], :unique => true

        say "Adding Foreign Key Constraint to 'company_role'.", true
        
    end

    def self.down
        drop_table :company_role
    end

end
