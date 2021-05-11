class AddCountryRegion < ActiveRecord::Migration
  def self.up

        say "Creating country_region table", true

        create_table :country_region, :force => true do |t|
            t.column :id, :integer, :null => false
            t.column :country_id, :integer, :null => false
            t.column :iso, :string, :null => false
            t.column :name, :string, :null => false
             
        end
        
        add_index :country_region, [:iso, :name]
                        

    end

    def self.down                          
        
        drop_table :country_region

    end
end
