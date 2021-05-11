###
# Resistor::AuthController
# @author Chris Scott
#
module Resistor::AuthController
    

    ###
    # authenticate
    #
    def authenticate

        res = RResponse.new

        # get current_user
        user = current_user

        # authenticate
        if (user.authenticate(params["username"], params["password"]))
            res.success = true
            res.msg = 'Login success'
            res.data[:url] = @config[:login_success_url] # <-- wrap this in a method.  do role-based success_url.  config/application.yml

            # this data can be added to cookie on client
            res.data[:account] = {:id => user.account.id, :username => user.account.username, :first => user.account.first, :last => user.account.last}
        else
            res.msg = 'Invalid username or password'
        end

        self.current_user = user

        # talk to client
        respond(res)

    end

    def check_auth
        res = {
            :success => true,
            :msg => ''
        }
        user = current_user
        if (user.authenticated?)
            res[:msg] = 'true: ' + user.account.username
        else
            res[:msg] = 'false'
        end

        render :json => res.to_json, :layout => false
    end
    ###
    # logout
    # log user out
    #
    def logout

        # get current_user
        user = current_user

        # logout user
        user.logout

        # save to persistence
        self.current_user = user

        redirect_to(auth_url)

    end
end