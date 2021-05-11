require 'openssl'  
require 'base64'  

###
# @class Ssl
# encrypt and decrypt ssl
#
# @author Chris Scott
# 
module Resistor::Util
    
    module Encryption
        
        class Ssl
            @@params, @@public_key, @@private_key = nil
            
            ###
            # config
            # configure teh class config
            #
            def self.config(params)
                @@params = params        
                self
            end
            
            ###
            # decrypt
            #
            def self.decrypt(v)       
                OpenSSL::PKey::RSA.new(self.get_private_key, @@params[:passphrase]).private_decrypt(Base64.decode64(v))                 
            end    
            
            ###
            # encrypt
            #
            def self.encrypt(v)                        
                Base64.encode64(OpenSSL::PKey::RSA.new(self.get_public_key).public_encrypt(v))                   
            end
            
            protected
            
            ###
            # get_private_key
            # loads from file specified in config
            #
            def self.get_private_key                
                if @@private_key == nil 
                    @@private_key = File.read(@@params[:private_key])
                end
                @@private_key
            end
            
            ###
            # get_public_key
            # loads from file specified in config
            #
            def self.get_public_key
                if @@public_key == nil
                    @@public_key = File.read(@@params[:public_key])
                end
                @@public_key
            end
   
         end               
    end
end