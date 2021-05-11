/***
 * Form Vtype extensions.
 * from extjs forums.
 *
 */
Ext.form.VTypes["time"] = /^(0[1-9]|[1-9]|1[0-9]|2[0-4]):([0-5][0-9])$/i;
Ext.form.VTypes["timeMask"] = /[\d\s:amp]/i;
Ext.form.VTypes["timeText"] = 'Not a valid time.  Must be in 24-hour format "14:00".';

Ext.form.VTypes["usernameVal"] = /^[a-zA-Z][-_.a-zA-Z0-9]{0,30}$/;
Ext.form.VTypes["passwordVal1"] = /^.{6,31}$/;
Ext.form.VTypes["passwordVal2"] = /[^a-zA-Z].*[^a-zA-Z]/;

Ext.form.VTypes["username"]=function(v){
    return Ext.form.VTypes["usernameVal"].test(v);
}
Ext.form.VTypes["usernameText"]="Username must begin with a letter and cannot exceed 255 characters"
Ext.form.VTypes["usernameMask"]=/[-_.a-zA-Z0-9]/;

Ext.form.VTypes["password"]=function(v){
    if(!Ext.form.VTypes["passwordVal1"].test(v)){
          Ext.form.VTypes["passwordText"]="Password length must be 6 to 31 characters long";
          return false;
    }
     Ext.form.VTypes["passwordText"]="Password must include atleast 2 numbers or symbols";
     return Ext.form.VTypes["passwordVal2"].test(v);
}
Ext.form.VTypes["passwordText"]="Invalid Password"
Ext.form.VTypes["passwordMask"]=/./;

/***
 * us/cdn phone
 */

Ext.form.VTypes["phoneLength"] = /^.{7,12}$/;
Ext.form.VTypes["phoneText"] = 'Not a valid phone number.  Must be in the format 123-4567 or 123-456-7890 (dashes optional)';

Ext.form.VTypes["phone"] = function (v) {
    if(!Ext.form.VTypes["phoneLength"].test(v)) {
        Ext.form.VTypes["phoneText"] = 'Phone number must have between 7 and 12 digits';
        return false;
    } else { return true}
}


Ext.form.VTypes["phone"] = /^\D?(\d{3})\D?\D?(\d{3})\D?(\d{4})$/;
Ext.form.VTypes["phoneMask"] = /[\d.()-]/;

/***
 * cc
 */
Ext.form.VTypes["cc"] = function(v) { return this.ccRe.test(v); }
Ext.form.VTypes["ccRe"] = /^((4\d{3})|(5[1-5]\d{2}))[ -]?(\d{4}[ -]?){3}$|^(3[4,7]\d{2})[ -]?\d{6}[ -]?\d{5}$/;
Ext.form.VTypes["ccMask"] = /[\d\s-]/;
Ext.form.VTypes["ccText"] = 'Invalid creditcard number';

/***
 * dollar
 */
Ext.form.VTypes["dollar"] = /^[\$]?[\d]*(.[\d]{2})?$/;
Ext.form.VTypes["dollarMask"] = /[\d\$.]/;
Ext.form.VTypes["dollarText"] = 'Not a valid dollar amount.  Must be in the format "$123.45" ($ symbol and cents optional).';

/***
 * date
 *
 */
Ext.apply(Ext.form.VTypes, {
    'date': function(){
        /************************************************
        DESCRIPTION: Validates that a string contains only
            valid dates with 2 digit month, 2 digit day,
            4 digit year. Date separator can be ., -, or /.
            Uses combination of regular expressions and
            string parsing to validate date.
            Ex. mm/dd/yyyy or mm-dd-yyyy or mm.dd.yyyy

        PARAMETERS:
           strValue - String to be tested for validity

        RETURNS:
           True if valid, otherwise false.

        REMARKS:
           Avoids some of the limitations of the Date.parse()
           method such as the date separator character.
        *************************************************/
          var objRegExp = /^\d{1,2}(\-|\/|\.)\d{1,2}\1\d{4}$/;
          return function(strValue){
              //check to see if in correct format
              if(!objRegExp.test(strValue))
                return false; //doesn't match pattern, bad date
              else{
                var strSeparator = strValue.substring(2,3)
                var arrayDate = strValue.split(strSeparator);
                //create a lookup for months not equal to Feb.
                var arrayLookup = { '01' : 31,'03' : 31,
                                    '04' : 30,'05' : 31,
                                    '06' : 30,'07' : 31,
                                    '08' : 31,'09' : 30,
                                    '10' : 31,'11' : 30,'12' : 31}
                var intDay = parseInt(arrayDate[1],10);

                //check if month value and day value agree
                if(arrayLookup[arrayDate[0]] != null) {
                  if(intDay <= arrayLookup[arrayDate[0]] && intDay != 0)
                    return true; //found in lookup table, good date
                }

                //check for February (bugfix 20050322)
                //bugfix  for parseInt kevin
                //bugfix  biss year  O.Jp Voutat
                var intMonth = parseInt(arrayDate[0],10);
                if (intMonth == 2) {
                   var intYear = parseInt(arrayDate[2]);
                   if (intDay > 0 && intDay < 29) {
                       return true;
                   }
                   else if (intDay == 29) {
                     if ((intYear % 4 == 0) && (intYear % 100 != 0) ||
                         (intYear % 400 == 0)) {
                          // year div by 4 and ((not div by 100) or div by 400) ->ok
                         return true;
                     }
                   }
                }
              }
              return false; //any other values, bad date
        }
    }(),
    'dateText' : 'The format is wrong, ie: 01/01/2007 | 01.01.2007 | 01-01-2007'
});