
###
# override ActionController::Base::render
# if it finds an rresponse, placed there by self.set_response
#
module ActionController

    class Base

        # hi-jack teh main render method to do some magic.
        alias_method :original_render, :render

        # authorize
        before_filter :authorize

        ###
        # ActionController::Base::register_js
        # used in controllers for registering a js file
        # defers to Resistor::View::AssetMgr in lib/view/asset_mgr.rb
        #
        def self.register_js(*files)
            Resistor::View::AssetMgr.register_js(files)
        end

        ###
        # ActionController::Base::register_css
        # used in controllers for registering a css file
        # defers to Resistor::View::AssetMgr in lib/view/asset_mgr.rb
        #
        def self.register_css(*files)
            Resistor::View::AssetMgr.register_css(files)
        end

        ###
        # render
        # override ActionController::Base::render
        # checks if this is an ajax req.  if so, it'll render the response_queue as JSON
        # if not ajax, simply pass on to super to deal with.
        #
        def render(*params)

            if (@exception != nil)  # <-- look!  an exception was set.

                if request.xml_http_request?
                    res = RExceptionResponse.new(:exception => @exception)
                    original_render(:json => res, :layout => false)
                else
                    original_render(:text => "<h1>Exception caught at #{controller_name}/#{action_name}</h1><h3>#{@exception.message}</h3><pre>" + @exception.backtrace.join("\n") + '</pre>', :layout => false)
                end

                return false
            end

            if (@rres != nil)

                if (@rres.kind_of?(RResponse))
                    if (@rres.debug)
                        output = "<h1>DEBUG json response from #{controller_name}/#{action_name}</h1>"
                        output += "<p>success: #{@rres.success}</p>"
                        output += "<P>msg: #{@rres.msg}</p>"
                        output += "<p>data: #{@rres.data.to_json}</p>"
                        output += "<hr />"
                        original_render(:text => output, :layout => false)
                    else
                        original_render(:json => @rres, :layout => false)
                    end

                else
                    original_render(:json => @rres, :layout => false)
                end
            else
                original_render(*params)
            end
        end
    end
end

