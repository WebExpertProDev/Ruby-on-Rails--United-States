class CompanyController < ApplicationController
    
    include Resistor::CompanyController
                                   
    ###
    # index
    # draw the initial UI
    #
    def index
        respond_to do |format|
            format.html # index.html.erb
            format.xml  { 
                @companies = Company.find(:all)                
                render :xml => @companies.to_xml 
            }
            format.rss  { 
                @orders = Order.find(:all)
                render :layout => false } # uses index.rss.builder
        end
        
    end
                  
    def view
        
        begin 
            @company = Company.find(params[:id])
            @id = @company.id
        end
        render :layout => false
    end
    
    ###
    # list
    # company-tree handler
    #
    def list
        res = []

        path = params["node"].split(':')
        if (path.length == 1)
            node = path[0]

            if (node == 'root' || node == 'source')
                res = Domain.get_tree_nodes(0)

            end
        elsif (path.length == 2)
            node = path[0]
            id = path[1]

            case node
                when 'Domain'
                    res = Domain.get_tree_nodes(id).concat(Company.tree_by_domain_id(id))
                when 'Company'
                    res = Account.tree_by_company_id(id)
            end

        end
        render :json => res.to_json, :layout => false

    end

    

    ###
    # search_compnay
    # type-ahead handler for client ComboBoxes
    #
    def search_client

        domain = Domain.find_by_name('client')
        ids = domain.get_all_child_ids
                       
        conditions = "#{Company.table_name}.name ~* '^#{params["query"]}' AND #{Company.table_name}.domain_id IN (#{ids.join(',')})"
        select = "#{Company.table_name}.id, #{Company.table_name}.name"
        
        company_ids = []
        res = {
            :total      => get_pager_total(Company, conditions),
            :success    => true,
            :data       => Company.find(:all,
                            :limit => params["limit"],
                            :offset => params["start"],
                            :conditions => conditions,                            
                            :select => select,
                            :order => "#{Company.table_name}.name").collect { |c| 
                                company_ids.push(c.id)
                                [c.id, c.name] 
                            }
        }
        ###
        # now attach roles to response data# with this little page of data, map account-roles to each.  we'll use them as css-classes in the resultset..  we'll use roles as css-classes.                
        #
        if (!company_ids.empty?)
            croles = CompanyRole.hash_by_company_id(company_ids)
            res[:data].each do |c| (!croles[c[0]].nil?) ? c << croles[c[0]].collect { |r| {:cls => r.gsub('.', '-') }} : c << [] end
        end
        
        ###
        # response data:
        # @return {Array} [company_id, company_name, roles]
        #
        render :json => res.to_json, :layout => false
    end
    
    ###
    # search
    # alias to search_company
    #
    def search    
        res = RPagerResponse.new
        
        conditions = "UPPER(#{Company.table_name}.name) LIKE '%#{params["query"].upcase}%'"
        
        # Don't show CORP company (id=1) in the query
        conditions += " AND #{Company.table_name}.id != 1"
        
        if (!params["domain_id"].nil?)
            #domain = Domain.find_by_name('client')
            domain = Domain.find(params["domain_id"])
            ids = domain.get_all_child_ids        
             conditions += " AND #{Company.table_name}.domain_id IN (#{ids.join(',')})"
        end
        select = "#{Company.table_name}.id, #{Company.table_name}.name, #{Company.table_name}.domain_id"
        
        company_ids = []
        res.total = get_pager_total(Company, conditions)
        res.data = Company.find(:all,
            :limit => params["limit"],
            :offset => params["start"],
            :conditions => conditions,                            
            :select => select,
            :order => "#{Company.table_name}.name"
        ).collect { |c| 
            company_ids.push(c.id)
            [c.id, c.name, c.domain_id] 
        }
        res.success = true
        
        ###
        # now attach roles to response data# with this little page of data, map account-roles to each.  we'll use them as css-classes in the resultset..  we'll use roles as css-classes.
        # NOTE: we have to splice the roles into teh array at INDEX 2, because js Ext.data.Record objects have the
        # column mapped to 2                
        #
        if (!company_ids.empty?)
            croles = CompanyRole.hash_by_company_id(company_ids)
            res.data.each do |c| (!croles[c[0]].nil?) ? c.insert(2, croles[c[0]].collect { |r| {:cls => r.gsub('.', '-') }}) : c.insert(2, []) end

        end               
        respond(res)
    end
    
    def search_sales_agency
        search    
    end
    
    ###
    # search_contact
    # type-ahead handler for finding an account within a company
    #
    def get_company_accounts
        
        res = RResponse.new
        
        begin 
            ids = []
            conditions = "#{Account.table_name}.company_id = #{params['company_id']}"
            select = "#{Account.table_name}.id, #{Account.table_name}.first, #{Account.table_name}.last"
            res.data = Account.find(:all,
                :conditions => conditions,
                :select => select,
                :order => "#{Account.table_name}.last"
            ).collect {|a|
                ids << a.id
                [a.id, a.first, a.last]
            }
            
            ###
            # now attach roles to response data# with this little page of data, map account-roles to each.  we'll use them as css-classes in the resultset..  we'll use roles as css-classes.                
            #
            if (!ids.empty?)
                aroles = AccountRole.hash_by_account_id(ids)
                res.data.each do |c| (!aroles[c[0]].nil?) ? c << aroles[c[0]].collect { |r| {:cls => r.gsub('.', '-') }} : c << [] end
            end
        
            res.success = true                
        end
        respond(res)
    end
    
    ###
    # get_locations
    # combo-box handler
    #
    def get_locations
        res = RPagerResponse.new                
        j = "LEFT OUTER JOIN #{Country.table_name} AS country ON country.id = #{CompanyLocation.table_name}.country_id"
        j += " LEFT OUTER JOIN #{Region.table_name} AS region ON region.id = #{CompanyLocation.table_name}.region_id"
        j += " LEFT OUTER JOIN #{City.table_name} AS city ON city.id = #{CompanyLocation.table_name}.city_id"
        j += " LEFT OUTER JOIN #{Airport.table_name} AS airport ON airport.id = #{CompanyLocation.table_name}.airport_id"
        j += " LEFT OUTER JOIN #{Company.table_name} AS company ON company.id = #{CompanyLocation.table_name}.company_id"
        
        c = "#{CompanyLocation.table_name}.company_id = #{params['company_id']}"        
        c += " AND (UPPER(airport.iso) LIKE '%#{params['query'].upcase}%' OR UPPER(city.name) LIKE '%#{params['query'].upcase}%')" if !params["query"].nil?
        
        s = "#{CompanyLocation.table_name}.id, country.iso AS country_iso, region.iso AS region_iso, city.name AS city_name, airport.iso AS airport_iso, company.primary_location_id, company.billing_location_id"
        res.total = get_pager_total(CompanyLocation, c, j)
                
        res.data = CompanyLocation.find(:all,  
            :select => s,
            :joins => j,
            :conditions => c,
            :order => "(#{CompanyLocation.table_name}.id = company.primary_location_id) DESC",
            :limit => params["limit"],
            :offset => params["start"]
        ).collect {|l|             
            {
                :id => l.id, 
                :country => l.country_iso, 
                :region => l.region_iso, 
                :city => l.city_name, 
                :airport => l.airport_iso, 
                :is_primary => (l.id.to_i == l.primary_location_id.to_i) ? true : false,
                :is_billing => (l.id.to_i == l.billing_location_id.to_i) ? true : false
            }
        }
        
        res.success = true
        respond(res)
    end
    
    ###
    # search_carrier
    # type-ahead handler for carrier ComboBox.  restricts on location and role
    # TODO: needs better handling of case where carrier's offer both "air_commercial" and "air_freight" / "ground"
    # THIS METHOD IS DISABLED -- IT SEARCHES ONLY CARRIERS WHO HAVE LOCATION IN SELECTED AIRPORT_ID
    #
    def search_carrier_by_location
        # if  no origin/destination was provided, just return a list-of-carriers
        if (params["origin_id"].nil? && params["destination_id"].nil?)
            return search_carrier_unrestricted
        end
        
        res = RPagerResponse.new
        
        # try and load teh query from cache.
        if (params["start"].to_i > 0 && get_query_cache("#{params['origin_id']}_#{params['destination_id']}"))
            cache = get_query_cache("#{params['origin_id']}_#{params['destination_id']}")
            query = cache[:query]
            res.total = cache[:total]            
        else        
            domain = Domain.find_by_name('carrier')
            
            # load the shipper
            j = "LEFT OUTER JOIN #{OrderEntity.table_name} AS oe ON oe.company_id = #{Company.table_name}.id"
            j += " LEFT OUTER JOIN #{OrderTypeEntity.table_name} AS ote ON ote.id = oe.order_type_entity_id"        
            c = "oe.order_id = #{params['order_id']} AND ote.name = 'shipper'"
            shipper = Company.find(:first, :select => "#{Company.table_name}.id", :joins => j, :conditions => c)
            
            # prepare the presentation query
            s = "l.company_id AS company_id, c.name AS company_name"
            j = "LEFT OUTER JOIN #{Company.table_name} AS c ON c.id = l.company_id"
            c = "c.domain_id = #{domain.id}"
            c += " AND UPPER(c.name) LIKE '%#{params['query'].upcase}%'" if params["query"].length > 0
            
            # if shipper is not a "known_shipper", shipper cannot use carrier's having role "air_commercial"
            if !shipper.has_role?('client.known_shipper')
                role = Role.find_by_identifier('vendor.carrier.air_commercial')
                j += " LEFT OUTER JOIN #{CompanyRole.table_name} AS cr ON cr.company_id = c.id"
                c += " AND cr.role_id != #{role.id}"
            end
            
            # build query
            query = "SELECT #{s} FROM #{CompanyLocation.table_name} AS l #{j} WHERE #{c} AND l.airport_id = #{params['origin_id']}"
            query += " INTERSECT(SELECT #{s} FROM #{CompanyLocation.table_name} AS l #{j} WHERE #{c} AND l.airport_id = #{params['destination_id']})"
            
            # get total records
            res.total = CompanyLocation.find_by_sql(query).length
            
            # cache the query
            set_query_cache("#{params['origin_id']}_#{params['destination_id']}", query, res.total)
        end
        
        # do the query
        company_ids = []
        res.data = CompanyLocation.find_by_sql(query + " LIMIT #{params['limit']} OFFSET #{params['start']}").collect {|l|
            company_ids << l.company_id
            [l.company_id, l.company_name]
        }
                                                       
        # map roles to css-class
        if (!company_ids.empty?)
            croles = CompanyRole.hash_by_company_id(company_ids)
            res.data.each do |c| (!croles[c[0]].nil?) ? c << croles[c[0]].collect {|r| {:cls => r.gsub('.', '-')} } : c << [] end
        end
        
        # we're done
        res.success = true
        respond(res)

    end
    
    ###
    # search_carrier_unrestricted
    # returns a list of all carriers in system without location/role restrictions
    # @return {RResponse}
    #
    def search_carrier
        
        res = RPagerResponse.new
                                        
        domain = Domain.find_by_name('carrier')
        
        conditions = "#{Company.table_name}.domain_id = #{domain.id}"
        conditions += " AND UPPER(#{Company.table_name}.name) LIKE '%#{params["query"].upcase}%' " if (params["query"].length > 0)
                                                                                             
        select = "#{Company.table_name}.id AS id, #{Company.table_name}.name AS name"
                             
        # query the shit.
        ids = []
        res.total = get_pager_total(Company, conditions)
        res.data  = Company.find(:all,
            :select => select,
            :limit => params["limit"],
            :offset => params["start"],
            :conditions => conditions,            
            :order => "#{Company.table_name}.name"
        ).collect {|c|
            ids << c.id
            [c.id, c.name.capitalize]
        }
        
        ###
        # if there are records found, map their roles as well.  we'll use roles as css-classes in resultset
        #
        if (!ids.empty?)
            croles = CompanyRole.hash_by_company_id(ids)
            res.data.each do |c| (!croles[c[0]].nil?) ? c << croles[c[0]].collect {|r| {:cls => r.gsub('.', '-')} } : c << [] end
        end
        res.success = true

        # render the shit.
        respond(res)
        
    end
            
    ###
    # search_agent_by_location
    # type-adhead handler for pickup/deliver agent ComboBox.    
    #
    def search_agent    
        res = RPagerResponse.new
                                        
        agent_domain = Domain.find_by_name('agent')
        
        conditions = "#{Company.table_name}.domain_id = #{agent_domain.id}"
        conditions += " AND #{Company.table_name}.name ~* '^#{params["query"]}' " if (params["query"].length > 0)
                       
        # DISABLE LOCATION CONSTRAINT WHEN SEARCING AGENTS
        #joins = "LEFT OUTER JOIN #{CompanyLocation.table_name} AS l ON l.company_id = #{Company.table_name}.id"
        joins = ''
        
        # sanity check airport_id
        #if !params["airport_id"].nil?
        #    conditions += " AND l.airport_id = '#{params["airport_id"]}'"
        #end
        
        # carrier_role is set with the radio-button on RoutingForm.  we only do a role-check on agent when 
        # "air-commercial" is selected.
        # (o) Ground ( ) Air-commercial ( ) Air-freight
        #
        if (!params["carrier_id"].nil? && !params["carrier_role"].nil? && params["carrier_role"] == "air_commercial")
            carrier = Company.find_by_id(params["carrier_id"])
            # If this is an Air Commercial shipment, show only TSA Approved agents.
            # this is a bit of a hack -- this functionality should not be hard-coded here
            #
            if (carrier && carrier.has_role?('vendor.carrier.air_commercial') && params["role"] == 'shipper')            
                role = Role.find_by_identifier('vendor.agent.tsa_approved')
                joins = "LEFT JOIN #{CompanyRole.table_name} ON #{CompanyRole.table_name}.company_id = #{Company.table_name}.id"
                conditions += " AND #{CompanyRole.table_name}.role_id = #{role.id}"
            end
        end
                      
        select = "#{Company.table_name}.id AS id, #{Company.table_name}.name AS name"
                             
        # query the shit.
        ids = []
        res.total = get_pager_total(Company, conditions, joins)
        res.data  = Company.find(:all,
            :select => select,
            :limit => params["limit"],
            :offset => params["start"],
            :conditions => conditions,
            :joins => joins,
            :order => "#{Company.table_name}.name"
        ).collect {|c|
            ids << c.id
            [c.id, c.name.capitalize]
        }
        
        ###
        # if there are records found, map their roles as well.  we'll use roles as css-classes in resultset
        #
        if (!ids.empty?)
            croles = CompanyRole.hash_by_company_id(ids)
            res.data.each do |c| (!croles[c[0]].nil?) ? c << croles[c[0]].collect {|r| {:cls => r.gsub('.', '-')} } : c << [] end
        end
        res.success = true

        # render the shit.
        respond(res)

    end
       
    ###
    # insert
    # insert a new company and/or account
    #
    def insert

        res = RResponse.new

        # get the requested domain to place company in
        if params["domain_id"] != nil
            domain = Domain.find_by_id(params["domain_id"])
        elsif params["domain"] != nil
            domain = Domain.find_by_name(params["domain"])
        else
            res.msg = 'ERROR: company/insert -- no domain specified'
            return respond(res)
        end

        # all systems, go...
        form = params["company"]

        # do the insert.  raise exception on failure.
        Company.transaction do
            begin
                                                                                
                form["created_by"] = current_user.account.id
                
                # set domain
                form["domain_id"] = domain.id
                
                # save domain_field values if any found.  domain_values is a serialized column
                if (domain.fields.length && params[domain.name] != nil) 
                    dvalues = {}
                    dform = params[domain.name]
                    domain.fields.each do |f|
                        dvalues[f.id] = dform[f.id.to_s]
                    end     
                    form["domain_values"] = dvalues
                else 
                    form["domain_values"] = {}
                end
                
                # create company
                company = Company.create(params)
                if (!company.id)                    
                    raise RException.new(company.errors)
                end
                                                                                                                                
                res.success = true
                res.msg = 'Inserted company "' + company.name + '"'
                res.data = {
                    :company => company.to_combo_record
                }
                
                

            end
        end

        respond(res)
    end
    
    ##
    # delete
    # delete-handler for companies
    #
    def delete 
        res = RResponse.new
        begin                    
            Company.destroy(params[:id])
            res.msg = "Deleted company"
            res.success = true
        rescue Company::OrderError => e #<-- if this exception is caught, the company is attached to prev. orders.
            c = Company.find(params[:id])
            
            # remove company from its domain and save.  company will no long be able to play in any reindeer games.
            c.domain_id = 0 
            c.save!            
            res.msg = e
            res.success = true
        end
                
        respond(res)
        
        
    end
    
    ###
    # add_account
    # add an account to an existing company
    #
    def add_accounttttttttttttttttttttttttttt

        res = {
            :success => false,
            :msg => '',
            :data => []
        }

        begin
            params["account"][:company_id] = params[:id]
            account = Account.create(params["account"])

            res[:msg] = 'Created new company account'
            res[:data] = {:account => {:id => account.id, :name => account.first.capitalize + ' ' + account.last.capitalize}}
            res[:success] = true
        rescue AccountCreateError => e
            res[:msg] = e.errors[0]
            res[:data][:errors] = e.errors[1]
        end

        render :json => res.to_json, :layout => false
    end
    
    ###
    # validate
    # validate a company form
    #
    def validate
        res = RResponse.new   
        
        form = (params["company"] != nil) ? params["company"] : params["agent"]
                
        exists = Company.exists?(form["name"])
        if (exists === true) 
            res.msg = "A company named '#{form["name"]}' already exists.  please choose another name"
            return respond(res)            
        end
        
        tmp = Company.new(form)
        if (!tmp.valid?) 
            tmp.errors.each_full {|msg|
                res.msg += msg
            }
            return respond(res)            
        end
        
        res.success = true
        respond(res)
    end
    
    ###
    # validate_account
    # validates an account form.  creates a dummy Account object but does not save.
    # used for AccountForm popup, where insert action adds a record to a view.  these accounts will not be inserted
    # until the Company form is submitted.
    #params[]
    def validate_account
        res = RResponse.new   
        params["account"].delete("description")
               
        #exists = Account.exists?(params["account"])
        #if (exists === true)
        #    res.msg = '<p>That account already exists</p>'
        #    return respond(res)
        #end
        
        
        # create a new Account but DO NOT save -- just want to call valid? upon it.
        tmp = Account.new(params["account"])        
        if (params["account"]["password"] == nil)   # <-- create dummy password in order to run validation
            tmp.password = Account.create_password
            tmp.password_confirmation = tmp.password
        end
        tmp.username = tmp.first + tmp.last if tmp.username.nil?
        
        if (!tmp.valid?)
            res = RServerValidationResponse.new
            tmp.errors.each_full {|msg|
                res.msg += '<p>' + msg + '</p>'
                res.errors.push(msg)
            }            
            return respond(res)
        else
            res.msg = 'Account validated, ok, but you still must update the company for the changes to take effect'
        end
        
        # good to go
        res.success = true
        respond(res)
        
    end
    
    ###
    # get_account
    #
    def on_edit_account
        res = RResponse.new
        acct = Account.find_by_id(params[:id])

        res.success = true
        res.data = {
            :account => acct.on_edit
        }

        respond(res)

    end
    
    def on_edit_company
        res = RResponse.new
        
        company = Company.find(params[:id])
        res.data[:company] = company.on_edit
        res.success = true
        respond(res)
        
    end
    
    def update
        res = RResponse.new
                             
        company = Company.update(params[:id], params)
        res.success = true
        res.data[:company] = company.to_h
        res.msg = 'Updated company'            
        
                                                        
        respond(res)
    end
    
    ###
    # update_account
    #
    def update_account
        res = RResponse.new

        begin
            acct = Account.update(params[:id], params)
            res.success = true
            res.data = {
                :account => acct.to_record
            }
            res.msg = 'Updated account'
        
        end

        respond(res)
    end
    
    def add_account
        res = RResponse.new
                
        if (params[:id].nil?)
            res.msg = 'company/add_account error -- no company id specified'
            return respond(res)
        end
              
        if (!company = Company.find_by_id(params[:id]))
            res.msg = 'could not locate that company'
            return respond(res)
        end
        
        Account.transaction do 
            begin
                form = params["account"]
                form["company_id"] = company.id
                
                acct = Account.create(form)
                
                if (acct.id)
                    if (params["roles"] != nil)
                        acct.create_roles(params["roles"], params["role_field"])
                    end
                    
                    res.success = true
                    res.data = {:account => acct.to_combo_record}
                    res.msg = 'Created account'
                    
                    # send notification email.  set acct.password back to plain-text version for emailing.
                    #acct.password  = form["password"]
                    #Notification.deliver_registration(acct)
                else
                    err = self.process_error(acct.errors)
                    res.msg = err[:msg]
                    res.data = {:fields => err[:fields]}
                end
            rescue StandardError => e
                res.msg = e
                respond(res)
            else
                respond(res)
            end
        end
    end
    
    ###
    # insert_account
    #
    def insert_account
          
        res = RResponse.new
        if (params[:id] == nil) 
            res.msg = 'Error, no key, params[:id], was set'
        else
            Account.transaction do 
                begin
                    params["account"]["company_id"] = params[:id]
                    acct = Account.create(params["account"])
                    
                    if (acct.id)
                        if (params["roles"] != nil)
                            acct.create_roles(params["roles"], params["role_field"])
                        end
                        
                        res.success = true
                        res.data[:account] = acct.to_record
                        res.msg = 'Created account'
                        
                        # send notification email.  set acct.password back to plain-text version for emailing.
                        #acct.password  = params["account"]["password"]
                        #Notification.deliver_registration(acct)
                    else
                        err = self.process_error(acct.errors)
                        res.msg = err[:msg]
                        res.data[:fields] = err[:fields]
                    end
                rescue StandardError => e
                    res.msg = e
                end
            end
        end
        respond(res)
    end    
    
    ###
    # insert_location
    #
    def insert_location
        res = RResponse.new
        params["location"]["company_id"] = params[:id]
        if (location = CompanyLocation.create(params["location"]))            
            if !params["is_primary"].nil?
                location.company.head_office = location 
                location.company.save!
                res[:is_primary] = true
            else
                res.data[:is_primary] = false
            end
            res.data[:location] = location.reload(:include => [:country, :region, :city, :airport, :company]).to_record
            res.success = true
        end
        respond(res)
    end
    
    ###
    # edit_location
    # user wishes to edit a location.  return a successful RResponse will cause the form to appear on client
    #
    def edit_location
        res = RResponse.new
        res.data[:location] = CompanyLocation.edit(params[:id])
        res.success = true
        res.msg = 'edit_location'
        respond(res)
    end
    
    ###
    # set_primary_location
    # sets the company's primary location
    #
    def set_primary_location
        res = RResponse.new                  
        if location = CompanyLocation.set_head_office(params[:id])    
            res.success = true 
            res.msg = "Set head-office to '#{location.airport.iso}'"
        end
        respond(res)
    end
    
    ###
    # set_billing_location
    # sets the company's billing location
    #
    def set_billing_location
        res = RResponse.new                  
        if location = CompanyLocation.set_billing_location(params[:id])    
            res.success = true 
            res.msg = "Set Billing-address to '#{location.airport.iso}'"
        end
        respond(res)
    end
    
    ###
    # update_location
    #
    def update_location
        res = RResponse.new
        location = CompanyLocation.update(params[:id], params["location"])          
        if (!params["is_primary"].nil? && params["is_primary"] == 'on' && location.company.primary_location_id != location.id)            
            location.company.update_attribute(:primary_location_id, location.id)                             
        end                      
        res.success = true
        
        # reload here in order to grab all changes with one JOIN query. 
        res.data[:location] = CompanyLocation.find(params[:id], :include => [:company, :country, :region, :city, :airport]).to_h
        res.msg = 'Updated location'
        respond(res)
    end
    
    ###
    # delete_location
    #
    def delete_location
        res = RResponse.new     
        if (location = CompanyLocation.destroy(params[:id]))
            res.success = true
            res.msg = 'Deleted location'
            res.data[:primary_location_id] = location.company.head_office.id
        end
        respond(res)
    end
    
end
