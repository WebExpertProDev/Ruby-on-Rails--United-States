/***
 * RExt.form.Label
 */
RExt.form.Label = Ext.extend(Ext.form.Field, {
    disabled: true,
    fieldLabel: 'Label',    
           
    onRender : function(ct, position) {   
        
        RExt.form.Label.superclass.onRender.call(this, ct, position);
        this.el.applyStyles({
            border: 'none',
            background: 'transparent',
            color: '#000'   
        });                        
    }     
});

/***
 * RExt.LinkButton
 * An <a> tag
 */
RExt.LinkButton = Ext.extend(Ext.BoxComponent, {
    
    defaultAutoCreate : {tag: "a", href:"#"},
    
    cls : 'r-link-button',
    
    /**
     * @cfg {Mixed} commandParam
     * this param is sent along with the handler event.  you can set this to whatever you wish.
     */    
    commandParam : null,
           
    // private
    onRender : function(ct, position){
        Ext.form.Field.superclass.onRender.call(this, ct, position);
        if(!this.el){
            var cfg = this.getAutoCreate();       
            cfg.html = this.text;
            this.el = ct.createChild(cfg, position);
            this.el.on("click", this.onClick, this);
        }        
        this.el.addClass([this.cls]);        
    },
    
    // privatte
    onClick : function(ev, node) {        
        if (this.handler) {
            var scope = this.scope || this;
            this.handler.call(scope, ev, node, this.commandParam);
        }    
    },
    
    /***
     * setText
     * Set the link's text
     * @param {String} v
     */     
    setText : function(v) {
        this.el.dom.innerHTML = v;
    },
    
    /***
     * setParam
     * the param sent along when handler is called
     * @param {Object} v
     */
    setParam : function(v) { this.param = v; },
    
    /***
     * reset
     */
    reset : function() {
        this.commandParam = null;
    }
    
});

/***
 * Ext.form.ComboBox::initList
 * Extend initList to z-index the dropdown list (11000) above Menu (15000)
 */
Ext.override(Ext.form.ComboBox, {
	initList : function(){
	    if(!this.list){
            var cls = 'x-combo-list';

			// z-index 16000 -- this is the only change.
            this.list = new Ext.Layer({
                zindex: 15001, shadow: this.shadow, cls: [cls, this.listClass].join(' '), constrain:false
            });

            var lw = this.listWidth || Math.max(this.wrap.getWidth(), this.minListWidth);
            this.list.setWidth(lw);
            this.list.swallowEvent('mousewheel');
            this.assetHeight = 0;

            if(this.title){
                this.header = this.list.createChild({cls:cls+'-hd', html: this.title});
                this.assetHeight += this.header.getHeight();
            }

            this.innerList = this.list.createChild({cls:cls+'-inner'});
            this.innerList.on('mouseover', this.onViewOver, this);
            this.innerList.on('mousemove', this.onViewMove, this);
            this.innerList.setWidth(lw - this.list.getFrameWidth('lr'))

            if(this.pageSize){
                this.footer = this.list.createChild({cls:cls+'-ft'});
                this.pageTb = new Ext.PagingToolbar({
                    store:this.store,
                    pageSize: this.pageSize,
                    renderTo:this.footer
                });
                this.assetHeight += this.footer.getHeight();
            }

            if(!this.tpl){
                this.tpl = '<tpl for="."><div class="'+cls+'-item">{' + this.displayField + '}</div></tpl>';
            }

		    /**
		    * The {@link Ext.DataView DataView} used to display the ComboBox's options.
		    * @type Ext.DataView
		    */
            this.view = new Ext.DataView({
                applyTo: this.innerList,
                tpl: this.tpl,
                singleSelect: true,
                selectedClass: this.selectedClass,
                itemSelector: this.itemSelector || '.' + cls + '-item'
            });

            this.view.on('click', this.onViewClick, this);

            this.bindStore(this.store, true);

            if(this.resizable){
                this.resizer = new Ext.Resizable(this.list,  {
                   pinned:true, handles:'se'
                });
                this.resizer.on('resize', function(r, w, h){
                    this.maxHeight = h-this.handleHeight-this.list.getFrameWidth('tb')-this.assetHeight;
                    this.listWidth = w;
                    this.innerList.setWidth(w - this.list.getFrameWidth('lr'));
                    this.restrictHeight();
                }, this);
                this[this.pageSize?'footer':'innerList'].setStyle('margin-bottom', this.handleHeight+'px');
            }
        }
    }
});

