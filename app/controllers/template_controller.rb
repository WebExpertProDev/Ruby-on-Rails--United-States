class TemplateController < ApplicationController
    
    include Resistor::TemplateController
    register_js 'resistor-ext2/source/application/template/TemplateMgr'
       
end
