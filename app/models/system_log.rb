class SystemLog < ActiveRecord::Base
    belongs_to :log_type, :class_name => "SystemLogType", :foreign_key => "system_log_type_id"
    belongs_to :created_by, :class_name => "Account", :foreign_key => "created_by"
    belongs_to :loggable, :polymorphic => true
    
    def to_h
        {
            :type => log_type.to_h,
            :subject => subject,
            :msg => msg,
            :verb => verb,
            :created_by => created_by.first.capitalize + ' ' + created_by.last.capitalize,
            :created_at => created_at
        }
        
    end
end
