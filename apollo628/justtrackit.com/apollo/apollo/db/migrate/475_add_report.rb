class AddReport < ActiveRecord::Migration
    def self.up
        create_table :report do |t|
            t.integer :id, :null => false
            t.string :name, :null => false
            t.string :label, :null => false
            t.string :model, :null => false
            t.text :joins
            t.text :order_by
            t.text :conditions
            t.text :select_columns
            t.text :columns                                               
        end
    end

    def self.down
        drop_table :report
    end
end

