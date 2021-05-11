class OrderRouteCost < ActiveRecord::Base
    belongs_to :order_route
    belongs_to :company, :class_name => 'Company', :foreign_key => 'company_id'
    belongs_to :shipping_cost

    def self.create(param)

        ###
        # hot-wire agent_id for now.
        #
        #param["agent_id"] = 1
        super
    end

    def self.to_json (id)
        rs = ShippingCost.find(:all)    # <-- make a hash of shipping costs to cut-down on sql queries
                                        #     to shipping_cost
        costs = {}
        rs.each do |c|
            costs[c.id] = c.name
        end

        self.find_all_by_order_id(id).collect {|c| [c.id, costs[c.shipping_cost_id], c.amount, c.when]}.to_json
    end

    def to_h
        row = self.attributes
        row[:name] = self.shipping_cost.name
        row

    end


end
