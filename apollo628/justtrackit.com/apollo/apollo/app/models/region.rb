class Region < ActiveRecord::Base
    set_table_name "country_region"
    
    # methods available to liquid
    liquid_methods :iso, :name
    
    validates_presence_of :iso
    
    belongs_to :country
    has_many :city

    def to_h
        {:id => self.id, :iso => self.iso, :name => self.name}
    end

end
