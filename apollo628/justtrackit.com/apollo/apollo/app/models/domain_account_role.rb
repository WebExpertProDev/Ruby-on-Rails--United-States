class DomainAccountRole < ActiveRecord::Base
    
    belongs_to :role
    belongs_to :domain

end
