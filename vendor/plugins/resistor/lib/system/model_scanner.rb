module Resistor::System
    
    ###
    # ModelScanner
    # scan the list-of-files in teh app/models directory.  can return Ext tree-node hash
    #
    class ModelScanner
            
        ####
        # get_models
        # return an array of the list of found models
        # @return Array
        #
        def self.get_models
            return self.scan.collect { |item| [item]}
        end
        
        def self.get_models_as_tree
            
        end
        
        ###
        # show_tables
        # @param {String} model name
        # @return {Array} list of column of supplied model
        #
        def self.get_columns(model)                                    
            model.constantize.send('column_names').collect {|col| 
                {:text => col, :id => "#{model}:#{col}", :leaf => true}
            }            
        end
    
        ###############################################
        #
        #
        protected
    
        ###
        # load
        # scans the app/models/* dir and returns a list of ActiveRecord classes.
        # @return Array
        #
        def self.scan
            ds = []
            path = 'app/models'
    
            # trap files and convert /app/models/filename.rb -> Filename
            dir = Dir[path + '/*']
            dir.each do |f|
                m = /^#{path}\/(.*).rb$/.match(f)
                if (m != nil)                    
                    ds.push(m.captures.to_s.split('_').collect {|m| m.capitalize}.to_s)
                end
            end
            return ds
        end
    end
end
