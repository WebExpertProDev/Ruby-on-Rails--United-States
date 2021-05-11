###
# Apollo rake tasks
# @author Chris Scott
#
namespace :apollo do 
    
    desc "apollo cron task"
    task :cron => :environment do
        puts "************************************************************************"
        puts "* apollo:cron"
        puts "************************************************************************" 
        t = Time.now
        if (t.hour == 0 and t.min == 0)
            puts "-- creating nightly backup (rake resistor:db:dump RAILS_ENV=#{RAILS_ENV})"
            # nightly backup
            `/usr/local/bin/rake resistor:db:dump RAILS_ENV=#{RAILS_ENV}`
            
            puts "-- dumping templates (rake resistor:db:dump RAILS_ENV=#{RAILS_ENV})"
            # dump templates
            `/usr/local/bin/rake resistor:db:dump_templates RAILS_ENV=#{RAILS_ENV}`            
        end
        
        ##
        # produce sales-agent report if this is a friday at midnight
        #
        d = t.to_date        
        if (d.wday == 5 && t.hour == 0 && t.min == 0)                        
            end_date = d - 7            # last friday            
            start_date =  end_date - 6  # saturday before last
            report = Report.find_by_name('commissions')
            puts "-- Emailing #{report.label}"
            
            ReportMailer.deliver_report_pdf(report.label, report.render(:pdf, start_date, end_date))                                   
        end
    end

    task :dump_regions => :environment do
                        
        f = File.new('db/regions_dump.yml', File::CREAT|File::RDWR|File::TRUNC, 0644)
        data = {
            :countries => [],
            :regions => [],
            :cities => [],
            :airports => []
        }
        Country.find(:all).each do |c|
            data[:countries] << c.attributes
        end
        Region.find(:all).each do |r|
            data[:regions] << r.attributes
        end
        City.find(:all).each do |c|
            data[:cities] << c.attributes
        end
        Airport.find(:all).each do |a|
            data[:airports] << a.attributes
        end
        
        f << data.to_yaml
            
            
                
    
    end

    desc "Install application"
    task :install => :environment do
        puts "************************************************************************"
        puts "* Installing application"
        puts "************************************************************************"
        
        #begin
            Apollo::Installer.run
        #rescue StandardError => e
        #     puts " - ERROR: #{e}"
        #     exit(0)
        #end
    end

    task :import_customers => :environment do
        puts "*************************************************************************************"
        puts " Import customers "
        puts "*************************************************************************************"
        
        Apollo::Importer.import_customers('db/customers.yml')
                                                                
    end
    
    task :import_agents => :environment do
        puts "*************************************************************************************"
        puts " Import agents "
        puts "*************************************************************************************"                        
        Apollo::Importer.import_agents('db/agents.yml')                
    end
    
    task :import_carriers => :environment do
        puts "*************************************************************************************"
        puts " Import carriers "
        puts "*************************************************************************************"                
        Apollo::Importer.import_carriers('db/carriers.yml')                                                                                    
    end
            
    task :apply_locations => :environment do
        rs = Company.find(:all)
        rs.each do |c|
            if c.head_office.nil?
                l = CompanyLocation.create(
               :company_id => c.id,
               :country_id => c.country_id,
               :region_id => c.region_id,
               :city_id => c.city_id,
               :airport_id => c.airport_id,
               :name => 'Head office',
                :addr1 => c.addr1,
                :addr2 => c.addr2,
                :zip => c.zip,
                :www => c.www,
                :email => c.email,
                :phone1 => c.phone1,
                :phone2 => c.phone2,
                :fax => c.fax
                )
                c.primary_location_id = l.id
                c.save!
                
                OrderEntity.find(:all, :conditions => "company_id = #{c.id}").each do |e|
                    e.company_location_id = l.id
                    e.save!
                end
            end
            
        end
    end
    
    ###
    # @task build
    # used to dump current company country/region/city/airport settings to yaml file.  each is saved as text
    # in preparation for applying a new region import.  if you didn't do this and re-imported regions from a different source, 
    # the country/region/city/airport ids would be out-to-lunch
    #
    desc "Dump current company country/region/city/airport mappings to yaml file"
    task :dump_company_region_map => :environment do                   
        puts "******************************************************************"
        puts "* apollo:dump_company_region_map"
        puts "******************************************************************"                        
        
        output = {}
        
        count = 0
        rs = Company.find(:all, :include => [:country, :region, :city, :airport])
        rs.each do |c|
            count += 1
            output[c.id] = {:country => c.country.iso, :region => c.region.iso, :city => c.city.name, :airport => c.airport.iso}    
        end
        
        # write .jsb file
        filename = "#{RAILS_ROOT}/tmp/company_region_map.yml"
        
        f = File.new(filename, File::CREAT|File::RDWR|File::TRUNC, 0644)
        f << output.to_yaml
        f.close            
        
        puts " - Success.  found #{count} companies"
    end     
    
    ###
    # @task apply_company_region_map
    # 
    desc "Apply company region mapping from yml file"
    task :apply_company_region_map => :environment do                   
        puts "*************************************************************************************"
        puts "* apollo:apply_company_region_map"
        puts "*************************************************************************************"                        
        
        # load map from yaml file in /tmp
        filename = "#{RAILS_ROOT}/tmp/company_region_map.yml"
        if (!FileTest.exist?(filename)) # no yaml config detected.  just return.     
            puts "Error: File not found (#{filename}"   
            exit(0)
        end        
        map = YAML.load(File.read(filename))
        
        count = 0
        found = 0     
        found_dirty = 0
        found_fixed = 0
        
        rs = Company.find(:all, :include => [:country, :region, :city, :airport])
        rs.each do |c|            
            dirty = false
            fixed = true
            
            if (m = map[c.id])
                
                found += 1
                if (c.country.nil? || c.country.iso != m[:country])
                    dirty = true
                    if (country = Country.find_by_iso(m[:country]))
                        c.country_id = country.id                        
                    else 
                        fixed = false
                    end
                    
                end
                if (c.region.nil? || !(c.region.iso == m[:region] && c.region.country.iso == m[:country]) )                    
                    if (region = Region.find(:first, :conditions => "iso = '#{m[:region]}' AND country_id = #{c.country.id}"))                        
                        c.region_id = region.id
                    else
                        fixed = false
                    end
                    dirty = true
                end
                if (c.city.nil? || c.city.name != m[:city])
                    if (city = City.find_by_name(m[:city]))
                        c.city_id = city.id    
                    else 
                        fixed = false
                    end                         
                    dirty = true
                end
                if (c.airport.nil? || c.airport.iso != m[:airport])
                    if (airport = Airport.find_by_iso(m[:airport]))
                        c.airport_id = airport.id    
                    else 
                        fixed = false
                    end                    
                    dirty = true
                end
                
                # if any of the current company's region info doesn't match, it becomes dirty and needs now to be updated.
                if (dirty === true)
                    if (fixed === true)
                        found_fixed += 1    
                    end
                    found_dirty += 1
                    c.save
                end                                                
            end
            count += 1
        end
        
        puts "*************************************************************************************"
        if (count == found)             
            puts "Success -- updated region mappings for all #{count} companies.\n"  
            puts "#{found_dirty} were found dirty and #{found_fixed} were fixed\n"            
            
        else
            puts "WARNING -- found #{count} companies but updated region mapping for only #{found}"
        end
        puts "*************************************************************************************"
    end     
    
    desc "Import Freight-force addresses"
    task :parse_ff => :environment do
        require 'html/tree'
        require 'html/xmltree'
        
        company = Company.find_by_name("Freight Force", :include => [:locations])
        country = Country.find_by_iso("US")
        
        puts "*************************************************************************************"
        puts " Parse #{company.name} addressses"
        puts "*************************************************************************************"
        f = File.open('tmp/freight_force.html')        
        str = f.read                
        p = HTMLTree::XMLParser.new(true,true)        
        p.feed(str)
        xml = p.document
        
        index = 0
        airport = nil
        address = nil
        
        unknown = {
            :airports => [],
            :cities => []
        }
        xml.elements.each('//b') do |node|   
            index += 1
            
            if (index == 1)
                airport = node    
            elsif index == 2
                address = node
                
                puts " - station -"
                puts " airport node: " + airport.text
                
                location = address.texts[2].value.match(/\b(.*),\s\b(.*)\b\s\b(.*)\b/)
                
                if (location != nil)                    
                    region = Region.find_by_iso(location[2], :conditions => "#{Region.table_name}.country_id = #{country.id}")                    
                    city = City.find(:first, :conditions => "UPPER(name) ~* '#{location[1].upcase}' AND region_id = #{region.id}")
                    ap = Airport.find_by_iso(airport.text)
                    
                    if (ap.nil? && !city.nil?)
                        ap = Airport.create(
                                            :city_id => city.id,
                                            :icao => airport.text,
                                            :iso => airport.text,                       
                                            :name => city.name
                        )
                    end
                    
                    if (!city.nil? && !ap.nil? && !company.locations.find_by_name(address.texts[0].value))
                        data = {         
                            :company_id => company.id,
                            :name => address.texts[0].value,
                            :addr1 => address.texts[1].value,
                            :zip => location[3],
                            :phone1 => address.texts[3].value.match(/\Tel:?\s(.*)$/)[1],
                            :fax => address.texts[4].value.match(/\Fax:?\s(.*)$/)[1],                            
                            :country_id => country.id,
                            :region_id => region.id,
                            :city_id => city.id,
                            :airport_id => ap.id                            
                        }
                        CompanyLocation.create(data)
                    else
                        puts "--- Unknown location or already exists"
                    end                    
                end                                                
            end
            
            index = 0 if index == 2
            
        end
        
        puts "************************************************************************"
        puts "* Unknown"
        puts "************************************************************************"
        puts unknown.to_yaml
                        
    end    
