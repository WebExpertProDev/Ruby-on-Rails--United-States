Ext.namespace("Ext.ux.form");

/**
 * @class Ext.ux.form.MaskFormatter
 * @constructor
 *
 * MaskFormatter is used to format and edit strings in form fields.
 *
 * @param {Object} config Configuration options
 */
Ext.ux.form.MaskFormatter = function(config) {

	var mask = config["mask"];
	var placeholder = config["placeholder"] || "_";
	var validCharacters = config["validCharacters"];
	var field = null;

	// private final
	var KEY_RANGES = {
		numeric: [48, 57],
		padnum: [96, 105],
		characters: [65, 90],
		all: [0, 255]
	};

	// private
	var isInRange = function(charCode, range) {
		return charCode >= range[0] && charCode <= range[1];
	};

	// private
	// TODO: support other wildcards, like: A (char or number), U (uppercase char), L (lowercase char), ' (escape)
	var getRange = function(wildcard) {
		switch (wildcard) {
			case '#': return [KEY_RANGES["numeric"]];
			case '?': return [KEY_RANGES["characters"]];
			case '*': return [KEY_RANGES["all"]];
		}
		return null;
	};

	// private
	var isMaskChar = function(chr) {
		return getRange(chr) != null;
	};

	// private
	var getDefaultString = function() {
		var str = "";
		var mask = config["mask"];
		for(var i = 0; i < mask.length; i++) {
			var chr = mask.charAt(i);
			str += isMaskChar(chr) ? placeholder : chr;
		}
		return str;
	};

	// private
	var doBackspace = function() {
		doDelete();
		moveCaret(-1);
	};

	// private
	var doDelete = function() {
		var position = getCaretPosition().left;

        var left = field.dom.value.substr(0, position);
        var right = field.dom.value.substr(position + 1, field.dom.value.length - 1);

		field.dom.value = left + placeholder + right;
		setSelection(position);
	};

	// private
	var getCaretPosition = function() {
		var left, right;

		if (!field.dom) {
			// unexpected
			return null;
		}

		var fieldEl = field.dom;
		if (fieldEl.createTextRange) {
			var range = document.selection.createRange().duplicate();
			range.moveEnd("character", fieldEl.value.length);

			if (!range.text) {
				left = fieldEl.value.length;
			} else {
				left = fieldEl.value.lastIndexOf(range.text);
			}

			range = document.selection.createRange().duplicate();
			range.moveStart("character", -(fieldEl.value.length));

			right = range.text.length;
		} else {
			left = fieldEl.selectionStart;
			right = fieldEl.selectionEnd;
        }

		return {left: left, right: right};
    };

	// private
	var setSelection = function(leftPos, rightPos) {
		var left = leftPos;
		var right = rightPos || left + 1;
		if (field.dom.createTextRange) {
			var range = field.dom.createTextRange();
			range.moveStart("character", left);
			range.moveEnd("character", right - field.dom.value.length);
			range.select();
		} else {
			field.dom.setSelectionRange(left, right);
		}
	};

	// private
	var doMask = function(key) {
		if (isInRange(key, KEY_RANGES["padnum"])) {
			key -= 48;
		}

		var position = getCaretPosition().left;
		var ranges = getRange(mask.charAt(position));
		var valid = false;
		if (ranges != null) {
			for (var i = 0; i < ranges.length; i++) {
				if (isInRange(key, ranges[i])) {
					valid = true;
					break;
				}
			}
		}
		if (valid) {
			var fieldValue = field.dom.value;

			var left = fieldValue.substr(0, position);
			var right = fieldValue.substr((position + 1), (fieldValue.length - 1));

			field.dom.value = left + String.fromCharCode(key) + right;

			var previousPosition = position;

			do {
				position++;
			} while(!(isMaskChar(mask.charAt(position))) && (position < fieldValue.length));

			if (isMaskChar(mask.charAt(position))) {
				setSelection(position);
			} else {
				setSelection(previousPosition);
			}
		}
	};

	// private
	var mapKeyToBehavior = function(evt) {
		var key = evt.getKey();
		switch (key) {
			case Ext.EventObject.BACKSPACE:
				doBackspace();
				break;
			case Ext.EventObject.DELETE:
				doDelete();
				break;
			case Ext.EventObject.HOME:
				setSelection(0);
				break;
			case Ext.EventObject.END:
				setSelection(field.dom.value.length - 1);
				break;
			case Ext.EventObject.RIGHT:
				moveCaret(1);
				break;
			case Ext.EventObject.LEFT:
				moveCaret(-1);
				break;
			case Ext.EventObject.TAB:
			case Ext.EventObject.ENTER:
				return;
			default:
				doMask(key);
		}
		evt.stopEvent();
	};

	// private
	var doSelection = function(evt) {
		var pos = getCaretPosition().left;
        if (evt.type == 'focus') {
			console.log('focus');
			pos = 1;
		}
		else if(pos == field.dom.value.length) {
			pos--;
		}
        if(!isMaskChar(mask.charAt(pos))) {
			if (!moveCaret(1)) {
				moveCaret(-1);
			}
		} else {
			setSelection(pos);
		}
	};

	// private
	var moveCaret = function(step, left) {
		var position = left || getCaretPosition().left;

		if (step == 0) {
			return false;
		}

		if (position == 0 && step < 0) {
			return false;
		}

		if ((position >= (field.dom.value.length - 1)) && (step > 0)) {
			return false;
		}

		do {
			position += step;
		} while(!(isMaskChar(mask.charAt(position))) && (position > 0) && (position < field.dom.value.length));

		if (!(isMaskChar(mask.charAt(position)))) {
			return false;
		}

		setSelection(position);
        return true;
	};

	return {

		/**
		 * @cfg {String}
		 */
		mask: mask,

		/**
		 * @cfg {String}
		 */
		placeholder: placeholder,

		/**
		 * @cfg {String}
		 */
		validCharacters: validCharacters,

		/**
		 * @param {String/HTMLElement/Element} el The id of the form field,
		 * a form field HTML reference or an existing form field Element
		 */
		applyTo: function(element) {
			var el = Ext.get(element);
			field = el;

			var stopEventFunction = function(evt) {
		        var key = evt.getKey();
		        var ignore = false;

		        switch (key) {
		            case Ext.EventObject.BACKSPACE:
		            case Ext.EventObject.DELETE:
		            case Ext.EventObject.HOME:
		            case Ext.EventObject.END:
		            case Ext.EventObject.RIGHT:
		            case Ext.EventObject.LEFT:
		            	ignore = true;
		            	break;
		        }

		        if ( (ignore || ( key>=41 && key<=122 ) || key==32 || key>186) && (!evt.altKey && !evt.ctrlKey)  ) {
					evt.stopEvent();
				}
			};

			el.on("keydown", mapKeyToBehavior);
			el.on("keypress", stopEventFunction);
			el.on("keyup", stopEventFunction);
			el.on("focus", doSelection);
			el.on("click", doSelection);

			el.dom["autocomplete"] = "off";
			if (!el.dom.value) {
				el.dom.value = getDefaultString();
			}
		}

	};

};