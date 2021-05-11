module Resistor::TemplateController
    
    require "#{File.dirname(__FILE__)}/../../system/model_scanner"
    require 'liquid'
        
    ###
    # index
    #
    def index                                                      
                                                       
    end
    
    def insert
        res = RResponse.new
        res.success = true
        if (!params["template"].nil?)
            begin
                form = params["template"]
                form.delete("model") if form["model"].empty?
                form["created_by"] = current_user.account.id
                form["updated_by"] = current_user.account.id
                ::Template.create(form)                
                res.success = true
                res.msg = "Created new template"
            rescue StandardError => e
                res.msg = e
            end
        end        
        respond(res)
        
    end
    
    def delete
        res = RResponse.new
        res.success = true
        res.msg = 'template/delete'
        ::Template.destroy(params[:id])
        respond(res)
    end
    
    ###
    # list
    # tree-handler
    #
    def list 
        res = []
        if (params["node"] == 'root')
            res = ::TemplateType.get_tree_nodes
        else    params["node"].split(':').pop()
            path = params["node"].split(':')
            obj = path.shift
            id = path.pop
            res = ::Template.get_tree_nodes(id)  # popped == template_type_id
        end
        render(:json => res, :layout => false)
    end
        
    ###
    # view
    #
    def view
        @tpl = ::Template.find(params[:id])         
        @theme = ::Template.find_theme('print').content
        @theme.gsub!(/\{\{host\}\}/, 'www.freightoperations.com:8080')
        
        render(:layout => false)    
    end
    
    
        
    def show
        @tpl = ::Template.find(params[:id], :include => [:type]) 
        
        output = @tpl.render_model(Order.find(1), 'email', 'www.freightoperations.com:8080')
                
        render(:text => output, :layout => false)        
    end
    
    ###
    # update
    #
    def update 
        res = RResponse.new
        
        tpl = ::Template.find(params[:id])
        tpl.content = params["content"]
        begin
            tpl.save
            res.msg = 'Updated template "' + tpl.label + '"' 
            res.success = true
        rescue StandardError => e
            res.msg = e
            log_exception(e)
        end                       
        respond(res)
    
    end
    
end
