class OrderEntityDomainValue < ActiveRecord::Base

    belongs_to :order_entity
    belongs_to :field, :class_name => "DomainField", :foreign_key => "domain_field_id"

end