/****
 * RExt.form.ComboBoxAdd
 * a Combination of both ComboBox and TwinTriggerField.
 * adds an "add" button beside std combo Box trigger.
 * @author Chris Scott
 *
 */
RExt.form.ComboBoxAdd = Ext.extend(Ext.form.ComboBox, {
    
    /***
     * trigger classes.
     */
    trigger1Class: '',            
    trigger2Class: 'x-form-add-trigger',
    
    /** @config {Boolean} hides the regular combo trigger **/
    hideTrigger1 : false,
    
    /** @config [Boolean} hides the add trigger **/
    hideTrigger2 : false,
    
    /***
     * initComponent
     */    
    initComponent : function(){
        RExt.form.ComboBoxAdd.superclass.initComponent.call(this);
        
        /***
         * @event add
         * fires when 2nd trigger is clicked
         */
        this.addEvents({add : true});
        
        // implement triggerConfig from Ext.form.TwinTriggerField
        this.triggerConfig = {
            tag:'span', cls:'x-form-twin-triggers', cn:[
            {tag: "img", src: Ext.BLANK_IMAGE_URL, cls: "x-form-trigger " + this.trigger1Class},
            {tag: "img", src: Ext.BLANK_IMAGE_URL, cls: "x-form-trigger " + this.trigger2Class}
        ]};
    },
    
    /***
     * onRender
     * provide a mechanism to hide either triggers
     * @param {Object} ct
     * @param {Object} position
     */
    onRender : function(ct, position) {
        RExt.form.ComboBoxAdd.superclass.onRender.call(this, ct, position);
        if (this.hideTrigger1 === true) { this.getTrigger(0).setDisplayed(false);}
        if (this.hideTrigger2 === true) { this.getTrigger(1).setDisplayed(false);}                   
    },
    
    /***
     * getTrigger
     * copied from Ext.form.TwinTriggerField
     * @param {Object} index
     */
    getTrigger : function(index){
        return this.triggers[index];
    },
    
    /***
     * initTrigger
     * copied from Ext.form.TwinTriggerField
     */
    initTrigger : function(){
        var ts = this.trigger.select('.x-form-trigger', true);
        this.wrap.setStyle('overflow');
        var triggerField = this;
        ts.each(function(t, all, index){
            t.hide = function(){
                var w = triggerField.wrap.getWidth();
                //this.dom.style.display = 'none';    // <-- commented out these lines.  they fuck things.
                triggerField.el.setWidth(w-triggerField.trigger.getWidth());
            };
            t.show = function(){
                var w = triggerField.wrap.getWidth();
                //this.dom.style.display = '';  // <-- commented out these lines.  they fuck things.
                triggerField.el.setWidth(w-triggerField.trigger.getWidth());
            };
            var triggerIndex = 'Trigger'+(index+1);

            if(this['hide'+triggerIndex]){
                //t.dom.style.display = 'none';  // <-- commented out these lines.  they fuck things.
            }
            t.on("click", this['on'+triggerIndex+'Click'], this, {preventDefault:true});
            t.addClassOnOver('x-form-trigger-over');
            t.addClassOnClick('x-form-trigger-click');
        }, this);
        this.triggers = ts.elements;
    },
    
    /***
     * onTrigger1Click
     * defer to std ComboBox trigger method
     */
    onTrigger1Click : function() {
        this.onTriggerClick();    
    },
    
    /***
     * onTrigger2Click     
     * this is the "add" [+] button handler.  fire 'add' event     
     */
    onTrigger2Click : function(ev, node, options) {                
        this.fireEvent('add', {field: this, button: this.triggers[1]});
        // NOTE: I've added a stopEvent here to prevent refocussing of popup (if this combo is on a popup)
        // since the [+] button usually show another popup or form, its parent popup was receiving the click 
        // event and calling toFront(), refocussing over top of the newly shown form.
        // @see RExt.form.Popup::initialize -- there's a body element click-handler there that refocusses itself
        // when clicked.
        // Anyway -- this behaviour is not desired when we click on the [+] button -- we *want* the newly shown
        // form to appear on top of this one.
        ev.stopEvent();        
    },
        
	/***
	 * insert
	 * provide a convenience method to insert ONE AND ONLY ONE record to the store.	 	 	 	 
	 * @param {Object} index
	 * @param {Object} data (
	 */
	insert : function(index, data) {
        this.reset();
        
        var rec = new this.store.recordType(data);                
        rec.id = rec.data.id; 
        this.store.insert(index, rec);
		this.setValue(rec.data.id);
		this.fireEvent('select', this, rec, index);
        return rec;        
	}
});



