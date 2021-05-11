class AddCompany < ActiveRecord::Migration
    def self.up
        say "Create table company.", true
        create_table :company, :force => true do |t|
          t.column :id, :integer, :null => false
          t.column :domain_id, :integer, :null => false
          t.column :name,             :string,      :limit => 100, :null => false
          t.column :description,      :text,                       :null => false
          t.column :www,              :string,      :limit => 100, :null => true
          t.column :nickname,         :string,      :limit => 50,  :null => true          
          t.column :logo,             :string          
        
          t.column :billing_method_id, :integer, :null => true
          t.column :bill_to_company_address, :boolean, :null => false, :default => true
          
          t.column :domain_values,      :string,    :null => true
          t.column :created_at,         :timestamp, :null => false
          t.column :updated_at,         :timestamp, :null => false
          t.column :created_by,         :integer, :null => false, :references => :account
          
        end

        say "Add index name to table company.", true
        add_index :company, :name
                   


    end

    def self.down
        
        drop_table :company, :cascade => true
    end
end