###
# RApplication module
# @author Chris Scott
#
# adds ajax methods for dealing with request / response
#
module Resistor

    ###
    # @module Application
    # included by your ApplicationController
    #
    module Application

        attr_accessor :rres

        def initialize
            LOG.info("\n\nHello from Resistor::Application")



            # ptr to Resistor response object
            @rres = nil

            # ptr to Resistor exception object
            @exception = nil

            self.load_application_config
        end

        ###
        # update_field
        # application-wide field-updater.  used for auto-updating inline-fields.
        # THIS COULD BE A SECURITY RISK.  EXISTING ROLES / AUTH ARE IN-EFFECT THOUGH.
        #
        def update_field
            res = {
                :success => false,
                :msg => '',
                :data => {}
            }

            if (params["model"] == nil)
                res[:msg] = 'order/update_field -- no model specified'
            else
                peer = nil
                case params["model"]
                    when "entity"
                    peer = OrderEntity
                    when "company"
                    peer = Company
                    when "order"
                    peer = Order
                    when "order_revenu"
                    peer = OrderRevenu
                else
                    res[:msg] = 'Could not locate that model'
                end
                if (peer != nil)
                    obj = peer.new  # <-- create a dummy instance of peer to check if method exists.
                    if (!obj.respond_to?(params["field"].to_a[0][0])) #<-- check the first key of hash only.
                        res[:msg] = 'Error: Invalid field'
                    else
                        model = peer.update(params[:id], params["field"])
                        if (!model.errors.empty?)
                            res = self.process_error(model.errors, res)
                        else
                            field = params["field"].to_a
                            res[:msg] = 'Updated field'
                            res[:data][:field] = field[0][0]
                            res[:data][:value] = field[0][1]
                            res[:success] = true
                        end
                    end
                end
            end
            render :json => res, :layout => false
        end

        ###
        # respond
        # adds an ajax response to be rendered
        #
        def respond(res)
            @rres = res
        end

        ###
        # get_config_param
        # @param {String} config param name in application.yml or domain_name.yml
        # @return {Hash/String/nil} the requested config param || nil
        # @see Resistor::Application.load_application_config
        # @raises Resistor::Application::UnknownConfigParamError
        #
        def get_config_param(key)
            if (@config[key].nil?)
                raise Resistor::Application::UnknownConfigParamError.new("Attempt to load unknown application config param '#{key}'")
            end
            @config[key]
        end

        ###
        # get_service
        # @param {Symbol} the service name to retrieve
        # @return {Hash} the service config from application.yml
        # @raises Resistor::Application::ServiceNotDefinedError
        #
        def get_service(name)
            if (@config[:services].nil?)
                raise Resistor::Application::ServiceNotDefinedError.new("The application config file has no services defined")
            end
            if (@config[:services][name].nil?)
                raise Resistor::Application::ServiceNotDefinedError.new("Attempt to load an unknown application service named #{name}")
            end
            @config[:services][name]
        end

        ###
        # protected methods
        #
        protected

        ###
        # load_application_config
        #
        def load_application_config

            filename = 'config/application.yml'

            if (!FileTest.exist?(filename)) # no yaml config detected.  just return.
                # raise Error
                return false
            end

            # load application config file
            @config = YAML.load(File.read(filename))

        end

        ###
        # load_domain_config
        # account has just been authorized.  get their root domain and search for a correspondingly-named
        # config file in /config (eg: /config/admin.yml, /config/client.yml, /config/vendor.yml)
        #
        def load_domain_config
            filename = nil

            if (!self.current_user.account.nil?)
                filename = 'config/' + self.current_user.root_domain + '.yml' # <-- figure out acct's root-domain (admin, client || vendor)
            else
                filename = 'config/anonymous.yml'
            end

            if (!FileTest.exist?(filename)) # no yaml config detected.  just return.
                # raise Error
                #LOG.info('Resistor::Application::load_domain_config -- could not locate domain config file: "' + filename + '"')
                return false
            else
                #LOG.info("Loading file #{filename.to_s}")
                # merge domain-config with main config
                @config.merge!(YAML.load(File.read(filename)))
                #LOG.info('load_domain_config')
            end
        end

        ###
        # get_ext_cookie
        # get ext-created coolies
        #
        def get_ext_cookie(key)
            c = cookies['ys-' + key]
            row = c.split(/:/)
            case row[0]
                when 's'
                return row[1]
                when 'n'
                return row[1].to_s
                when 'o'
                return JSON.parse(row[1])
            end
            return false
        end

        ###
        # process_error
        # process an ActiveRecord error.  builds your error response for you.
        #
        def process_error(errors)

            res = {
                :msg => '',
                :fields => []
            }
            errors.each do |err|
                res[:fields].push(err[0])
                res[:msg] += "<p>#{err[0]} #{err[1]}</p>"
            end
            res
        end

        ###
        # authorize
        # reads application config and determines if this controller has a required role.
        # if so, it queries current_user for that role.  if not found, redir to auth_url (defined in routes.rb)
        #
        # @author Chris Scott
        def authorize
            if (controller_name == 'region')
                return true
            end
            if (current_user.has_role?('admin')) # <-- admin is good.  he need go not further.
                load_domain_config
                return true
            end

            if (!@config[:auth][controller_name].nil?) # <-- compare user's role with required_role on controller

                auth = @config[:auth][controller_name]

                # check if current_user has required_role
                if (!current_user.has_role?(auth[:required_role]))
                    redirect_to(auth_url)
                    #return false
                end
            end
            load_domain_config
            return true
        end

        ###
        # private
        #
        private

        ###
        # rescue_action
        #
        def rescue_action(e)
            @exception = e
            log_exception(e)
            render
        end

        ###
        # global rescue handler (development)
        # @param Exception
        # aliased to rescue_action_public
        #
        def rescue_action_locallyyyyyyyyyyyy(e)
            @exception = e
            log_exception(e)
            rescue_action_in_public(e)
        end

        ###
        # global rescue handler
        # @param Exception
        #
        def rescue_action_in_publiccccccccccccccc(e)
            @exception = e
            log_exception(e)
            if e.is_a? ActiveRecord::RecordNotFound
                LOG.info('----------------------- NOT FOUND')
            elsif e.is_a? NameError

            else
                super
            end
        end

        ###
        # get_pager_total
        #
        def get_pager_total(model, conditions, joins = '')
            path = (controller_name + '_' + action_name).to_sym
            session[:pager_total] = {} if session[:pager_total] == nil
            session[:pager_total][path] = 0 if session[:pager_total][path] == nil

            if params["start"] == nil || params["start"] == '0'
                #session[:pager_total][path] = Company.count_by_sql("SELECT count(*) FROM " + Company.table_name + " WHERE #{conditions}")
                session[:pager_total][path] = model.count(:conditions => conditions, :joins => joins)
            end
            session[:pager_total][path]
        end

        def set_query_cache(key, query, total)
            key = (controller_name + '_' + action_name + '_' + key).to_sym
            LOG.info('set_query_cache: ' + key.to_s)

            session[:query_cache] = {} if session[:query_cache].nil?
            session[:query_cache][key] = {
                :query => query,
                :total => total
            }
        end

        def get_query_cache(key)
            key = (controller_name + '_' + action_name + '_' + key).to_sym
            return session[:query_cache][key]
        end

        ###
        # log_exception
        # send all your exceptoins here so they can be logged.
        # @param {Exception}
        def log_exception(e)
            LOG.info("****************************************************************************")
            LOG.info("* #{Time.now.strftime("%c")} Resistor::Application Exception ")
            LOG.info("* at #{controller_name}/#{action_name}")
            LOG.info("#{e}")
            LOG.info("****************************************************************************")
            LOG.info(e.backtrace.join("\n"))
        end

    end