/***
 * RExt.form.GridField
 * @param {Object} config
 * - provides a way of adding a Grid to a form, perhaps contained in a fieldset for example
 */
RExt.form.GridField = function(config) {
    RExt.form.GridField.superclass.constructor.apply(this, arguments);
    this.gridType = config.grid;
    this.grid = '';
};

Ext.extend(RExt.form.GridField, Ext.form.Field, {
     validationEvent : false,

    // private
    onRender : function(ct, position){
        RExt.form.GridField.superclass.onRender.call(this, ct, position);

        if(!this.el) {
            var cfg = this.getAutoCreate();
            if(!cfg.name){
                cfg.name = this.name || this.id;
            }
            this.el = ct.createChild(cfg, position);
        }

        var label = Ext.get(ct.getPrevSibling()).remove(); // kill the label too, grid won't need a label
        ct.removeClass('x-form-element');    // no need to move the grid to the right of labels with this style
        ct.setStyle('padding-left',0);        // shift the grid to where the labels used to be...
        this.el.setStyle('overflow','auto');
        var dlg = Application.getDialog();
        this.el.setWidth(ct.getWidth());    // 50 pixels off the width allows for some padding, hackish
        this.el.setHeight(ct.getHeight());
        switch(this.gridType) {
             case 'attribute':
                 this.grid = new Ext.grid.AttributeGrid(this.el,{autoSizeColumns: true});
                 break;
             case 'property':
                 break;
             case 'grid':
                 break;
         }
         this.grid.render(ct);
    },

    onResize : function (dialog, width, height) {
        var width = dialog.body.getWidth()-40;
        var el = this.grid.getGridEl();
        el.setWidth(width);
        var view = this.grid.getView();
        view.refresh();
        view.autoSizeColumn(1);
    },

    /***
     * reset
     * function will check the Store to see if it has any records, if it does, remove them
     */
    reset : function(){
        if(this.grid) {
            var ds = this.grid.getDataSource();
            if(ds.getTotalCount() > 0) {
                ds.removeAll();
            }
        }
    },

    validate : function () {
        valid= true;
        if(this.grid) {
            var view = this.grid.getView();
            var ds = this.grid.getDataSource();
            if(ds.getTotalCount() > 0) {
               valid = this.validateGrid(ds);
               if(!valid) {
                   Application.setAlert("Please provide missing Requirements", false);
               }
            }
        }
        return valid;
    },

    validateGrid : function (ds) {
        var valid = true;
        var view = this.grid.getView();
        var currCell = 0;
        for (var key in this.grid.customEditors) {
            var ed = this.grid.customEditors[key];
            var cell = view.getCell(currCell,1);
            var el = Ext.fly(cell);
            var list = el.query('.x-grid-cell-text');
            if(ed.field.rendered) {
                if(!ed.field.allowBlank && !ed.field.isValid()) {
                    // don't keep adding the invalid class
                    if(!el.hasClass('x-form-invalid')) {
                        list[0].className = list[0].className + ' x-form-invalid';
                        cell.className = cell.className + " x-form-invalid";
                    }
                    valid = false;
                }
            }
            currCell++;
        }
        return valid;
    }
});


