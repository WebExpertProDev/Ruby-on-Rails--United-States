module RExt
    module Grid
        module ColumnModel
                    
            ##
            # to_ext
            # reformats an incoming array of columns into Ext.grid.ColumnModel format
            # @param {Array {:header => 'Header Text', :name => 'column_name'}}
            # @return {Array}
            #
            def self.to_ext(columns)
                columns.collect { |c|
                    d = c.dup
                    if (m = d[:dataIndex].match(/^\{\{(\w+)\}\}\.(\w+)$/))                        
                        d[:dataIndex] = "#{m[1].constantize.table_name}_#{m[2]}"
                    end  
                    d                   
                }    
            end
        end       
    end
end