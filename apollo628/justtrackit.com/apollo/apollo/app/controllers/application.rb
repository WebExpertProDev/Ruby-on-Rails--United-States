# Filters added to this controller apply to all controllers in the application.
# Likewise, all the methods added will be available for all controllers.

require_dependency 'account'
require_dependency 'role'
require_dependency 'static_permission'

class ApplicationController < ActionController::Base
    
    INCH_TO_FOOT = 0.000578703704
                
    INCH_TO_METER = 0.000016387064
        
    # Pick a unique cookie name to distinguish our session data from others'
    session :session_key => '_apollo_session_id'

    # active_rbac -- gives us access to current_user througout app.
    acts_as_current_user_container :anonymous_user => User
                           
    layout 'base'          
    
    def initialize
        
        super
        ssl = Resistor::Util::Encryption::Ssl
        ssl::config(
            :public_key => @config[:ssl][:public_key],
            :private_key => @config[:ssl][:private_key],
            :passphrase => @config[:ssl][:passphrase]
        )                                
    end
        
end