/***
 * RExt.plugins.InlineField
 * A new plugin-based implementation of InlineFields.
 */
Ext.namespace("RExt.plugins");
RExt.plugins.InlineField = function(param) {
    Ext.apply(this, param);    
};
Ext.extend(RExt.plugins.InlineField, Ext.util.Observable, {
    
    inlineClass: 'x-form-inline-field',
	disabledClass: 'x-form-inline-field-disabled',
	saveOnlyOnChange: true,
    autoSave : true,
	confirmSave: false,
	confirmText: 'The data has been successfully saved.',
    
    url: null,
	method: 'POST',
	success: null,
	failure: null,
	params: {},
	scope: null,
            
    init : function(field) {
                                        
        field.on('specialkey', function(f, e) {
    		if (e.getKey() == e.ESC) {
    			f.setValue(this.startValue);
    			f.blur();
    		}
    	},this);  
        
        field.on('render', function(f) {
    		f.el.addClass(this.inlineClass);
    
    		if (f.editable === false) {
    			f.disabled = true;
    		}
    	},this);
    
    	field.on('focus', function(f) {
            this.startValue = f.getValue();
    		if (f.editable !== false) {
    			f.el.removeClass(this.inlineClass);
    		}
    	},this);
    
    	field.on('blur', function(f) {
    		if (f.isValid() && !f.el.hasClass(this.inlineClass)) {
    			f.el.addClass(this.inlineClass);                                
    			if (this.autoSave && (this.saveOnlyOnChange === false || f.getValue() != this.startValue)) {
    				this.doSave(f);
    			}
    		}
	    },this);      
    },
    
    doSave : function(f) {
                				
		// chris fixed this line for Ext2.0
		this.params[(f.name || f.id)] = f.getValue();
		
        	/*		
			this.callback = (!cfg.callback) ? {success: Ext.emptyFn, failure: Ext.emptyFn} :
				{success: cfg.callback.success || cfg.callback, failure: cfg.callback.failure || Ext.emptyFn};
			this.scope = cfg.scope || this.callback;
            
			if (this.confirmSave === true) {
				var success = function() {
					Ext.MessageBox.alert('Success', this.confirmText);
				}.createDelegate(this);

				this.callback.success = success.createSequence(this.callback.success);
			}									
		}        		
		*/                
        
		Ext.Ajax.request({
			url: this.url,
			method: this.method,
			success: this.success,
			failure: this.failure,
			params: this.params,
			scope: this.scope
		});
	},
    
    reset : function() {
		Ext.form.TextField.superclass.reset.call(this);

		if (this.value) {
			this.setRawValue(this.value);
		}
		else if (this.emptyText && this.getRawValue().length < 1) {
			this.setRawValue(this.emptyText);
			this.el.addClass(this.emptyClass);
		}
	}
});


/***
 * Ext.form.InlineTextField
 * from Ext user extensions
 * @param {Object} config
 */

Ext.form.InlineTextField = function(config) {
	Ext.form.InlineTextField.superclass.constructor.call(this, config);

	this.on('specialkey', function(f, e) {
		if (e.getKey() == e.ESC) {
			f.setValue(this.startValue);
			f.blur();
		}
	}, this);
};

