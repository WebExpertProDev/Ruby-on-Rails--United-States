/***
 * RExt.util.RecordCollection
 * A special extension of Ext.util.MixedCollection for handling Ext.data.Record (from an Ext.data.Store)
 * the only difference is in the filter method, where it tests on o.data[property], rather'n o[property]
 * @author Chris Scott
 *
 */
RExt.util.RecordCollection = function() {
	RExt.util.RecordCollection.superclass.constructor.apply(this, arguments);
};
Ext.extend(RExt.util.RecordCollection, Ext.util.MixedCollection, {
	/**
     * override Ext.util.MixedCollection::filter to filter Ext.data.Record objects, where the property
     * to filter exists in record.data.property
     *
     * @param {String} property A property on your objects
     * @param {String/RegExp} value Either string that the property values
     * should start with or a RegExp to test against the property
     * @return {MixedCollection} The new filtered collection
     */
    filter : function(property, value){
		if(!value.exec){ // not a regex
            value = String(value);
            if(value.length == 0){
                return this.clone();
            }
            value = new RegExp("^" + Ext.escapeRe(value), "i");
        }

        return this.filterBy(function(o){
            return o && value.test(o.data[property]); // <-- test o.data[property] on Ext.data.Record
        });
	}
});