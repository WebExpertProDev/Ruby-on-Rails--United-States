###
# pdf_builder rake tasks
# @author Chris Scott
#

namespace :pdf_builder do 
    
    ###
    # @task build
    #
    desc "html2pdf conversion"
    task :html2pdf => :environment do  
                        
        if (ENV["in"].nil?)
            puts "Error -- undefined argument 'in'.  you must specify an html infile."
            exit(0)
        elsif (ENV["out"].nil?)
            puts "Error -- undefined argument 'out'.  you must specify an html infile."
            exit(0)
        end
        puts "******************************************************************"
        puts "* pdf_builder:html2pdf "
        puts "******************************************************************"
        
        puts PdfBuilder::html2pdf(ENV["in"], ENV["out"], ENV["width"])                      
        
    end     
        
end
