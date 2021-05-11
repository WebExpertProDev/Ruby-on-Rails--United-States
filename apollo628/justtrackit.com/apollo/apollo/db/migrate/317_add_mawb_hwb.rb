class AddMawbHwb < ActiveRecord::Migration

    def self.up
       say "Create table mawb table.", true
       create_table :mawb_hwb, :force => true do |t|
           t.column :id, :integer, :null => false
           t.column :mawb_id, :integer,   :null => false, :references => :order
           t.column :hwb_id,  :integer,   :null => false, :references => :order
       end
                            
    end
    
    def self.down
       drop_table :mawb_hwb
    end
   
end
