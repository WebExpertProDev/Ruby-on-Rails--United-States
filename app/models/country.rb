class Country < ActiveRecord::Base
    liquid_methods :name, :iso
    
    has_many :region

    def to_h
        {:id => self.id, :iso => self.iso, :name => self.name}
    end
end
