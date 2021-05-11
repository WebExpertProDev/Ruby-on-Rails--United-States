class DomainCompany < ActiveRecord::Base
    
    belongs_to :domain, :class_name => 'Domain', :foreign_key => 'domain_id'
    belongs_to :company, :class_name => 'Company', :foreign_key => 'company_id'

end
