class OrderLog < ActiveRecord::Base

    belongs_to :account
    belongs_to :order
    belongs_to :log_type, :class_name => "OrderLogType", :foreign_key => :order_log_type_id
    
    def to_a
        duration = (Time.today.to_date - self.created_at.to_date).to_i
        case duration
            when 0
                duration = 'today'
            when 1
                duration = 'yesterday'
            else
                duration = duration.to_s + ' days ago'
        end
        #[log.id, log.created_at.strftime("%B %d, %Y, %I:%M%p") + ' (' + duration + ')', log.subject, log.msg, log.first + ' ' + log.last]

        return (self.respond_to?('first') && self.respond_to?('last')) ? [self.id, self.created_at.strftime("%B %d, %Y, %I:%M%p") + ' (' + duration + ')', self.subject, self.msg, self.first + ' ' + self.last, self.log_type_name] : [self.id, self.created_at.strftime("%B %d, %Y, %I:%M%p") + ' (' + duration + ')', self.subject, self.msg, self.account.first + ' ' + self.account.last, self.log_type.name]
    end
end
