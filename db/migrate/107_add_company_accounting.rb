class AddCompanyAccounting < ActiveRecord::Migration

    def self.up
        say "Add company_accounting", true
        create_table :company_accounting, :force => true do |t|
            t.column :id, :integer, :null => false
            t.column :company_id,       :integer, :null => false                                    
            t.column :city_id,          :integer, :null => true
            t.column :address1,         :string, :null => true
            t.column :address2,         :string, :null => true
            t.column :zip,              :string, :null => true
        end

        say "Add indexes on 'company_accounting'", true
        add_index :company_accounting, [ :company_id ], :unique => true

    end

    def self.down
      
        drop_table :company_accounting

    end
end

