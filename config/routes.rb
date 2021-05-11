ActionController::Routing::Routes.draw do |map|
  map.resources :add_column_invoice_payable_company_ids

  # The priority is based upon order of creation: first created -> highest priority.

  ###
  # map default route
  #
  map.connect '', :controller => 'auth', :action => 'index'

  # Sample of regular route:
  # map.connect 'products/:id', :controller => 'catalog', :action => 'view'
  # Keep in mind you can assign values other than :controller and :action
    
  ###
  # doc_controller print & tx actions (tx as in Transmit)
  #
  map.connect 'doc/preview/:template_id/:id', :controller => 'doc', :action => 'preview'
  map.connect 'doc/tx/:template_id/:id', :controller => 'doc', :action => 'tx'
  
  # hook-up order/query
  map.connect 'order/query', :controller => 'order', :action => 'query'
  
  # Straight 'http://my.app/blog/' displays the index

  # Sample of named route:
  # map.purchase 'products/:id/purchase', :controller => 'catalog', :action => 'purchase'
  # This route can be invoked with purchase_url(:id => product.id)

  ###
  # map the auth_url
  # @author Chris Scott
  #
  map.auth "auth",
             :controller  => "auth",
             :action      => "index"

  # You can have the root of your site routed by hooking up ''
  # -- just remember to delete public/index.html.
  # map.connect '', :controller => "welcome"

  # Allow downloading Web Service WSDL as a file with an extension
  # instead of a file named 'wsdl'
  map.connect ':controller/service.wsdl', :action => 'wsdl'
      
  map.resources :order, :has_many => :account
  
  # Install the default route as the lowest priority.    
  map.connect ':controller/:action/:id'
  map.connect ':controller/:action/:id.:format'
  map.connect ':controller/:action.:format'
  
  




end
