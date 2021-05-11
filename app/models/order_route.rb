class OrderRoute < ActiveRecord::Base

    belongs_to :order
    belongs_to :origin, :class_name => 'City', :foreign_key => 'origin_id', :include => :region
    belongs_to :destination, :class_name => 'City', :foreign_key => 'city_id', :include => :region
    belongs_to :carrier, :class_name => 'Company', :foreign_key => 'carrier_id'
    belongs_to :loading_agent, :class_name => 'Company', :foreign_key => "loading_agent_id"
    belongs_to :unloading_agent, :class_name => 'Company', :foreign_key => "unloading_agent_id"

    has_many :costs, :class_name => 'OrderRouteCost', :include => [:company]

    def self.create(params)
        route = super
    end

    ###
    # to_h
    # custom class impl of to_h
    # @param {OrderRoute}
    #
    def self.to_h(r)

        if !r.kind_of?(OrderRoute)
            LOG.info("ERROR: OrderRoute.to_h -- supplied param must be kind_of OrderRoute")
            return false
        end

        return {
            :loading_agent => {
                :type => 'Loading Agent',
                :name => r.loading_agent.name,
                :phone => r.loading_agent.phone1,
                :instructions => r.loading_instructions
            },
            :carrier => {
                :type => r.carrier.domain_type.name,
                :name => r.carrier.name,
                :airbill => r.airbill,
                :origin => '',#r.origin.name + ', ' + r.origin.region.iso + ', ' + r.origin.region.country.iso,
                :origin_id => 1, #r.origin_id,
                :origin_code => 'zz', #r.origin_code,
                :destination => r.destination.name + ', ' + r.destination.region.iso + ', ' + r.destination.region.country.iso,
                :destination_id => r.destination.id,
                :destination_code => '', #r.city_code,
                :depart_date => r.depart_date.to_s + ', ' + r.depart_time.strftime("%H:%M"),
                :arrival_date => r.arrival_date.to_s + ', ' + r.arrival_time.strftime("%H:%M")
            },
            :unloading_agent => {
                :type => 'Unloading Agent',
                :name => r.unloading_agent.name,
                :phone => r.unloading_agent.phone1,
                :instructions => r.unloading_instructions
            },
            :id => r.id
        }
    end

end
