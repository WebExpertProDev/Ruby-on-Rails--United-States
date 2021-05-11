class CompanyAccounting < ActiveRecord::Base

    belongs_to :company    
    belongs_to :city
    
    def get_billing_address
        {:city_id => self.city_id, :city => self.city.to_h, :address1 => self.address1, :address2 => self.address2, :zip => self.zip}
    end
end
