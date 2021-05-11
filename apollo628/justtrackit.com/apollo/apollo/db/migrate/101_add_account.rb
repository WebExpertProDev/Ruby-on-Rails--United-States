class AddAccount < ActiveRecord::Migration
    def self.up
        say "Create table 'account'.", true
        create_table(:account, :force => true) do |t|
            t.column :id,                 :integer,   :null => false
            t.column :company_id,          :integer,   :null => false
            t.column :created_at,         :timestamp, :null => false
            t.column :updated_at,         :timestamp, :null => false
            t.column :email,              :string,    :limit => 100, :null => true
            t.column :username,           :string,    :null => false
            t.column :first,              :string,    :limit => 50,  :null => false
            t.column :last,               :string,    :limit => 50,  :null => false
            t.column :phone,              :string,    :limit => 20,  :null => true
            t.column :ext,                :string,    :limit => 20,  :null => true
            t.column :mobile,             :string,    :limit => 20,  :null => true
            t.column :fax,                :string,    :limit => 20,  :null => true
            t.column :description,        :string,    :null => false, :default => ''
            t.column :password,           :string,    :limit => 128, :null => false # sha-512 ready
            t.column :password_salt,      :string,    :limit => 100, :null => false
            t.column :password_hash_type, :string,    :limit =>  10, :null => false
        end
                   
        #say "Add indexes to table 'account' (columns 'email' and 'username').", true
        add_index :account, [:email, :username]
        
        
        
    end

    def self.down
   
        drop_table :account
    end
end
