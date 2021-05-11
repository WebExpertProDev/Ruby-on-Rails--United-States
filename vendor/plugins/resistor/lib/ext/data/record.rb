module RExt
    module Data
        module Record
            def self.to_ext(model, columns)
                columns.collect {|c| 
                    if (m = c.match(/^\{\{(\w+)\}\}\.(\w+)$/))                        
                        c = "#{m[1].constantize.table_name}_#{m[2]}"
                    end            
                    {:name => c}
                }                                                               
            end
        end
    end
end