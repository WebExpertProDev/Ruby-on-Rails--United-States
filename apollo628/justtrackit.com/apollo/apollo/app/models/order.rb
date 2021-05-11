class Order < ActiveRecord::Base
    ##
    # pickup date, delivery date, carrier depart/arrival time.
    #
    
    class LiquidDropClass < Liquid::Drop
        
        def before_method(name)            
            case name
                when "total_length"
                    l = 0
                    @object.items.each do |i|
                        l += i.length
                    end
                    return l
                when "total_width"
                    w = 0
                    @object.items.each do |i|
                        w += i.width    
                    end
                    return w
                when "total_height"
                    h = 0
                    @object.items.each do |i|
                        h += i.height    
                    end
                    return h
                else
                    return nil
            end
        end
                
        ###
        # pickup_agent
        # returns the shipper for 1st route (children[0])
        # @return {OrderEntity} 
        #
        def pickup_agent
            route = @object.children.first           
            route.entities.find(:all).find {|e|
                return e if ( (route.type.name == 'local' && e.type.name == 'carrier') || e.type.name == 'shipper')
            }
            
        end
        
        ###
        # delivery_agent
        # returns the consignee for last route
        # @return {OrderEntity}
        #
        def delivery_agent
            route = @object.children.last
            route.entities.find(:all).find { |e|
                return e if ( (route.type.name == 'local' && e.type.name == 'carrier') || e.type.name == 'consignee')                
            }
        end
        
        ###
        # consignee
        # @return {OrderEntity || false}
        #
        def consignee
            @object.entities.each do |e|
                return e if e.type.name == 'consignee'    
            end
            return false
        end
        
        ###
        # consignee
        # @return {OrderEntity || false}
        #
        def shipper
            @object.entities.each do |e|
                return e if e.type.name == 'shipper'    
            end
            return false
        end
        
        ###
        # carrier
        # @return {OrderEntity || false
        #
        def carrier                    
            @object.entities.each do |e|
                return e if e.type.name == 'carrier'    
            end
            return false
        end
        
        ###
        # dim_weight
        # @return {Integer} 
        #
        def dim_weight
            volume = 0.0
            @object.items.each do |i|
                volume += i.pieces * i.length * i.width * i.height    
            end
            (volume / @object.dim_factor).ceil
        end
                        
        ###
        # chargeable_weight
        #
        def chargeable_weight
            dweight = self.dim_weight        
            return (@object.weight < dweight) ? dweight : @object.weight     
        end
        
        def volume             
            @volume
        end
        
        ###
        # costs
        # compiles a list of all order_entity_costs spread throughout all routes/entities
        #
        def costs
            list = []                        
            @object.children.each do |route|
                route.entities.each do |e|
                    e.costs.each do |c|
                        list.push(c)
                    end
                end
            end
            list              
        end
        
        ###
        # total_entity_cost
        # returns the sum of all OrderEntityCost
        # @return {Number}
        #
        def total_entity_cost
            total = Money.new(0)                  
            @object.children.each do |route|
                route.entities.each do |e|
                    e.costs.each do |c|
                        total += c.cost
                    end
                end
            end
            total.to_s       
        end
    end
    
    set_table_name "orders"
    
    serialize :pickup_locations
    
    ###
    # orders can contain children
    #
    acts_as_tree
    
    ###
    # children
    # override standard children method provided by acts_as_tree because we need to do complex child-ordering based upon the 
    # carrier's "date_in" field, the date the carrier ships the shipment.
    #
    alias_method :_children, :children
    def children(*options)
        list = []
        
        #call original acts_as_tree "children" method.  result is *un-ordered* by time.
        kids = _children(:include => [:type])
        
        # iterate the resultset and seek for the carrier.  carrier.date_in is the date we want to order_by
        kids.each do |c|
            c.entities.each do |e|
                if (e.type.name == 'carrier')
                    list.push(:date => e.date_in, :order => c)    
                end
            end
        end        
        list.sort_by { |i| i[:date]}.collect {|o| o[:order] }                        
    end
    
    belongs_to :type, :class_name => "OrderType", :foreign_key => 'order_type_id'
    belongs_to :bill_to, :class_name => "Company", :foreign_key => "bill_to_id", :include => [:head_office]
    belongs_to :status, :class_name => "ShippingStatus", :foreign_key => "shipping_status_id"
    belongs_to :commodity, :class_name => "ShippingCommodity", :foreign_key => "shipping_commodity_id"
    belongs_to :billing_method
    belongs_to :shipping_method
    belongs_to :created_by, :class_name => "Account", :foreign_key => 'created_by'
    belongs_to :order_status, :class_name => "OrderStatus", :foreign_key => "order_status_id"
    
    has_many :entities, :include => [:account, {:location => [:country, :region, :city]}, :company, :type], :class_name => 'OrderEntity', :source => :order_entity, :dependent => :destroy                            
    has_many :log, :class_name => "OrderLog", :source => :order_log, :dependent => :destroy
    has_many :items, :class_name => "OrderItem", :source => :order_item, :dependent => :destroy
    has_many :revenus, :class_name => "OrderRevenu", :source => :order_revenu, :include => [:item, :type], :dependent => :destroy
    has_one :invoice
    
    # use Tobias' Money class
    composed_of :declared_value, :class_name => "Money",  :mapping => %w(declared_value_cents cents) do |v|
        Money.new(v.to_f*100)
    end
     
    liquid_methods :bill_number, :purpose, :declared_value, :pieces, :weight, :pickup_locations, :pod_name, :pod_date, :total_cost, :bill_to, :commodity, :billing_method, :shipping_method, :type, :entities, :items, :children, :created_by 
    
    ###
    # initialize
    # define an instance var to cache total order-cost
    #
    def initialize(*params)        
        @total_cost = nil    
        super
    end
    
    ###
    # callbacks
    #
    def before_create        
        if (self.type.name == 'local' || type.name == 'mawb' || type.name == 'route')
            corp = Company.find(1)
            self.bill_to_id = corp.id  # <-- billing columns don't apply to order-routes
            self.billing_method_id = 1
        end
    end
    
    def after_save        
        if (declared_value.nil? || declared_value == 0)
            sr = SystemRevenu.find_by_name('insurance')                  
            if (r = self.revenus.find_by_system_revenu_id(sr.id))                
                r.destroy                
            end
        end
    end     
    
    ###
    # create
    # over-ride create a bit.
    #
    def self.create(param)

        # timestamp the record
        param[:shipping_status_id] = 1 # <-- NEW HWB

        super
    end 
    
    ##
    # finalize
    # finalize an order and create an invoice
    # @param {Integer} order id
    # @raises Order::FinalizeError
    #
    def self.finalize(id)
        order = Order.find(id)
                       
        # raise exceptions if things aren't kosher
        raise FinalizeError.new("This order appears to have been FINALIZED already.  Its status is currently set to '#{order.order_status.name}'.") if order.order_status.name != 'open'
        raise FinalizeError.new("This order has already been invoiced (INVOICE#: #{order.invoice.id}).") if !order.invoice.nil?
        raise FinalizeError.new("This order's proof-of-delivery is not confirmed") if order.get_pod === false
        
        # check that each route's entity has a service-cost defined.  no freebies here.
        order.children.each do |route|
            route.entities.each do |e|
                raise FinalizeError.new("The #{e.type.label} '#{e.company.name}' has no service-cost defined.  Finalize failed.") if e.cost == 0
            end
        end
        
        # good-to-go.  this order will be finalized.
        begin 
            status = OrderStatus.find_by_name('delivered')
            order.order_status = status
            order.save!                
        end
        order
            
    end
    
    ###
    # to_h
    #
    def to_h
        self.attributes        
    end
    ###
    # find_entity_by_type
    # return an order_entity by name ("shipper", "consignee", "carrier", etc)
    # @return {OrderEntity}
    #
    def find_entity_by_type(type)
        
        self.entities.each do |e|
            if (e.type.name == type)
                return e
            end
        end
            
        return false     
    end
            
    ###
    # get_title
    # title method for tree nodes.  called by REXt::Tree::Node
    # @return {String}
    #
    def get_node_title
        return 'Order #' + self.id.to_s
    end
    
    ###
    # get_pod
    # get proof-of-delivery info
    #
    def get_pod
        (!(self.pod_name.nil? && self.pod_date.nil?)) ? {:pod_name => self.pod_name, :pod_date => self.pod_date} : false
    end
    ###
    # get_routes
    # returns a list of routes associated with this order
    # @return {Array}
    #
    def get_routes
        list = []
        routes = self.children(:include => [:status])
        routes.each do |r|
            list.push(Order.render_route(r, self))
        end
        
        # sort routes on date.
        list = list.sort_by {|r| r[:depart_date]}
        
        # add an index field to each
        index = 1;
        list.each do |r| 
            if (r[:type] != 'local')
                if (r[:pickup_mode] != 'agent' && index-2>=0)                        
                    p = list[index-2]
                    if (r[:pickup_mode] == 'carrier')                    
                        carrier = r[:pickup_mode_message] = p[:entities].find {|e| (e[:role] == 'carrier') ? true : false}
                        r[:pickup_mode_message] = "Carrier will pick-up from " + carrier[:company][:name]
                    elsif (r[:pickup_mode] == 'shipper')
                        shipper = p[:entities].find {|e| (e[:role] == 'consignee') ? true : false}
                        r[:pickup_mode_message] = shipper[:company][:name] + ' will deliver to Carrier'
                    end            
                end
                if (r[:delivery_mode] != 'agent' && index < list.length)
                    n = list[index]
                    consignee = n[:entities].find {|e| (e[:role] == 'consignee') ? true : false}
                    r[:delivery_mode_message] = "Carrier will deliver to " + consignee[:company][:name]
                end
            end            
            r[:index] = index            
            index += 1
        end
        
        return list
    end

    ###
    # render_route
    # class method to render a an order_route into a nice hash.  for sending to client
    # @param {Order} route
    # @param {Order} parent order
    # @return {HASH}
    #
    def self.render_route(r, parent = nil)
        parent = r.parent if parent.nil?
        
        shipper = parent.find_entity_by_type('shipper')
        consignee = parent.find_entity_by_type('consignee')
        
        roles = {}
        row = {
            :id => r.id,
            :parent_id => parent.id,
            :bill_number => r.bill_number,
            :type => r.type.name,
            :entities => [],
            :pickup_mode => 'agent',
            :delivery_mode => 'agent'
        }
        r.entities.each do |e|                      
            roles[e.type.name.to_sym] = e
            row[:origin_name] = e.location.city.name if e.type.name == 'shipper'
            row[:destination_name] = e.location.city.name if e.type.name == 'consignee'            
            row[:entities].push(e.to_h)
        end
        
        if (!roles[:shipper].nil? && !roles[:consignee].nil?)
            # determine if this is customer-pickup, carrier-pickup or agent-pickup        
            if (roles[:shipper].company.id == r.parent.find_entity_by_type('shipper').company_id)
                row[:pickup_mode] = 'shipper'     
                row[:pickup_mode_message] = "Shipper will deliver to Carrier"
            elsif (roles[:shipper].company.id == roles[:carrier].company.id)            
                row[:pickup_mode] = 'carrier'            
                row[:pickup_mode_message] = "Carrier will pick-up from Shipper"
            end
            
            # determine if this is agent-delivery or carrier-delivery
            if (roles[:consignee].company.id == roles[:carrier].company.id)
                row[:delivery_mode] = 'carrier'
                row[:delivery_mode_message] = "Carrier will deliver to Consignee"
            end        
        else
            row[:pickup_mode] = 'local'
            row[:delivery_mode] = 'local'
        end
                        
        
        
        row[:depart_date] = roles[:carrier].date_in
        row[:arrival_date] = roles[:carrier].date_out
        row[:origin] = {
            :city => shipper.location.city.to_h,                            
            :region => shipper.location.region.to_h,              
            :country => shipper.location.country.to_h,                
            :airport => shipper.location.airport.to_h           
        }
        row[:destination] = {
            :city => consignee.location.city.to_h,                            
            :region => consignee.location.region.to_h,              
            :country => consignee.location.country.to_h,                
            :airport => consignee.location.airport.to_h                             
        }
        
        return row
    end
    
    def departure_date
        self.get_entity_by_name('carrier').date_in
    end
    
    def arrival_date
        self.get_entity_by_name('carrier').date_out    
    end
    
    ###
    # total_cost
    # tally an order's costs and spit it out.  meant to used as a liquid method ONLY
    # @return {Float}
    #
    def total_cost        
        return @total_cost if !@total_cost.nil?        
        @total_cost = Money.new(0)
        self.children.each do |route|
            route.entities.each do |e|                    
                @total_cost += e.cost if !e.cost.nil? # <-- entity-cost
                e.costs.each do |c|
                    @total_cost += c.cost   # <-- order-cost
                end
            end
        end
        @total_cost
    end
    
    ###
    # total_entity_cost
    # return the total cost of all entities (agents, carriers, etc)
    # @return {Float}
    #
    def total_entity_cost
        total = Money.new(0)
        self.children.each do |route|
            route.entities.each do |e|
                total += e.cost if !e.cost.nil?   
            end
        end
        return total
    end
    
    def get_log
        joins = "LEFT OUTER JOIN #{Account.table_name} ON #{Account.table_name}.id = #{OrderLog.table_name}.account_id"
        joins += " LEFT OUTER JOIN #{OrderLogType.table_name} ON #{OrderLog.table_name}.order_log_type_id = #{OrderLogType.table_name}.id"
        select = "#{OrderLog.table_name}.id AS id, #{OrderLogType.table_name}.name AS log_type_name, #{OrderLog.table_name}.created_at AS created_at, #{OrderLog.table_name}.subject AS subject, #{OrderLog.table_name}.msg AS msg, #{Account.table_name}.first AS first, #{Account.table_name}.last AS last"

        return OrderLog.find_all_by_order_id(self.id,
            :joins => joins,
            :select => select,
            :order => "#{OrderLog.table_name}.created_at DESC"
        ).collect { |log| log.to_a }
        
    end

    ###
    # get_route_costs
    #
    def get_route_costs(*param)

        joins = " LEFT OUTER JOIN #{OrderEntity.table_name} ON #{OrderEntityCost.table_name}.order_entity_id = #{OrderEntity.table_name}.id"
        joins += " LEFT OUTER JOIN #{Company.table_name} ON #{OrderEntity.table_name}.company_id = #{Company.table_name}.id"        
        joins += " LEFT OUTER JOIN #{Order.table_name} ON #{OrderEntity.table_name}.order_id = #{Order.table_name}.id"
        joins += " LEFT OUTER JOIN #{ShippingCost.table_name} ON #{OrderEntityCost.table_name}.shipping_cost_id = #{ShippingCost.table_name}.id"

        conditions = "#{Order.table_name}.parent_id = #{self.id}"
        #entity_cost_id, entity_id, order_id, amount, company, when, type
        select = "#{OrderEntityCost.table_name}.id AS id,",
            "#{OrderEntity.table_name}.id AS entity_id,",
            "#{Order.table_name}.id AS order_id,",
            "#{OrderEntityCost.table_name}.cost_cents AS cost_cents,",
            "#{Company.table_name}.name AS company,",
            "#{OrderEntityCost.table_name}.when AS when,",
            "#{ShippingCost.table_name}.name AS cost_type"

        return OrderEntityCost.find(:all,
            :joins => joins,
            :conditions => conditions,
            :select => select,
            :order => "#{Order.table_name}.id, #{OrderEntity.table_name}.id"
        ).collect { |c|
            OrderEntityCost.to_grid_record(c)
        }

    end
    
    ###
    # update_costs
    # @param {Array}
    #
    def self.update_costs(modified)
        
        # fetch the all pks of modified costs & entities.  we have to find entity from company.name due to limitatoin
        # of Combo GridEditor
        company_names = []
        cost_ids = []
        modified.each do |rec|
            rec["fields"].each do |f|
                if (f["name"] == 'company')
                    company_names << f["value"]
                end
            end            
            cost_ids << rec["id"]
        end
        company_names.uniq!
                              
        if (company_names.length > 0)
            # load all entities associated with modified-orders
            joins = "LEFT OUTER JOIN #{Company.table_name} ON #{OrderEntity.table_name}.company_id = #{Company.table_name}.id"         
            
            # build conditions of LIKE query on company.name
            conditions = ""
            company_names.each do |n|
                conditions += "LOWER(#{Company.table_name}.name) LIKE" + "('%#{n.downcase}%')"                
                conditions += " OR " if company_names.index(n) < (company_names.length - 1)
            end
            
            # here's all the changed entities
            entities = OrderEntity.find_by_sql("SELECT #{OrderEntity.table_name}.id, #{Company.table_name}.name FROM #{OrderEntity.table_name} #{joins} WHERE #{conditions}")
        end
        
        # load all modified costs.
        costs = OrderEntityCost.find(:all, :conditions => "id IN(#{cost_ids.join(',')})")
        
        # business as usual now; loop through the modified field-list from grid...
        modified.each do |rec|
            cost = costs.find {|c| (c.id == rec["id"]) ? true : false}           
            rec["fields"].each do |f|                
                case f["name"]
                    when "company"
                        e = entities.find {|e| (e.name.downcase == f["value"].downcase) ? true : false }
                        if (e.nil?)
                            raise RException.new("Could not find order-entity associated with company named '#{f["value"]}'")
                        end
                        cost.order_entity_id = e.id
                    when "type"
                        cost.shipping_cost_id = ShippingCost.find_by_name(f["value"]).id  
                    when "cost"
                        cost.cost = f["value"]
                    else
                        cost.write_attribute(f["name"], f["value"])                                                             
                end
            end
            cost.save!                
        end    
    end
    
    def get_sales_agents
        
        list = []    
        self.entities.each do |e| 
            e.company.sales_agents.each do |a| 
                list << a.to_h    
            end
        end  
        list
    end
    
    def get_bill_to
        self.bill_to.to_h.merge(
            :id => self.bill_to_id,   
            :location => self.bill_to.head_office.to_h,
            :accountant => self.bill_to.accountant.contact            
        )  
    end
    
    ###
    # get_items
    # return a list of order_items
    #
    def get_items
        return self.items.collect {|i| 
            i.to_a    
        }    
    end
    
    def self.get_tree_nodes(req)
                               
        res = []
        case req[:object]
            when 'root', 'source', 'is_quote', 'created_by', 'company'                                                            
                res = self.get_years_with_orders(req)
            when 'today_delivery'
                today = Date.today
                req[:year] = today.year
                req[:month] = today.month
                req[:day] = today.day                
                res = self.tree_query(req).collect { |o| Node::Order.to_h(o) }                
            when 'today_pickup'
                today = Date.today
                req[:year] = today.year
                req[:month] = today.month
                req[:day] = today.day
                res = self.tree_query(req).collect { |o| Node::Order.to_h(o) }            
            when 'Year'                   
                res = self.get_months_with_orders(req)                
            when 'Month'                  
                res = self.get_days_with_orders(req)               
            when 'Day'                
                res = self.tree_query(req).collect {|o| Node::Order.to_h(o) }
        end
        return res
        
    end
    
    ###
    # get_years_with_orders
    # get a list of years that have orders in them
    # @return {Array}
    #
    def self.get_years_with_orders(params = {})
        years = {}
        self.tree_query(params).each do |o|
            d = Date.parse(o[:date])
            if (years[d.year].nil?)
                years[d.year] = {:count => 1, :id => d.year, :name => d.strftime("%Y")}
            else
                years[d.year][:count] += 1   
            end
        end                
        years.sort.collect {|y| Node::Year.to_h(y[1]) } # @see ruby class Hash#sort
    end
    
    ###
    # get_months_with_orders
    # returns a list of month-names that have orders within a given year
    # @return {Array}
    #
    def self.get_months_with_orders(params = {})
        months = {}
        self.tree_query(params).each do |o|
            d = Date.parse(o[:date])
            if months[d.mon].nil?    
                months[d.mon] = {:count => 1, :id => d.month, :name => d.strftime("%B")}
            else
                months[d.mon][:count] += 1
            end
        end
        
        months.sort.collect {|m| Node::Month.to_h(m[1]) }  
    end
    
    ###
    # get_days_with_orders
    # returns a list of day-names that have orders within a given month
    # @return {Array}
    #
    def self.get_days_with_orders(params = {})
        days = {}
        self.tree_query(params).each do |o|
            d = Date.parse(o[:date])
            if days[d.day].nil?    
                days[d.day] = {:count => 1, :id => d.day, :name => d.strftime("%d")}
            else
                days[d.day][:count] += 1
            end
        end        
        days.sort.collect {|d| Node::Day.to_h(d[1]) }  
    end
    
    ###
    # query
    # returns a list of order ids & order_date for various criteria
    # @params
    #   :type [hwb]
    #   :status [open] -> order_status
    #   :is_quote [false]
    #   :created_by
    # TODO: :created_on    
    #   :year
    #   :month
    #   :day
    #
    # @return {Array}
    #
    def self.tree_query(params = {})
                        
        params[:type] = OrderType.find_by_name('hwb').id if params[:type].nil?
        params[:status] = OrderStatus.find_by_name('open').id if params[:status].nil?
        params[:is_quote] = false if params[:is_quote].nil?
        
        select = "#{Order.table_name}.id AS id, oe.date_in AS start_date, #{Order.table_name}.bill_number"
                
        joins = " LEFT OUTER JOIN #{OrderTypeEntity.table_name} AS ote ON ote.order_type_id = #{Order.table_name}.order_type_id"        
        joins += " LEFT OUTER JOIN #{OrderEntity.table_name} AS oe ON oe.order_id = #{Order.table_name}.id"
        
        conditions = "#{Order.table_name}.order_type_id = #{params[:type]} AND #{Order.table_name}.order_status_id = #{params[:status]}"
        
        # If query if for today's deliveries, match order_type_entity to Cosnignee.
        if (params[:object] == 'today_delivery')
            conditions += " AND ote.name = 'consignee' AND oe.order_type_entity_id = ote.id"                        
        else
            conditions += " AND ote.name = 'shipper' AND oe.order_type_entity_id = ote.id"
        end
        
        # get orders within a particular month
        # this date-range method comes from http://www.therailsway.com/2007/1/21/more-idiomatic-ruby
        if (!params[:year].nil?)
            from = nil
            to = nil
            if (!params[:day].nil?)
                requested_date = Date.new(params[:year].to_i, params[:month].to_i, params[:day].to_i)
                conditions += " AND oe.date_in LIKE '#{requested_date}%'"
            elsif (!params[:month].nil?)
                requested_date = Date.new(params[:year].to_i, params[:month].to_i, 1)
                from = requested_date
                to = requested_date >> 1
                conditions += " AND oe.date_in BETWEEN '#{from}' AND '#{to}'"
            else
                from = Date.new(params[:year].to_i, 1, 1) - 1
                to = Date.new(params[:year].to_i + 1, 1, 1)
                conditions += " AND oe.date_in BETWEEN '#{from}' AND '#{to}'"
            end
            
        end
        
        # query by created_by (the account_id that created the order
        if (!params[:created_by].nil?)
            conditions += " AND #{Order.table_name}.created_by = #{params[:created_by].to_i}"
        end
        
        # are we querying quotes only?
        conditions += (params[:is_quote] != false) ? " AND #{Order.table_name}.bill_number IS NULL" : " AND NOT #{Order.table_name}.bill_number IS NULL"
               
        # good to go...        
        return Order.find(:all, 
            :joins => joins,
            :conditions => conditions,
            :select => select,
            :order => "oe.date_in"
        ).collect {|o|
            {:id => o.id, :date => o.start_date, :bill_number => o.bill_number}        
        }       
    end
    
    ###
    # prepare_filter
    # @param {Hash} criteria    
    # @return {Array} order ids
    # This is the initial hit from an order-filter.  this first part simply return the set of order-ids that match the 
    # user's filter params.  this set of ids will be cached in the session and used as an IN(ids.join(',')) condition for 
    # the actual presentation query to follow
    # 
    #
    def self.prepare_filter(criteria)
        ids = []
                        
        # 1. date, shipping_status, employee filter
        if (!criteria[:date].nil? || !criteria[:shipping_status].nil? || !criteria[:employee].nil?)
            j = "LEFT OUTER JOIN #{OrderEntity.table_name} AS oe ON oe.order_id = #{Order.table_name}.id"
            j += " LEFT OUTER JOIN #{OrderTypeEntity.table_name} AS ote ON ote.order_type_id = #{Order.table_name}.order_type_id"
            j += " LEFT OUTER JOIN #{OrderStatus.table_name} ON #{OrderStatus.table_name}.id = #{Order.table_name}.order_status_id"                    
            j += " LEFT OUTER JOIN #{OrderType.table_name} ON #{OrderType.table_name}.id = #{Order.table_name}.order_type_id"            
                                
            c = "#{OrderStatus.table_name}.name = 'open' AND #{OrderType.table_name}.name = 'hwb'"     
            c += " AND ote.name = 'shipper' AND oe.order_type_entity_id = ote.id"
            
            # filter: date
            c += " AND oe.date_in BETWEEN '#{Date.parse(criteria[:date][:start])}' AND '#{Date.parse(criteria[:date][:end])}'" if (!criteria[:date].nil?)
            
            # filter: shipping_status
            c += " AND #{Order.table_name}.shipping_status_id = #{criteria[:shipping_status][:id]}" if (!criteria[:shipping_status].nil?)
            
            # filter: employee
            c += " AND #{Order.table_name}.created_by = #{criteria[:employee][:id]}" if (!criteria[:employee].nil?)
            
            rs = Order.find(:all, :joins => j, :conditions => c, :select => "#{Order.table_name}.id")
                                    
            # if no orders in this date-range, no point in doing any more filters.  just return false.
            return false if (rs.length == 0) 
            
            # generate a list of order-ids on the filters date, shipping_status and employee
            ids = rs.collect {|o| o.id}             
        end
                
        # 2. Company Filter.
        if (!criteria[:company].nil?)
            j = ""; c = ""; s = "";                                                                       
            
            j = " LEFT OUTER JOIN #{OrderEntity.table_name} AS oe ON oe.order_id = o.id"                
            j += " LEFT OUTER JOIN #{OrderTypeEntity.table_name} AS ote ON ote.order_type_id = o.order_type_id"                            
            c = "oe.company_id = #{criteria[:company][:id]} AND ote.name = '#{criteria[:company][:role]}'"   
            c += " AND oe.order_type_entity_id = ote.id"
            if (criteria[:company][:role] == 'shipper' || criteria[:company][:role] == 'consignee')
                s = "o.id AS id"        
                
                # use the previous filters as an IN(ids) condition
                c += " AND o.parent_id = 0 AND o.id IN(#{ids.join(',')})" if (ids.length > 0)                
            else
                if (criteria[:company][:role] == 'agent')
                    c = "oe.company_id = #{criteria[:company][:id]} AND (ote.name = 'shipper' OR ote.name = 'consignee')"
                end                
                s = "o.parent_id AS id"   
                
                # use the previous filters as an IN(ids) condition
                c += " AND o.parent_id IN(#{ids.join(',')})" if (ids.length > 0)                
            end                 
                         
            ids = Order.find_by_sql("SELECT DISTINCT #{s} FROM #{Order.table_name} AS o #{j} WHERE #{c}").collect{|o| o.id} 
            return false if ids.length == 0                        
        end
        
        # 3. Airport Filter
        if (!criteria[:airport].nil?)
            j = "LEFT OUTER JOIN #{OrderEntity.table_name} AS oe ON oe.order_id = o.id"
            j += " LEFT OUTER JOIN #{OrderTypeEntity.table_name} AS ote ON ote.order_type_id = o.order_type_id"                               
            j += " LEFT OUTER JOIN #{OrderType.table_name} AS ot ON ot.id = o.order_type_id"                   
            j += " LEFT OUTER JOIN #{Company.table_name} AS c ON c.id = oe.company_id"
            j += " LEFT OUTER JOIN #{Airport.table_name} AS a ON a.id = c.airport_id"
            
            c = "ot.name = 'hwb' AND a.iso = '#{criteria[:airport][:iso].upcase}' AND oe.order_type_entity_id = ote.id"
            c += " AND o.id IN(#{ids.join(',')})" if (ids.length > 0)
            
            if (criteria[:airport][:location] == 'origin')  
                c += " AND ote.name = 'shipper'"    
            elsif (criteria[:airport][:location] == 'destination')
                c += " AND ote.name = 'consignee'"    
            end
            ids = Order.find_by_sql("SELECT o.id FROM #{Order.table_name} AS o #{j} WHERE #{c}").collect{|o| o.id}
        end
        
                                                                  
        return (ids.length > 0) ? ids.uniq : false
                                                    
    end
    
    ###
    # filter
    # The actual presentation query.
    # @param {Array} order-ids
    # @param {Integer} limit
    # @param {Integer} offset    
    #
    def self.filter(ids, limit = nil, offset = nil)
                
        joins = "LEFT OUTER JOIN #{Account.table_name} AS a ON a.id = #{Order.table_name}.created_by"              
        joins += " LEFT OUTER JOIN #{OrderEntity.table_name} AS oe ON oe.order_id = #{Order.table_name}.id"
        joins += " LEFT OUTER JOIN #{ShippingStatus.table_name} AS s ON #{Order.table_name}.shipping_status_id = s.id"
        joins += " LEFT OUTER JOIN #{OrderTypeEntity.table_name} AS ote ON ote.order_type_id = #{Order.table_name}.order_type_id"
        joins += " LEFT OUTER JOIN #{OrderStatus.table_name} ON #{OrderStatus.table_name}.id = #{Order.table_name}.order_status_id"                    
        joins += " LEFT OUTER JOIN #{OrderType.table_name} ON #{OrderType.table_name}.id = #{Order.table_name}.order_type_id"                                   
        
        conditions = "#{OrderStatus.table_name}.name = 'open' AND #{OrderType.table_name}.name = 'hwb'"     
        conditions += " AND ote.name = 'shipper' AND oe.order_type_entity_id = ote.id"
        
        conditions += " AND #{Order.table_name}.id IN(#{ids.join(',')})" if (ids.length > 0)
                
        # first get the orders
        rs = Order.find(:all,             
            :conditions => conditions,
            :joins => joins,
            :select => "#{Order.table_name}.id, #{Order.table_name}.bill_number, a.first AS account_first, a.last AS account_last, oe.date_in AS start_date, s.name AS current_status",
            :order => "oe.date_in DESC",
            :limit => limit,
            :offset => offset
        )
        
        # now get a list of all associated entities (shipper, consignee)
        joins = "LEFT OUTER JOIN #{Company.table_name} AS c ON #{OrderEntity.table_name}.company_id = c.id"
        joins += " LEFT OUTER JOIN #{CompanyLocation.table_name} AS l ON l.id = #{OrderEntity.table_name}.company_location_id"
        joins += " LEFT OUTER JOIN #{Airport.table_name} AS ap ON ap.id = l.airport_id"
        joins += " LEFT OUTER JOIN #{OrderTypeEntity.table_name} AS ote ON ote.id = #{OrderEntity.table_name}.order_type_entity_id"        
        entities = OrderEntity.find(:all,
            :select => "#{OrderEntity.table_name}.order_id, c.name AS name, ap.iso AS airport, ote.name AS role, #{OrderEntity.table_name}.date_in, #{OrderEntity.table_name}.date_out",
            :joins => joins,
            :conditions => "#{OrderEntity.table_name}.order_id IN(#{rs.collect{|o|o.id}.join(',')})"            
        )
        
        # finally, attach order-entities to the order rs       
        return rs.collect {|o|                
            {
                :id => o.id,                 
                :bill_number => o.bill_number,
                :status => o.current_status,
                :created_by => {:first => o.account_first.capitalize, :last => o.account_last.capitalize},
                :shipper => entities.find {|e| (e.order_id == o.id && e.role == 'shipper') ? true : false}.to_search_result,
                :consignee => consignee = entities.find { |e| (e.order_id == o.id && e.role == 'consignee') ? true : false}.to_search_result                
            }
        }              
    end
    
    ##
    # class Order::FinalizeError
    # raised when an order failed to be finalized.
    #
    class FinalizeError < RException
        
    end
    
    ###
    # module NOde
    # This simple module is a utility for rendering tree-nodes
    #
    module Node
        module Company
            
        end
        module Year            
            @@icon_cls = 'icon-calendar'
            @@leaf = false
            @@object = self.to_s.split(':').pop            
            def self.to_h(year) {                       
                    :nid => @@object + ':' + year[:id].to_s,
                    :text => "#{year[:name]} (#{year[:count]})",
                    :leaf => @@leaf,
                    :iconCls => @@icon_cls
                }
            end
        end
        module Month
            @@icon_cls = 'icon-calendar-month'
            @@leaf = false 
            @@object = self.to_s.split(':').pop
            def self.to_h(month) {                        
                    :nid => @@object + ":" + month[:id].to_s,
                    :text => "#{month[:name]} (#{month[:count].to_s})", 
                    :iconCls => @@icon_cls,
                    :leaf => false
                }    
            end
        end
        module Day
            @@icon_cls = 'icon-calendar-day'
            @@leaf = false
            @@object = self.to_s.split(':').pop
            def self.to_h(day) {                        
                    :nid => @@object + ":" + day[:id].to_s,
                    :text => "#{day[:name]} (#{day[:count].to_s})",
                    :iconCls => @@icon_cls,
                    :leaf => @@leaf
                }    
            end
        end
        
        module Order
            @@icon_cls = 'icon-package'
            @@leaf = true
            @@object = self.to_s
            
            def self.to_h(o) {
                    :nid => @@object + ":" + o[:id].to_s,
                    :text => (o[:bill_number]) ? o[:bill_number].to_s : "Quote:" + o[:id].to_s,
                    :iconCls => @@icon_cls,
                    :leaf => @@leaf
                }    
            end
        end
        module Quote
            
        end
                                
    end      
end

