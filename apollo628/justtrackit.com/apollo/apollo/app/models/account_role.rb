class AccountRole < ActiveRecord::Base
    
    # yaml column field_value
    serialize :field_value

    belongs_to :account, :class_name => "Account"
    belongs_to :role, :class_name => "Role", :foreign_key => "role_id"
    
    ##
    # before_create
    #
    def before_create
        field_value = {} if field_value.nil?    
    end
    
    ##
    # method_missing
    # override Class#method_missing to search role-fields
    # relays to super to raise usual MethodNotFound exception if not found
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
        super || (!role.nil? && role.fields.find(:first, :conditions => {:name => method})) ? true : false                     
    end
    
    
    def to_h
        {:id => self.role_id, :values => self.field_value} # <-- ar.field_value is json column
    end
    ###
    # hash_by_account_id
    # build a hash of account_id with associated roles as array
    # @param {Array} list of company_ids to search
    # @param {bool} to_css_class [true] convert role-separator "." into css-friendly "-"
    #
    def self.hash_by_account_id(list) 
        aroles = {}
        AccountRole.find(:all, :conditions => "account_id IN (#{list.join(',')})", :include => [:role]).each do |ar|
            if (aroles[ar.account_id].nil?)
                aroles[ar.account_id] = []
            end
            aroles[ar.account_id] << ar.role.identifier
        end
        return aroles
    end
           
    ###
    # exists
    # 2 versions.  if role_id is supplied, ask question "is this role mapped to this account?"
    # otherwise do super.  can't think of how this would go to super though.
    # @author Chris Scott
    #
    def self.exists?(*param)
                
        if (param.length == 2)
            
            account_id = param[0]
            role_id = param[1]
            conditions = "account_id = #{account_id} AND role_id = #{role_id}"
            LOG.info('conditions: ' + conditions)
            
            return (self.count_by_sql("SELECT count(*) FROM #{self.table_name} WHERE #{conditions}") > 0) ? true : false
        else
            return super
        end
    end
    
    def self.find_by_account_role_id(account_id, role_id)
        conditions = "account_id = #{account_id} AND role_id = #{role_id}"
        return self.find(:conditions => conditions)
    end
    
    ##
    # find_by_identifier
    # finds an account_role by its role's identifier
    # @param {String} id
    # @return {AccountRole}
    #
    def self.find_by_identifier(id)
        joins = "LEFT OUTER JOIN #{Role.table_name} AS r ON r.id = #{self.table_name}.role_id"
        conditions = "r.identifier = '#{id}'"
        self.find(:first, :joins => joins, :conditions => conditions)
    end
    
    

end
