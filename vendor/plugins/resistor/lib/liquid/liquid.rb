###
# Resistor::Liquid
# resistor extensions to Liquid
# @author Chris Scott
#
module Resistor::Liquid
    require 'liquid/ui'
    require 'liquid/db_file_system'
    require 'liquid/filters'               
end

###
# Money
# define a to_liquid method for Money class, included in environment.rb
#
class Money
    def to_liquid
        self.to_s
    end
end
    


# register resistor's custom database filesystem
Liquid::Template.file_system = Resistor::Liquid::DbFileSystem.new
