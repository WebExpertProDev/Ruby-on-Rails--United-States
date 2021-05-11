module Resistor::Template
            
    attr_accessor :object
    
    ICON_PARTIAL    = 'icon-plugin'
    ICON_VIEW       = 'icon-page'
    ICON_THEME      = 'icon-page'
    
    ###
    # included
    # this is low-level module-piping.  this method is automatically called when a module is included via
    # include Resistor::Template
    #
    def self.included(klass)
        klass.extend ClassMethods
        
        # add assns to Template class
        klass.class_eval do
            liquid_methods :name, :label
            attr_accessor :object
            belongs_to :type, :class_name => "TemplateType", :foreign_key => "template_type_id"    
        end                    
    end                 
    
    ###
    # load 
    # given a pk, the Template will constantize its "model" attribute and try to call find(pk) upon it.
    #
    def load(pk)
        if (!self.model)
            raise InvalidTemplateModel.new("This template-type '#{self.model}' has no data-model attached to it")                        
        end        
        if (!self.model.constantize.respond_to?("find"))
            raise InvalidTemplateModel.new("This template-type '#{self.model}' is defined with model named '#{self.model}' which doesn't seem to be an ActiveRecord class")
        end
        @object = self.model.constantize.send('find', pk) 
    end
    
    ###
    # get_methods
    # return a tree dada-structure of methods
    # @return {Object} 
    #
    def get_methods
        if !self.model
            return false
        end
        model = self.model.constantize
        if (!model.respond_to?('find'))
            return false
        end
        tree = model.send('get_liquid_method_tree')                    
        
        corp = ::Company.get_liquid_method_tree
        corp[:text] = 'corp'
        
        document = self.class.get_liquid_method_tree
        document[:text] = 'document'
        
        return [         
            document,
            {:text => 'host', :iconCls => Resistor::Liquid::UI::ICON_TAG, :leaf => true},            
            corp,
            tree
        ]
    end
        
    ###
    # to_h
    #
    def to_h
        return {:id => self.id, :name => self.name, :label => self.label}
    end
            
    ###
    # render_by_model_id
    # renders a template, loading a model using supplied id.  discovers which model to load with template's own "model" attr.
    # @param {Integer} id
    # @param {String} theme name
    #
    def render_by_model_id(id, theme_name, host = 'localhost')                              
        if (!self.model)
            raise InvalidTemplateModel.new("This template '#{self.name}' has no data-model attached to it")                        
        end        
        if (!self.model.constantize.respond_to?("find"))
            raise InvalidTemplateModel.new("This template '#{self.name}' is defined with model named '#{self.model}' which doesn't seem to be an ActiveRecord class")
        end        
        return render_model(self.model.constantize.send('find', id), theme_name, host)
               
    end
    
    ###
    # render_model
    # @param {ActiveRecord::Base} model
    # @param {String} theme_name (eg: print, fax, email)
    # @param {String} host, the asset_host url
    #
    def render_model(model, theme_name, host = 'localhost:3001')
        
        # sanity-check the model before we try to load it.
        if (!theme_name || !theme = ::Template.find_theme(theme_name))
            raise ThemeLoadError.new("Theme '#{theme_name} not found")
        end
        
        # good-to-go...
        data = {
            "document" => self,            
            "corp" => ::Company.find(1),            
            "host" => host,
            model.class.to_s.downcase => model                  
        }
        
        return ::Template.render_to_theme(self, data, theme) 
        
    end
    
    ###
    # render
    #
    def render(theme_name, asset_host)
        # sanity-check the model before we try to load it.
        if (!theme_name || !theme = ::Template.find_theme(theme_name))
            raise ThemeLoadError.new("Theme '#{theme_name} not found")
        end
        
        # check @object is loaded
        if (@object.nil?)
            raise DataObjectNotLoaded.new("Template::render -- data object not loaded!")
        end
        
        # good-to-go...
        data = {
            "document" => self,
            "corp" => ::Company.find(1),
            "host" => asset_host,
            self.model.downcase => @object                  
        }
        
        return ::Template.render_to_theme(self, data, theme)     
    end
    
    ###
    # ClassMethods
    # methods attached to Template class
    #
    module ClassMethods               
        def get_tree_nodes(template_type_id) 
            type = ::TemplateType.find(template_type_id)        
            case (type.name)
                when "theme"                                        
                    return self.find_all_by_template_type_id(template_type_id, :order => "name").collect {|t|
                        {:id => "#{self}:#{t.id.to_s}", :text => t.name, :iconCls => ICON_THEME, :leaf => true}
                    }       
                when "view"                
                    joins = "LEFT JOIN #{::TemplateType.table_name} ON #{::TemplateType.table_name}.id = #{::Template.table_name}.template_type_id"
                    conditions = "#{::TemplateType.table_name}.name = 'view' OR #{::TemplateType.table_name}.name = 'partial'"
                    order = "#{::TemplateType.table_name}.name, #{::Template.table_name}.name ASC"
                    rs = self.find(:all, :joins => joins, :conditions => conditions, :order => order)
                    return rs.collect {|t| 
                        icon_cls = const_get("ICON_" + t.type.name.upcase)
                        {:id => "#{self}:#{t.id.to_s}", :text => t.name, :iconCls => icon_cls, :leaf => true}
                    }
            end
                               
        end
        
        ###
        # find_by_model
        # returns a list of documents mapped to a particular Model.  does a join on template_type.
        # @param {String} model-name
        # @return {Array} list of docs
        def find_by_model(name)
            type = ::TemplateType.find_by_name('view')        
            self.find(:all, :conditions => "model = '#{name}' AND template_type_id = #{type.id}")  
        end
        
        ###
        # find_theme
        # @param {String} theme name
        # @return {Template} theme
        #
        def find_theme(name)
            self.find_by_name(name, :conditions => "#{::TemplateType.table_name}.name = 'theme'", :joins => "LEFT JOIN #{::TemplateType.table_name} ON #{::Template.table_name}.template_type_id = #{::TemplateType.table_name}.id")
        end
        
        ###
        # render_to_theme
        # pushes supplied template into supplied template then renders supplied data into the mix
        # @param {Template} tpl
        # @param {Hash} data
        # @param {Template} theme
        # @return {String} output from liquide
        #
        def render_to_theme(tpl, data, theme)        
            theme.content.sub!(/\{\{content_for_layout\}\}/, tpl.content)   
            theme.content.gsub!(/\n|\t/, "")                                 
            
            return Liquid::Template.parse(theme.content).render(data)
        end
    end       
end

###
# @exception DataObjectNotLoaded
# fires when you try to render a template that hasn't had its data-object loaded via "load" method
# 
class DataObjectNotLoaded < RException
    
end

###
# InvalidTemplateModel
#
class InvalidTemplateModel < StandardError
    attr_accessor :errors

    def initialize(errors)
        @errors = errors
        super
    end
end

###
# ThemeLoadError
#
class ThemeLoadError < StandardError
    attr_accessor :errors

    def initialize(errors)
        @errors = errors
        super
    end
end
