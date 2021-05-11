class Airport < ActiveRecord::Base
    set_table_name "country_region_city_airport"
    
    # methods avail. to liquid
    liquid_methods :iso, :name

    belongs_to :city
    
    def to_h
        {:id => self.id, :name => self.iso, :iso => self.iso}    
    end
    
end
