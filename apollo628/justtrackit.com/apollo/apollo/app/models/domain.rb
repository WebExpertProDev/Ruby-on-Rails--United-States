class Domain < ActiveRecord::Base
    
    ###
    # liquid_methods
    liquid_methods :name, :fields
    acts_as_tree

    has_many :fields, :class_name => "DomainField", :source => :domain_field

    #has_many :domain_company
    has_many :company

    has_many :domain_company_role
    has_many :company_roles, :class_name => "Role", :through => :domain_company_role, :source => :role
    has_many :domain_account_role
    has_many :account_roles, :class_name => "Role", :through => :domain_account_role, :source => :role
    
    ###
    # to_menu
    # return a list of domains for use as a menu.  DOES NOT INCLUDE DOMAIN ID 1
    #
    def self.to_menu
        return self.find(:all, :conditions => "id != 1", :order => "parent_id ASC").collect {|d| {:id => d.id, :parent_id => d.parent_id, :label => d.label} }
    end
    
    ###
    # to_h
    #
    def to_h
        data = self.attributes
        data[:fields] = self.fields.collect {|f| f.to_h }
        data[:roles] = {
            :company => {},
            :account => {}        
        }        
        # company roles
        self.get_company_roles.each do |r|
            data[:roles][:company][r.id] = r.to_h
        end
        
        # account roles
        self.get_account_roles.each do |r|
            data[:roles][:account][r.id] = {:id => r.id, :label => r.label, :fields => r.get_fields, :cls => r.identifier.gsub('.', '-')}
        end
                        
        data    
    end
    
    def is_a?(name)
        return true if (self.name == name)
        node = self.parent
        while (node && node.name != name)
            node = node.parent
        end
        if (node == nil)
            return false
        else
            return (node.name == name) ? true : false
        end
    end

    ###
    # get_company_roles
    # @return {Array} list of all company_roles, up the tree
    # @todo optimize
    #
    def get_company_roles
        list = self.company_roles.to_a    
        node = self.parent
        while (node)      
            list.concat(node.company_roles)                                    
            node = node.parent
        end
        return list
    end

    ###
    # get_account_roles
    # @return {Array} list of all account_roles, up the tree
    # @todo optimize
    #
    def get_account_roles
        list = self.account_roles.collect {|ar| ar}
        node = self.parent
        while (node)
            list.concat(node.account_roles)
            node = node.parent
        end
        return list
    end

    ###
    # get_all_child_ids
    #
    def get_all_child_ids(list = nil)
        list = [] if list == nil
        self.children.each do |child|
            list.push(child.id)
            child.get_all_child_ids(list)
        end
        list.push(self.id)
        return list
    end

    ###
    # get_all_parent_ids
    #
    def get_all_parent_ids(list = nil)
        list = []
        node = self.parent
        while (node)
            list.push(node.id)
            node = node.parent
        end
        return list
    end


    ###
    # get_fields
    # returns a recursive list of all DomainFields
    #
    def get_fields
        ids = self.get_all_parent_ids
        ids << 0
        
        return DomainField.find(:all, :conditions => "domain_id IN(#{ids.join(',')})")
    end

    ###
    # get_tree_nodes
    #
    # @param {Int} parent, id of parent domain
    #
    def self.get_tree_nodes(parent_id)
        select = "#{self.table_name}.id, #{self.table_name}.label"
        return self.find(
            :all,
            :conditions => "parent_id = #{parent_id}",
            :select => select
        ).collect {|d|
            {:id => self.to_s + ':' + d.id.to_s, :text => d.label, :iconCls => 'node-domain', :leaf => false}
        }
    end

    ###
    # list
    # @param {Bool} [false] include_admin, true to include *all* records, including the admin domain
    #
    def self.list(include_admin = false)
        (include_admin == true) ? self.find(:all) : self.find(:all, :conditions => ["id != 1"])
    end

end
