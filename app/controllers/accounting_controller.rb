class AccountingController < ApplicationController
    
    register_js "resistor-ext2/source/application/template/DocumentMgr"
    
    ###
    # list
    # tree-loader method
    #
    def list        
        status = OrderStatus.find_by_name('delivered')        
        req = self.get_tree_request(:company_tree)
        req[:status] = status.id                
        render :json => Order.get_tree_nodes(req).to_json, :layout => false                
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
            raise RException.new("invoice/filter called with neither a filter nor a resultset in session") if session[:invoice_filter].nil?  
            
            peer = (session[:invoice_filter][:type] == 'receivable') ? Invoice : InvoicePayable
            res.data[:rs] = peer.filter(session[:invoice_filter][:rs], params["limit"], params["start"]) 
            res.data[:total] = session[:invoice_filter][:rs].length            
            res.success = true            
        
        # filter params were found -- this means we're building a new query
        else
            # build a criteria hash.
            c = {}
            params["filter"].each_pair do |k,v|
                if (v == 'on')
                    filter = {} 
                    if !params[k].nil?
                        params[k].each_pair do |name, value|
                            filter[name.to_sym] = value
                        end                    
                        filter[:location] = params["location"] if (k == 'airport')                    
                        filter[:role] = params["role"] if (k == 'company')                    
                        c[k.to_sym] = filter               
                    else
                        c[k.to_sym] = v
                    end
                end
            end      
            c[:type] = params["type"]
            peer = (c[:type] == 'receivable') ? Invoice : InvoicePayable
            res.data[:total] = 0        
            if (rs = peer.prepare_filter(c))
                session[:invoice_filter] = {
                    :type => c[:type],
                    :rs => rs
                }                                                             
                res.data[:total] = rs.length
                res.data[:type] = c[:type]
                res.msg = "Found #{rs.length} orders"                   
            else 
                res.msg = "No orders found with that criteria"
            end 
            res.success = true
        end   
                
        respond(res)        
    end          
    
    def view
        @order = Order.find_by_bill_number(params[:id], :include => [:invoice])
        
        # sanity check: 1. do we have an order & 2. is there actually an invoice on that order?
        raise RException.new("Could not find an invoice by that hwb#") if @order.nil?
        raise RException.new("That HWB has not yet been invoiced.  Its status is currently set to '#{@order.status.name}'.  Has this HWB been 'finalized'?") if @order.invoice.nil?
        
        @invoice = @order.invoice      
        @log = @invoice.log.find(:all, :order => "#{SystemLog.table_name}.created_at DESC", :include => [:created_by, :log_type]).collect { |l| l.to_h }
        @transactions = @invoice.transactions.find(:all, :include => [:type, :method, :created_by, :updated_by]).collect {|t| t.to_h }
                
        @id = @invoice.id
        
        render(:layout => false)
    end
           
    ##
    # pay
    # pay a list of payables
    #
    def pay
        ids = JSON.parse(params["payables"])
        raise RException.new("No payables selected") if ids.nil? || ids.length == 0
        
        # update payables only if their current paid status is "false"
        InvoicePayable.update_all({:paid => true, :updated_at => Time.now}, "id IN(#{ids.join(',')}) AND paid = false")
        
        res = RResponse.new
        res.msg = 'Set selected payables to "paid"'
        res.success = true
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
            path = params["node"].split(':')        
                        
            state = session[key]
            case path[0]
                when 'Year'
                    req = {:year => path[1].to_i, :month => nil, :day => nil}    
                when 'Month'
                    req =  {:year => state[:year], :month => path[1].to_i, :day => nil}   
                when 'Day'
                    req = {:year => state[:year], :month => state[:month], :day => path[1].to_i}
            end            
            session[key] = req
            req[:object] = path[0]
        else
            req = {:object => params["node"], :year => nil, :month => nil, :day => nil}                        
        end
                
        session[key] = req        
        
        req
    end
    
end
