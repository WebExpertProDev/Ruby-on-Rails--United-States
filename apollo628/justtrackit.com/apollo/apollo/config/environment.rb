
# Be sure to restart your web server when you modify this file.

# Uncomment below to force Rails into production mode when
# you don't control web/app server and can't set it the proper way

# ENV['RAILS_ENV'] ||= 'production'

# Specifies gem version of Rails to use when vendor/rails is not present
RAILS_GEM_VERSION = '2.0.2' unless defined? RAILS_GEM_VERSION

# Bootstrap the Rails environment, frameworks, and default configuration
require File.join(File.dirname(__FILE__), 'boot')


Rails::Initializer.run do |config|
  # Settings in config/environments/* take precedence over those specified here

  # Skip frameworks you're not going to use (only works if using vendor/rails)
  # config.frameworks -= [ :action_web_service, :action_mailer ]

  # Only load the plugins named here, by default all plugins in vendor/plugins are loaded
  # config.plugins = %W( exception_notification ssl_requirement )

  # Add additional load paths for your own custom dirs
  # config.load_paths += %W( #{RAILS_ROOT}/extras )

  # Force all environments to use the same logger level
  # (by default production uses :info, the others :debug)
  # config.log_level = :debug

  # Use the database for sessions instead of the file system
  # (create the session table with 'rake db:sessions:create')
  config.action_controller.session_store = :active_record_store    

  # Use SQL instead of Active Record's schema dumper when creating the test database.
  # This is necessary if your schema can't be completely dumped by the schema dumper,
  # like if you have constraints or database-specific column types
  config.active_record.schema_format = :sql

  # Activate observers that should always be running
  # config.active_record.observers = :cacher, :garbage_collector

  # Make Active Record use UTC-base instead of local time
  # config.active_record.default_timezone = :utc

  # See Rails::Configuration for more options
  # Your secret key for verifying cookie session data integrity.
  # If you change this key, all old sessions will become invalid!
  # Make sure the secret is at least 30 characters and all random, 
  # no regular words or you'll be exposed to dictionary attacks.
  
  config.action_controller.session = {
    :session_key => '_foo_session',
    :secret      => '2fbbe06327c804aa3579fd3fcb07f5b35295b18bf23185a7a396dd42e3a9aad553b19ac1ae425277eb9eaef750b0ba7141a8baf6b4bc6e8599f8ca772f562aac'
  }
  
  ##
  # ruport reporting library
  # http://oreillynet.com/pub/a/ruby/2008/04/08/ruport-business-reporting-for-ruby.html
  #
  require 'ruport'
  
  ##
  # Add Ruport directory /app/reports to load path
  #
  config.load_paths += %W( #{RAILS_ROOT}/app/reports )

   
end

##
# Fuck pluralization
#
ActiveRecord::Base.pluralize_table_names = false
           
###
# application user class for active_rbac
#
require 'user'

###
# require json support
#
require 'json'

###
# require Tobias' Money class
#
require 'money'

###
# init test logger for DEVELOPMENT
#
LOG = Logger.new('log/test.log')

LOG.level = Logger::DEBUG

# Add new inflection rules using the following format
# (all these examples are active by default):
# Inflector.inflections do |inflect|
#   inflect.plural /^(ox)$/i, '\1en'
#   inflect.singular /^(ox)en/i, '\1'
#   inflect.irregular 'person', 'people'
#   inflect.uncountable %w( fish sheep )
# end

# Add new mime types for use in respond_to blocks:
# Mime::Type.register "text/richtext", :rtf
# Mime::Type.register "application/x-mobile", :mobile

# Include your application configuration below
ActionMailer::Base.smtp_settings = {
  :address  => "localhost",
  :port  => 25, 
  :domain  => "griffon.resistorsoftware.com",
  :user_name  => "apollo",
  :password  => "apollo911",
  :authentication  => :login
} 
    
