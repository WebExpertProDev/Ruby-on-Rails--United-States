# Settings specified here will take precedence over those in config/environment.rb


# In the development environment your application's code is reloaded on
# every request.  This slows down response time but is perfect for development
# since you don't have to restart the webserver when you make code changes.
config.cache_classes = false

# Log error messages when you accidentally call methods on nil.
config.whiny_nils = true

# Enable the breakpoint server that script/breakpointer connects to
#config.breakpoint_server = true

# Show full error reports and disable caching
config.action_controller.consider_all_requests_local = true
config.action_controller.perform_caching             = false
config.action_view.cache_template_extensions         = false


config.action_view.debug_rjs                         = true

# Don't care if the mailer can't send
config.action_mailer.raise_delivery_errors = false

###
# set default javascript includes for Ext2 and resistor-ext2
#
JAVASCRIPT_DEFAULT_SOURCES = {
    :default => [ 
        "ext-2.0/adapter/ext/ext-base",
        "ext-2.0/ext-all-debug",
        "resistor-ext2/source/core/RExt",
        "resistor-ext2/source/Page",
        "resistor-ext2/source/util/Collection",
        "resistor-ext2/source/form/vtypes",    
        "resistor-ext2/source/form/DialogForm",
        "resistor-ext2/source/form/Fields",
        "resistor-ext2/source/widgets/Plugins",
        "resistor-ext2/source/widgets/View",
        "resistor-ext2/source/widgets/RPanel",
        "resistor-ext2/source/widgets/RegionManager",
        'resistor-ext2/source/application/company/CompanyManager',
        "resistor-ext2/source/widgets/GMap",
        "ux/form/radiogroup/radiogroup",   
        "app/app",           
    ],
    :system => [
        "ext-2.0/adapter/ext/ext-base",
        "ext-2.0/ext-all-debug",
        "resistor-ext2/source/core/RExt",  
        "resistor-ext2/source/Page",
        "resistor-ext2/source/widgets/LoginForm",                      
        "resistor-ext2/source/form/vtypes",                                                        
        "app/app"       
        
    ]
}
       

###
# set default stylesheets to include
#
STYLESHEET_DEFAULT_SOURCES = {
    :default => [
        "reset-fonts-grids",
        "/javascripts/ext-2.0/resources/css/ext-all",
        "/javascripts/resistor-ext2/resources/css/rext.css",
        "/javascripts/resistor-ext2/resources/css/buttons.css",
        "app"
    ]    
}

