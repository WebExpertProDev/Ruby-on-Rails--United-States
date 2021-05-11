###
# @class DbFileSystem
# @package Resistor::Liquid
# An implementation of Liquid::FileSystem that returns files from database rather than file-system
# method read_template(filename) is called automatically by Liquid framework
# @author Chris Scott
# 
module Resistor::Liquid
    class DbFileSystem
                
        ###
        # read_template_file
        # @param {String} filename name of template to load from db
        # called automatically by Liquid framework
        # @author Chris Scott
        def read_template_file(filename)    
            begin 
                return Template.find(:first, 
                    :select => "#{Template.table_name}.content",
                    :joins => "LEFT JOIN #{TemplateType.table_name} ON #{TemplateType.table_name}.id = #{Template.table_name}.template_type_id", 
                    :conditions => "#{Template.table_name}.name = '#{filename}' and #{TemplateType.table_name}.name = 'partial'"
                ).content
            rescue
                raise Liquid::FileSystemError, "No such template '#{filename}'"
            end                        
        end
    end
end

