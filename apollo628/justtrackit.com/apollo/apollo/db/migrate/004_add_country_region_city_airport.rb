class AddCountryRegionCityAirport < ActiveRecord::Migration
    def self.up

        say "Creating country_region_city_airport table", true
        create_table :country_region_city_airport, :force => true do |t|
            t.column :id, :integer, :null => false
            t.column :icao, :string, :limit => 4, :null => false, :unique => true
            t.column :iso, :string, :limit => 3, :null => false
            t.column :city_id, :integer, :null => true, :references => :country_region_city
            t.column :name, :string, :null => false
        end
                
        add_index :country_region_city_airport, [:iso, :name]
    end

    def self.down
        
        #execute "ALTER TABLE country_region_city_airport DROP CONSTRAINT country_region_city_fkey;"
        
        drop_table :country_region_city_airport

    end
end