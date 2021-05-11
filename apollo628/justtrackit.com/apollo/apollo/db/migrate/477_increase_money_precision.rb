class IncreaseMoneyPrecision < ActiveRecord::Migration
  def self.up
                                   
        change_column :order_entity, :cost_cents, :decimal, :precision => 11, :scale => 2, :null => false, :default => 0
        
        change_column :invoice_item, :cost_cents, :decimal, :precision => 11, :scale => 2, :default => 0
        
        change_column :invoice_transaction, :amount_cents, :decimal, :precision => 11, :scale => 2, :default => 0
        
        change_column :order_entity_cost, :cost_cents, :decimal, :precision => 11, :scale => 2, :default => 0      
        
        change_column "orders", :declared_value_cents, :decimal, :precision => 11, :scale => 2, :default => 0
        
                                          
            
  end

  
  def self.down
  
  end
end
