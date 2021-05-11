class AddCompanySalesAccount < ActiveRecord::Migration
    def self.up
        say "Add company_sales_account", true
        create_table :company_sales_account do |t|
            t.column :id, :integer, :null => false
            t.column :company_id,       :integer, :null => false
            t.column :account_id,       :integer, :null => false            
        end

        say "Add indexes on 'company_sales_account'", true
        add_index :company_sales_account, [ :company_id, :account_id ], :unique => true

        say "Adding Foreign key relations to ensure these keys exist.", true

    end

    def self.down
        
        drop_table :company_sales_account

    end
end

