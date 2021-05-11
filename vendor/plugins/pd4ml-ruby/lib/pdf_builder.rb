###
# module PdfBuilder
# A wrapper for pd4ml java-based html 2 pdf converter
# @raises PdfBuilder::Error
# @author Chris Scott
#
module PdfBuilder    
    
    # path to the pd4ml jarfile
    #PATH = 'pd4ml.lib.323b2/lib/'
    
    JAR = 'pd4ml.jar'
    
    ###
    # convert infile to pdf
    # @param {String} infile
    # @param {String} outfile
    # @return {Boolean} whether the process succeeded or not.
    #
    def self.html2pdf(infile, outfile, width = 950)
        
        # sanity-check infile exists           
        raise Error.new("input file '#{infile}' not found") if !FileTest.exist?(infile)
                
        # build & execute the shell command.        
        #cmd = "java -jar #{File.dirname(__FILE__)}/#{JAR} file:#{infile} #{outfile}"           
        #`#{cmd}`
        
        cmd = "java -Xmx512m -Djava.awt.headless=true -cp #{JAR}:.:#{File.dirname(__FILE__)} Pd4Ruby file:#{RAILS_ROOT + '/' + infile} #{width} A4"
        puts cmd
        
        output = %x[cd #{File.dirname(__FILE__)} \n #{cmd}]
                                
        # raise error if process returned false (ie: a java error)
        raise Error.new("An unknonwn error occurred while generating pdf: #{cmd}") if $?.success? === false
        
        f = File.open(outfile, 'w') do |pdf|
            pdf << output
        end
        
        # raise error if process returned false (ie: a java error)
        raise Error.new("An unknonwn error occurred while generating pdf") if $?.success? === false
        
        # s'all good.  return true
        $?.success?
    end  
    
    ###
    # html2pdf_stream
    # @param {String} input
    # @param {Integer} html width
    # @param {Binary} pdf binary stream
    #
    def self.html2pdf_stream(input, width = 950)
        # search for stylesheet links and make their paths absolute.
        input.gsub!('<link href="/javascripts', '<link href="' + RAILS_ROOT + '/public/javascripts')
        input.gsub!('<link href="/stylesheets', '<link href="' + RAILS_ROOT + '/public/stylesheets')   
        
        # search for images src, append full-path.
        input.gsub!('src="/images', 'src="' + RAILS_ROOT + '/public/images')
                        
        cmd = "java -Xmx512m -Djava.awt.headless=true -cp #{JAR}:.:#{File.dirname(__FILE__)} Pd4Ruby '#{input.gsub("'", "&#145;")}' #{width} A4"
               
        output = %x[cd #{File.dirname(__FILE__)} \n #{cmd}]
                                
        # raise error if process returned false (ie: a java error)
        raise Error.new("An unknonwn error occurred while generating pdf: #{cmd}") if $?.success? === false
        
        f = File.open('public/test.pdf', 'w') do |pdf|
            pdf << output
        end
        
        
        #return raw pdf binary-stream
        output                
    end
    
    ###
    # Error
    # PdfBuilder exception class
    #
    class Error < StandardError
        
    end
end


