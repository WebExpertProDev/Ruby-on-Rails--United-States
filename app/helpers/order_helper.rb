module OrderHelper
    
   
    ###
    # get_allowed_routing_types
    # returns a list of all available routing types available to the shipper (eg: Commercial Air, Ground)
    # built for the ComboBox in order-routing tab.
    # this method of categorizing Carriers is a bit hack-ish.
    # @return {String} JSON encoded string
    #
    def get_allowed_routing_types
        
        domain = Domain.find_by_name('carrier')
        roles = domain.company_roles
        list = []
        roles.each do |r|            
            unless r.identifier == 'vendor.carrier.air_commercial'
                list.push([r.id, r.label])    
            else
                list.push([r.id, r.label]) if @shipper.company.has_role?('client.known_shipper')                                             
            end
        end

        return list.to_json
    end
    
    
end

