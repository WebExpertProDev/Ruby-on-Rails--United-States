###
# OrderController
# @author Chris Scott
# FIXME: 
# TODO:
#


class OrderController < ApplicationController
    
    register_js('app/company/CompanyManager')
    register_js('resistor-ext2/source/application/template/DocumentMgr')
    register_css('company/company')
        
    ###
    # index
    #
    def index
        if (params[:id])
            #@order = Order.find(params[:id])
            #return render :xml => @order.to_xml, :layout => false
        end
        
        respond_to do |format|
            format.html # index.html.erb
            format.xml  { 
                @orders = Order.find(:all)                
                render :xml => @orders.to_xml 
            }
            format.rss  { 
                @orders = Order.find(:all)
                render :layout => false } # uses index.rss.builder
        end
                
    end
    
    ###
    # view
    # load-tab method
    #
    def view                                      
        begin                      
            @order = Order.find(params[:id], :include => [:bill_to, :status, :commodity])
        rescue ActiveRecord::RecordNotFound => e
            @order = Order.find_by_bill_number(params[:id], :include => [:bill_to, :status, :commodity], :conditions => "#{Order.table_name}.order_type_id = #{OrderType.find_by_name('hwb').id}")            
            if @order.nil?
                raise e
            end
        end
        
        @shipper
        @consignee = nil
        @bill_to = @order.get_bill_to

        entities = @order.entities
        entities.each do |e|
            case e.type.name
                when "shipper"
                    @shipper = e
                when "consignee"
                    @consignee = e
            end
        end
       
        # might make @bill_to??????????

        @id = @order.id
        
        ###
        # experimental file-cacheing
        #filename = "tmp/cache/order_" + params[:id] + '.html'
        #output = ''
        #if (!FileTest.exist?(filename))            
        #    output = render_to_string(:layout => false)
        #    f = File.new(filename, File::CREAT|File::RDWR, 0644)
        #    f << output
        #    f.close  
        #else            
        #    output = IO::read(filename)
        #end                                                      
        #render :text => output, :layout => false     
        render :layout => false   
        
        
    end
           
    ###
    # finalize
    # changes an order's status "order_status".  status might be "cancelled" or "delivered"
    # 
    def finalize
        res = RResponse.new
        begin
            order = Order.finalize(params[:id])
            Invoice.create(
                :order => order,
                :created_by => self.current_user.account
            )                                                                
            res.msg = 'Order ' + order.bill_number.to_s + ' ' + order.order_status.name
            res.success = true
        rescue Order::FinalizeError => e
            raise e    
        end
        respond(res)
        
        
    end            

    ###
    # list
    # tree-loader method
    #
    def list_by_account                             
        
        res = Order.get_tree_nodes(self.get_tree_request(:company_tree))
        if (params["node"] == 'source')
            res.push({
                :id => 'created_by',
                :nid => 'created_by:' + self.current_user.account.id.to_s,
                :text => 'My Orders'
            })
            res.push({
                :id => 'quotes',
                :nid => 'is_quote:true',
                :text => "Quotes"
            })
        end
        render :json => res.to_json, :layout => false                
    end
    
    ###
    # filter
    # query orders with a variety of filters.  this method is used with a paging datagrid.  it has 2 modes:
    # 1.  The initial form POST
    #   With the initial form-post, we'll see the form-fields from the search-form present, including params["filter"].
    #   The initial POST does *NOT* return any records -- it returns only the record-count -- res.data[:total].  The JsonReader on
    #   client is configured accordingly.
    #
    # 2.  View-paging.
    #   A page-request will *not* have params["filter"].  params["limit"] and params["offset"] will be present here.  we'll send
    #   these params into Order.query.
    #    
    def filter
        res = RResponse.new
                
        # if no filter params exists, then we're in presentation mode of an existing query (and possibly paging).  in this case
        # the set of order ids must exist in session[:order_filter]
        if (params["filter"].nil?)
            raise RException.new("order/query call with neither a filter nor a resultset in session") if session[:order_filter].nil?            
            res.data[:rs] = Order.filter(session[:order_filter], params["limit"], params["start"]) 
            res.data[:total] = session[:order_filter].length            
            res.success = true            
        
        # filter params were found -- this means we're building a new query
        else
            # build a criteria hash.
            c = {}
            params["filter"].each_pair do |k,v|
                if (v == 'on')
                    filter = {}                                        
                    params[k].each_pair do |name, value|
                        filter[name.to_sym] = value
                    end                    
                    filter[:location] = params["location"] if (k == 'airport')                    
                    filter[:role] = params["role"] if (k == 'company')                    
                    c[k.to_sym] = filter               
                end
            end  
            LOG.info('filter: ' + c.to_yaml)
            res.data[:total] = 0        
            if (rs = Order.prepare_filter(c))
                session[:order_filter] = rs                                                                
                res.data[:total] = rs.length
                res.msg = "Found #{rs.length} orders"                   
            else 
                res.msg = "No orders found with that criteria"
            end 
            res.success = true
        end   
                
        respond(res)
        
    end
    
    ###
    # list_by_account
    # show current_user's orders
    #
    def list        
        req = self.get_tree_request(:company_tree)
        req[:created_by] = current_user.account.id
                
        if (params["node"] == 'source')
            res = []
            res.push({
                :id => 'company',
                :nid => 'company',
                :text => "Company Orders"
            })
            res.push({
                :id => 'created_by',
                :nid => 'created_by:' + self.current_user.account.id.to_s,
                :text => 'My Orders'
            })
            res.push({
                :id => 'quotes',
                :nid => 'is_quote:true',
                :text => "Quotes"
            })
            res.push({
                :id => 'today_pickup',
                :nid => 'today_pickup',
                :text => "Today's Pickups"
            })
            res.push({
                :id => 'today_delivery',
                :nid => 'today_delivery',
                :text => "Today's Deliveries"
            })
        else
            res = Order.get_tree_nodes(req)
        end
        render :json => res.to_json, :layout => false                
    end
              
    ###
    # preview_doc
    # preview an order document before sending
    #       
    def preview_doc
        @tpl = Template.find(params["template_id"])                   
        output = @tpl.render_by_model_id(params[:id], 'print', 'www.freightoperations.com:8080')
        render(:text => output, :layout => false)    
    end
    
    ###
    # send_doc
    # transmit a document to recipients via email and/or fax
    #
    def send_doc
        tpl = Template.find(params["template_id"])
        tpl.load(params[:id])
        
        Notification.deliver_order_email(self, tpl)
        Notification.deliver_order_fax(self, tpl)
        
        log = OrderLog.create({
            :order_id => params[:id],
            :subject => 'notification',
            :msg => 'Sent order-document "' + tpl.label + '"',
            :account_id => self.current_user.account.id,
            :order_log_type_id => OrderLogType.find_by_name('notification').id            
        })
        
        res = RResponse.new
        res.add_action(RAction.new({
            :component_id => 'order-log-' + params[:id],
            :success => true,
            :data => {:log => log.to_a}
        }))
        res.success = true
        res.msg = 'Transmitted document "' + tpl.label + '"'
        respond(res)
    end
    
    ###
    # insert
    # insert a new HWB form
    #
    def insert_hwb
        type = OrderType.find_by_name("hwb")
                
        res = RResponse.new

        Order.transaction do
            begin
                data = params["order"]

                # hack created by for now
                data["created_by"] = current_user.account
                data["order_type_id"] = type.id
                
                                
                data["bill_number"] = (params["is_quote"] == 'false') ? type.generate_bill_number(self.get_config_param(:hwb_offset)) : nil
                                
                data["dim_factor"] = 194
                
                if (params["multiple_pickup"] != nil && params["multiple_pickup"] == "on") 
                    data["pickup_locations"] = JSON::parse(params["locations"])
                end
                
                # read bill_to bill_third_party checkbox:  if on, bill third-party. otherwise, bill shipper.
                if (params["bill_third_party"].nil? || params["bill_third_party"] != 'on')
                    data["bill_to_id"] = params["shipper"]["company_id"]
                end
                
                ##############################################################################################
                # HACK order[billing_method_id] -- might need this in order since it's defined company-wide
                ##############################################################################################
                data["billing_method_id"] = 1
                ##############################################################################################
                
                # super can handle it from here...
                order = Order.create(data)

                # get OrderTypeEntity list
                entities = order.type.entities(:include => [:domain])
                entities.each do |e|
                    if (e.name != 'consignee' || (e.name == 'consignee' && params["has_consignee"] != nil && params["has_consignee"] == 'on') )
                        data = params[e.name]
                        data[:order_id] = order.id
                        data[:order_type_entity_id] = e.id
                        oe = OrderEntity.create(data)
                    end
                end
                
                # apply markup & fuel_surcharge from order's bill_to to the order.
                types = SystemRevenuType.find(:all)
                revenus = SystemRevenu.find(:all)
                revenus.each do |sr|
                                        
                    field = order.bill_to.domain.fields.find_by_name(sr.name)                    
                    raise RException.new("Create HWB -- Could not locate company's revenu-field '#{sr.name}'") if field.nil?
                    
                    # first get default value    
                    value = field.config[:value] 
                                                            
                    # if the bill_to company has this Revenu field explicitly defined, apply that instead.
                    if (!order.bill_to.domain_values.nil? && !order.bill_to.domain_values[field.id].nil?)
                        value = order.bill_to.domain_values[field.id]                         
                    end  
                    
                    # apply insurance only if declared_value was defined
                    if (sr.name != 'insurance' || !order.declared_value.nil?)
                        # apply multiplier type to insurance only -- all other revenus (markup, fuel-surcharge) get percentage
                        type = (sr.name != 'insurance') ? types.find { |t| (t.name == 'percentage') ? true : false} : types.find { |t| (t.name == 'multiplier') ? true : false}    
                        OrderRevenu.create(
                            :order_id => order.id,
                            :system_revenu_id => sr.id,
                            :system_revenu_type_id => type.id,
                            :value => value,
                            :config => field.config #<-- this column contains Ext.form.Field config
                        )                                               
                    end                                                                                     
                end
                # log order-creation
                OrderLog.create(
                    :order_id => order.id,
                    :account_id => current_user.account.id,
                    :order_log_type_id => OrderLogType.find_by_name('status').id,
                    :subject => 'Order created',
                    :msg => 'New ' + type.name
                )
                res.data[:order] = {
                    :id => order.id,
                    :bill_number => order.bill_number
                }
                res.success = true
                res.msg = 'Created order #' + order.bill_number.to_s
            end            
        end

        respond(res)
    end

    ###
    # convert_quote
    # converts a quote to a HAWB
    #
    def convert_quote        
        type = OrderType.find_by_name('hwb')
        order = Order.find(params[:id])
        begin
            order.bill_number = type.generate_bill_number(self.get_config_param(:hwb_offset))
            order.save
            res = RResponse.new
            res.success = true
            res.msg = 'Converted quote #' + params[:id].to_s + ' to HAWB #' + order.bill_number.to_s
            respond(res)
        end
    end

    ####
    # change_status
    # for order_status ComboBox
    # changes the order status
    #
    def change_status

        res = RResponse.new

        order = Order.find_by_id(params[:id])
        order.shipping_status_id = params["shipping_status_id"]
        begin
            order.save
            res.success = true
            res.msg = 'Changed order status to "' + order.status.name + '"'

            # log this
            type = OrderLogType.find_by_name('status')
            log = OrderLog.create(:account_id => current_user.account.id, :order_log_type_id => type.id, :order_id => order.id, :subject => 'Order Status', :msg => res.msg)
            res.add_action(RAction.new({
                :component_id => 'order-log-' + params[:id],
                :success => true,
                :data => {:log => log.to_a}
            }))             
        end

        respond(res)

    end

    ###
    # get_expense_companies
    # for combo box.  returns a list of all possible companies who
    # can incur expenses for an order
    #
    def get_expense_companies
        res = {
            :total => nil,
            :success => true,
            :data => []
        }
        entities = OrderEntity.find_all_by_order_id(params[:id], :include => [:company])
        entities.each do |e|
            res[:data].push([e.id, e.company.name])
        end

        render :json => res.to_json, :layout => false

    end

    ###
    # add_expense
    # creates a new order_expense
    #
    def add_expense
        res = RResponse.new
        begin
            cost = OrderEntityCost.create(params["cost"])
            res.data = cost.to_h
            res.success = true
            res.msg = 'Added new order cost'
        rescue StandardError => e
            res.msg = 'Error: ' + e
        end
        respond(res)
    end

    def update_expense

        res = {
            :success => false,
            :msg => '',
            :data => [],
            :id => params[:id]
        }
        cost = OrderEntityCost.find_by_id(params[:id], :include => [:entity])

        case params["name"]
            when "company"
                company = Company.find_by_name(params["value"])
                order = cost.entity.order
                order.entities.each do |e|
                    if (e.company_id == company.id)
                        cost.entity = e;
                        cost.save
                        res[:success] = true
                    end
                end
            when "type"
                begin
                    type = ShippingCost.find_by_name(params["value"])
                    cost.shipping_cost_id = type.id
                    cost.save
                    res[:success] = true
                rescue StandardError => e
                    res[:msg] = 'Error: ' + e
                end
            else
                if (cost.respond_to?(params["name"]))
                    begin
                        cost[params["name"]] = params["value"]
                        cost.save
                        res[:success] = true
                    rescue StandardError => e
                        res[:msg] = 'Error: ' + e
                    end
                else
                    res[:msg] = 'Error: unknown cost field "' + params["name"]
                end

        end
        res[:msg] = "Updated #{params["name"]}"
        render :json => res.to_json, :layout => false

    end

    ###
    # update_costs
    #
    def update_costs
        res = RResponse.new
        
        modified = JSON.parse(params["modified"])                  
        
        begin
            Order.update_costs(modified)
        end
                                
        res.success = true
        res.msg = "Updated order-costs"
        respond(res)                
    end
    
    ###
    # delete_cost
    #
    def delete_cost
        OrderEntityCost.destroy(params[:id])    
        res = RResponse.new
        res.success = true
        res.msg = 'Deleted cost'
        respond(res)
    end
    
    ###
    # update_dims
    #
    def update_dims
        res = RResponse.new
        res.msg = 'order/update_dims'
        
        if (params["modified"].nil? || params["deleted"].nil?)
            res.msg = 'Error order/update_dims missing params'
            return respond(res)
        end
        
        order = Order.find(params[:id])
        
        modified = JSON::parse(params["modified"])
        deleted = JSON::parse(params["deleted"])
        
        Order.transaction do 
            begin 
                # perform on modifed records.
                modified.each do |rec|
                    id = rec["id"].to_i
                    if (!rec["id"].nil? && id > 0)
                        OrderItem.update(id, rec["data"])
                    else
                        rec["data"]["order_id"] = params[:id]
                        item = OrderItem.create(rec["data"])
                    end
                end
                
                # now delete any requested records
                # seems to be a bug with Rails 2.0 here -- can't call destroy(Array), have to destroy each id separate
                #
                if (!deleted.empty?)
                    deleted.each do |id| OrderItem.destroy(id) end                    
                end
                
                # now check to see if shipment was modified
                shipment = params["shipment"]
                if (shipment["weight"].to_i != order.weight) # <-- if shipment weight was modified, log it.
                    type = OrderLogType.find_by_name("re-weigh")                
                    log = OrderLog.create(
                        :order_id => order.id,
                        :account_id => current_user.account.id,
                        :order_log_type_id => type.id,
                        :subject => type.name,
                        :msg => "#{type.name} order.  Previous: #{order.weight}, Current: #{shipment["weight"]}"
                    )                                  
                    res.add_action(RAction.new({
                        :component_id => 'order-log-' + params[:id],
                        :success => true,
                        :data => {:log => log.to_a}
                    }))        
                end                
                                                
                if (shipment["declared_value"].to_f > 0 && shipment["declared_value"].to_f != order.declared_value)
                    sr = SystemRevenu.find_by_name('insurance')
                    if (!order.revenus.find_by_system_revenu_id(sr.id))
                        type = SystemRevenuType.find_by_name('multiplier')                    
                        field = order.bill_to.domain.fields.find_by_name(sr.name)
                        OrderRevenu.create(
                            :order_id => order.id,
                            :system_revenu_id => sr.id,
                            :system_revenu_type_id => type.id,
                            :value => order.bill_to.domain_values[field.id],
                            :config => field.config #<-- this column contains Ext.form.Field config
                        )   
                    end
                end
                order.update_attributes(shipment)
                
                
                
            rescue StandardError => e
                res.msg = e
            else 
                res.success = true
                
                # send back the list of items to avoid confusion on client with records in store that don't have ids
                res.data = {
                    :items => OrderItem.find_all_by_order_id(params[:id]).collect {|i| i.to_a}
                }
                res.msg = 'Updated order dims'
            end
        end
        respond(res)   
        
    end
    
    ###
    # add_route
    # adds a new order-route to this order
    #
    def add_route
        type = OrderType.find_by_name('route')
        
        hwb = Order.find(params[:id])
        
        data = params["route"]
        data["parent_id"] = params[:id]
        
        data["created_by"] = self.current_user.account          # <-- hardcoded to Transmance compnay id
        data["order_type_id"] = type.id
        data["bill_to_id"] = 1          # <-- hacked to Transmanage company id
        data["billing_method_id"] = 1   # <-- read this from db!!!!!!!!!!!!!!
        data["shipping_method_id"] = 1  # <-- hardcoded.
        data["pieces"] = 1
        data["declared_value"] = 0
        data["purpose"] = ''
        data["weight"] = 0
        data["shipping_commodity_id"] = 1

        res = {
            :success    => false,
            :data       => [],
            :msg        => ''
        }

        Order.transaction do            
            # super can handle it from here...
            order = Order.create(data)
            
            # get OrderTypeEntity list
            entities = order.type.entities(:include => [:domain])
                                                                               
            case params["pickup_mode"]
                when "shipper"                                                     
                    params["shipper"] = {"company_id" => Order.find(params[:id]).find_entity_by_type("shipper").company.id}
                when "carrier"
                    params["shipper"] = {"company_id" => params["carrier"]["company_id"]}                                        
            end
            
            case params["delivery_mode"]
                when "carrier"
                    params["consignee"] = {"company_id" => params["carrier"]["company_id"]}
            end
            entities.each do |e|                      
                data = params[e.name]                    
                case e.name
                    when "shipper"
                        location = CompanyLocation.find(:first,                                
                            :conditions => "airport_id = #{params['origin_airport_id']} AND company_id = #{params['shipper']['company_id']}"
                        ) || Company.create_anonymous_location(params["shipper"]["company_id"], hwb.find_entity_by_type('shipper').location)
                        data[:company_location_id] = location.id
                        data[:date_in] = params["carrier"]["date_in"] + ' ' + params["carrier"]["time_in"]
                    when "consignee"
                        location = CompanyLocation.find(:first,                                
                            :conditions => "airport_id = #{params['destination_airport_id']} AND company_id = #{params['consignee']['company_id']}"
                        ) || Company.create_anonymous_location(params["consignee"]["company_id"], hwb.find_entity_by_type('consignee').location)                        
                        data[:company_location_id] = location.id
                        data[:date_in] = params["carrier"]["date_out"] + ' ' + params["carrier"]["time_out"]
                    when "carrier"  
                        data[:company_location_id] = Company.find(params["carrier"]["company_id"], :include => [:head_office]).head_office.id                            
                end
                data[:order_id] = order.id
                data[:order_type_entity_id] = e.id                                       
                oe = OrderEntity.create(data)
            end
                   
            res[:success] = true
            res[:data] = {:route => Order.render_route(order)}
            res[:msg] = 'Added order route'        
        end

        render :json => res.to_json, :layout => false

    end
    
    def delete_route
        res = RResponse.new
        
        begin
            route = Order.find(params[:id])
            route.destroy()
            res.success = true
            res.msg = 'delete_route'
            respond(res)
        end
        
    end
    
    ###
    # update_route
    #
    def update_route
        res = RResponse.new
                
        if (params[:id].nil?)
            res.msg = 'order/update_route -- no :id specified'
            return respond(res)
        end
        
        if (!route = Order.find_by_id(params[:id]))
            res.msg = 'order/update_route -- could not load order ' + params[:id]
            respond(res)
        end
        
        depart_date = params["carrier"]["date_in"] + ' ' + params["carrier"]["time_in"]
        arrival_date = params["carrier"]["date_out"] + ' ' + params["carrier"]["time_out"]
        
        # check teh radio buttons "pickup_mode" / "delivery_mode"
        case params["pickup_mode"]
            when "shipper"                   
                params["shipper"] = {"company_id" => route.parent.find_entity_by_type("shipper").company.id}
            when "carrier"
                params["shipper"] = {"company_id" => params["carrier"]["company_id"]}                                        
        end        
        case params["delivery_mode"]
            when "carrier"
                params["consignee"] = {"company_id" => params["carrier"]["company_id"]}
        end
                
        Order.transaction do 
            begin                                   
                route.update_attributes(params["route"])                
                route.entities.each do |e|
                    form = params[e.type.name]                                                           
                    case e.type.name
                        when "shipper"
                            form[:date_in] = depart_date
                            form[:company_location_id] = CompanyLocation.find(:first,                                
                                :conditions => "airport_id = #{params['origin_airport_id']} AND company_id = #{params['shipper']['company_id']}"
                            ).id
                        when "consignee"
                            form[:date_in] = arrival_date
                            form[:company_location_id] = CompanyLocation.find(:first,                                
                                :conditions => "airport_id = #{params['destination_airport_id']} AND company_id = #{params['consignee']['company_id']}"
                            ).id
                        when "carrier"    
                            form[:company_location_id] = Company.find(params["carrier"]["company_id"], :include => [:head_office]).head_office.id
                    end                       
                    e.update_attributes(form)
                    e.reload # <-- this reload is very important
                end
            rescue StandardError => exc
                res.msg = exc 
                log_exception(exc)                
            else
                res.msg = 'Updated order route'
                res.data = {:route => Order.render_route(route)}
                res.success = true    
            end
        end
        
        respond(res)        
    end
    
    ###
    # insert_local_route
    #
    def insert_local_route
        res = RResponse.new
        
        order = Order.find(params[:id])
        shipper = order.find_entity_by_type('shipper')
        consignee = order.find_entity_by_type('consignee')
        Order.transaction do 
            form = {
                :created_by => self.current_user.account,
                :order_type_id => OrderType.find_by_name('local').id,
                :parent => order,
                :shipping_method => ShippingMethod.find_by_name("Local"),
                :pieces => order.pieces,
                :commodity => order.commodity
            }
            route = Order.create(form)            
            if (!route.id.nil?)            
                route.type.entities.each do |et|
                    company = Company.find_by_id(params[et.name]["company_id"])
                    location = company.locations.find_by_airport_id(shipper.location.airport.id) || Company.create_anonymous_location(company.id, shipper.location)
                    form = {
                        :company => company,
                        :location => location,
                        :order_type_entity_id => et.id,
                        :order_id => route.id,
                        :date_in => shipper.date_out,
                        :date_out => consignee.date_in                       
                    }
                    OrderEntity.create(form)       
                end                
                res.data[:route] = Order.render_route(route, order)                
            end            
        end
                        
        res.msg = 'insert_Local_route'
         
        res.success = true
        respond(res)
    end
    
    
    ###
    # update_billing
    #
    def update_billing
        res = RResponse.new
        order = Order.find(params[:id])           
        order.update_attributes!(params["order"])
        if (params["bill_third_party"].nil?)
            order.bill_to = order.find_entity_by_type('shipper').company
            order.save!
        end
        res.data[:bill_to] = order.get_bill_to
        res.data[:shipping_method] = order.shipping_method.to_h
        res.success = true
        res.msg = 'Updated order-billing information'
        respond(res)
    end
    ###
    # add_entity
    # updates an order entity.  designed for case where an order is created without a consignee.
    #
    def add_entity
        res = {
            :success => false,
            :msg => '',
            :data => {}
        }
        if (params[:id].nil?)
            res[:msg] = 'order/update_entity was called without an :id'
            return render(:json => res.to_json, :layout => false)
        end
        
        order = Order.find_by_id(params[:id])
        entities = order.type.entities
        entities.each do |e|
            if (e.name == params["entity"])
                data = params[e.name]
                data[:order_id] = params[:id]
                data[:order_type_entity_id] = e.id
                oe = OrderEntity.create(data)
                
                res[:success] = true
                res[:data][:entity] = oe.to_h
                res[:msg] = "Added #{oe.type.name.capitalize}"   
            end
        end                    
        render :json => res.to_json, :layout => false        
    end
    
    def update_entity
        res = RResponse.new
        res.msg = 'update_entity'
        
        if (params[:id].nil?)
            res.msg = 'Error: update_entity called without an :id'
            return respond(res)            
        end
        
        if (! e = OrderEntity.find(params[:id]))
            res.msg = 'Could not load order entity'
            return respond(res)
        end
        
        if (params[e.type.name].nil?)
            res.msg = 'Could not find entity form "' + e.type.name + '"'
            return respond(res)
        end
        
        # shields up...
        begin 
            #form = OrderEntity.prepare_attributes(params[e.type.name])
            e.update_attributes(params[e.type.name])
            
            e.save!
        rescue StandardError => e
            res.msg = e        
            log_exception(e)
            respond(res)
        else
            res.success = true
            res.data = {:entity => e.to_h}
            res.msg = 'Updated ' + e.type.name
            respond(res)
        end
        
    end
    
    ###
    # update_agent
    # user clicks [update] buttons on pickup/delivery form
    #
    def update_agent
        res = {
            :success => true,
            :msg => 'order/update_agent'
        }
        render :json => res.to_json, :layout => false
    end

    def insert_log
        res = {
            :success => false,
            :msg => '',
            :data => {:log => nil}
        }
        if (params["log"] != nil)
            begin
                type = OrderLogType.find_by_name('comment')
                form = params["log"]
                form[:order_id] = params[:id]
                form[:order_log_type_id] = type.id
                form[:account_id] = current_user.account.id
                log = OrderLog.create(form)
                res[:success] = true
                res[:msg] = 'Inserted new log entry'
                res[:data][:log] = log.to_a
            rescue StandardError => e
                res[:msg] = e
            end
        end
        render :json => res.to_json, :layout => false

    end
    
    def notify_entity 
        res = RResponse.new
                
        entity = OrderEntity.find_by_id(params[:id])
        
        Notification.deliver_route_entity_email(entity)
        res.success = true
        res.msg = 'Sent agent-notification email and fax'  
        type = OrderLogType.find_by_name('notification')
        OrderLog.create(:account_id => self.current_user.account.id, :order_log_type_id => type.id, :order_id => entity.order.parent.id, :subject => 'Order Notification', :msg => 'Sent order notification to ' + entity.type.name)   
        
        action = RAction.new(
            :success => true,
            :component_id => 'order_log',
            :type => 'SUBMIT',
            :msg => '',
            :data => {
                :log => {
                    :subject => 'Notification',
                    :msg => 'Notified order entity'
                }
            }
        )
        res.add_action(action)
        respond(res)
    end
    
    ###
    # notify_route
    #
    def notify_route
        res = RResponse.new
        res.msg = 'Sent agent notification email and fax'
        
        order = Order.find_by_id(params[:id])
        carrier = order.find_entity_by_type('carrier')
        shipper = order.find_entity_by_type("shipper")
        consignee = order.find_entity_by_type('consignee')
        
        type = OrderLogType.find_by_name('notification')
        OrderLog.create(
            :account_id => self.current_user.account.id, 
            :order_log_type_id => type.id, 
            :order_id => order.id, 
            :subject => 'Order Notification', 
            :msg => 'order/notify_route -- NOT IMPLEMENTED'
        )        
        res.success = true        
        respond(res)        
                
    end
    
    ###
    # pod
    #
    def pod 
        res = RResponse.new
        order = Order.find(params[:id])
        form = params["pod"]
        form["pod_updated_at"] = Time.new
        form["pod_date"] = params["date"] + ' ' + params["time"]
        order.attributes = form   
        
        begin
            order.save!
            res.success = true
            res.data[:pod] = order.get_pod
            res.msg = 'Set order proof-of-delivery'
            res.add_action(RAction.new({
                :component_id => 'pod_' + order.id.to_s,
                :data => order.get_pod,
                :verb => 'update'
            }))
            
            type = OrderLogType.find_by_name('pod')
            OrderLog.create(
                :account_id => self.current_user.account.id, 
                :order_log_type_id => type.id, 
                :order_id => order.id, 
                :subject => type.label,
                :msg => "Delivery confirmed by #{form['pod_name']} at #{form['pod_date']}"
            )    
        
        end
        respond(res)
        
    end
    
    ###
    # here be protected methods
    #
    protected
    
    ###
    # save_tree_node
    # saves currently clicked tree-node into session.  there are 2 trees, so 2 keys -- :account & :company
    # :company => {:year => INTEGER, :month => INTEGER, :day => INTEGER},
    # :account => {:year => INTEGER, :month => INTEGER, :day => INTEGER},
    # @param {Symbol} key    
    #
    def get_tree_request(key)
        if (session[key].nil?)
            session[key] = {:year => nil, :month => nil, :day => nil}
        end
        
                 
        if (params["node"] != 'source')
            path = params["path"].split('/')
            path.shift
            node = path[path.length-1].split(':')
                        
            req = {
                :object => node.shift
            }
            
            path.each do |n|
                if (n != 'root')
                    node = n.split(':')
                    req[node.shift.downcase.to_sym] = node.pop
                end
            end
                                                                        
        else
            req = {:object => params["node"]}                        
        end                               
        LOG.info('req: ' + req.to_json)
        
        req
    end
end






