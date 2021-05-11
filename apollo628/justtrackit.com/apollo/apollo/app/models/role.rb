class Role < ActiveRecord::Base

    acts_as_role

    has_many :account_role
    has_many :account, :through => :account_role

    has_many :company_role
    has_many :company, :through => :company_role

    has_many :role_static_permission
    has_many :static_permission, :through => :role_static_permission
    has_many :fields, :class_name => 'RoleField', :source => :role_field


    ###
    # get_fields
    # return an array of role-fields
    # @return {array}
    #
    def get_fields
        fields = []
        self.fields.each do |f|
            fields << f.to_h
        end
        return fields;
    end
    
    ###
    # to_h
    #
    def to_h
        return {:id => self.id, :label => self.label, :fields => self.get_fields, :cls => self.identifier.gsub('.', '-')}
    end

end