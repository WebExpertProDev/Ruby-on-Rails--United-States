###
# @module Resistor::View::AssetMgr
# This module fills in teh gaps of Rails' Pro-crap-u-lo-us-pecific Asset mgmt and kicks its ass like a rented donkey.
# @author Chris Scott
#
# Mixed into ActionView::Base
#
# This class adds custom Asset management methods to more flexibly deal with css / js files
# Rails is a fucking bitch for this shit since it's so damn intertwined with pro-crapulous
# 
# This module adds teh following features:
# 1. mechanism for easily specifying default js / css includes.
# 2. mechanism for registering js / css file(s)
# 3. mechanism for including all-at-once, js & css includes into the head, accross controllers.
# 
# default js / css includes are specified in your config/environments/development.rb & production.rb files
# eg: <development.rb>
#JAVASCRIPT_DEFAULT_SOURCES = [
#    "ext-2.0/adapter/ext/ext-base",
#    "ext-2.0/ext-all-debug"
#]
#STYLESHEET_DEFAULT_SOURCES = [
#   "/javascripts/ext-2.0/resources/ext-all"
#]
#
# This module breaks from the Rails way of including assets.  In rails, assets are included via
# <%= javascript_include_tag "foo.js" %>
#
# AssetMgr works like a queue where resources are pushed onto it instead.  assets can be added to the 
# queue in both the (V)iew and (C)ontroller stages (with rails, resources are added only in (V)iew
#
# Two methods have been added to ActionController::Base so that you can register js / css
# in your controllers like this:
# class FooController < ApplicationController
#     register_js('app/foo/FooManager.js')
#     register_css('app/foo/foo.css')
#     ...
# HOWEVER:  Resistor::View::AssetMgr has some intelligence -- it will automatically look for
# any asset files in the /javascripts & /stylesheets dirs.
#
# Finally, to include all your js / css resources into your layout, simply do this in your <head>
# <head>
#     <%= include_registered_js %>
#     <%= include_registered_css %>
#
# AssetMgr is built with JsBuilder in mind -- when your app is in production mode, resources are searched-for
# in the following manner:
# <h3>Javascript:</h3>
# JAVASCRIPT_DEFAULT_SOURCES + /javascripts/deploy/controller_name-all.js 
#
# <h3>Stylesheets</h3>
# STYLESHEET_DEFAULT_SOURCES + /stylesheets/deploy/controller_name-all.css
#
# It's important to have JsBuilder correctly configured but it's quite easy to do.
#
# Voila
#
module Resistor::View::AssetMgr                  
    
    ##################################################
    # 1.  Javascript Asset Management
    ###################################################
    
    # suck-in javascript defaults from the rails environement config file (development.rb || production.rb)
    @@javascript_default_sources = (Rails::Initializer.const_defined?(:JAVASCRIPT_DEFAULT_SOURCES)) ? Rails::Initializer.const_get(:JAVASCRIPT_DEFAULT_SOURCES).dup : []
    
    # the bucket for javascript includes
    @@js_files = []
            
    ###
    # register_js
    # this method is meant to be called from your controller when you wish to include custom js lib(s)
    # adds a javascript file to the @@js_files "bucket".  you may include all files in teh bucket in your <head></head>
    # via <%= include_registered_js %>
    #
    def self.register_js(*sources)                                                
        @@js_files.concat(sources.flatten)                                
    end                        
    
    ###
    # include_registered_js
    # return html-i-fied list of js_files 
    # <head><%= include_registered_js %></head>
    #
    def include_registered_js          
                               
        case RAILS_ENV
            when 'production'
                # look for build versions of js in javascripts/deploy if app is in production
                filename = ActionView::Helpers::AssetTagHelper.const_get(:JAVASCRIPTS_DIR) + '/deploy/' + @controller.controller_name + '-all.js'
                if (!FileTest.exist?(filename)) #<-- look for /javascripts/deploy/controller_name.js                     
                    #LOG.info("Resistor::View::AssetMgr -- FAILED TO FIND DEPLOYED CONTROLLER JAVASCRIPT /javascripts/deploy/#{@controller.controller_name}")
                    #LOG.info("Loading development resources instead")
                    
                    sources = self.get_javascript_development_sources
                else
                    sources = self.get_javascript_production_sources
                end
            when 'development'
                sources = self.get_javascript_development_sources                                
        end                                                                   
        
        # return javascript_include_tag on each source
        sources.collect {|source| javascript_include_tag(source)}.join("\n")                                                                                                                                   
    end
    
    ##################################################
    # 2.  Stylesheet Asset Management
    ###################################################

    # suck-in stylesheet defaults from the rails environement config file (development.rb || production.rb)
    @@stylesheet_default_sources = (Rails::Initializer.const_defined?(:STYLESHEET_DEFAULT_SOURCES)) ? Rails::Initializer.const_get(:STYLESHEET_DEFAULT_SOURCES).dup : {}
    
    # the bucket of stylesheet includes
    @@css_files = []           
           
    ###
    # register_css
    # this method is meant to be called from your controller when you wish to add custom stylesheet(s)
    # register a css file to be included via method include_registered_css
    #
    def self.register_css(*sources)
        @@css_files.concat(sources.flatten)    
    end
    
    ###
    # include_registered_css
    # returns html-i-fied list of css files
    # this method is used in erb templates <head><%= include_registered_css %></head>
    #
    def include_registered_css                
        case RAILS_ENV
            when 'production'
                # look for build versions of js in javascripts/deploy if app is in production
                filename = ActionView::Helpers::AssetTagHelper.const_get(:STYLESHEETS_DIR) + '/deploy/app-all.css'
                if (!FileTest.exist?(filename)) #<-- look for /javascripts/deploy/controller_name.js                     
                    #LOG.info("Resistor::View::AssetMgr -- FAILED TO FIND DEPLOYED CONTROLLER JAVASCRIPT /javascripts/deploy/#{@controller.controller_name}")
                    #LOG.info("Loading development resources instead")
                    
                    sources = self.get_stylesheet_development_sources
                else
                    sources = self.get_stylesheet_production_sources
                end
            when 'development'
                sources = self.get_stylesheet_development_sources                                
        end                                                                                   
        
        # return stylesheet_link_tag on each source
        sources.collect {|s| stylesheet_link_tag(s)}.join("\n")              
    end      
    
    #################################################
    # protected
    #################################################
    
    ###
    # get_javascript_production_sources
    # loads /javascripts/deploy/controller_name.js
    # @return {Array}
    #
    def get_javascript_production_sources                        
        sources = self.get_layout_sources(@@javascript_default_sources).dup
        sources << "deploy/#{@controller.controller_name}-all"    
    end
    
    ###
    # get_javascript_development_sources
    # scans dir /javascripts/app/controller_name/*.js
    # @return {Array}
    #
    def get_javascript_development_sources
        # default + register_js
        
        sources = self.get_layout_sources(@@javascript_default_sources).concat(@@js_files.dup).uniq
        
        # include controller-specific js found in javascripts/app/controller_name.  
        path = 'app/' + @controller.controller_name
        sources.concat(Dir[File.join(ActionView::Helpers::AssetTagHelper.const_get(:JAVASCRIPTS_DIR) + '/' + path, '*.js')].collect { |file| path + '/' + File.basename(file).split(".", 0).first }.sort)
    end   
    
    ###
    # get_stylesheet_production_sources
    # loads/stylesheets/deploy/controller_name.js
    # @return {Array}
    #        
    def get_stylesheet_production_sources
        sources = self.get_layout_sources(@@stylesheet_default_sources)        
    end
    
    ###
    # get_stylesheet_development_sources
    # scans dir /stylesheets/controller_name/*.css
    # @return {Array}
    #
    def get_stylesheet_development_sources
        sources = self.get_layout_sources(@@stylesheet_default_sources).concat(@@css_files.dup).uniq
        
        # include controller-specific js found in javascripts/app/controller_name.  
        path = @controller.controller_name
        sources.concat(Dir[File.join(ActionView::Helpers::AssetTagHelper.const_get(:STYLESHEETS_DIR) + '/' + path, '*.css')].collect { |file| path + '/' + File.basename(file).split(".", 0).first }.sort)
    end
    
    ###
    # get_layout_sources
    # @param {Array}
    # reads the given defaults array (javascript || stylesheet) and tries to pick out a key based upon teh layout name.
    # if it doesn't find a layout key, it looks for a key of :default.  if that doesn't exist it returns an empty array
    # @return {Array} 
    #
    def get_layout_sources(default_sources)    
        sources = nil        
        layout = @controller.active_layout.split('/').pop().to_sym
        if (!default_sources[layout].nil?)
            sources = default_sources[layout].dup
        elsif (!default_sources[:default].nil?)
            sources = default_sources[:default].dup            
        end                
        return (!sources.nil?) ? sources : []    
        
    end
    
end