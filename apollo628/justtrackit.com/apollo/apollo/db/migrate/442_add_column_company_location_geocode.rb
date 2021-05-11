class AddColumnCompanyLocationGeocode < ActiveRecord::Migration
    def self.up
        if !CompanyLocation.column_names.include?("lat")
            add_column :company_location, :lat, :float
            add_column :company_location, :lng, :float
        end
    
    end

  def self.down
      
  end
end
