class ReportMailer < ActionMailer::Base
    
    def report_pdf(name, pdf)
        
        corp = Company.find(1)
        accountant = corp.accountant                                 
                                       
        recipients      "#{accountant.email}, christocracy@gmail.com"
        from            "#{corp.name} <#{corp.head_office.email}>"
        subject         "#{name} Report"
        headers         "Reply-to" => "#{corp.head_office.email}"
        part "text/plain" do |p|
            p.body = "This is the #{name} report"
        end 
                    
        attachment "application/pdf" do |a|
            a.body = pdf           
            a.filename = "#{name}.pdf"
        end    
        
    end

    
end
