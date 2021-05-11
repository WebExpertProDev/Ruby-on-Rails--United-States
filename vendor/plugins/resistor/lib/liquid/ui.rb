###
# Liquid::UI
# @author Chris Scott
#
# This is a module that takes advantage of Domizio Demichelis's Module-extension found in the Liquid framework in "module_ex.rb", 
# for auto-creating the Liquid drop-class.
# 
# This extension provides your ActiveRecord::Base with the ability to query a drop class for its available liquid_methods 
# in order to create a tree of available template-tags for the user.
#
# A config hash can be provided to the tree-get method where you define your own css-class for the following 3 entities:
#   :tag (eg: {{template_tag}}
#   :has_many (eg: {% for item in collection %}
#   :belongs_to (eg: {{parent.object.tag_name}}  "object" here represents the belongs-to rel'ship
#
# Some default icon-clases are defined as constants to the module
#
# A slight change is necessary in above module, where the drop-class eval takes place:
# <code> 
#   drop_class = eval "class #{self.to_s}::LiquidDropClass < Liquid::Drop; @@liquid_methods = [#{allowed_methods.collect {|m| "'" + m.to_s + "'" }.join(',')}]; def self.get_methods; return @@liquid_methods; end; self; end" 
# </code>
#
# Once added, this module can query the drop-classes for their method-list as set via:
# <code>
#   class Company < ActiveRecord::Base  
#       has_many :accounts
#       liquid_methods :name, :phone, :address, :accounts
#       ...
#   end
#
# @usage
#   <code>
#       tree = Company.get_liquid_method_tree(:has_many => 'icon-has-many', :tag => 'icon-tag', :belongs_to => 'icon-belongs-to')
#   </code>
#
# </code>
# 
# @author Chris Scott
#

class Module
  
  def liquid_methods(*allowed_methods)
    drop_class = eval "class #{self.to_s}::LiquidDropClass < Liquid::Drop; @@liquid_methods = [#{allowed_methods.collect {|m| "'" + m.to_s + "'" }.join(',')}]; def self.get_methods; return @@liquid_methods; end; self; end"
    define_method :to_liquid do
      drop_class.new(self)
    end
    drop_class.class_eval do
      def initialize(object)
        @object = object
      end
      allowed_methods.each do |sym|
        define_method sym do
          @object.send sym
        end
      end
    end
  end
end

module Resistor::Liquid    
        
    module UI
        
        # some default icon css-classes (mapping to icons found in the 
        # silk package at http://www.famfamfam.com/lab/icons/silk/
        #
        ICON_TAG        = 'icon-tag'
        ICON_BELONGS_TO = 'icon-arrow-right'
        ICON_HAS_MANY   = 'icon-chart-organisation'
        
        ###
        # get_liquid_methods
        # @param {Object} cfg tree-node icon-cfg (css classes)
        #    @cfg :tag css-class for {{template_tag}}
        #    @cfg :has_many icon class for has many reln'ship (ie: {% for item in collection %} )
        #    @cfg :belongs_to icon-class for belongs to reln'ship (ie: {{parent.belongs_to.tag_name}}     
        # @return {Hash} node   
        #                           
        def get_liquid_method_tree(cfg = {}, is_recursing = false)
                        
            if (!self.constants.include?("LiquidDropClass"))
                return false    # <-- no drop-methods here.  run away!
            end
            
            # good-to-go
            rs = self::LiquidDropClass.get_methods                        
            thisClass = self.to_s
            
            # build node-hash
            node = {                
                :text => thisClass.downcase,  # <-- default text is classname
                :children => [],
                :leaf => false, # <-- can't know following yet -- they'll be set during recursion
                :iconCls => ''
            }      
            
            # attach child-nodes recursively
            rs.each do |m|                    
                
                # try reflecting upon this method -- maybe there's an association here...
                assn = self.reflect_on_association(m.to_sym)                
                if (assn && assn.options[:polymorphic].nil?)  
                    if (assn.klass.to_s != self.to_s || is_recursing == false)                        
                        if child = assn.klass.get_liquid_method_tree(cfg, true)                                                                                        
                            child[:iconCls] = cfg[assn.macro] || Resistor::Liquid::UI.const_get("ICON_" + assn.macro.to_s.upcase)                                                                      
                            child[:text] = m
                            node[:children].push(child)
                        end
                    end
                   
                else  
                    # no association -- just an attribute
                    node[:children].push({                        
                        :text => m,
                        :iconCls => cfg[:tag] || Resistor::Liquid::UI::ICON_TAG,
                        :leaf => true
                    })
                end
            end            
            node # <-- return the node-hash    
        end                
    end
end

# Finally, extend ActiveRecord::Base.
ActiveRecord::Base.send(:extend, Resistor::Liquid::UI)

