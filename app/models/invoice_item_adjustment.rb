class InvoiceItemAdjustment < ActiveRecord::Base
    liquid_methods :reason, :amount
    
    # use Tobias' Money class
    composed_of :amount, :class_name => "Money",  :mapping => %w(amount_cents cents) do |v|
        Money.new(v.to_f*100)
    end
    
    belongs_to :invoice_item
    belongs_to :updated_by, :class_name => "Account", :foreign_key => "updated_by"
    belongs_to :created_by, :class_name => "Account", :foreign_key => "created_by"
    
    # encode reasons in model instead of created join-table invoice_adjustment_reason
    @@reasons = {
        :discount => "Discount",
        :write_off => "Write off"       
    }    
    cattr_accessor :reasons
    
    def to_h
        {
            :id => id, 
            :invoice_item_id => invoice_item.id,             
            :amount => amount, 
            :transferable => transferable,
            :reason => reason
        }
    end
    
    ###
    # to_line_item
    # formats an adjustment to fit into the Ext LineItem grid on client
    #
    def to_line_item
        {:id => id, :type => "Adjustments", :name => @@reasons[reason.to_sym], :cost => amount}
    end
    
end
