class AddSalesAgent < ActiveRecord::Migration
    def self.up
        create_table :sales_agent do |t|
            t.integer :id, :null => false
            t.integer :company_id
            t.timestamps
        end     
    end

  def self.down
      drop_table :sales_agent
  end
end
