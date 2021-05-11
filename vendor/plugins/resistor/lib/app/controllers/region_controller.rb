###
# Resistor::RegionController
# Generic region methods.  handles importing / querying of country/region/city/airports
#
# @author Chris Scott
#
module Resistor::RegionController
    
    ###
    # query
    # catch-all query method for all region entities
    #
    def query
        country_id  = (params["country_id"] != nil) ? params["country_id"].to_i : nil
        region_id   = (params["region_id"] != nil) ? params["region_id"].to_i : nil
        city_id     = (params["city_id"] != nil) ? params["city_id"].to_i : nil
        q           = params["query"]
                        
        conditions = ''
        peer = nil

        res = {:success => false, :data => []}

        # figure out which combo executed the query.  set the peer and query conditions accordingly.
        if (country_id == nil && region_id == nil && city_id == nil)  # <-- Country ComboBox
            peer = Country
            conditions = "#{Country.table_name}.name ~* '^#{q}'"
            res[:data] = Country.find(:all,
                :select => "id, iso, name",
                :conditions => conditions,
                :order => "name").collect {|c| [c.id, c.name]}

        elsif (country_id != nil )                  # <-- Region ComboBox
            peer = Region
            if (q.length == 2) # if 2-letter query, query on iso
                conditions = "#{Region.table_name}.iso = '#{q.upcase}'"
            else
                conditions = "#{Region.table_name}.name ~* '^#{q}'"
            end
            
            if (country_id > 0)
                conditions += " AND #{Region.table_name}.country_id = #{country_id}"
            end
            data = Region.find(:all,
                :select => "id, name",
                :conditions => conditions,
                :order => "name"
            ).collect {|r| [r.id, r.name]}               
            res[:data] = data
            if (data.length > 0)
                res[:success] = true
            end

        elsif (region_id != nil)                    # <-- City ComboBox
            peer = City
                        
            conditions = "#{City.table_name}.name ~* '^#{q}'"              
            select = "#{City.table_name}.id AS id, #{City.table_name}.name AS name"
            if (region_id > 0)
                conditions += " AND #{City.table_name}.region_id = #{region_id}"
                res[:data] = City.find(:all,
                    :conditions => conditions,                    
                    :select => select,
                    :order => "name").collect {|c| [c.id, c.name]}
            else
                joins = "LEFT JOIN #{Region.table_name} ON #{City.table_name}.region_id = #{Region.table_name}.id"
                joins += " LEFT JOIN #{Country.table_name} ON #{Region.table_name}.country_id = #{Country.table_name}.id"  
                select += ", #{Region.table_name}.iso AS region_iso, #{Country.table_name}.iso AS country_iso"
                res[:data] = City.find(:all,
                    :conditions => conditions,
                    :joins => joins,
                    :select => select,
                    :order => "name").collect {|c|                        
                        [c.id, c.name + ',' + c.region_iso.to_s + ',' + c.country_iso.to_s]
                    }
             end
        elsif (city_id != nil)
            peer = Airport
            conditions = "#{Airport.table_name}.city_id = #{city_id}"
            res[:data] = Airport.find(:all,
                :conditions => conditions,
                :order => "id").collect {|a| [a.id, a.iso]}
        end

        render :json => res.to_json, :layout => false
    end

    ###
    # query_airport
    # service a query from airport ComboBox
    #
    def query_airport
        res = {
            :success => false,
            :msg => '',
            :data => []
        }
        q = params["query"]
        select = "#{Airport.table_name}.id AS id, #{Airport.table_name}.iso AS iso, #{City.table_name}.name AS cityname"
        conditions = "#{Airport.table_name}.iso ~* '^#{q}'"
        
        res[:data] = Airport.find(
            :all,
            :select => select,
            :conditions => conditions,
            :order => "#{Airport.table_name}.iso"            
        ).collect {
            |a| [a.id, a.iso]
        }
        res[:success] = true
        render :json => res.to_json, :layout => false

    end
    
    def validate_region
        query = params["value"]
        country_id = params["country_id"].to_i if params["country_id"] != nil
        
        res = RValidationResponse.new
                               
        select = "id, name"
        conditions = "country_id = #{country_id} AND name ~* '^#{query}'"
        
        # Im in ur database...Im queryin ur cities...
        begin
            rs = Region.find(:all,             
                :select => select,
                :conditions => conditions
            )
        rescue
            res.valid = false            
        else        
            res.success = true                                    
            if (rs.length == 1)
                region = rs.shift
                res.valid = true
                res.data = {:region => {:id => region.id, :name => region.name}}
            elsif (rs.length > 1)
                res.valid = false
                res.msg = 'Multiple regions with that name!'
            else
                res.msg = 'Unknown region'
            end            
        end                                                                    
                
        respond(res)    
    end
    
    ###
    # validate_airport
    # use with Ext.ux.RemoteValidator to validate your airport
    # @return RValidationResponse
    #
    def validate_airport
        
        iso = params["value"][0..2].upcase  #<-- take the first 3 chars only (eg "YBR", "LAX")
                        
        res = RValidationResponse.new
                               
        select = "id, name"
        
        # Im in ur database...Im queryin ur airports...
        ap = Airport.find_by_iso(iso, :select => select)
        res.valid = (!ap.nil?) ? true : false        
        
        # tag-on some extra data while we're here.
        if res.valid === true
            res.data = {:id => ap.id, :airport => iso.upcase}
        else
            res.msg = 'Invalid airport code'
        end
                
        res.success = true
                
        respond(res)
        
    end
    
    ###
    # validate_city
    # use with Ext.ux.RemoteValidator to validate your airport
    # @param {String} field
    # @param {String} value
    # @param {Integer} region_id
    # @return RValidationResponse
    #
    def validate_city
        
        query = params["value"]
        region_id = params["region_id"].to_i if params["region_id"] != nil
        
        res = RValidationResponse.new
                               
        select = "id, name"
        conditions = "region_id = #{region_id} AND name ~* '^#{query}'"
        
        # Im in ur database...Im queryin ur cities...
        begin
            rs = City.find(:all,             
                :select => select,
                :conditions => conditions
            )
            if (rs.length > 1) 
                conditions = "region_id = #{region_id} AND name ~* '^#{query}$'" 
                rs = City.find(:all, 
                    :select => select,
                    :conditions => conditions
                )
            end
        rescue
            res.valid = false            
        else        
            res.success = true                                    
            if (rs.length == 1)
                city = rs.shift
                res.valid = true
                res.data = {:city => {:id => city.id, :name => city.name}}
            elsif (rs.length > 1)
                
                res.valid = false
                res.msg = 'Multiple cities with that name!'
            else
                res.msg = 'Unknown city'
            end            
        end                                                                    
                
        respond(res)
        
    end
    
    def insert_airport
        res = RResponse.new        
        city = City.find(params["city_id"])
        if (ap = Airport.find_by_iso(params["iso"].upcase))            
            res.msg = "The airport '#{params["iso"].upcase}' already exists."
            res.success = false
        else
            ap = Airport.create(:city_id => city.id, :iso => params["iso"].upcase, :name => params["iso"], :icao => params["iso"])
            res.msg = "Created new airport '#{ap.iso.upcase}'"
            res.success = true
        end
        res.data[:airport] = ap.to_h
        
        respond(res)
    end
    
    def insert_city
        res = RResponse.new
        if (City.find(:all, :limit => 1, :conditions => "UPPER(name) = '#{params["name"].upcase}' AND region_id = #{params["region_id"]}").length > 0)
            res.msg = "A city named '#{params["name"].upcase}' already exists in that prov/state"            
        else
            city = City.create(:region_id => params["region_id"], :name => params["name"].capitalize)
            res.msg = "Created new city '#{city.name}'"
            res.success = true
            res.data[:city] = city.to_h
        end                
        respond(res)    
    end
    
    ###
    # import
    # imports country, region, city from files in /tmp dir
    #
    def import

        output = ''

        country_src = 'tmp/Countries.txt'
        
        rs = File.open(country_src)
        rs.gets # <-- remove first line (columns header) "CountryID:Title"
        countries = {}
        City.delete_all
        Region.delete_all
        Country.delete_all

        while (row = rs.gets)            
            row = row.split(':')
            row[0].gsub!(/\n/, '')
            row[1].gsub!(/\n/, '')
            countries[row[0]] = {:name => row[1], :regions => {}, :model => nil}
            c = Country.new
            c.iso = row[0]
            c.name = row[1]
            c.save
            countries[row[0]][:model] = c
        end

        regions_src = 'tmp/Regions.txt'
                
        rs = File.open(regions_src)
        rs.gets # <-- remove the 1st line (header row) #CountryID:RegionID:Title
        while (row = rs.gets)            
            row = row.split(':')
            row[0].gsub!(/\n/, '')
            row[1].gsub!(/\n/, '')
            row[2].gsub!(/\n/, '')
            c = countries[row[0]][:model]
            r = Region.new
            r.iso = row[1]
            r.country_id = c.id

            # magic trick to ignore UTF-8 chars for now.
            ic = Iconv.new('UTF-8//IGNORE', 'UTF-8')
            r.name = ic.iconv(row[2] + ' ')[0..-2]
            r.save
            countries[row[0]][:regions][row[1]] = r

        end

        cities_src = 'tmp/Cities.txt'
                
        rs = File.open(cities_src)
        rs.gets # <-- remove 1st row (header) #CountryID:RegionID:Title:Latitude:Longitude
        while(row = rs.gets)
            row = row.split(':')
            row[1].gsub!(/\n/, '')
            row[2].gsub!(/\n/, '')
            row[3].gsub!(/\n/, '')
            row[4].gsub!(/\n/, '')
            
            r = countries[row[0]][:regions][row[1]]
            if (!r.nil?) 
                c = City.new
                ic = Iconv.new('UTF-8//IGNORE', 'UTF-8')
                c.name = ic.iconv(row[2] + ' ')[0..-2]                               
                c.region_id = r.id
                c.lat = row[3]
                c.lng = row[4]
                c.save
            end
        end

        output += '<h1>Import complete</h1>'
        render(:text => output, :layout => false)
    end


    ###
    #    *  Field 01 - ICAO Code: 4 character ICAO code
    #* Field 02 - IATA Code: 3 character IATA code
    #* Field 03 - Airport Name: string of varying length
    ##* Field 04 - City,Town or Suburb: string of varying length
    #* Field 05 - Country: string of varying length
    #* Field 06 - Latitude Degrees: 2 ASCII characters representing one numeric value
    #* Field 07 - Latitude Minutes: 2 ASCII characters representing one numeric value
    #* Field 08 - Latitude Seconds: 2 ASCII characters representing one numeric value
    #* Field 09 - Latitude Direction: 1 ASCII character either N or S representing compass direction
    #* Field 10 - Longitude Degrees: 2 ASCII characters representing one numeric value
    #* Field 11 - Longitude Minutes: 2 ASCII characters representing one numeric value
    # Field 12 - Longitude Seconds: 2 ASCII characters representing one numeric value
    #* Field 13 - Longitude Direction: 1 ASCII character either E or W representing compass direction
    #* Field 14 - Altitude: varying sequence of ASCII characters representing a numeric value corresponding to the airport's altitude from mean sea level (ie: "123" or "-123")
    #
    def import_airports

        Airport.delete_all

        src = 'tmp/GlobalAirportDatabase.txt'

        #id serial NOT NULL,
        #city_id int4 NOT NULL,
        #name varchar(255) NOT NULL,
        #code varchar(3),
        #latitude varchar(255) NOT NULL,
        #longitude varchar(255) NOT NULL,

        rs = File.open(src)

        conn = City.connection
        output = ''
        
        conditions = []
        n = 0
        found = 0
        query_count = 0
        
        joins = "LEFT OUTER JOIN #{Region.table_name} ON #{City.table_name}.region_id = #{Region.table_name}.id"
        joins += " LEFT OUTER JOIN #{Country} ON #{Region.table_name}.country_id = #{Country.table_name}.id"  
        
        list = []
        while ( (row = rs.gets))
            n+=1
            row = row.split(':')
            row[2].gsub!(/\n/, '')
            row[3].gsub!(/\n/, '')
            row[4].gsub!(/\n/, '')
            
            if (row[1] != 'N/A')
                found +=1
                data = {
                    :icao => row[0],
                    :iso => row[1],
                    :city_id => nil,
                    :name => row[2]
                }                
                ap = Airport.create(data)            
            end
                                   
        end                       
                
        output += "<p>Searched: #{n}"
        output += "<p>Found: #{found.to_s}"

        render(:text =>  output, :layout => false)
    end
end