###
# company_cc
# list of all company credit cards
#
#
class AddCompanyCc < ActiveRecord::Migration

     def self.up
        say "Add system_cc", true
        create_table :company_cc, :force => true do |t|
            t.column :id,               :integer, :null => false
            t.column :company_id,       :integer, :null => false
            t.column :system_cc_id,     :integer, :null => false
            t.column :num,              :text,  :null => false            
            t.column :expiry,           :date,    :null => false
            t.column :pin,              :text,  :null => false            
            t.column :hash_type,        :string,  :limit =>  10, :null => false
        end        
        
    end

    def self.down
      
        drop_table :company_cc
    end
end

