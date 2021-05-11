class AddRole < ActiveRecord::Migration
    def self.up
        say "Create table 'role'.", true

        create_table :role, :force => true do |t|
            t.column :id, :integer, :null => false
            t.column :created_at,         :timestamp, :null => false
            t.column :updated_at,         :timestamp, :null => false
            t.column :identifier,         :string,    :limit => 100, :null => false
            t.column :label,              :string,    :limit => 100, :null => false
        end

        say "Add indexes on table 'role'.", true
        add_index :role, :identifier

        say "Populate the RBAC system with a default role and account.", true
        
        # admin roles
        Role.create :identifier => 'admin', :label => 'Administrator'
        Role.create :identifier => 'corp.employee', :label => 'Employee'
        Role.create :identifier => 'corp.tsa_manager', :label => 'TSA Manager'
        Role.create :identifier => 'corp.sales', :label => 'Sales'
        
        # client roles
        Role.create :identifier => 'client.known_shipper', :label => 'Known Shipper'
        Role.create :identifier => 'accountant', :label => 'Accountant'
        
        # vendor.agent roles
        Role.create :identifier => 'vendor.agent.tsa_approved', :label => 'TSA Approved'
        Role.create :identifier => 'vendor.agent.after_hours', :label => 'After-hours'
        Role.create :identifier => 'vendor.agent.weekends', :label => 'Weekends'
        Role.create :identifier => 'vendor.agent.manager', :label => 'Manager'               
    
        # carrier roles
        Role.create :identifier => 'vendor.carrier.ground', :label => 'Ground'
        Role.create :identifier => 'vendor.carrier.air_freight', :label => 'Air Freight'
        Role.create :identifier => 'vendor.carrier.air_commercial', :label => 'Air Commercial'
        
        # sales-agent roles
        Role.create :identifier => 'vendor.sales_agent', :label => "Sales-agent"
        Role.create :identifier => 'vendor.sales_agent.commission_bonus', :label => 'Commission Bonus'
    end

    def self.down
        drop_table :role
    end
end
