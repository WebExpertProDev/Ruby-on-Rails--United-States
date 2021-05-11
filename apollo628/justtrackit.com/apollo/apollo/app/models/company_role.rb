class CompanyRole < ActiveRecord::Base
    
    #json encoded field_value [{:role_id1 => 'value'}, {:role_id2 => 'value2'}]
    serialize :field_value

    belongs_to :company
    belongs_to :role           
    
    ##
    # method_missing
    # implement method_missing to search for role fields
    #
    def method_missing(method, *args)         
        if (!role.nil? && f = role.fields.find(:first, :conditions => {:name => method.to_s}))            
            field_value[f.id] = args.first if args.length == 1                            
            field_value[f.id]            
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
        super || (!role.nil? && role.fields.find(:first, :conditions => {:name => method.to_s})) ? true : false               
    end
    
    ###
    # to_h
    #
    def to_h
        {:id => self.role_id, :values => self.field_value } # <-- ar.field_value is serialized column            
    end
    
    ###
    # hash_by_company_id
    # build a hash of company_id with associated roles
    # @param {Array} list of company_ids to search
    # @param {bool} to_css_class [true] convert role-separator "." into css-friendly "-"
    #
    def self.hash_by_company_id(list, to_css_class = true) 
        croles = {}
        CompanyRole.find(:all, :conditions => "company_id IN (#{list.join(',')})", :include => [:role]).each do |cr|
            if (croles[cr.company_id].nil?)
                croles[cr.company_id] = []
            end
            croles[cr.company_id] << cr.role.identifier
        end
        return croles
    end
end