end

##
# @module Apollo
#
module Apollo
    
    ##
    # @module Installer
    # installs the application
    #
    module Installer
        
        APP_DATA_PATH   = "#{RAILS_ROOT}/db/application.yml"
        GEO_DATA_PATH   = "#{RAILS_ROOT}/db/geodata.yml"
        
        @@config = nil
        
        def self.run            
            if (!FileTest.exist?(APP_DATA_PATH)) # no yaml config detected.  just return.        
                raise StandardError.new("Config file '#{APP_DATA_PATH}' was not found")
            end        
            @@config = YAML.load(File.read(APP_DATA_PATH))
            

            ActiveRecord::Base.transaction do |t|
                # install GeoData System (countries, regions, cities, airports)Alabama
                geodata = YAML.load(File.read(GEO_DATA_PATH))
                Country.install(geodata[:country])
                Region.install(geodata[:region])
                City.install(geodata[:city])
                Airport.install(geodata[:airport])
                
                # System
                SystemLogType.install(@@config[:system_log_type])
                                       
                # AuthN System
                Role.install(@@config[:role])                   
                Domain.install(@@config[:domain])      
                
                # Corp and Admin
                self.install_corp
                self.install_admin
                
                # Document System
                TemplateType.install(@@config[:template_type])
                
                # Order System
                ShippingMethod.install(@@config[:shipping_method])
                ShippingStatus.install(@@config[:shipping_status])
                ShippingCommodity.install(@@config[:shipping_commodity])
                ShippingCost.install(@@config[:shipping_cost])
                OrderType.install(@@config[:order_type])
                OrderLogType.install(@@config[:order_log_type])
                OrderStatus.install(@@config[:order_status])
                BillingMethod.install(@@config[:billing_method])
                SystemRevenuType.install(@@config[:system_revenu_type])
                SystemRevenu.install(@@config[:system_revenu])
                            
                #Invoice System
                TransactionType.install(@@config[:transaction_type])
                TransactionMethod.install(@@config[:transaction_method])
                InvoiceStatus.install(@@config[:invoice_status])
                
                # Import companies
                puts "-- Installing customers"
                Apollo::Importer.import_customers('db/customers.yml')
                puts "-- Installing agents"
                Apollo::Importer.import_agents('db/agents.yml')
                puts "-- Installing carriers"
                Apollo::Importer.import_carriers('db/carriers.yml')
                              
                puts `rake resistor:db:import_templates RAILS_ENV=#{RAILS_ENV}`
                
            end
                                                                                                                                                        
        end
        
        ##############################################
        private
        ##############################################
                                
        def self.install_corp           
            data = @@config[:corp]
            data[:created_by] = 1            
            Company.install([data])
            corp = Company.find(1)
            corp.head_office = corp.locations.first
            corp.bill_address = corp.locations.first
            corp.save!
        end
        
        def self.install_admin
            # create the first account
            data = @@config[:admin]
                        
            corp = Company.find(1)
            data[:company_id] = corp.id
            data[:password_confirmation] = data[:password]
            admin = Account.create(data)
            
            # attach admin role to admin account             
            AccountRole.create(:account_id => admin.id, :role_id => Role.find_by_identifier('admin').id)
            
        end
        
        def append_order_documents
            hawb = OrderType.find_by_name('hwb')
            q = OrderType.find_by_name('hawb_quote')
            
            Template.find_by_model('Order').each do |t|
                if (t.name != 'quote')
                    OrderTypeDoc.create(
                        :order_type_id => hawb.id,
                        :template_id => t.id
                    )
                else
                    OrderTypeDoc.create(
                        :order_type_id => q.id,
                        :template_id => t.id
                    )
                end
            end
        
        end
    
        
        
    end
    
    ##
    # @module Importer
    #
    module Importer
         
        ##
        # import_agents
        #
        def self.import_agents(filename)
            
            #company = {
            #    :name => name,
            #    :faa => row[3],
            #    :contact => row[4],
            #    :rank => row[7],
            #    :accounting_code => row[12],
            #    :billing_location => number
            #    :locations => [{
            #        :name => name,
            #        :number => row[8],
            #        :airport => row[0],
            #        :addr1 => row[2],
            #        :addr2 => '',
            #        :city_state_zip => row[9],
            #        :phone => row[5],
            #        :url => row[6],
            #        :fax => row[11]
            #    }]
            #}
                       
            domain = Domain.find_by_name('agent')
            
            self.import(domain, filename)
                                                        
            #out = File.new('db/agents.yml', File::CREAT|File::RDWR|File::TRUNC, 0644)
            #out << companies.to_yaml                        
            
        end
        
        ##
        # import_carriers
        def self.import_carriers(filename)
            #company = {
            #    :name => name,
            #    :number => row[0],
            #    :credit_limit => row[3],
            #    :accounting_code => row[4],
            #    :head_office => '',
            #    :locations => [{
            #        :name => row[1],
            #        :number => row[0],
            #        :addr1 => row[2],
            #        :addr2 => '',
            #        :city_state_zip => row[7],
            #        :phone => row[5],
            #        :url => row[6]
            #    }]
            #}
            
            domain = Domain.find_by_name('carrier')
            
            self.import(domain, filename)
                                
        end
        
        ##
        # import_customers
        #
        def self.import_customers(filename)
            
            domain = Domain.find_by_name('client')
            self.import(domain, filename)
                        
            #company = {
            #    :name => name,
            #    :number => row[6],
            #    :credit_status => row[3],
            #    :sales_agent => row[5],
            #    :date_added => row[8],
            #    :close_time => row[9],
            #    :added_by => row[11],
            #    :locations => [{
            #        :name => name,
            #        :number => row[6],
            #        :addr1 => row[1],
            #        :addr2 => row[7],
            #        :city_state_zip => row[2],
            #        :phone => row[4],
            #        :fax => row[10],
            #        :city,
            #        :region,
            #        :country
            #        :airport
            #    }]
            #}    
            
        end
        
        private
        def self.import(domain, filename)
            
            companies = YAML.load(File.read(filename));   
            puts " - Count: " + companies.length.to_s
            
            admin = Account.find(1)
            
            pks = []
            # first clear existing versions of agents within yaml
            companies.each do |c|
                pks << "#{Company.table_name}.name = '#{c[:name].gsub("'", "''")}'"
            end
            Company.delete_all("domain_id = '#{domain.id}' AND (#{pks.join(' OR ')})")
                    
            companies.sort_by{|c| c[:name]}.each do |c|
                
                form = {
                    "company" => {
                        "description" => domain.name,
                        "billing_method_id" => 2,
                        "name" => c[:name],
                        "created_by" => admin,                
                        "domain_id" => domain.id,
                        "domain_values" => {}
                    },
                    "locations" => {"added" => [], "deleted" => []},
                    "accounts" => {"added" => [], "deleted" => []}.to_json
                }
                                                        
                # save domain_field values if any found.  domain_values is a serialized column
                if (domain.fields.length)                  
                    domain.fields.each do |f|
                        form["company"]["domain_values"][f.id] = f[:config][:value]
                    end                     
                else 
                    form["company"]["domain_values"] = {}
                end
                            
                c[:locations].each do |l|
                    #puts "city: #{l[:city]} #{l[:region]} #{l[:country]}"
                    
                    city = City.find_by_name(l[:city], :conditions => "#{Region.table_name}.name = '#{l[:region]}'", :include => [:region])   
                    if (city) 
                        #puts c[:name] + " #{city.name} #{city.region.name}"
                        airport = Airport.find_by_iso(l[:airport])
                        
                        l[:fax] = '' if l[:fax].nil?
                        l[:airport] = (airport) ? airport.id : 1
                        
                        form["locations"]["added"].push({
                            :location => {                            
                                :country_id => city.region.country.id,
                                :region_id => city.region.id,
                                :airport_id => l[:airport],
                                :city_id => city.id,
                                :addr1 => l[:addr1],
                                :addr2 => l[:addr2],
                                :zip => l[:zip],
                                :phone1 => l[:phone],
                                :fax => l[:fax],
                                :www => l[:url]                    
                            },
                            :roles => {
                                :is_primary => (l[:number] == c[:billing_location]) ? true : false,
                                :is_billing => (l[:number] == c[:billing_location]) ? true : false
                            }
                        })                    
                    else
                        puts "-- Could not locate city #{l[:city]}, #{l[:region]}, #{l[:country]}"
                    end
                    
                end                         
                                                                                               
                # create company
                if (form["locations"]["added"].length > 0)
                    form["locations"] = form["locations"].to_json  
                    company = Company.create(form)
                end
            end                        
        end
    end
end
