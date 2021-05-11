# Methods added to this helper will be available to all templates in the application.
module ApplicationHelper
                       
    def render_application_menu(container)                
        return @config[:menu].to_json        
    end
    
    def google_maps_key
                
        key = @config[:google_maps_key]
                
        if !request.env["HTTP_X_FORWARDED_HOST"].nil?
            if !request.env["HTTP_X_FORWARDED_HOST"].match('www.freightoperations.com:8080')
                key = 'ABQIAAAA2h4uQGtJitMLpYRGo0nEoRSp_mu5IltVBT8I_tQTc2dSqPSLcBSF8PfTq5nbJSh2pYACFcR6PQY25Q'
            end
        end                    
        return key
    end
    
end
