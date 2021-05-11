require 'reports'

##
# ProfitLossReport
# An extension built to handle the "Profit Loss" report specifically
# @author Chris Scott
#
class ProfitLossReport < Resistor::Ruport::Controller
    
    stage :header, :body
    
    def setup
        super
        # group the table   
        self.data.rename_column("Name", "Cost name")     
        self.data = Ruport::Data::Grouping.new(self.data, :by => "Company")
        
        # total each group
        self.data.each do |name, group|
            
            # monify (Money) Cost column
            group.replace_column("Cost") {|rec| Money.new(rec.get("Cost").to_f) }            
            
            # Mix first, last into Name
            group.add_column("Name", :before => "Cost name") do |rec|
                rec.get("First") + ' ' + rec.get("Last") if rec.get("First") && rec.get("Last")
            end
            
            # Mix Country, Region, City into address
            group.add_column("Address", :before => "Country") do |rec|
                "#{rec.get('City')}, #{rec.get('Region')}, #{rec.get('Country')}, #{rec.get('Zip')}, phone: #{rec.get('Phone')}"
            end
            
            # removed up mixed columns
            group.remove_column("Country")
            group.remove_column("Region")
            group.remove_column("City")
            group.remove_column("First")
            group.remove_column("Last")  
            group.remove_column("Zip")
            group.remove_column("Phone")
            
            # add a summary row            
            rec = group.record_class.new({"Cost name" => "Total", "Cost" => Money.new(group.sigma {|r| r.get("Cost").cents})})
            group << rec
                        
        end
        
    
    end
        
    class PDF < Resistor::Ruport::Controller::Grouping::PDF
        renders :pdf, :for => [::ProfitLossReport, Ruport::Controller::Group]   
        
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

