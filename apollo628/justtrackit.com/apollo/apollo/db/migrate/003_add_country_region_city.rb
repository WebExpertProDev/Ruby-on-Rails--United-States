class AddCountryRegionCity < ActiveRecord::Migration

  def self.up

        say "Creating country_region_city table", true

            create_table :country_region_city, :force => true do |t|
                t.column :id, :integer, :null => false
                t.column :region_id, :integer, :null => false, :references => :country_region
                t.column :name, :string, :null => false
                t.column :lat, :float, :null => true
                t.column :lng, :float, :null => true
            end
            
                
            say "Add indexes to table 'city' (columns 'iso' and 'name').", true
            add_index :country_region_city, [:name]
        
        

    end

    def self.down
                        
        drop_table :country_region_city
    end

end
