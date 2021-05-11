##
# Resistor::Ruport stuff
# @author Chris Scott 
# Base extensions for rendering all reports.
#
module Resistor::Ruport
    
    class Formatter < Ruport::Formatter
        def to_money(v)
            Money.new(v)
        end
    end
    
    ##
    # @class Resistor::Ruport::Controller
    #
    class Controller < Ruport::Controller
        stage :header, :body
        required_option :model
        
        def setup                                  
            self.data = Ruport::Data::Table(:column_names => self.options.model.column_names, :data => self.options.model.execute(self.options.start_date, self.options.end_date))   
        end
        
        ##
        # @class Controller::PDF
        # @module Resistor::Ruport
        #
        class PDF < Ruport::Formatter::PDF
            renders :pdf, :for => [Controller, Ruport::Controller]
            
            def build_header
                pad(10) do
                    add_text "#{options.model.label}", :justification => :center, :font_size => 22
                    if !(options.start_date.nil? && options.end_date.nil?)
                        add_text "#{options.start_date.to_s} - #{options.end_date.to_s}", :justification => :center, :font_size => 14
                    end
                end
            end
            
            def build_body
                draw_table(data)   
            end   
        end
        
        ##
        # @class Controller::Text
        # @module Resistor::Ruport
        #
        class Text < Ruport::Formatter::Text
            renders :text, :for => [Controller, Ruport::Controller]                                  
            
        end
    
        ##
        # @class Controller::Grouping
        # @module Resistor::Ruport
        # special extension of Grouping
        #
        class Grouping < Controller                        
                                    
            ##
            # @class Grouping::PDF
            # @module Resistor::Ruport
            #
            class PDF < Controller::PDF
                renders :pdf, :for => Ruport::Controller::Group
                
                def build_body                       
                    render_grouping(data, options.to_hash.merge(:formatter => pdf_writer))
                end
                                                                    
            end
        end                
    end                      
end