Ext.extend(Ext.form.InlineTextField, Ext.form.TextField, {
	inlineClass: 'x-form-inline-field',
	disabledClass: 'x-form-inline-field-disabled',
	saveOnlyOnChange: true,
	confirmSave: false,
	confirmText: 'The data has been successfully saved.',

	doSave : function() {
		var cfg = this.autoSave;

		this.params = {};

		// chris fixed this line for Ext2.0
		this.params[(this.name || this.id)] = this.getValue();

		if (typeof cfg == 'object') {
			this.method = cfg.method || 'POST';
			this.callback = (!cfg.callback) ? {success: Ext.emptyFn, failure: Ext.emptyFn} :
				{success: cfg.callback.success || cfg.callback, failure: cfg.callback.failure || Ext.emptyFn};
			this.scope = cfg.scope || this.callback;

			if (this.confirmSave === true) {
				var success = function() {
					Ext.MessageBox.alert('Success', this.confirmText);
				}.createDelegate(this);

				this.callback.success = success.createSequence(this.callback.success);
			}
			var p = (cfg.params) ? cfg.params : '';
			if (p) {
				// chris fixed this for Ext2
				Ext.apply(this.params, p);
			}

			this.url = (this.method == 'POST') ? cfg.url : cfg.url + '?' + this.params;
		}
		else if (typeof cfg == 'string') {
			this.method = 'POST';
			this.url = (this.method == 'POST') ? cfg : cfg + '?' + this.params;
		}

		Ext.Ajax.request({
			url: this.url,
			method: this.method,
			success: this.callback.success,
			failure: this.callback.failure,
			params: this.params,
			scope: this.scope
		});
	},

	reset : function() {
		Ext.form.TextField.superclass.reset.call(this);

		if (this.value) {
			this.setRawValue(this.value);
		}
		else if (this.emptyText && this.getRawValue().length < 1) {
			this.setRawValue(this.emptyText);
			this.el.addClass(this.emptyClass);
		}
	}
});

Ext.override(Ext.form.InlineTextField, {
	onRender : Ext.form.TextField.prototype.onRender.createSequence(function() {
		this.el.addClass(this.inlineClass);

		if (this.editable === false) {
			this.disabled = true;
		}
	}),

	onFocus : Ext.form.TextField.prototype.onFocus.createSequence(function() {
		if (this.editable !== false) {
			this.el.removeClass(this.inlineClass);
		}
	}),

	onBlur : Ext.form.TextField.prototype.onBlur.createSequence(function() {
		if (this.isValid() && !this.el.hasClass(this.inlineClass)) {
			this.el.addClass(this.inlineClass);

			if (this.autoSave && (this.saveOnlyOnChange === false || this.getValue() != this.startValue)) {
				this.doSave();
			}
		}
	})
});


/***
 * Ext.form.InlineTextArea
 * @param {Object} config
 */
Ext.form.InlineTextArea = function(config) {
	Ext.form.InlineTextArea.superclass.constructor.call(this, config);

	this.on('specialkey', function(f, e) {
		if (e.getKey() == e.ESC) {
			f.setValue(this.startValue);
			f.blur();
		}
	}, this);
};

Ext.extend(Ext.form.InlineTextArea, Ext.form.TextArea, {
	inlineClass: 'x-form-inline-field',
	disabledClass: 'x-form-inline-field-disabled',
	saveOnlyOnChange: true,
	confirmSave: false,
	confirmText: 'The data has been successfully saved.',

	doSave : function() {
		var cfg = this.autoSave;

		this.params = {};

		// chris fixed this line for Ext2.0
		this.params[(this.name || this.id)] = this.getValue();

		if (typeof cfg == 'object') {
			this.method = cfg.method || 'POST';
			this.callback = (!cfg.callback) ? {success: Ext.emptyFn, failure: Ext.emptyFn} :
				{success: cfg.callback.success || cfg.callback, failure: cfg.callback.failure || Ext.emptyFn};
			this.scope = cfg.scope || this.callback;

			if (this.confirmSave === true) {
				var success = function() {
					Ext.MessageBox.alert('Success', this.confirmText);
				}.createDelegate(this);

				this.callback.success = success.createSequence(this.callback.success);
			}

			var p = (cfg.params) ? cfg.params : '';

			// chris fixed this for Ext2.0
			if (p) {
				Ext.apply(this.params, p);
			}

			this.url = (this.method == 'POST') ? cfg.url : cfg.url + '?' + this.params;
		}
		else if (typeof cfg == 'string') {
			this.method = 'POST';
			this.url = (this.method == 'POST') ? cfg : cfg + '?' + this.params;
		}

		Ext.Ajax.request({
			url: this.url,
			method: this.method,
			success: this.callback.success,
			failure: this.callback.failure,
			params: this.params,
			scope: this.scope
		});
	},

	reset : function() {
		Ext.form.TextField.superclass.reset.call(this);

		if (this.value) {
			this.setRawValue(this.value);
		}
		else if (this.emptyText && this.getRawValue().length < 1) {
			this.setRawValue(this.emptyText);
			this.el.addClass(this.emptyClass);
		}
	}
});

