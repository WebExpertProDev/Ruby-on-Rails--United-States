class SystemRevenuType < ActiveRecord::Base
    def to_h
        {:id => id, :name => name}
    end
end
