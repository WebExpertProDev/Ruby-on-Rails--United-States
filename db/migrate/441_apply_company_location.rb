# adds column "company_location_id" to order_entity to facilitate new company_location schema
#
class ApplyCompanyLocation < ActiveRecord::Migration
  def self.up      
      add_column :order_entity, :company_location_id, :integer if !OrderEntity.column_names.include?("company_location_id")
      
      add_column :company, :primary_location_id, :integer if (!Company.column_names.include?("primary_location_id"))
      add_column :company, :billing_location_id, :integer if (!Company.column_names.include?("billing_location_id"))
      
      
      add_column :account, :company_location_id, :integer if !Account.column_names.include?("company_location_id")
      
      change_column :company, :city_id, :integer, :null => true
      change_column :company, :airport_id, :integer, :null => true
      change_column :company, :region_id, :integer, :null => true
      change_column :company, :country_id, :integer, :null => true
      
  end

  def self.down
      
  end
end
