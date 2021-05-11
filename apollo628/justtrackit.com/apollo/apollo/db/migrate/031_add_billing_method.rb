class AddBillingMethod < ActiveRecord::Migration
  def self.up
        say "Create table billing_method.", true
        create_table :billing_method do |t|
            t.column :id, :integer, :null => false
            t.column :name,   :string, :null => false
            t.column :label,  :string, :null => false
        end
        
        
    end

    def self.down
        drop_table :billing_method
    end
end
