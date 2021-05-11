class AddCompanyLocation < ActiveRecord::Migration
    def self.up
        create_table :company_location do |t|
            t.integer :id, :null => false
            
            # location info
            t.integer :company_id, :null => false            
            t.integer :country_id,  :null => false, :references => :country
            t.integer :region_id,   :null => false, :references => :country_region
            t.integer :city_id,     :null => false, :references => :country_region_city
            t.integer :airport_id,  :null => false, :references => :country_region_city_airport                                    
            t.string :name
            t.string :addr1            
            t.string :addr2
            t.string :zip,      :limit => 20
            
            # contact info
            t.string :www,      :limit => 100
            t.string :email,    :limit => 100               
            t.string :phone1,   :limit => 25
            t.string :phone2,   :limit => 25
            t.string :fax,      :limit => 25                                    
                        
        end        
    end

    def self.down
        drop_table :company_location
    end
end
