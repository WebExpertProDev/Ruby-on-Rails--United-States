class AddMiscChanges < ActiveRecord::Migration
    def self.up
        
        # add some more Ext field-params to commission fields for security.
        role = Role.find_by_identifier('vendor.sales_agent')
        field = role.fields.find_by_name('commission')
        field.config = {
            :minValue => 1,
            :minText => 'Commission must be > 0',
            :maxValue => 75,
            :maxText => 'Commission cannot exceed 70%'
        }
        field.field_type = 'number'
        field.save
        
        role = Role.find_by_identifier('vendor.sales_agent.commission_bonus')
        field = role.fields.find_by_name("bonus")
        field.config = {
            :minValue => 1,
            :minText => 'Bonus must be > 0',
            :maxValue => 30,
            :maxText => 'Bonus cannot exceed 30%'
        }
        field.field_type = 'number'
        field.save
                        
        
        unless OrderType.find_by_name('hawb_quote')
            d = Domain.find_by_name('client')
            q = OrderType.create(
                :name => 'hawb_quote',
                :label => "Quote"
            )
            OrderTypeEntity.create(
                :order_type_id => q.id,
                :domain_id => d.id,
                :name => 'shipper',
                :label => 'Shipper'
            )
            OrderTypeEntity.create(
                :order_type_id => q.id,
                :domain_id => d.id,
                :name => 'consignee',
                :label => 'Consignee'
            )
            
        end
        
        
        
        
        
        
        
                                    
    end                
    
    def self.down
            
        
    end
end
