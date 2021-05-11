###
# require Resistor::Application
#
require 'app/application'
ActionController::Base.send(:include, Resistor::Application)

###
# allow client to execute action "update_field" on ApplicationController::Base
# this is the handler for inline-editors
#
ActionController::Base.hidden_actions.delete 'update_field'

###
# include Resistor::User
#
require 'app/user'

###
# include resistor controller mix-ins
#
require 'app/controllers/auth_controller'
require 'app/controllers/company_controller'
require 'app/controllers/region_controller'
require 'app/controllers/template_controller'

###
# include RExt::Grid module
#
require 'ext/grid/grid'
require 'ext/data/record'

###
# include resistor AR model mixins
#
require 'active_record/company'
require 'active_record/template'
require 'active_record/template_type'
require File.dirname(__FILE__) + '/active_record/base'

###
# include Liquid extensions
#
require 'liquid/liquid'

###
# namespace Resistor::Util
#
module Resistor::Util   
    # for encrypting / decrypting data on a Model
    require 'encryption/ssl'     
end

###
# Resistor View extensions
#
module Resistor::View        
    require 'action_view/asset_mgr'
    ActionView::Base.send(:include, Resistor::View::AssetMgr)
end








