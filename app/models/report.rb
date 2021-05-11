class Report < ActiveRecord::Base
                    
    serialize :columns
    serialize :select_columns
    serialize :joins
    serialize :conditions
    serialize :order_by
    serialize :plugins
    
    belongs_to :template, :class_name => "Template", :foreign_key => :template_id
            
    def before_create                   
        self.columns = [] if self.columns.nil?
        self.select_columns = [] if self.select_columns.nil?
        self.joins = [] if self.joins.nil?
        self.conditions = [] if self.conditions.nil?    
        self.order_by = [] if self.order_by.nil?
        self.plugins = [] if self.plugins.nil?
    end
    
    def to_h
        {
            :id => id,
            :name => name,
            :label => label,
            :model => model,
            :joins => joins.to_yaml,
            :order_by => order_by.to_yaml,
            :conditions => conditions.to_yaml,
            :select_columns => select_columns.to_yaml,
            :columns => columns.to_yaml,
            :template_id => template_id}
    end
    
    def criteria
        {
            :joins => joins.to_yaml, 
            :conditions => conditions.to_yaml, 
            :select_columns => select_columns.to_yaml, 
            :columns => columns.to_yaml,
            :order_by => order_by.to_yaml
        }    
    end
    
    ##
    # accounting_reports
    # returns all reports with Invoice-related model (Invoice, InvoicePayable)
    # @return {Array}
    #
    def self.accounting_reports
        self.find(:all, :conditions => "model ~* '^Invoice'")        
    end
    
    ##
    # execute
    #
    def execute(start_date = nil, end_date = nil)       
        #start_date = '2008-05-25'
        #end_date = '2008-05-26'
        
        # raw Connection query
        s = Report.querify(:select, columns).join(',')
        j = Report.querify(:joins, joins).join(' ')
        c = Report.querify(:conditions, conditions).join(' AND ')
        
        # filter: date
        if !(start_date.nil? && end_date.nil?)
            start_date = Date.parse(start_date) if start_date.class == String
            end_date = Date.parse(end_date) if end_date.class == String
            c += " AND #{Invoice.table_name}.created_at BETWEEN '#{start_date}' AND '#{end_date+1}'"    
        end
            
        self.connection.execute("SELECT #{s} FROM #{model.constantize.table_name} #{j} WHERE #{c}").to_a                
    end
            
    ##
    # render
    # renders a report.
    # @return {pdf binary stream}
    #
    def render(format, start_date = nil, end_date = nil)                
        "#{self.name.camelize}Report".constantize.render(format, :model => self, :start_date => start_date, :end_date => end_date)                                                                                              
    end
                
    def column_names
        columns.collect {|c| c[:header] }    
    end
    
    def record        
        Report.querify(:record, columns).collect {|c| {:name => c}}
    end
    
    def self.querify(type, list)
        #raise RException.new(list.class.to_s) if list.class == String
        return '' if list.class == String
        
        if type == :select || type == :record
            list = list.collect {|r| r[:dataIndex]}
        end
                
        list.collect {|i| 
            if (m = i.match(/^\{\{(\w+)\}\}\.(\w+)$/))
                peer = m[1].constantize
                case type
                    when :select
                        "#{peer.table_name}.#{m[2]} AS #{peer.table_name}_#{m[2]}" 
                    when :order_by
                        "#{peer.table_name}.#{m[2]}"
                    when :columns, :record
                        "#{peer.table_name}_#{m[2]}"
                end
            elsif (m = i.match(/(\{\{\w+\}\})/))                
                i.gsub(/\{\{\w+\}\}/) {|m| m.slice(2..(m.length-3)).constantize.table_name}
            end
        }
        
    end        
end


# conditions
#--- 
#- "{{InvoicePayable}}.payable_type = 'CompanySalesAccount'"


