class AuthController < ApplicationController

    # use system as layout.
    layout "system"

    include Resistor::AuthController
    
end




