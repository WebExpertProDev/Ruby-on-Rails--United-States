
class Company < ActiveRecord::Base
                    
    class LiquidDropClass < Liquid::Drop
        ###
        # DomainFields
        # implements Liquid::Drop#before_method.  if drop doesn't respond_to the method
        # check to see if there's like-named domain-field.  if so, return teh value
        # of DomainField
        #       
        def before_method(method)        
            if (self.respond_to?(method))
                nil
            elsif (f = @object.domain.fields.find_by_name(method.to_s))
                @object.domain_values[f.id]            
            else
                nil
            end                 
        end
        
        def is_air_carrier 
            (@object.has_role?('vendor.carrier.air_commercial') || @object.has_role?('vendor.carrier.air_freight')) ? true : false            
        end
    end
    
    #include Resistor::Company
    
    liquid_methods :accountant, :name, :logo, :head_office, :billing_address, :domain, :domain_values, :locations, :accounts    
    
            
    # domain_values are the serialized values from domain_field
    serialize :domain_values
              
    belongs_to :domain
    has_many :domain_fields, :class_name => "DomainField", :finder_sql => 'SELECT domain_field.* FROM domain_field INNER JOIN domain ON domain_field.domain_id = domain.id WHERE ((domain.id = #{domain_id}))'
    
        
    has_many :cc, :class_name => "CompanyCc", :source => :company_cc, :dependent => :destroy
    has_many :accounts, :class_name => "Account", :source => :account
    has_many :sales_agents, :class_name => "CompanySalesAccount", :source => :company_sales_account, :dependent => :destroy
                
    has_many :company_role, :class_name => "CompanyRole", :dependent => :destroy
    has_many :roles, :class_name => "Role", :through => :company_role
    has_many :locations, :class_name => "CompanyLocation", :source => :company_location
    belongs_to :head_office, :class_name => "CompanyLocation", :foreign_key => :primary_location_id, :include => [:country, :region, :city, :airport]
    belongs_to :billing_address, :class_name => "CompanyLocation", :foreign_key => :billing_location_id, :include => [:country, :region, :city, :airport]
                             
    ###
    # validations
    #
    validates_uniqueness_of :name    
    
    ##
    # method_missing
    # implement method_missing to search for domain/role fields
    #:iaccert_number
    def method_missing(method, *args)          
        if domain.nil?
            super
        elsif (f = domain.fields.find(:first, :conditions => {:name => method.to_s}))
            if (args.length > 0)
                domain_values[f.id] = args.first
                save!
            else
                domain_values[f.id]
            end
        else
            super
        end                 
    end
        
    ##
    # respond_to
    # override respond_to to match method_missing above.
    # @return {Boolean}
    #
    def respond_to?(method) 
        (!domain.nil? && domain.fields.find(:first, :conditions => {:name => method})) ? true : super                     
    end
    
            
    def accountant
        role = Role.find_by_identifier('accountant')
        joins = "LEFT JOIN #{AccountRole.table_name} ON #{Account.table_name}.id = #{AccountRole.table_name}.account_id"
        conditions = "#{AccountRole.table_name}.role_id = #{role.id}"
        a = self.accounts.find(:first, :conditions => conditions, :joins => joins)
        return (!a.nil?) ? a : self.accounts.find(:first, :order => "created_at ASC")        
    end
    
    ###
    # callbacks
    #
    
    ###
    # before_destroy
    # have to be careful destroying a company since it may have accounts or locations that are pointed-to by orders.
    # If a company *does* have one of its entities connected a past order, its domain_id id will be set to zero, placing it
    # into the twilight zone where it can no longer be selected and attached to future orders.
    # @raises Company::OrderError
    # when Company::OrderError is raised the caller should catch this exception and save teh company with its zeroed domain_id
    # @see company_controller#delete
    #
    def before_destroy(*param)        
                   
        # remove accounts
        self.accounts.each do |a|
            begin
                a.destroy
            rescue Account::OrderError => e #<-- this account is involved in an previous order somehow.
                self.domain_id = 0                                               
            end
        end
        
        # remove locations
        self.locations.each do |l|
            begin
                l.destroy
            rescue CompanyLocation::OrderError => e #<-- this location is connected to a previous order somewhere.
                self.domain.id = 0
            rescue CompanyLocation::LastLocationError => e  
                CompanyLocation.delete(l.id) # <-- false-positive.  not worried about last-location when deleting a company.
            end
        end
        
        # if this company's domain_id has been zeroed, then either one of its locations or accounts is connected to previous 
        # orders and mustn't be deleted.  b y removing it from its domain though, it can't be accessed anymore.       
        if (self.domain_id == 0)                          
            raise OrderError.new("This company is attached to previous orders and cannot be deleted.  However, it will be hidden from being able to be used anymore.")
        end
            
    end
    
    ###
    # before_create
    # ensure that domain_values is always a hash
    #
    def before_create
        domain_values = {} if domain_values.nil?
    end
    
    ###
    # has_role?
    # (copied from active_rbac)
    # This method returns true if the company is assigned the role with one of the
    # role titles given as parameters. False otherwise.
    #
    def has_role?(*roles_identifiers)      
        self.roles.any? { |role| roles_identifiers.include?(role.identifier) }
    end
    
    ###
    # Company::create
    # override peer create method
    #
    def self.create(params)
        
        # if no params["company"], standard create hash.  go to super
        if (params["company"].nil?)
            return super
        end
                        
        form = params["company"]                                                   
               
        #if (form[:country_id] == nil && form["country_id"] == nil && form["region_id"] == nil) # <-- if these params are nil, discover them from city_id
        #    city = City.find_by_id(form["city_id"].to_i, :include => :region)
        #    form["region_id"] = city.region.id
        #    form["country_id"] = city.region.country.id
        #end
        
        # if alternate_billing is set, we need to send bills to another addresss         
        form["bill_to_company_address"] = (!params["alternate_billing_address"].nil? && params["alternate_billing_address"] == 'on') ? false : true
                        
        # super-duper
        company = super(form)
                
        if (company.id)                         
            # 1. create locations
            if (params["locations"] != nil && params["locations"].length)
                data = JSON.parse(params["locations"])
                if (!data.nil?)
                    locations = Company.create_locations(company.id, data)
                    
                    # raise shit if no location was created...
                    raise RException.new("A company must have at least one location defined") if locations[:records].length == 0
                    
                    # set company's primary_location                                        
                    company.primary_location_id = (!locations[:primary].nil?) ? locations[:primary].id : locations[:records].first.id
                    
                    # set company's billing_location                                        
                    company.billing_location_id = (!locations[:billing].nil?) ? locations[:billing].id : locations[:records].first.id
                    
                    company.save!
                end
            end
            
            # 2. if there was a list of accounts provided in json param "accounts", decode and create.
            # otherwise, create an anonymous account based upon company name.                     
            if (params["accounts"] != nil && params["accounts"].length)
                data = JSON.parse(params["accounts"])   
                if (data != nil)
                    accounts = company.create_accounts(data)   
                    
                    # if user didn't create any accounts, create an anonymous one for convenience
                    if (accounts.length == 0)                        
                        Company.create_anonymous_account(company)                        
                    end        
                end
            end
            
            # 3. create sale-agent companies
            if (params["agents"] != nil && params["agents"].length)
                data = JSON.parse(params["agents"])
                if (data != nil)
                    company.create_sales_agents(data)                    
                end
            end          
            
            # 4. create roles
            if (params["roles"] != nil)
                company.apply_roles(params)                                        
            end
            
            # 5. company credit-card was defined?
            # if billing_method_id not set, default it to 1.  not quite sure how to solve this more elegently but it shouldn't cause problems                
            credit = BillingMethod.find_by_name('credit') 
            if (company.billing_method_id == credit.id && params["cc"] != nil)
                params["cc"]["company_id"] = company.id                
                CompanyCc.create(params["cc"])                       
            end
            
            # 6. Bill-to
            if (company.bill_to_company_address === false)
                company.create_alternate_billing_address(params["billing_address"])        
            end
        end
        
        return company
    end
    
    ###
    # create_alternate_billing_address
    #
    def create_alternate_billing_address(form)   
        if (!self.accounting) 
            form["company_id"] = self.id
            CompanyAccounting.create(form)
        else
            self.accounting.attributes = form
            self.accounting.save
        end
    end
    
    ###
    # create_anonymous_location
    # adds a new company location based upon the params of the supplied location
    # @param {CompanyLocation}
    # @return {CompanyLocation}
    def self.create_anonymous_location(id, location)
        c = self.find(id, :include => [:head_office])
        return CompanyLocation.create({           
            :company_id => id,
            :name => c.head_office.name,
            :country_id => location.country_id,
            :region_id => location.region_id,
            :city_id => location.city_id,
            :airport_id => location.airport_id,
            :phone1 => c.head_office.phone1,
            :phone2 => c.head_office.phone2,
            :fax => c.head_office.fax,
            :email => c.head_office.email
        })    
    end
    
    ###
    # Company::create_anonymous_account
    # creates a default company account based upon company params.
    # used for creating an anonymous account for a carrier company.
    #
    def self.create_anonymous_account(company)
        Account.create(
            :company_id => company.id,
            "first" => 'Anonymous',
            "last" => company.name,
            "phone" => company.head_office.phone1,            
            "fax" => company.head_office.fax            
        )
    end
        
    ###
    # create_accounts
    # @param {Array} accounts
    # @return {Array} list of Account objects created
    #
    def create_accounts(accounts)

        res = []
                        
        accounts["added"].each do |a|
            params = {}
            # need to build a new form with regexp on key "account[fieldname]"
            a.each_pair do |k,v|
                if (match = k.match(/^(.*)\[(.*)\]$/))
                    params[match[1]] = {} if params[match[1]].nil? 
                    params[match[1]][match[2]] = v
                end
            end
            form = params["account"]
            form[:company_id] = self.id
            account = Account.create(form)
            if (!account.id)
                raise RException.new(account.errors)
            end
            
            if (params["roles"] != nil)
                params["roles"].each_pair do |id, on|
                    role = Role.find_by_id(id)
                    values = {}
                    role.fields.each do |f|                        
                        values[f.id] = params["role_field"][f.id.to_s]
                    end                    
                    AccountRole.create(:role_id => role.id, :account_id => account.id, :field_value => values)
                end
            end                       
            res.push(account)
        end
        
        accounts["deleted"].each do |id|
            Account.destroy(id)    
        end
        
        # return the list of created account records to caller.
        return res

    end
    
    ###
    # create_locations
    # @param {Array} locations
    # @return {Array} list of CompanyLocation objects created
    #
    def self.create_locations(id, locations)
        res = []  
        primary = nil
        billing = nil        
        locations["added"].each do |form|            
            form["location"]["company_id"] = id
            location = CompanyLocation.create(form["location"])
            if (!location.id)
                raise RException.new(location.errors)
            end 
            primary = location if form["roles"]["is_primary"] == true
            billing = location if form["roles"]["is_billing"] == true
            res.push(location)
        end
        
        locations["deleted"].each do |location_id|
            CompanyLocation.destroy(location_id)    
        end
        
        # return the list of created account records to caller.
        return {
            :records => res,
            :primary => primary || nil,
            :billing => billing || nil
        }

    end
    ###
    # create_sales_agents
    # @param {Array} agents
    # @return {Hash}
    #
    def create_sales_agents(agents)   
        
        # add new agents
        agents["added"].each do |agent|
            agent["company_id"] = self.id        
            csa = CompanySalesAccount.create(agent)
            if (!csa.id)             
                raise RException.new(csa.errors)
            end
        end
        
        # check deleted agents
        agents["deleted"].each do |id|
            CompanySalesAccount.destroy(id)
        end
        
    end
        
    ###
    # find_agent_by_name
    # ComboBox search function for finding pickup/delivery agents
    # @param {Object} POST params
    # @return {String} JSON string
    #
    def self.find_agent_by_name(param)
        param[:domain] = Domain.find_by_name('Agent')

        case param[:type]
            when "Air Carrier"
                return self.find_tsa_approved_agent_by_name(param)
            else
                return self.find_company_by_name_and_domain(param)
        end
    end

    def self.find_tsa_approved_agent_by_name(param)
        res = {
            :total => 0
        }
        res[:data] = []
        res.to_json

    end
    
    ###
    # to_h
    #
    def to_h               
        data = self.contact.merge({
            :id => self.id
        })
        if (self.domain.fields.length)             
            self.domain.fields.each do |f|
                data[f.name] = self.domain_values[f.id]    
            end
        end     
        return data
    end
           
    ###
    # on_edit
    #
    def on_edit
        data = self.attributes
        
        # load accounts        
        data[:accounts] = self.accounts.collect {|a|            
            a.on_edit
        }
                
        # sales-agents
        data[:agents] = self.sales_agents.collect {|agent| agent.on_edit }
                
        # company roles        
        data[:roles] = self.company_role.collect { |cr| cr.to_h }
                                
        # credit card (if set)                
        if (!self.cc.empty?)            
            data[:cc] = self.cc.find(:first).to_h            
        end
                               
        return data        
    end
    
    ###
    # update
    #
    def self.update(id, params)
               
        if (params["company"] != nil)                                
            self.transaction do                 
                    
                # if alternate_billing is set, we need to send bills to another addresss                     
                params["company"]["bill_to_company_address"] = (!params["alternate_billing_address"].nil? && params["alternate_billing_address"] == 'on') ? false : true                                                
                                    
                # super update
                company = super(id, params["company"])
                
                # update alternate billing address if set
                if (company.id && company.bill_to_company_address === false)
                    company.create_alternate_billing_address(params["billing_address"])        
                end
                
                # company credit-card was defined?
                if (params["cc"] != nil)
                    company.apply_cc(params["cc"])
                end
            
                # apply domain_fields                    
                if (params[company.domain.name] != nil)                                                    
                    company.apply_domain_fields(params[company.domain.name])                        
                end
                
                # apply roles
                company.apply_roles(params)
                                    
                # add accounts
                # if there was a list of accounts provided in json param "accounts", decode and create.
                # otherwise, create an anonymous account based upon company name.                                              
                if (params["accounts"] != nil)                         
                    list = JSON.parse(params["accounts"])
                    if (list.length > 0)
                        accounts = company.create_accounts(list)                            
                    end                    
                end                                                                                
                
                # create locations
                if (params["locations"] != nil && params["locations"].length)
                    data = JSON.parse(params["locations"])
                    if (!data.nil?)
                        locations = Company.create_locations(company.id, data)
                        
                        # raise shit if no location was created...
                        #raise RException.new("A company must have at least one location defined") if locations[:records].length == 0
                        
                        # set company's primary_location                                        
                        company.update_attribute(:primary_location_id, locations[:primary].id) if !locations[:primary].nil?                        
                    end
                end
            
                # create sale-agent companies
                if (params["agents"] != nil)
                    company.create_sales_agents(JSON.parse(params["agents"]))                    
                end
                
                return company                                    
                
            end
        else
            super
        end                  
    end
    
    ###
    # apply_cc
    # apply credit-card info.  either creates new or updates existing
    #
    def apply_cc(form)
        # mix the yy/mm into date-time        
        year = form.delete("year").to_i
        month = form.delete("month").to_i   
        begin 
            exp = Date.parse(year.to_s + '-' + month.to_s + '-01')
        rescue StandardError => e
            raise RException.new('whoa...something weird with expiry date there?')
        end
        form["expiry"] = exp.to_s
        LOG.info("expiry: " + form["expiry"])
        
        now = Date.today
        LOG.info('exp: ' + exp.to_s)
        if (exp.year <= now.year && exp.month < now.month)
            raise RException.new("That creditcard is expired!")
        end
        if (self.cc.empty?)     
            form["company_id"] = self.id
            CompanyCc.create(form)
        else
            cc = self.cc.find(:first)
            cc.attributes = form
            cc.save
        end
    end
    
    ###
    # apply_roles
    # @param {Array} params POST params
    #
    def apply_roles(params)
        # apply roles                     
        selected_roles = [0]                                                                 
        if (params["roles"] != nil)                                                                           
            Role.find(params["roles"].keys).each do |r|                            
                selected_roles << r.id
                values = {} # <-- an empty has for role-field values.
                
                # found role_fields, yay!
                if (params["role_field"] != nil)                                
                    r.fields.each do |f|
                        values[f.id] = params["role_field"][f.id.to_s]    
                    end                                                                                                
                end
                
                # save or insert role                                                                                  
                if (cr = self.company_role.find_by_role_id(r.id))                                                                                                                                
                    cr.field_value = values
                    cr.save                                                                  
                else                             
                    CompanyRole.create(:company_id => self.id, :role_id => r.id, :field_value => values)
                end                            
            end
                
        end
            
        # now determine if any roles have been de-activated.  the form submitted a JSON param "account_roles" which
        # contains a list of *all* the roles available to this account.  if a key doesn't exist in teh above form,
        # it must have been unchecked.
        removed = self.company_role.find(
            :all,
            :conditions => "role_id NOT IN (#{selected_roles.join(',')})"
        )            
        removed.each do |cr|
            CompanyRole.destroy(cr)
        end               
    end
    
    ###
    # apply_domain_fields
    # @param {Array} form params
    #
    def apply_domain_fields(data)
        values = {}       
        self.domain.fields.each do |f|                            
            values[f.id] = data[f.id.to_s]    
        end
        self.domain_values = values
        self.save                        
    end
    
    ###
    # contact
    # returns a hash of contact info
    #
    def contact
        return {            
            :name => self.name.capitalize            
        }
    end

    ###
    # tree_by_domain_id
    # find all company nodes under domain_id.  used for building trees.
    # @param {Int} domain_id
    def self.tree_by_domain_id(domain_id)        
        conditions = "#{self.table_name}.domain_id = #{domain_id}"
        select = "#{self.table_name}.id, #{self.table_name}.name"

        return self.find(
            :all,
            :conditions => conditions,            
            :select     => select
        ).collect { |c|
            {:id => self.to_s + ':' + c.id.to_s, :text => c.name, :iconCls => 'icon-building', :leaf => false}
        }
    end

    ###
    # get_domain_company_roles
    # return a list of all roles available to this company through the domains
    # they're attached.
    # @return {Hash}
    def get_domain_company_roles
        list = {}                    
        self.domain.get_company_roles.each do |r|
            list[r.id] = r.to_h
        end        
        list
    end

    ###
    # get_domain_account_roles
    # returns a list of all the roles an account of this company has available through
    # the domains the company is attached.
    # @return {Hash}
    def get_domain_account_roles
        list = {}
       
        self.domain.get_account_roles.each do |r|
            list[r.id] = r.to_h           
        end        
        list
    end
    
    ###
    # get_domain
    # returns the first domain a company is a member of.  ugly.
    #
    def get_domain
        #LOG.info('company::get_domain: ' + self.domain.to_h.to_json)
        self.domain.to_h 
        #return {:id => self.domain.id, :name => self.domain.name, :label => self.domain.label}
    end
    
    def to_combo_record
        roles = ''
        self.roles.each do |r|
            roles += r.identifier.gsub('.', '-')
        end
       
        return {
            :id => self.id,             
            :name => self.name,
            :roles => roles
        }    
    end
    
    ###
    # OrderError
    # 
    class OrderError < StandardError
        
    end
    
end
