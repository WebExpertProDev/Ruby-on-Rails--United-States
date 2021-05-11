class AddTemplate < ActiveRecord::Migration
    def self.up
        create_table :template, :force => true do |t|
            t.integer :id, :null => false    
            t.integer :template_type_id, :null => false
            t.string :model, :null => true
            t.string  :name, :null => false
            t.string  :label, :null => false
            t.text    :content, :null => false, :default => ''
            t.integer :created_by, :null => false
            t.integer :updated_by, :null => false
            t.timestamps
        end     
        
        #type = TemplateType.find_by_name('theme')
        #Template.create(
        #    :template_type_id => type.id,
        #    :name => 'print',
        #    :label => 'Print',
        #    :content => '',
        #    :created_by => 1,
        #    :updated_by => 1
        #)
       # 
       # Template.create(
       #     :template_type_id => type.id,
       #     :name => 'email',
       #     :label => "Email",
       #     :content => '',
       #     :created_by => 1,
       #     :updated_by => 1
       # )                   
       # Template.create(
       #     :template_type_id => type.id,
       #     :name => 'fax',
       #     :label => "Fax",
       #     :content => '',
       #     :created_by => 1,
       #     :updated_by => 1
       # )
       #         
        ###
        # create order documents
        #              
       # type = TemplateType.find_by_name('view') 
       # Template.create(            
       ##     :template_type_id => type.id,
        #    :model => "Order",
        #    :name => "TSA_certificate",
        #    :label => "TSA Certificate",            
        #    :content => "",
        #    :created_by => 1,
        #    :updated_by => 1
        #)
       # 
       # Template.create(
       #     :template_type_id => type.id,
       #     :model => "Order",
       #     :name => "TSA_unknown_shipper_declaration",
       #     :label => "TSA Unknown Shipper Declaration",
       #     :content => "",
       #     :created_by => 1,
       #     :updated_by => 1
       # )
       # Template.create(
       #     :template_type_id => type.id,
       #     :model => "Order",
       #     :name => "straight_bill_of_lading",
       #     :label => "Straight Bill of Lading",
       #     :content => "",
       #     :created_by => 1,
       #     :updated_by => 1
       # )
       # Template.create(
       #     :template_type_id => type.id,
       #     :model => "Order",
       #     :name => "re-weigh_and_dim",
       #     :label => "Re-weigh and DIM notification",
       #     :content => "",
       #     :created_by => 1,
       #     :updated_by => 1
       # )
       # Template.create(
       #     :template_type_id => type.id,
       #     :model => "Order",
       #     :name => "POD_slip",
       #     :label => "POD Slip",
       #     :content => "",
       #     :created_by => 1,
       #     :updated_by => 1
       # )
       # Template.create(
       #     :template_type_id => type.id,
       #     :model => "Order",
       #     :name => "pickup_slip",
       #     :label => "Pick-up Slip",
       #     :content => "",
       #     :created_by => 1,
       #     :updated_by => 1
       # )
       # Template.create(
       #     :template_type_id => type.id,
       #     :model => "Order",
       #     :name => "FCCOD_invoice",
       #     :label => "FCCOD Invoice",
       #     :content => "",
       #     :created_by => 1,
       #     :updated_by => 1
       # )
       # Template.create(
       #     :template_type_id => type.id,
       #     :model => "Order",
       #     :name => "delivery_receipt",
       #     :label => "Delivery Receipt",
       #     :content => "",
       #     :created_by => 1,
       #     :updated_by => 1
       # )
       # Template.create(
       #     :template_type_id => type.id,
       #     :model => "Order",
       #     :name => "delivery_alert",
       #     :label => "Delivery Alert",
       #     :content => "",
       #     :created_by => 1,
       #     :updated_by => 1
       # )
       # Template.create(
       #     :template_type_id => type.id,
       #     :model => "Order",
       #     :name => "bill_of_lading_customer",
       #     :label => "Bill of Lading (Customer)",
       #     :content => "",
       #     :created_by => 1,
       #     :updated_by => 1
       # )
       # 
       # ###
       # # CREATE PARTIALS
       # #
       # type = TemplateType.find_by_name('partial')
       ## Template.create(
       #     :template_type_id => type.id,
       #     :model => "Order",
       #     :name => "shipper",
       #     :label => "Shipper",
       #     :content => "<h1>Shipper</h1>",
       #     :created_by => 1,
       #     :updated_by => 1
       # )
    end                
    
    def self.down
        drop_table :template
        
    end
end
