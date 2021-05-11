    
class CompanyCc < ActiveRecord::Base
                    
    belongs_to :company
    belongs_to :system_cc
        
    attr_protected :hash_type

    # Make sure that the password is given.
    validates_presence_of :num
    validates_presence_of :pin    
            
    ###
    # to_h
    #
    def to_h
        #cc_masked = num.gsub(/\d/, '*')
        #cc_masked[num.length-4..num.length] = num[num.length-4..num.length]
        cc_masked = num        
        {:system_cc_id => system_cc_id, :num => cc_masked, :pin => pin, :expiry => expiry}
    end
    
    ###
    # expiry
    # override expiry, append -01-01 to the year.
    #
    def expiry=(v)
        v = v + '-01-01'
        write_attribute(:expiry, v)
    end
    
    def num
        Resistor::Util::Encryption::Ssl::decrypt read_attribute('num')
    end
    
    def pin
        Resistor::Util::Encryption::Ssl::decrypt read_attribute('pin')
    end
    
    def num=(v)
        write_attribute(:hash_type, 'base64/ssl')
        write_attribute('num', Resistor::Util::Encryption::Ssl::encrypt(v))
    end
    
    def pin=(v)
        write_attribute('pin', Resistor::Util::Encryption::Ssl::encrypt(v))
    end
                    
    # Do not allow calls to hash_type
    def hash_type=(value)
        raise NameError, "hash_type=(value) is not allowed to be called on #{self}:#{self.class}"
    end   
    
    class ExpiredError < RException
        
    end
               
end
