class City < ActiveRecord::Base
    set_table_name "country_region_city"
    
    # methods avail. to liquid
    liquid_methods :name
    
    belongs_to :region       
    has_many :airport, :class_name => "Airport", :source => :country_region_city_airport 
    
    validates_presence_of :name

    def to_h
        {:id => self.id, :name => self.name}
    end
end
