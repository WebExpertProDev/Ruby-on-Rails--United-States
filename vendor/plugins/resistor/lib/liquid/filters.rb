###
# Resistor::Liquid::Filters
# @author Chris Scott
#
module Resistor::Liquid
    module Filters        
                        
        ###
        # find
        # {% order.entities | find: 'type.name', 'shipper'
        def find(list, field, value)
            path = field.split('.')               
            item = list.find { |i|   
                ptr = i
                path.each do |m|                    
                    if (!ptr.respond_to?(m))
                        return false
                    end
                    ptr = ptr.send(m)                                            
                end                 
                (ptr == value) ? true : false
            }            
            item                       
        end
        
        ###
        # get_yaml_field
        # @param {Liquid::Drop} 
        def get_field(values, name, assn)                             
            if (assn.respond_to?('find'))
                if (f = assn.find { |i| (i.name == name) ? true : false })                                                    
                    return values[f.id]
                else
                    return "unknownn field #{name}"
                end
            else
                return 'ERROR: get_field | {String} {Array}'
            end                                               
        end   
        
        def even_or_odd(v)
            (v % 2 == 0) ? 'odd' : 'even'
        end
        
        def to_money(v)
            Money.new(v.to_f).to_s
        end
                
    end
    Liquid::Template.register_filter(Filters)    
end

