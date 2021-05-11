class InvoiceTransaction < ActiveRecord::Base
    
    belongs_to :invoice
    belongs_to :type, :class_name => "TransactionType", :foreign_key => "transaction_type_id"
    belongs_to :method, :class_name => "TransactionMethod", :foreign_key => "transaction_method_id"
    belongs_to :created_by, :class_name => "Account", :foreign_key => "created_by"
    belongs_to :updated_by, :class_name => "Account", :foreign_key => "updated_by"
    
    # use Tobias' Money class
    composed_of :amount, :class_name => "Money",  :mapping => %w(amount_cents cents) do |v|
        Money.new(v.to_f*100)
    end
    
    def to_h 
        {
            :id => id,
            :invoice_id => invoice_id,
            :method => method.to_h,
            :type => type.to_h,
            :method_number => method_number,
            :method_date => method_date,
            :amount => amount,
            :comment => comment,
            :created_by => created_by.first.capitalize + ' ' + created_by.last.capitalize,
            :created_at => created_at,
            :updated_by => updated_by.first.capitalize + ' ' + updated_by.last.capitalize,  
            :updated_at => updated_at
        } 
    end
end
