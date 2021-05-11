module Resistor::CompanyController
    
    ###
    # on_new
    # user clicks "new" company menu.  this is a form-initializer.  params[:id] is set to the domain_id of the type of 
    # company that user wishes to create.  with that, return the "type" of domain this is (eg: 'client', 'carrier', 'agent', etc) along
    # with the available roles for that domain
    #
    def on_new        
        res = RResponse.new
                        
        data = {
            :roles => {
                :company => {},
                :account => {}
            },
            :fields => [],
            :type => '',
            :domain_id => nil,
            :domain => nil
        }
        if (params[:id].nil?)
            res.msg = 'company_controller/on_new -- no :id specified'
            return respond(res)
        end
        
        # params[:id] will be eithe INT (the domain id) or String (the domain name)
        domain = (params[:id].to_i > 0) ? Domain.find_by_id(params[:id]) : Domain.find_by_name(params[:id])
                
        if (domain.parent != nil && domain.parent.name == 'carrier')                        
            data[:type] = 'carrier'
            data[:domain] = {:id => domain.id, :name => domain.name, :label => domain.label}
        else
            data[:type] = domain.name
            data[:domain] = {:id => domain.id, :name => domain.name, :label => domain.label}
        end
                
        # company roles
        domain.get_company_roles.each do |r|
            data[:roles][:company][r.id] = r.to_h
        end
        
        # account roles
        domain.get_account_roles.each do |r|
            data[:roles][:account][r.id] = {:id => r.id, :label => r.label, :fields => r.get_fields, :cls => r.identifier.gsub('.', '-')}
        end
        
        # domain fields
        data[:fields] = domain.fields.collect {|f| f.to_h }
        res.success = true
        res.data = data
                
        respond(res)        
    end
    
    ###
    # delete_account
    #
    def delete_account
                
        res = RResponse.new
        
        # sanity check
        if (params[:id].to_i == 1) # <-- admin account is id 1
            res.msg = 'The administer account cannot be deleted.'
            respond(res)
            return false
        end
        
        # don't allow deletion of last account of a company
        if (Account.count(:conditions => "company_id = #{Account.find(params[:id]).company_id}") == 1)
            res.msg = 'You cannot delete the last account of a company'
            return respond(res)
        end
        
        
        begin
            Account.destroy(params[:id])
            res.success = true
            res.msg = 'Deleted account'        
        end
                    
        respond(res)
        
    end
        
end