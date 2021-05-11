class OrderType < ActiveRecord::Base

    has_many :entities, :class_name => "OrderTypeEntity", :source => :order_type_entity
    has_many :docs, :class_name => "OrderTypeDoc", :source => :order_type_doc
    
    liquid_methods :name
    
    ###
    # generate_bill_number
    # @param {Integer} offset, the starting-seed for all bill numbers of this type.
    # generate a unique bill number
    #
    def generate_bill_number(offset)        
        case self.name
            when "hwb"
                return offset + Order.count(:conditions => "order_type_id = #{self.id} AND NOT bill_number IS NULL").to_i
            else
                raise GenerateBillNumberException("OrderType::generate_bill_number does not know how to generate a bill_number for the order_type #{self.name}").new              
        end
    end
end

###
# GenerateBillNumberException
#
class GenerateBillNumberException < RException
        
end