class SystemLogType < ActiveRecord::Base
    
    def to_h
        {:name => name, :label => label, :icon => icon}
    end
    
end
