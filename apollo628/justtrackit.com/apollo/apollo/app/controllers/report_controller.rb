class ReportController < ApplicationController
    
    def list
        res = RResponse.new
        res.msg = 'report/list'
        res.success = true
        res.data = Report.find(:all).collect { |r| r.to_h }
        respond(res)
    end
    
    ##
    # execute
    # run a report
    #
    def execute       
        res = RResponse.new        
        report = Report.find(params[:id])
        peer = report.model.constantize
        
        key = "report_#{report.id.to_s}".to_sym
        
        if params["start"] == '0'
            res.msg = 'start'
            
            #- every friday, pay sales-agnets sat-fri business paid the *next* friday
            #- run "sales-agents reports" revenu, cost, profit, their %, their $
            # 1.  find closest next friday
            # 2.  
            c = {                
                :payable_status => 'on',
                :data => {
                    :start => '04/01/2008',
                    :end => '05/20/2008'
                },
                :payable_type => 'CompanySalesAccount'
            }
            rs = peer.send('prepare_filter', c)
            session[key] = rs
        end    
        
        res.data = {
            :rs => peer.send('filter', session[key], params["limit"], params["start"]),
            :total => session[key].length
        }
        res.success = true        
        respond(res)        
    end
    
    ##
    # execute2
    # built to replace execute above, which is being used temporarily by accounting_controller
    # 
    def execute2
        res = RResponse.new                 
        res.data = Report.find(params[:id]).execute        
        res.msg = "report/execute2, #{res.data.length.to_s} rows"
        res.success = true
        respond(res)
    end
    
    def print      
        report = Report.find(params[:id])
        send_data(report.render(:pdf), :disposition => 'inline', :filename => "#{report.name}.pdf", :type => "application/pdf")
    end
    
    def view
        @report = Report.find(params[:id])
        
        render(:layout => false)
    end
    
    def update_criteria
        raise RException.new("Could not locate 'report' form") if params["report"].nil?
        
        report = Report.find(params[:id])
                        
        report.update_attributes(params["report"])
        
        res = RResponse.new
        res.msg = 'Updated report criteria'
        res.data[:criteria] = report.criteria
        res.data[:columns] = RExt::Grid::ColumnModel.to_ext(report.columns)        
        res.data[:record] = report.record
        res.success = true
        respond(res)
        
    end

end
