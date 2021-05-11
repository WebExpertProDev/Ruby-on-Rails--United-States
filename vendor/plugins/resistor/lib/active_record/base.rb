###
# Resistor::Company
# resistor extensions to Company model
# @author Chris Scott
#
module Resistor::ActiveRecord
    module Base
        ##
        # InstallError
        #
        class InstallError < StandardError            
        end
        
        def self.included(klass)
            klass.extend ClassMethods  
            
            klass.class_eval do
                # add associations here.
            end
        end
    
        module ClassMethods
            
            ##
            # install
            # @param {Array} array of attribute hashes.
            # recursively self-reflectively parse the incoming recordset.  reflects on associations and compares to keys in rs-data.
            # if a key is found, it's removed before sending to create.  if a :has_many assn is found, processing of the array is 
            # delegated recursively to the association reflection-class.
            # TODO: ADD ERROR-CHECKING!!!!!!!!!!!!
            #
            def install(rs)   
                puts "#{self}.install"                
                refls = self.reflections # <-- list of all associations available on this Model (:belongs_to, :has_may, etc)            
                rs.each do |row|                      
                    data = row.dup
                    
                    assns = {} # <-- subset of associations found in incoming data    
                    
                    ##########################################################
                    # 1. iterate through reflections, pick-out matching assns 
                    #    from incoming data and hash them.  note that if a :belongs_to
                    #    is found here, we need to discover the corresponding FK 
                    #    for the INSERT immediately following this block. 
                    #
                    refls.keys.each do |k|
                        # remove associated-data from hash.  discover PK.
                        if !data[k.to_sym].nil?
                            assns[k] = data.delete(k.to_sym) 
                            if refls[k].macro == :belongs_to
                                model = nil
                                refls[k].klass.columns.each do |col|
                                    # all we have here is a string of data.  not sure what column it maps to.
                                    # it could be a role name, like vendor.sales_agent.  look for all string columns on 
                                    # reflected model and call find_by_x until (hopefully) a model is returned.
                                    if model.nil? && col.type == :string                                                                                         
                                        model = refls[k].klass.send("find_by_#{col.name}", assns[k])
                                        data[refls[k].primary_key_name] = model.id
                                    end
                                end
                            end
                        end
                    end
                    
                    ############################################################                                                          
                    # 2. good-to-go on ActiveRecord::Base.create().  
                    #    this is the only time create is called in this function.
                    #    all association-data has been removed and stored in the assns hash.
                    #                                  
                    r = self.create(data)                    	  
                    
                    ############################################################        
                    # 3. now look for :has_many associations and recurse into 
                    #    the reflections.
                    #
                    if (assns.keys.length > 0)
                        assns.each_pair do |name, assndata|                            
                            peer = refls[name].klass    
                            # TODO: this IF-block could prob. be refactored into else to follow.
                            # note how both iterate assndata ("association-data") and call peer.send('install', assndata)
                            # :children *is* :has_many
                            if name == :children    # <-- acts_as_tree
                                refl = refls[name]
                                assndata.each do |rec|
                                    rec[:parent_id] = r.id
                                end
                                # we're done here.  recurse into association
                                peer.send('install', assndata)  # <-- recurse into the tree
                            else
                                if refls[name].options[:through]    #<-- :through, found...follow it....
                                    refl = self.reflect_on_association(refls[name].options[:through])
                                    peer = refl.klass
                                else
                                    refl = peer.send('reflect_on_association', self.table_name.to_sym)  #<-- end-of-the-line
                                end                            
                                
                                if (refls[name].macro == :has_many)                                                                       
                                    assndata.each do |rec|                                                                                                
                                        if rec.kind_of?(String)
                                            # here we have an array of strings which represent a pk to some model.
                                            # [role.identifier], for example.
                                            tpeer = refls[name].klass                                             
                                            model = nil
                                            t = 0
                                            cols = tpeer.columns
                                            
                                            # iterate through list of columns and call find_by_column_name(rec) until model is returned.
                                            while (model.nil? && t < cols.length)                                           
                                                if cols[t].type == :string                                                                                                              
                                                    if model = tpeer.send("find_by_#{cols[t].name}", rec)                                                     
                                                        # model found -- turn the string into a hash and attach key.
                                                        rec = assndata[assndata.index(rec)] = {                                                             
                                                            peer.reflect_on_association(tpeer.table_name.to_sym).primary_key_name => model.id
                                                        }                                                              
                                                    end
                                                end
                                                t += 1
                                            end  
                                            # blowup if a model was not found corresponding to rec
                                            raise InstallError.new("--Install Error: The #{peer.to_s} corresponding to the String '#{rec}' could not be located\n") if model.nil?                                            
                                        end   
                                        
                                        # phew...attach the reflection-model's pk
                                        rec[refl.primary_key_name.to_sym] = r.id                                        
                                    end                         
                                    # we're done here.  recurse into reflection
                                    peer.send('install', assndata)
                                end
                           end
                        end                    
                    end                                                            
                end                
            end                        
        end
    end    
end

##
# mix-into AR::Base
# 
ActiveRecord::Base.send(:include, Resistor::ActiveRecord::Base)
