class Account < ActiveRecord::Base
    liquid_methods :first, :last, :username, :email, :phone
    
    # active_rbac
    acts_as_user
    acts_as_encrypts_password

    validates_length_of :password, :minimum => 6
    validates_uniqueness_of :username
    validates_uniqueness_of :email, :allow_nil => true, :allow_blank => true, :scope => :id
    validates_presence_of :username
    validates_presence_of :first
    validates_presence_of :last
    
    has_many :account_role, :class_name => "AccountRole", :include => [:role], :dependent => :destroy
        
    has_many :entities, :class_name => "OrderEntity", :source => :order_entity
    belongs_to :company            
    
    ###
    # create
    # @author Chris Scott
    #
    # overridden from ActiveRecord::Base.  this impl. is identical to base, differing only on the
    # password confirmation block.  this is in order to comply with active_rbac, which doesn't correctly
    # set password_confirmation via hash['access'] on a model.  active_rbac prob. has some logic in its
    # password / password_confirmation methods which gets by-passed via hash['access'].  if this function
    # doesn't exist, ActiveRecord INSERT WILL FAIL on password.
    #
    # Creates an object, instantly saves it as a record (if the validation permits it), and returns it. If the save
    # fails under validations, the unsaved object is still returned.
    # @param {Hash || nil} attributes to apply to new Account (often a form direct from client, delivered by RExt)
    #
    def self.create(attributes = nil)
        if attributes.is_a?(Array)
            attributes.collect { |attr| create(attr) }            
            super
        else            
            attributes.delete("description") # <---- add this back
            
            # check if username key not provided.  if not, auto-create one based upon last, first.
            #
            if (attributes[:username] == nil and attributes["username"] == nil)
                
                # auto-create a username.  attempt to stuff it into db.  iterate the integer suffix until she goes in.
                proposed = attributes["last"].downcase + attributes["first"].slice(0..0)
                
                n = 1
                attributes[:username] = proposed
                while (self.find_by_username(attributes[:username], :limit => 1))
                    attributes[:username] = proposed + n.to_s
                    n += 1
                end
                attributes[:password] = self.create_password
                attributes[:password_confirmation] = attributes[:password]
            end

            object = new(attributes)
            scope(:create).each { |att,value| object.send("#{att}=", value) } if scoped?(:create)
            if (attributes[:password] != nil && attributes[:password_confirmation] != nil)
                object.password = attributes[:password]
                object.password_confirmation = attributes[:password_confirmation]
            end
            object.save            
            object
        end
    end
    
    ###
    # before_destroy
    # AR callback
    # don't delete accounts if they're connected to an existing OrderEntity
    #
    def before_destroy
        if (self.entities.count > 0)    
            raise OrderError.new("#{self.first.capitalize} #{self.last.capitalize} is connected to previous orders and cannot be deleted")
        end
    end
    
    ###
    # get_root_domain
    # get teh root domain of the comnpany this account belongs.  the root domain is used
    # to figure out which config-file to read. (eg: /config/vendor.yml, /config/client.yml
    #
    def get_root_domain
        self.company.domain.root
    end
    
    ###
    # create_roles
    # @param params["roles"] from the form submit
    #
    def create_roles(roles, fields = nil)
        roles.each_key do |rid|
            data = {:account_id => self.id, :role_id => rid}
            if (fields != nil)
                values = {}
                fields.each_pair do |k,v|
                    path = k.split(':')
                    if (path[0] == rid)
                        values[path[1]] = v
                    end
                end
                data[:field_value] = values
            end
            AccountRole.create(data)
        end
    end
    
    ###
    # update
    # override Base::update.  create account_roles.
    #
    def self.update(id, params)
        
        if (params["account"] != nil)
            Account.transaction do
                
                account = super(id, params["account"])
                
                # check if user updated password
                if (params["change_password"] == 'on')
                    if (account.password_equals?(params["old_password"]))
                        account.password = params["account"]["password"]
                        account.password_confirmation = params["password_confirmation"]
                        res = account.save!
                    else
                        raise RException.new('Invalid "old password"')
                    end  
                #################################################################################
                ### A QUICK HACK TO ALLOW PASSWORD CHANGES -- DOESN'T CHECK FOR OLD PASSORD
                ### POSSIBLE SECURITY RISK
                #################################################################################
                elsif (!(params["account"]["password"].nil? && params["account"]["password_confirmation"].nil?))                    
                    account.password = params["account"]["password"]
                    account.password_confirmation = params["account"]["password_confirmation"]
                    account.save!                    
                end
            
                Account.apply_roles(account, params)
                return account
            end
        else
            super
        end
    end
            
    ###
    # apply_roles
    # @todo Move this method to a common module -- it's identical to Company#apply_roles
    # @param {Array} params POST params
    #
    def self.apply_roles(account, params)           
        # apply roles                     
        selected_roles = [0]                                                                 
        if (params["roles"] != nil)                                                                           
            Role.find(params["roles"].keys).each do |r|                            
                selected_roles << r.id
                values = {} # <-- an empty hash for role-field values.
                
                # found role_fields, yay!
                if (params["role_field"] != nil)                                
                    r.fields.each do |f|
                        values[f.id] = params["role_field"][f.id.to_s]    
                    end                                                                                                
                end
                
                # save or insert role                                                                                  
                if (cr = account.account_role.find_by_role_id(r.id))                                                                                                                                
                    cr.field_value = values
                    cr.save                                                                  
                else                             
                    AccountRole.create(:account_id => account.id, :role_id => r.id, :field_value => values)
                end                            
            end                
        end
            
        # now determine if any roles have been de-activated.                
        account.account_role.find(:all, :conditions => "role_id NOT IN (#{selected_roles.join(',')})").each do |ar|
            AccountRole.destroy(ar)
        end                   
    end
    
    def to_a
        roles = self.roles.collect {|r| {:role => r.identifier.gsub('.', '-')} }
        [self.id, self.username, self.first.capitalize, self.last.capitalize, roles]
    end
            
    def to_combo_record
        roles = ''
        self.roles.each do |r|
            roles += r.identifier.gsub('.', '-')
        end
       
        return {
            :id => self.id, 
            :company => self.company.name.capitalize,
            :name => self.first.capitalize + ' ' + self.last.capitalize,
            :roles => roles
        }    
    end
    
    def to_record
        self.contact.merge(:id => self.id, :roles => self.account_role.collect {|ar| ar.to_h}) 
    end
    
    ###
    # on_edit
    # @return {Hash}
    #
    def on_edit
        data = self.attributes

        # blank password info.  don't send this to client!
        data.delete("password")
        data.delete("password_hash_type")
        data.delete("password_salt")
        
        # get simple list of role ids this account is granted.
        data[:roles] = self.account_role.collect { |ar| ar.to_h }
               
                
        
        data
    end

    ###
    # contact
    # return a list of contact information for account
    #
    def contact
        return {
            :first => self.first.capitalize,
            :last => self.last.capitalize,
            :phone => self.phone,
            :fax => self.fax,
            :email => self.email,
            :mobile => self.mobile
        }
    end

    def self.create_password
        chars = ("a".."z").to_a + ("1".."9").to_a
        return Array.new(8, '').collect{chars[rand(chars.size)]}.join
    end

    ###
    # tree_by_company_id
    # find all company nodes under company_id.  used for building trees.
    # @param {Int} domain_id
    def self.tree_by_company_id(company_id)

        select = "#{self.table_name}.id, #{self.table_name}.first, #{self.table_name}.last"

        res = self.find_all_by_company_id(company_id,
            :select     => select
        ).collect { |a|
            {:id => self.to_s + ':' + a.id.to_s, :text => a.first.capitalize + ' ' + a.last.capitalize, :iconCls => 'node-account', :leaf => true}
        }
    end
    
    ###
    # @class OrderError
    #
    class OrderError < RException
            
    end
end
