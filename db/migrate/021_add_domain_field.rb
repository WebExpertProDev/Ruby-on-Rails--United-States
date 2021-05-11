class AddDomainField < ActiveRecord::Migration

    def self.up
        say "Create table domain_field.", true
        create_table :domain_field, :force => true do |t|
            t.column :id, :integer, :null => false
            t.column :domain_id,      :integer,       :null => false
            t.column :name,           :string,        :null => false
            t.column :label,          :string,        :null => false
            t.column :required,       :boolean,       :null => false, :default => true
            t.column :field_type,     :string,        :null => false
            t.column :config,         :string,        :null => false, :default => {}
        end
        
               
        
       

    end

    def self.down
        drop_table :domain_field
   end

end
