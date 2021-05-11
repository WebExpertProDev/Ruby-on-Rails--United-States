###
# @class User
# Application user object
# manages authentication and holds a valid Account object in @account when user is logged in
#
class Resistor::User

    # acts_as_anonymous_user

    attr_accessor :account, :root_domain

    ###
    # initialize
    #
    def initialize(*params)
        @account = nil
        @root_domain = nil

        if (params.length == 1)
            data = params[0]
            if (data[:account_id] != nil)
                @account = Account.find_by_id(data[:account_id])
                @root_domain = data[:root_domain]
                #LOG.info('root_domain: ' + @root_domain.to_s)
            end
        end
    end

    ###
    # authenticate
    # @param {String} username
    # @param {String} password
    #
    def authenticate(username, password)
        #LOG.info('Resistor::User::authenticate')

        if (acct = Account.find_by_username(username))
            if (acct.password_equals?(password))
                @account = acct                
                @root_domain = acct.get_root_domain.name
            else
                @account = nil
            end
        else
            @account = nil
        end
        return (@account != nil) ? true : false
    end

    ###
    # logout
    # log the user out
    #
    def logout
        @account = nil
        #LOG.info("User::logout: " + @account.to_s)
    end

    ###
    # has_role
    # @return {Boolean}
    #
    def has_role?(role)
       # LOG.info('Resistor::User::has_role? ' + role.to_s)

        return true if (role == 'anonymous')
        return (@account != nil) ? @account.has_role?(role) : (role == 'anonymous') ? true : false
    end

    ###
    # authenticated
    # @return {Boolean}
    #
    def authenticated?
        return (@account != nil) ? true : false
    end

    ###
    # persist
    # save user data to session
    #
    def persist

        # create persistence hash.  JUST account_id.
        data = {
            :account_id => nil,
            :root_domain => nil
        }
        if @account != nil
            data[:account_id] = @account.id
            data[:root_domain] = @root_domain
        end

        #LOG.info('Resistor::User::persist() ' + data.to_json)

        return data
    end

    ###
    # unpersist
    # class method
    # reload user data from session
    #
    def self.unpersist(data)
        #LOG.info("Resistor::User::unpersist() " + data.to_s)
        user = User.new(data)

        return user
    end
end
