###
# Resistor rake tasks
# @author Chris Scott
#
desc "Resistor Tasks"
namespace :resistor do
    namespace :db do
        desc "dump templates"
        task :dump_templates => :environment do
            puts "******************************************************************"
            puts "* Resistor templates dumper '#{RAILS_ENV}'"
            puts "* Dumping application templates to db/templates.xml"
            puts "******************************************************************"
                        
            rs = Template.find(:all)
            
            output = ''
            
            doc = Builder::XmlMarkup.new(:target => output, :indent => 4)
            doc.instruct!             
            doc.templates do 
                rs.each do |t|
                    doc.template({:name => t.name}) do 
                        doc.template_type_id(t.template_type_id)
                        doc.label(t.label)
                        doc.model(t.model)
                        doc.content(t.content)
                        doc.created_by(t.created_by)
                        doc.updated_by(t.updated_by)
                    end
                    
                end
            end                                
            
            # write .xml file
            filename = "#{RAILS_ROOT}/db/templates.xml"                                                    
            f = File.new(filename, File::CREAT|File::RDWR|File::TRUNC, 0644)
            f << output
            f.close  
                                   
            puts " - Success.  The application templates are backed up"
        end
        
        desc "Import template"
        task :import_templates => :environment do
            puts "******************************************************************"
            puts "* Resistor templates importer '#{RAILS_ENV}'"
            puts "* Importing application templates from db/templates.xml"
            puts "******************************************************************"
            
            require 'rexml/document'
            
            templates = Template.find(:all)
            
            file = File.open('db/templates.xml')   
            doc = REXML::Document.new(file)
            root = doc.root
            root.elements.each do |e|
                                
                tpl = templates.find {|t| (t.name == e.attributes["name"]) ? true : false }
                if (tpl.nil?)                                        
                    tpl = Template.new
                    tpl.name = e.attributes["name"]
                    
                    e.elements.each do |i|
                        tpl.write_attribute(i.name, i.text)                       
                    end
                    tpl.content = '' if (tpl.content.nil?)                                             
                    tpl.save
                else                               
                    if (content = e.elements["content"].text)
                        tpl.content = content                          
                    end
                    tpl.content = 'empty' if !tpl.content
                    tpl.save
                end                
            end         
            puts "- success.  templates imported"
        end
        
        desc "dump database"
        task :dump => :environment do
            puts "******************************************************************"
            puts "* Resistor postgres dumper '#{RAILS_ENV}'"
            puts "******************************************************************"
            
            filename = (!ENV["f"].nil?) ? ENV["f"] : "db/#{RAILS_ENV}_backup.sql"
            config = ActiveRecord::Base.configurations[RAILS_ENV]
                                    
            cmd = "/usr/local/bin/pg_dump #{config['database']} -a | bzip2 > #{filename}"
            
            # show cmd user before execing
            puts ">#{cmd}"
            
            puts `#{cmd}`
            
        end
        
        desc "import database"
        task :import => :environment do
            puts "******************************************************************"
            puts "* Resistor postgres importer '#{RAILS_ENV}'"
            puts "******************************************************************"
                                   
            filename = (!ENV["f"].nil?) ? ENV["f"] : "db/#{RAILS_ENV}_backup.sql"
                        
            # file exists?
            if (!FileTest.exist?(filename))
                puts "Could not locate backup file #{filename} -- you can create this file with rake resistor:db:dump"
                exit(0)
            end
            
            config = ActiveRecord::Base.configurations[RAILS_ENV]
                                    
            cmd = "bzcat #{filename} | psql -W #{config['database']}"
            
            # show cmd user before execing
            puts ">#{cmd}"
            
            puts `#{cmd}`
            
        end            
    end
end
