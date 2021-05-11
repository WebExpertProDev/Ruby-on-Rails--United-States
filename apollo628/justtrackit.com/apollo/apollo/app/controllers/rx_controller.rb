class RxController < ApplicationController
    
    ###
    # fax_notification
    # handler for fax-service success notification (greenfax)
    # @param {String} result (success)
    # @param {Timestamp} timestamp (01/10/2005 02:10:25 PM EST (GMT-5) )
    # @param {Phone#} destination (12157018714)
    # @param {Integer} pages (1)
    # @param {Integer} duration=78
    # @param {String} userjobcode (Account:pk, Order:pk
    # @param {Integer} greenfaxreferenceid (8591334)
    # @param {Float} cost
    #
    # @raises RException
    # greenfax request is url-encoded.  for some reason, I have to manually decode and parse the query string.
    def fax_notification 
        
        # not sure why rails doesn't automatically do this...is there some weirdness in GreenFax's request??
        params = CGI.parse(CGI::unescape(request.query_string))
        params.each_key do |k|
            params[k] = params[k].pop
        end
                                                            
        LOG.info("*************************************************")
        LOG.info(" rx/fax_notification called will following params:")
        LOG.info(params.to_json)        
        LOG.info("*************************************************")                                                                                                                  
                
        # sanity check that this request includes the param "greenfaxreferenceid".  raise exception if not
        raise RException.new("rx/fax_notification was called without a greenfaxreferenceid.  params: #{params.to_yaml}") if params["greenfaxreferenceid"].nil?
        
        # load the Model:pk encoded in jobcode.  AR will raise an exception if the Model is invalid or record doesn't exist.
        jobcode = params["userjobcode"].split(':')
        model   = jobcode.shift.constantize
        pk      = jobcode.pop.to_i
        object  = model.send("find", pk)
        result  = (params["result"] == "success") ? "SUCCESS" : "FAILURE"          
        subject = "FAX-transmission notification: #{result}"
        msg     = ''
        
        if params["result"] == 'success'            
            msg = "<p><strong>Greenfax reference ID:</strong> #{params['greenfaxreferenceid']}</p>"
            msg += "<p><strong>FAX#:</strong> #{params['destination']}</p>"
            msg += "<p><strong>Timestamp:</strong> #{params['timestamp']}</p>"            
            msg += "<p><strong>Pages:</strong> #{params['pages']}, <strong>Duration:</strong> #{params['duration']} seconds, <strong>cost:</strong> #{params['cost']}"                        
        else
            msg = params.to_yaml
        end
        
        if (object.class == Order) # <-- old-school, order-specific log :(
            OrderLog.create({
                :order_id => object.id,
                :subject => subject,
                :msg => msg,
                :account_id => object.created_by.id,
                :order_log_type_id => OrderLogType.find_by_name('notification').id            
            }) 
        else                       # <-- new polymorphic log -- handles logs for any kind of model
            SystemLog.create({            
                :log_type => SystemLogType.find_by_name('notification'),       
                :loggable_id => object.id,
                :loggable_type => object.class.to_s,
                :subject => subject,
                :msg => msg,         
                :created_by => object.created_by 
            })
        end
                                            
        render(:nothing => true)
       
        
    end
end
