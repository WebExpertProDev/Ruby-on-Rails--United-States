class AddDomain < ActiveRecord::Migration
    
        
    def self.up

        say "Creating domain table", true
        #ActiveRecord::Base.transaction do
            say "Create table 'domain'.", true
            create_table :domain, :force => true do |t|
                t.column :id, :integer, :null => false
                t.column :parent_id, :integer, :null => false, :default => 0, :references => nil
                t.column :name, :string, :null => false
                t.column :label, :string, :null => true
            end
            corp = Domain.create :name => 'corp', :label => 'CORP'
            vendor = Domain.create :name => 'vendor', :label => 'Vendor'
            client = Domain.create :name => 'client', :label => 'Client'

            ###
            # create domains
            #            

            # create vendor/carrier
            carrier = Domain.create :name => 'carrier', :label => 'Carrier', :parent_id => vendor.id
            
            # domain vendor/agent
            agent = Domain.create :name => 'agent', :label => 'Carting Agent', :parent_id => vendor.id

            # domain vendor/customs broker
            Domain.create :name => 'customs_broker', :label => 'Customs Broker', :parent_id => vendor.id

            # domain vendor/packing service
            Domain.create :name => 'packing_service', :label => 'Packing Service', :parent_id => vendor.id

            # sales agent domain
            Domain.create :name => 'sales_agency', :label => 'Sales Agency', :parent_id => vendor.id


        #end
    end

    def self.down
        ActiveRecord::Base.transaction do
            drop_table :domain
        end
    end
end
