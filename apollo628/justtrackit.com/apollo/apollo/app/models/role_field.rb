class RoleField < ActiveRecord::Base
    serialize :config
    belongs_to :role

    def to_h
        self.attributes
    end
end
