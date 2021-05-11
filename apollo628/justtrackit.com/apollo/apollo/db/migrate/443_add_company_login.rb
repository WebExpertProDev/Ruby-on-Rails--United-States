class AddCompanyLogin < ActiveRecord::Migration
    def self.up
         add_column :company, :username, :string if !Company.column_names.include?("username")
         add_column :company, :password, :string if !Company.column_names.include?("password")
                                                           
    end

    def self.down
    
    end
end
