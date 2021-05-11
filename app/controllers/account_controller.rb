class AccountController < ApplicationController
    
    register_js("resistor-ext2/source/application/company/CompanyManager")
    register_js("app/company/CompanyManager")
        
    def view
        @account = Account.find(current_user.account.id)
        
    end
    
    def update        
        Account.update(current_user.account.id, params)
        res = RResponse.new
        res.success = true
        res.msg = "account/update"
        respond(res)
    end
        
    
end
