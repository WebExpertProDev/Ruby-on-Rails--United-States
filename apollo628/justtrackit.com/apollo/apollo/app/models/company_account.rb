class CompanyAccount < ActiveRecord::Base
  set_table_name "company_account"


  belongs_to :company     # foreign key is company_id
  belongs_to :account     # foreign key is account_id


end
