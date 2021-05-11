class CompanyLocation < ActiveRecord::Base
    belongs_to :company
    belongs_to :country
    belongs_to :region
    belongs_to :city
    belongs_to :airport
    
    # google geocode object
    serialize :geocode
    
    has_many :entities, :class_name => "OrderEntity", :source => :order_entity
    
    liquid_methods :www, :phone1, :phone2, :fax, :addr1, :addr2, :zip,:email, :country, :region, :city, :airport
    
    ###
    # to_h
    #
    def to_h
        self.attributes(:except => [:company_id]).merge({              
            :city => self.city.to_h,
            :country => self.country.to_h,
            :region => self.region.to_h,
            :airport => self.airport.to_h,
            :is_primary => (self.company.primary_location_id == self.id) ? true : false,
            :is_billing => (self.company.billing_location_id == self.id) ? true : false
        })
    end
    
    ###
    # to_record
    # formats a CompanyLocation for use in a ComboBox or View
    # 
    def to_record
        {
            :id => id, 
            :name => name,            
            :country => country.iso, 
            :region => region.iso, 
            :city => city.name, 
            :airport => airport.iso,
            :is_primary => (self.company.primary_location_id == self.id) ? true : false,
            :is_billing => (self.company.billing_location_id == self.id) ? true : false,
            :lat => lat,
            :lng => lng
        }
    end
    
    def self.edit(id) 
        CompanyLocation.find(id, :include => [:company, :country, :region, :city, :airport]).to_h     
    end
            
    ###
    # set_head_office
    # set the company's primary location
    # @return {CompanyLocation}
    #
    def self.set_head_office(id) 
        location = CompanyLocation.find(id, :include => [:company, :airport])        
        location.company.head_office = location
        location.company.save!
        return location
    end
    
    ###
    # set_billing_location
    # set the company's billing-address
    # @return {CompanyLocation}
    #
    def self.set_billing_location(id) 
        location = CompanyLocation.find(id, :include => [:company, :airport])        
        location.company.billing_address = location
        location.company.save!
        return location
    end
    
    ###
    # before_destroy
    # raise hell if user is trying to delete last location of a company.
    # if deleting the primary location, a new primary location is auto-selected.
    # @raises RException
    #
    def before_destroy
        raise LastLocationError.new("You cannot delete the last location of a company") if company.locations.count == 1     
        raise OrderError.new("This location is linked-to previous orders and cannot be deleted") if entities.count > 0        
        if company.head_office.id == self.id            
            company.head_office = company.locations.find(:first, :conditions => "id != #{self.id}")
            company.save!
        end        
    end
    
    class LastLocationError < RException
        
    end
    
    class OrderError < RException
        
    end
end
