module Resistor::TemplateType
    
    ###
    # included
    # called automatically when include Resistor::TemplateType is called
    #
    def self.included(klass)
        
        # extend Template with class-methods.
        klass.extend ClassMethods   
        
        # attach assns and such
        klass.class_eval do
            has_many :template
        end
    end
    
    ###
    # Class methods
    #
    module ClassMethods
        def get_tree_nodes 
            return self.find(:all, :conditions => "name != 'partial'", :order => "name").collect {|t|
                {:id => "#{self.to_s}:#{t.id.to_s}", :text => t.label, :leaf => false}
            }       
        end    
    end
end
