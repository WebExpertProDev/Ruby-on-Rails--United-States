# This file is auto-generated from the current state of the database. Instead of editing this file, 
# please use the migrations feature of ActiveRecord to incrementally modify your database, and
# then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your database schema. If you need
# to create the application database on another system, you should be using db:schema:load, not running
# all the migrations from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended to check this file into your version control system.

ActiveRecord::Schema.define(:version => 476) do

  create_table "account", :force => true do |t|
    t.integer  "company_id",                                         :null => false
    t.datetime "created_at",                                         :null => false
    t.datetime "updated_at",                                         :null => false
    t.string   "email",               :limit => 100
    t.string   "username",                                           :null => false
    t.string   "first",               :limit => 50,                  :null => false
    t.string   "last",                :limit => 50,                  :null => false
    t.string   "phone",               :limit => 20
    t.string   "ext",                 :limit => 20
    t.string   "mobile",              :limit => 20
    t.string   "fax",                 :limit => 20
    t.string   "description",                        :default => "", :null => false
    t.string   "password",            :limit => 128,                 :null => false
    t.string   "password_salt",       :limit => 100,                 :null => false
    t.string   "password_hash_type",  :limit => 10,                  :null => false
    t.integer  "company_location_id"
  end

  add_index "account", ["email", "username"], :name => "index_account_on_email_and_username"

  create_table "account_role", :force => true do |t|
    t.integer "role_id",     :null => false
    t.integer "account_id",  :null => false
    t.string  "field_value"
    t.date    "created_at",  :null => false
    t.date    "updated_at",  :null => false
  end

  add_index "account_role", ["role_id", "account_id"], :name => "index_account_role_on_role_id_and_account_id", :unique => true

  create_table "billing_method", :force => true do |t|
    t.string "name",  :null => false
    t.string "label", :null => false
  end

  create_table "company", :force => true do |t|
    t.integer  "domain_id",                                                :null => false
    t.string   "name",                    :limit => 100,                   :null => false
    t.text     "description",                                              :null => false
    t.string   "www",                     :limit => 100
    t.string   "nickname",                :limit => 50
    t.string   "logo"
    t.integer  "billing_method_id"
    t.boolean  "bill_to_company_address",                :default => true, :null => false
    t.string   "domain_values"
    t.datetime "created_at",                                               :null => false
    t.datetime "updated_at",                                               :null => false
    t.integer  "created_by",                                               :null => false
    t.integer  "primary_location_id"
    t.integer  "billing_location_id"
    t.string   "username"
    t.string   "password"
  end

  add_index "company", ["name"], :name => "index_company_on_name"

  create_table "company_accounting", :force => true do |t|
    t.integer "company_id", :null => false
    t.integer "city_id"
    t.string  "address1"
    t.string  "address2"
    t.string  "zip"
  end

  add_index "company_accounting", ["company_id"], :name => "index_company_accounting_on_company_id", :unique => true

  create_table "company_cc", :force => true do |t|
    t.integer "company_id",                 :null => false
    t.integer "system_cc_id",               :null => false
    t.text    "num",                        :null => false
    t.date    "expiry",                     :null => false
    t.text    "pin",                        :null => false
    t.string  "hash_type",    :limit => 10, :null => false
  end

  create_table "company_location", :force => true do |t|
    t.integer "company_id",                :null => false
    t.integer "country_id",                :null => false
    t.integer "region_id",                 :null => false
    t.integer "city_id",                   :null => false
    t.integer "airport_id",                :null => false
    t.string  "name"
    t.string  "addr1"
    t.string  "addr2"
    t.string  "zip",        :limit => 20
    t.string  "www",        :limit => 100
    t.string  "email",      :limit => 100
    t.string  "phone1",     :limit => 25
    t.string  "phone2",     :limit => 25
    t.string  "fax",        :limit => 25
    t.float   "lat"
    t.float   "lng"
  end

  create_table "company_role", :force => true do |t|
    t.integer "role_id",     :null => false
    t.integer "company_id",  :null => false
    t.string  "field_value"
    t.date    "created_at",  :null => false
    t.date    "updated_at",  :null => false
  end

  add_index "company_role", ["role_id", "company_id"], :name => "index_company_role_on_role_id_and_company_id", :unique => true

  create_table "company_sales_account", :force => true do |t|
    t.integer "company_id", :null => false
    t.integer "account_id", :null => false
  end

  add_index "company_sales_account", ["company_id", "account_id"], :name => "index_company_sales_account_on_company_id_and_account_id", :unique => true

  create_table "country", :force => true do |t|
    t.string "iso",  :null => false
    t.string "name", :null => false
  end

  add_index "country", ["name"], :name => "index_country_on_name"

  create_table "country_region", :force => true do |t|
    t.integer "country_id", :null => false
    t.string  "iso",        :null => false
    t.string  "name",       :null => false
  end

  add_index "country_region", ["iso", "name"], :name => "index_country_region_on_iso_and_name"

  create_table "country_region_city", :force => true do |t|
    t.integer "region_id", :null => false
    t.string  "name",      :null => false
    t.float   "lat"
    t.float   "lng"
  end

  add_index "country_region_city", ["name"], :name => "index_country_region_city_on_name"

  create_table "country_region_city_airport", :force => true do |t|
    t.string  "icao",    :limit => 4, :null => false
    t.string  "iso",     :limit => 3, :null => false
    t.integer "city_id"
    t.string  "name",                 :null => false
  end

  add_index "country_region_city_airport", ["iso", "name"], :name => "index_country_region_city_airport_on_iso_and_name"

  create_table "domain", :force => true do |t|
    t.integer "parent_id", :default => 0, :null => false
    t.string  "name",                     :null => false
    t.string  "label"
  end

  create_table "domain_account_role", :force => true do |t|
    t.integer "domain_id", :null => false
    t.integer "role_id",   :null => false
  end

  add_index "domain_account_role", ["domain_id", "role_id"], :name => "index_domain_account_role_on_domain_id_and_role_id", :unique => true

  create_table "domain_company_role", :force => true do |t|
    t.integer "domain_id", :null => false
    t.integer "role_id",   :null => false
  end

  add_index "domain_company_role", ["domain_id", "role_id"], :name => "index_domain_company_role_on_domain_id_and_role_id", :unique => true

  create_table "domain_field", :force => true do |t|
    t.integer "domain_id",                            :null => false
    t.string  "name",                                 :null => false
    t.string  "label",                                :null => false
    t.boolean "required",   :default => true,         :null => false
    t.string  "field_type",                           :null => false
    t.string  "config",     :default => "--- {}\n\n", :null => false
  end

  create_table "invoice", :force => true do |t|
    t.integer  "order_id",          :null => false
    t.integer  "invoice_status_id", :null => false
    t.text     "comment"
    t.integer  "created_by",        :null => false
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "invoice_item", :force => true do |t|
    t.integer "invoice_id",                                                               :null => false
    t.integer "invoiceable_id",                                                           :null => false
    t.string  "invoiceable_type",                                                         :null => false
    t.string  "name",                                                                     :null => false
    t.decimal "cost_cents",       :precision => 8, :scale => 2,                           :null => false
    t.text    "adjustments",                                    :default => "--- []\n\n", :null => false
    t.integer "updated_by"
  end

  create_table "invoice_payable", :force => true do |t|
    t.integer  "invoice_id",                                                    :null => false
    t.integer  "company_id",                                                    :null => false
    t.string   "payable_type",                                                  :null => false
    t.integer  "payable_id",                                                    :null => false
    t.string   "name",                                                          :null => false
    t.decimal  "cost_cents",   :precision => 8, :scale => 2,                    :null => false
    t.text     "adjustments"
    t.boolean  "paid",                                       :default => false, :null => false
    t.datetime "paid_date"
    t.integer  "updated_by",                                                    :null => false
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "invoice_status", :force => true do |t|
    t.string "name", :null => false
  end

  create_table "invoice_transaction", :force => true do |t|
    t.integer  "transaction_type_id",                                                  :null => false
    t.integer  "invoice_id",                                                           :null => false
    t.integer  "transaction_method_id",                                                :null => false
    t.integer  "method_number"
    t.datetime "method_date"
    t.decimal  "amount_cents",          :precision => 8, :scale => 2, :default => 0.0
    t.string   "comment"
    t.integer  "created_by",                                                           :null => false
    t.integer  "updated_by",                                                           :null => false
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "mawb_hwb", :force => true do |t|
    t.integer "mawb_id", :null => false
    t.integer "hwb_id",  :null => false
  end

  create_table "order_entity", :force => true do |t|
    t.integer  "order_id",                                                            :null => false
    t.integer  "order_type_entity_id",                                                :null => false
    t.integer  "company_id",                                                          :null => false
    t.integer  "account_id"
    t.datetime "date_in",                                                             :null => false
    t.datetime "date_out"
    t.string   "attn"
    t.integer  "company_location_id"
    t.decimal  "cost_cents",           :precision => 8, :scale => 2, :default => 0.0, :null => false
  end

  create_table "order_entity_cost", :force => true do |t|
    t.integer "order_entity_id",                                                 :null => false
    t.integer "shipping_cost_id",                                                :null => false
    t.decimal "cost_cents",       :precision => 8, :scale => 2, :default => 0.0, :null => false
    t.date    "when",                                                            :null => false
  end

  create_table "order_entity_domain_value", :force => true do |t|
    t.integer "order_entity_id", :null => false
    t.integer "domain_field_id", :null => false
    t.string  "value"
  end

  create_table "order_item", :force => true do |t|
    t.integer "order_id", :null => false
    t.integer "pieces",   :null => false
    t.float   "length",   :null => false
    t.float   "width",    :null => false
    t.float   "height",   :null => false
    t.float   "weight"
    t.float   "value"
  end

  create_table "order_log", :force => true do |t|
    t.integer  "order_log_type_id",               :default => 1, :null => false
    t.integer  "order_id",                                       :null => false
    t.integer  "account_id",                                     :null => false
    t.datetime "created_at",                                     :null => false
    t.datetime "updated_at",                                     :null => false
    t.string   "subject"
    t.text     "msg",                                            :null => false
    t.string   "verb",              :limit => 11
  end

  create_table "order_log_type", :force => true do |t|
    t.string "name",  :null => false
    t.string "label", :null => false
  end

  create_table "order_revenu", :force => true do |t|
    t.integer "order_id",                                        :null => false
    t.integer "system_revenu_id",                                :null => false
    t.integer "system_revenu_type_id",                           :null => false
    t.float   "value",                 :default => 0.0,          :null => false
    t.string  "config",                :default => "--- {}\n\n", :null => false
  end

  create_table "order_status", :force => true do |t|
    t.string "name",  :null => false
    t.string "label", :null => false
  end

  create_table "order_type", :force => true do |t|
    t.string "name",  :null => false
    t.string "label"
  end

  create_table "order_type_doc", :force => true do |t|
    t.integer "order_type_id", :null => false
    t.integer "template_id",   :null => false
  end

  create_table "order_type_entity", :force => true do |t|
    t.integer "order_type_id", :null => false
    t.integer "domain_id",     :null => false
    t.string  "name",          :null => false
    t.string  "label",         :null => false
  end

  create_table "orders", :force => true do |t|
    t.integer  "parent_id",                                           :default => 0,   :null => false
    t.string   "bill_number"
    t.integer  "shipping_status_id",                                                   :null => false
    t.integer  "order_type_id",                                                        :null => false
    t.integer  "created_by",                                                           :null => false
    t.datetime "created_at",                                                           :null => false
    t.datetime "updated_at",                                                           :null => false
    t.integer  "billing_method_id",                                                    :null => false
    t.integer  "bill_to_id",                                                           :null => false
    t.string   "po"
    t.string   "purpose"
    t.decimal  "declared_value_cents",  :precision => 8, :scale => 2, :default => 0.0, :null => false
    t.integer  "shipping_method_id",                                                   :null => false
    t.integer  "dim_factor",                                          :default => 194, :null => false
    t.integer  "pieces",                                                               :null => false
    t.integer  "weight"
    t.integer  "shipping_commodity_id",                                                :null => false
    t.string   "pickup_locations"
    t.string   "pod_name"
    t.datetime "pod_date"
    t.datetime "pod_updated_at"
    t.integer  "order_status_id",                                     :default => 1,   :null => false
  end

  create_table "plugin_schema_info", :id => false, :force => true do |t|
    t.string  "plugin_name"
    t.integer "version"
  end

  create_table "report", :force => true do |t|
    t.string "name",       :null => false
    t.string "label",      :null => false
    t.string "model",      :null => false
    t.string "conditions"
    t.string "joins"
    t.string "columns"
  end

  create_table "role", :force => true do |t|
    t.datetime "created_at",                :null => false
    t.datetime "updated_at",                :null => false
    t.string   "identifier", :limit => 100, :null => false
    t.string   "label",      :limit => 100, :null => false
  end

  add_index "role", ["identifier"], :name => "index_role_on_identifier"

  create_table "role_field", :force => true do |t|
    t.integer "role_id",                      :null => false
    t.text    "name",                         :null => false
    t.text    "label",                        :null => false
    t.boolean "required",   :default => true, :null => false
    t.text    "config",                       :null => false
    t.string  "field_type",                   :null => false
  end

  create_table "role_static_permission", :force => true do |t|
    t.integer "role_id",              :null => false
    t.integer "static_permission_id", :null => false
  end

  add_index "role_static_permission", ["role_id", "static_permission_id"], :name => "index_role_static_permission_on_role_id_and_static_permission_i", :unique => true

  create_table "sales_agent", :force => true do |t|
    t.integer  "company_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "session", :force => true do |t|
    t.string   "session_id", :null => false
    t.text     "data"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "session", ["session_id"], :name => "index_session_on_session_id"
  add_index "session", ["updated_at"], :name => "index_session_on_updated_at"

  create_table "shipping_commodity", :force => true do |t|
    t.string "name", :null => false
  end

  create_table "shipping_cost", :force => true do |t|
    t.string  "name",                         :null => false
    t.boolean "protected", :default => false, :null => false
  end

  create_table "shipping_method", :force => true do |t|
    t.string "name", :null => false
  end

  create_table "shipping_status", :force => true do |t|
    t.string "name", :null => false
  end

  create_table "static_permission", :force => true do |t|
    t.datetime "created_at",                :null => false
    t.datetime "updated_at",                :null => false
    t.string   "identifier", :limit => 100, :null => false
  end

  add_index "static_permission", ["identifier"], :name => "index_static_permission_on_identifier"

  create_table "system_cc", :force => true do |t|
    t.string "name", :limit => 55, :null => false
    t.string "mask", :limit => 55
  end

  create_table "system_log", :force => true do |t|
    t.integer  "system_log_type_id",               :default => 1, :null => false
    t.integer  "loggable_id",                                     :null => false
    t.string   "loggable_type",                                   :null => false
    t.string   "verb",               :limit => 23
    t.string   "subject",                                         :null => false
    t.text     "msg",                                             :null => false
    t.integer  "created_by",                                      :null => false
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "system_log_type", :force => true do |t|
    t.string "name",  :null => false
    t.string "label", :null => false
    t.string "icon"
  end

  create_table "system_revenu", :force => true do |t|
    t.string "name",          :null => false
    t.string "label",         :null => false
    t.string "invoice_label", :null => false
  end

  create_table "system_revenu_type", :force => true do |t|
    t.string "name", :limit => 25
  end

  create_table "template", :force => true do |t|
    t.integer  "template_type_id",                 :null => false
    t.string   "model"
    t.string   "name",                             :null => false
    t.string   "label",                            :null => false
    t.text     "content",          :default => "", :null => false
    t.integer  "created_by",                       :null => false
    t.integer  "updated_by",                       :null => false
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "template_type", :force => true do |t|
    t.string "name",  :null => false
    t.string "label", :null => false
  end

  create_table "transaction_method", :force => true do |t|
    t.string "name", :null => false
  end

  create_table "transaction_type", :force => true do |t|
    t.string "name", :null => false
  end

end
