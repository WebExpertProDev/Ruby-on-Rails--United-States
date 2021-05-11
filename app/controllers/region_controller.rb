class RegionController < ApplicationController

    include Resistor::RegionController
    
    def index
        @agents = YAML.load(File.read('db/agents.yml')).to_json                    
    end
    
    ###
    # geo
    # @param {String} filename [agents || customers || carriers]
    # @param {String} company number
    # @param {Integer} location index
    #
    def update_geo
        res = RResponse.new
        
        list = YAML.load(File.read("db/#{params['filename']}.yml"))
        
        modified = JSON.parse(params["modified"]);
        modified.each do |rec|
            company = list.find { |c| (c[:name] == rec["company"]) ? true : false }
            location = company[:locations].find { |l| (l[:number] == rec["number"]) ? true : false}
            location[:city] = rec["city"]
            location[:region] = rec["region"]
            location[:country] = rec["country"]
            location[:zip] = rec["zip"]
            location[:lat] = rec["lat"]
            location[:lng] = rec["lng"]
        end
        
        out = File.new("db/#{params['filename']}.yml", File::CREAT|File::RDWR|File::TRUNC, 0644)
        out << list.to_yaml
        
        res.msg = 'do geo'
        res.success = true
        respond(res)
        
    end
    
    

end


