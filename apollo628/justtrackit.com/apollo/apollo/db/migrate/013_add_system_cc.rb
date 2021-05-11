class AddSystemCc < ActiveRecord::Migration

    def self.up
        say "Add system_cc", true
        create_table :system_cc, :force => true do |t|
            t.column :id,               :integer, :null => false
            t.column :name,             :string, :limit => 55, :null => false
            t.column :mask,             :string, :limit => 55, :null => true
        end
       
    end


    def self.down
        #drop_table :system_cc
    end

end
