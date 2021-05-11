class StaticPermission < ActiveRecord::Base
    set_table_name "static_permission"
    acts_as_static_permission
    belongs_to :role

    has_many :role_static_permission
    has_many :role, :through => :role_static_permission
end