Ext.override(Ext.form.InlineTextArea, {
	onRender : Ext.form.TextArea.prototype.onRender.createSequence(function() {
		this.el.addClass(this.inlineClass);
		this.autoSize();	// <-- by Chris.  Ext.form.TextArea::autoSize() autosizes field to fit contained text.

		if (this.editable === false) {
			this.disabled = true;
		}
	}),

	onFocus : Ext.form.TextArea.prototype.onFocus.createSequence(function() {
		if (this.editable !== false) {
			this.el.removeClass(this.inlineClass);
		}
	}),

	onBlur : Ext.form.TextArea.prototype.onBlur.createSequence(function() {
		if (this.isValid() && !this.el.hasClass(this.inlineClass)) {
			this.el.addClass(this.inlineClass);

			if (this.autoSave && (this.saveOnlyOnChange === false || this.getValue() != this.startValue)) {
				this.doSave();
			}
		}
	})
});

/***
 * Ext.app.SearchField
 * Taken from Ext demos
 * Ext JS Library 2.0.2
 * Copyright(c) 2006-2008, Ext JS, LLC.
 * licensing@extjs.com
 * 
 * http://extjs.com/license
 */
Ext.app.SearchField = Ext.extend(Ext.form.TwinTriggerField, {
    initComponent : function(){
        Ext.app.SearchField.superclass.initComponent.call(this);
        this.on('specialkey', function(f, e){
            if(e.getKey() == e.ENTER){
                this.onTrigger2Click();
            }
        }, this);
    },

    validationEvent:false,
    validateOnBlur:false,
    trigger1Class:'x-form-clear-trigger',
    trigger2Class:'x-form-search-trigger',
    hideTrigger1:true,
    width:180,
    hasSearch : false,
    paramName : 'query',

    onTrigger1Click : function(){
        if(this.hasSearch){
            this.el.dom.value = '';
            var o = {start: 0};
            this.store.baseParams = this.store.baseParams || {};
            this.store.baseParams[this.paramName] = '';
            this.store.reload({params:o});
            this.triggers[0].hide();
            this.hasSearch = false;
        }
    },

    onTrigger2Click : function(){
        var v = this.getRawValue();
        if(v.length < 1){
            this.onTrigger1Click();
            return;
        }
        var o = {start: 0};
        this.store.baseParams = this.store.baseParams || {};
        this.store.baseParams[this.paramName] = v;
        this.store.reload({params:o});
        this.hasSearch = true;
        this.triggers[0].show();
    }
});


// vim: ts=4:sw=4:nu:fdc=4:nospell
/**
 * Ext.ux.plugins
 *
 * @author    Ing. Jozef Sakáloš <jsakalos@aariadne.com>
 * @copyright (c) 2007, by Ing. Jozef Sakáloš
 * @date      24. November 2007
 * @version   $Id: Ext.ux.plugins.js 596 2007-11-25 13:40:43Z jozo $
 */
 
