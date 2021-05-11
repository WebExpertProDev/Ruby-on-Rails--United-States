class AddTransactionMethod < ActiveRecord::Migration
    def self.up
        create_table :transaction_method do |t|
            t.integer :id, :null => false
            t.string :name, :null => false                       
        end
        
        
    end

    def self.down
        drop_table :transaction_method
    end
end