end

###
# REventParameter
# a wrapper for ajax requests
# @attr {String} sender id of the WebControl that sent the event
# @attr {String} verb the verb to execute
# @attr {String} object the classname of req object.  multi-purpose depending upon context.
# @attr {objectID} objectID the associated id of above object
# @attr {Mixed} data request data (structure depends upon specific context)
# @attr {ActiveRecordModel} aro "A"ctive "R"ecord "O"bject (general purpose placeholder for an optional ActiveRecord model associated to event)
# @attr {ActiveRecordModel} model alias to above.
#
class REventParameter < Object
    attr_accessor :success, :msg, :data

    def initialize(params = {})
        @success = false
        @msg = ''
        @data = {}
    end

    ###
    # to_h
    # convert to Hash
    #
    def to_h
        return {
            :success => @success, :msg => @msg, :data => @data
        }
    end

    def to_json
        self.to_h.to_json
    end
end


####
# RResponse
# A standard response class suitable for AJAX responses.
# @author Chris Scott
#
class RResponse < REventParameter
    attr_accessor :debug, :status, :errors    # <-- set :debug => true in constructor and render will render_text instead of :json

    def initialize(params = {})
        @actions = []
        @status = 0
        @debug = (!params[:debug].nil?) ? params[:debug] : false
        super(params)
    end

    def add_action(res)
        @actions.push(res.to_h)
    end

    def to_h
        data = super
        data[:actions] = @actions
        data[:status] = @status
        return data
    end
end

###
# RServerValidationResponse
# send this back and RExt.Application will know what to do.
#
class RServerValidationResponse < RResponse
    def initialize(params = {})
        super(params)
        @errors = []
    end

    def to_h
        data = super
        data[:status] = 'SERVER_VALIDATION_ERROR'
        data[:errors] = @errors
        return data
    end
end

###
# RValidationResponse
# special ajax response object for handling server-validations
# @author Chris Scott
#
class RValidationResponse < RResponse
    attr_accessor :valid

    def to_h
        data = super
        data[:valid] = @valid
        return data
    end
end

###
# RExceptionResponse
# A special extension of RResponse for performing ajax exception responses.
# @author Chris Scott
# @param {Exceptoin} e
#
class RExceptionResponse < RResponse
    attr_accessor :exception
    def initialize(param = {})
        super
        @exception = param[:exception]
        @status = 'EXCEPTION'
    end

    def to_h
        data = super
        data[:msg] = @exception.message
        return data
    end
end

###
# RPagerResponse
# @author Chris Scott
# A special case of RResponse for handling Ext pager-responses
#
class RPagerResponse < RResponse
    attr_accessor :total

    def initialize(param = {})
        super
        @total = param[:total] || 0
    end

    def to_h
        data = super
        data[:total] = @total
        return data
    end
end
###
# RAction
# an action to perform on client
#
class RAction < REventParameter
    attr_accessor :component_id, :verb

    def initialize(params = {})
        super
        @component_id = params[:component_id] if params[:component_id] != nil
        @msg = params[:msg] if params[:msg] != nil
        @data = params[:data] if params[:data] != nil
        @success = params[:success] if params[:success] != nil
        @verb = params[:verb] || nil
    end

    def to_h
        data = super
        data[:component_id] = @component_id
        data[:verb] = @verb
        data
    end
end


###
# RException
# Resistor baseclass for exceptions
#
class RException < StandardError
    attr_accessor :errors
    def initialize(errors)
        if errors.kind_of?(ActiveRecord::Errors)
            @errors = errors.each_full {|msg| msg + ','}
        else
            @errors = errors
        end
        super(@errors)

    end
end


###
# UnknownConfigParamError
# raised when an attempt is made to load an unknown @config param
#
class Resistor::Application::UnknownConfigParamError < RException

end

###
# ServiceNotDefinedError
# raised when an attempt is made to retrieve an unknown service
#
class Resistor::Application::ServiceNotDefinedError < RException

end