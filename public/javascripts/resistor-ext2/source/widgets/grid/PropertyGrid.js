RExt.grid.PropertyRecord = Ext.data.Record.create([
    {name:'name',type:'string'},
    {name: 'column', type: 'string'},
    'value'
]);

RExt.grid.PropertyStore = function(grid, source){
    this.grid = grid;
    this.store = new Ext.data.Store({
        recordType : RExt.grid.PropertyRecord
    });
    this.store.on('update', this.onUpdate,  this);
    if(source){
        this.setSource(source);
    }
    RExt.grid.PropertyStore.superclass.constructor.call(this);
};

Ext.extend(RExt.grid.PropertyStore, Ext.util.Observable, {

    setSource : function (o) {
        this.source = o;
        this.store.removeAll();
        var data = [];
        for(var i = 0, n = o.length; i < n; i++){
            //if(this.isEditableValue(o[i])){
                var record = new RExt.grid.PropertyRecord({name: o[i].name, column: o[i].column, value: o[i].value}, o[i].name);
                data.push(record);
            //}
        }
        this.store.loadRecords({records: data}, {}, true);
    },
     // private
    onUpdate : function(ds, record, type){
        if(type == Ext.data.Record.EDIT){
            var v = record.data['value'];
            var oldValue = record.modified['value'];
            if(this.grid.fireEvent('beforepropertychange', this.source, record.id, v, oldValue) !== false){
                this.source[record.id] = v;
                record.commit();
                this.grid.fireEvent('propertychange', this.source, record.id, v, oldValue);
            }else{
                record.reject();
            }
        }
    },

     // private
    getProperty : function(row){
       return this.store.getAt(row);
    },

    // private
    isEditableValue: function(val){
        if(val && val instanceof Date){
            return true;
        }else if(typeof val == 'object' || typeof val == 'function'){
            return false;
        }
        return true;
    },

    // private
    setValue : function(prop, value){
        this.source[prop] = value;
        this.store.getById(prop).set('value', value);
    },

    // protected - should only be called by the grid.  Use grid.getSource instead.
    getSource : function(){
        return this.source;
    }
});

RExt.grid.PropertyGrid = Ext.extend(Ext.grid.PropertyGrid, {

    initComponent : function(){
        this.customEditors = this.customEditors || {};
        this.lastEditRow = null;
        var store = new RExt.grid.PropertyStore(this);
        this.propStore = store;
        var cm = new Ext.grid.PropertyColumnModel(this, store);
        //store.store.sort('name', 'ASC');
        this.addEvents({
            beforepropertychange: true,
            propertychange: true
        });
        this.cm = cm;
        this.ds = store.store;

        Ext.grid.EditorGridPanel.prototype.initComponent.call(this, arguments);

       this.selModel.on('beforecellselect', function(sm, rowIndex, colIndex){
            if(colIndex === 0){
                this.startEditing.defer(200, this, [rowIndex, 1]);
                return false;
            }
        }, this);
    }
});