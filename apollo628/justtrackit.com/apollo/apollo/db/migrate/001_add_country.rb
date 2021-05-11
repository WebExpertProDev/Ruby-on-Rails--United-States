class AddCountry < ActiveRecord::Migration

    def self.up
        say "Creating country table", true
        create_table :country do |t|
            t.column :id, :integer, :null => false
            t.column :iso, :string, :null => false
            t.column :name, :string, :null => false
        end

        # have to manually add pk because migrations is fucked for string pks.
        #execute "ALTER TABLE country ADD CONSTRAINT country_pkey PRIMARY KEY (id)"
                
        say "Add index name to table country.", true
        add_index :country, :name
        
        #say "Add Foreign key check to ensure the company_type exists.", true
        #execute "ALTER TABLE company ADD CONSTRAINT domain_type_fkey FOREIGN KEY(domain_type_id) REFERENCES domain_type(id);"
        
    end

    def self.down

        # drop manually create pk.
        #execute "ALTER TABLE country DROP CONSTRAINT country_pkey;"
        
        drop_table :country
    end

end
