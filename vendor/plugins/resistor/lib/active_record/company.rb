###
# Resistor::Company
# resistor extensions to Company model
# @author Chris Scott
#
module Resistor::Company
    
    def self.included(klass)
        klass.extend ClassMethods  
        
        klass.class_eval do
            # add associations here.
        end
    end
    
    module ClassMethods
        
    end
    
end




