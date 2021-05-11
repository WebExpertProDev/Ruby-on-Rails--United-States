class RoleStaticPermission < ActiveRecord::Base

  set_table_name "role_static_permission"
  
  belongs_to :role                # foreign key is role_id
  belongs_to :static_permission   # foreign key is static_permission_id

end
