class ChangeSystemLogMsg < ActiveRecord::Migration
  def self.up
      change_column :system_log, :msg, :text, :null => false
  end

  def self.down
  end
end
