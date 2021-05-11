class Registration < ActionMailer::Base
    
    def to_account(account) 
        recipients      account.email
        from            "christocracy@gmail.com"
        subject         "Transmanage Account Regigstration"
        body            :account => account
        content_type    "text/html"
        
    end
end
