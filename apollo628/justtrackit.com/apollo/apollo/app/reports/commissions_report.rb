require 'reports'

##
# CommissionsReport
# An extension built to handle the "Profit Loss" report specifically
# @author Chris Scott
#
class CommissionsReport < Resistor::Ruport::Controller
    
    stage :header, :body
    
    def setup
        super
        # rename some columns for clarity
        self.data.rename_column("Amount", "Invoice") 
        self.data.rename_column("Cost", "Commission")
        self.data.remove_column("Name")
        
        # load associated Invoices in order to get total order-cost
        rs = Invoice.find(self.data.collect {|rec| rec.get("Invoice ID")}.uniq, :include => [:order])
        
        # get total order-cost
        self.data.add_column("Costs", :after => "Invoice") do |rec|            
             rs.find { |i| i.id == rec.get("Invoice ID").to_i}.order_cost            
        end
        # remove Invoice ID column
        self.data.remove_column("Invoice ID")
        
        # format Invoice date column
        self.data.replace_column("Invoice date") {|rec| rec.get("Invoice date").to_date.to_s}
        
        # monify (Money) Cost column
        self.data.replace_column("Commission") {|rec| Money.new(rec.get("Commission").to_f) }      
        
        # monify (Money) Invoice Amount column
        self.data.replace_column("Invoice") {|rec| Money.new(rec.get("Invoice").to_f) }      
                    
        # Mix first, last into Name
        self.data.add_column("Name", :before => "Rate") do |rec|
            rec.get("First") + ' ' + rec.get("Last") if rec.get("First") && rec.get("Last")
        end
        
        # Mix Country, Region, City into address
        self.data.add_column("Address", :before => "Country") do |rec|
            "#{rec.get('City')}, #{rec.get('Region')}, #{rec.get('Country')}, #{rec.get('Zip')}, phone: #{rec.get('Phone')}"
        end
        
        # removed up mixed columns
        self.data.remove_column("Country")
        self.data.remove_column("Region")
        self.data.remove_column("City")
        self.data.remove_column("First")
        self.data.remove_column("Last")  
        self.data.remove_column("Zip")
        self.data.remove_column("Phone")
        
        # group the data by Compnay
        self.data = Ruport::Data::Grouping.new(self.data, :by => "Company")
        
        # total each group
        self.data.each do |name, group|                                                                                    
            rec = group.record_class.new({"Name" => "Total", "Commission" => Money.new(group.sigma {|r| r.get("Commission").cents})})
            group << rec                                                
        end                           
    end
        
    class PDF < Resistor::Ruport::Controller::Grouping::PDF
        renders :pdf, :for => [::CommissionsReport, Ruport::Controller::Group]   
        
        ##
        # build_group_header
        # custom group header show address in header.
        #
        def build_group_header             
            pad(10) do
                add_text(data.name, :font_size => 14, :justification => :center)                
                add_text(data.data.first.get("Address"), :font_size => 12, :justification => :center)
            end
            data.remove_column("Address")            
        end
        
    end
    
    class Text < Ruport::Formatter::Text
        renders :text, :for => [Ruport::Controller::Group, Ruport::Controller::Grouping]        
    end
   
end