Ext.namespace('Ext.ux', 'Ext.ux.plugins');
 
/**
 * Remote Validator
 * Makes remote (server) field validation easier
 *
 * To be used by form fields like TextField, NubmerField, TextArea, ...
 */
Ext.ux.plugins.RemoteValidator = {
    init:function(field) {
        
        /***
         * @event servervalidatevalid   
         * fires when server-validation returns valid.
         * @param {Object} response from server       
         * @author Chris Scott
         */
        field.addEvents({
            'servervalidatevalid' : true,
            'servervalidateinvalid' : true
        });
        
        // save original functions
        var isValid = field.isValid;
        var validate = field.validate;
 
        // apply remote validation to field
        Ext.apply(field, {
             remoteValid:false
 
            // private
            ,isValid:function(preventMark) {
                if (this.disabled) { return true; }                
                return isValid.call(this, preventMark) && this.remoteValid;
            }
 
            // private
            ,validate:function() {
                var clientValid = validate.call(this);
                if(!this.disabled && !clientValid) {
                    return false;
                }
                if(this.disabled || (clientValid && this.remoteValid)) {
                    this.clearInvalid();
                    return true;
                }
                if(!this.remoteValid) {
                    this.markInvalid(this.reason);
                    return false;
                }
                return false;
            }
 
            // private - remote validation request
            ,validateRemote:function() {
                if (!validate.call(this)) { return false; } // <-- chris: why server-validate if client-validation isn't valid??
                
                this.rvOptions.params = this.rvOptions.params || {};
                this.rvOptions.params.field = this.name;
                this.rvOptions.params.value = (!this instanceof Ext.form.ComboBox) ? this.getValue() : this.getRawValue();
                Ext.Ajax.request(this.rvOptions);
            }
 
            // private - remote validation request success handler
            ,rvSuccess:function(response, options) {
                var o;
                try {
                    o = Ext.decode(response.responseText);
                }
                catch(e) {
                    throw this.cannotDecodeText;
                }
                if('object' !== typeof o) {
                    throw this.notObjectText;
                }
                if(true !== o.success) {
                    throw this.serverErrorText + ': ' + o.error;
                }
                                
                var names = this.rvOptions.paramNames;
                this.remoteValid = true === o[names.valid];
                if (this.remoteValid === true) {                    
                    this.fireEvent('servervalidatevalid', o); // <-- added by chris.  fire an event for others to play with.
                }
                else {
                    this.fireEvent('servervalidateinvalid', o);  // <-- added by chris.  fire an event for others to play with.
                }
                this.reason = o[names.reason];
                this.validate();
            }
 
            // private - remote validation request failure handler
            ,rvFailure:function(response, options) {
                throw this.requestFailText
            }
 
            // private - runs from keyup event handler
            ,filterRemoteValidation:function(e) {                
                if(!e.isNavKeyPress()) {
                    this.remoteValidationTask.delay(this.remoteValidationDelay);
                }
            }
        });
 
        // remote validation defaults
        Ext.applyIf(field, {
             remoteValidationDelay:500
            ,reason:'Server has not yet validated the value'
            ,cannotDecodeText:'Cannot decode json object'
            ,notObjectText:'Server response is not an object'
            ,serverErrorText:'Server error'
            ,requestFailText:'Server request failed'
        });
 
        // install event handlers on field render
        field.on({
            render:{single:true, scope:field, fn:function() {
                this.remoteValidationTask = new Ext.util.DelayedTask(this.validateRemote, this);
                this.el.on('keyup', this.filterRemoteValidation, this);
            }}
        });
 
        // setup remote validation request options
        field.rvOptions = field.rvOptions || {};
        Ext.applyIf(field.rvOptions, {
             method:'post'
            ,scope:field
            ,success:field.rvSuccess
            ,failure:field.rvFailure
            ,paramNames: {
                 valid:'valid'
                ,reason:'reason'
            }
        });
    }
};
 
// end of file
