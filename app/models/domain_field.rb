class DomainField < ActiveRecord::Base
    
    ###
    # liquid_methods
    liquid_methods :name, :label
    
    serialize :config
    belongs_to :domain
        
    def to_h 
        self.attributes            
    end

end
