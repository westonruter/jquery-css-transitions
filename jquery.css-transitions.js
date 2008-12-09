/* 
 * CSS Transitions Implemented with jQuery Animations 0.1
 *  by Weston Ruter, Shepherd Interactive <http://www.shepherd-interactive.com/>
 *
 * This implementation must be able to initiate transition animations with:
 *   - dynamic pseudo classes: :hover, :active, :focus
 *   - changing a class name
 * 
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 
@todo We need to not add a behavior to EVERY rule, just those which provide the properties; if every relevant rule included transition-property:inherit then we could sniff that
@todo Implement transition-timing-function
@todo We need to support the shorthand notation for transitions
@todo Impement transition events?
@todo We could have an option to restrict all transitions to one CSS file (more HTTP load, but less computation load)
 */

if(false && window.console && console.profile){
	console.profile("CSS Transitions");
	window.onload = function(){console.profileEnd("CSS Transitions");}
}

(function(){
var $ = jQuery;

//Return of if CSS Transitions are supported natively
var test = $('<div style="-moz-transition-duration:1s; -webkit-transition-duration:1s; transition-duration:1s; -moz-binding:none; binding:none;"></div>')[0];
if(test.style.transitionDuration || test.style.mozTransitionDuration || test.style.webkitTransitionDuration)
	return;

//Get the CSS property name that is used by the browser
var bindingPropertyName;
var isXBL = false, isHTC = false;
if(test.style.MozBinding){ //for Mozilla
	bindingPropertyName = 'MozBinding';
	isXBL = true;
}
else if(test.style.binding){ //for MSIE
	bindingPropertyName = 'behavior';
	isHTC = true;
}
else //Quit since bindings aren't supported
	return;

var animatableProperties = [
	'backgroundColor',
	'backgroundImage',
	'backgroundPosition',
	'borderBottomColor',
	'borderBottomWidth',
	'borderColor',
	'borderLeftColor',
	'borderLeftWidth',
	'borderRightColor',
	'borderRightWidth',
	'borderSpacing',
	'borderTopColor',
	'borderTopWidth',
	'borderWidth',
	'bottom',
	'color',
	'crop',
	'fontSize',
	'fontWeight',
	'height',
	'left',
	'letterSpacing',
	'lineHeight',
	'marginBottom',
	'marginLeft',
	'marginRight',
	'marginTop',
	'maxHeight',
	'maxWidth',
	'minHeight',
	'minWidth',
	'opacity',
	'outlineColor',
	'outlineOffset',
	'outlineWidth',
	'paddingBottom',
	'paddingLeft',
	'paddingRight',
	'paddingTop',
	'right',
	'textIndent',
	'textShadow',
	'top',
	'verticalAlign',
	'visibility',
	'width',
	'wordspacing',
	'zIndex',
	'zoom'
];

//Set up global bookkeeping object
var cssTransitions = window.cssTransitions = {
	rules:[],
	baseRules:[],
	baseRuleLookup:{}, //keys are rules
	bindingURL:'bindings.php'
};


$(function(){

var bindingAppliers = [];

var ruleIndex = 0;
$(document.styleSheets).each(function(){
	//Only do transitions for screen media
	for(var i = 0; i < this.media.length; i++){
		var media = this.media.item ? this.media.item(i) : this.media;
		if(media && media != 'screen' && media != 'all')
			return;
	}
	
	//We actually have to load the stylesheet in via XHR (inspired by moofx)
	var el = this[this.ownerNode ? 'ownerNode' : 'owningElement'];
	var sheetCssText;
	switch(el.nodeName.toLowerCase()){
		case 'style':
			return; //does not work with inline styles because IE doesn't allow you to get the text content of a STYLE element
			sheetCssText = el.innerHTML;
			break;
		case 'link':
			var xhr = $.ajax({
				url:el.href,
				async:false
			});
			sheetCssText = xhr.responseText;
			break;
		default:
			return;
	}
	
	//Remove all comments and normalize whitespace (except for transition directive comments)
	sheetCssText = sheetCssText.replace(/\/\*(?!@\s*transition-rule\s*@\*\/)(.|\s)*?\*\//g, ' ');
	sheetCssText = sheetCssText.replace(/\s+/g, ' ');
	
	//We now need to parse the cssText for the transition properties and their corresponding selectors
	
	//Note: For each rule that contains transition-property, we can set the styles on the element itself
	//      so that they can't be overridden; and then for IE we can apply the new ones that come into
	//      view when the behavior is constructed. This is a workaround for the swap()
	
	//If MSIE, we need to get the selectorText for each of the rules that have transition-property
	//       and we need to find to opacity? Or we can just use the filter: property
	
	var rules = this.cssRules ? this.cssRules : this.rules;
	for(var i = 0; i < rules.length; i++){
		var that = rules[i];
		var ruleInfo = {
			selectorText:that.selectorText,
			style:{},
			transitionProperty:['all'],
			transitionDuration:0, //ms
			transitionTimingFunction:'ease',
			transitionDelay:0, //ms
			isBaseRule:false
		};
		
		//@todo: Huge problem: that.selectorText may be different then the form used in the stylesheet (where the className appears or where the )
		//If in the stylesheet there is the selector: .foo#bar.on.off.freak
		//Then in Firefox it is stored as: #bar.foo.on.off.freak
		//    But in MSIE it is stored as: .freak.off.on.foo#bar
		//  One way to resolve this is to match by length; or to have a kind of signature which is composed of all of the characters used
		if(jQuery.browser.msie){
			ruleInfo.selectorText = ruleInfo.selectorText.replace(/((?:\.[a-z\-_]+?)+)(#\w+\S+)/ig, function(a,b,c){
				var classes = b.substr(1).split(/\./).reverse();
				return c + '.' + classes.join('.');
			});
		}
		
		//Parse out the transition styles that exist in this rule
		var regexpParseStyles = '(?:^|})\\s*' + regExpEscape(ruleInfo.selectorText) + '\\s*{((?:[^{}"]+|"[^"]+")+)}';
		var regExp = new RegExp(regexpParseStyles, 'i');
		var ruleMatches = sheetCssText.match(regExp);
		if(ruleMatches){
			//If the /*@ transition-rule @*/ directive doesn't appear in the CSS, then skip
			if(ruleMatches[1].indexOf('transition-rule') == -1){
				continue; //return;
			}
			
			var matches;
			
			//Parse shorthand "transition:" property [<transition-property> || <transition-duration> || <transition-timing-function> || <transition-delay>]
			matches = ruleMatches[1].match(/transition\s*:.+?\s*(?:;|$)/i);
			if(matches){
				throw Error("'transition:' shorthand property is not currently supported");
			}
			
			//Parse comma-separated "transition-property:" 
			matches = ruleMatches[1].match(/transition-property\s*:\s*(.+?)\s*(?:;|$)/i);
			if(matches){
				//ruleInfo.transitionProperty.length = 0;
				ruleInfo.transitionProperty = [];
				$(matches[1].split(/\s*,\s*/)).map(function(){
					ruleInfo.transitionProperty.push(this.replace(/-([a-z])/, cssNameToJsNameCallback));
				});
				if(ruleInfo.transitionProperty[0] == 'none')
					continue; //return;
			}
			
			//Parse "transition-duration:" which is in seconds or milliseconds
			matches = ruleMatches[1].match(/transition-duration\s*:\s*(\d*\.?\d*)(ms|s)\s*(?:;|$)/i);
			if(matches){
				ruleInfo.transitionDuration = (matches[2] == 's' ? parseFloat(matches[1])*1000 : parseFloat(matches[1]));
			}
			
			//Parse "transition-delay:" 
			matches = ruleMatches[1].match(/transition-delay\s*:\s*(\d*\.?\d*)(ms|s)\s*(?:;|$)/i);
			if(matches){
				ruleInfo.transitionDelay = (matches[2] == 's' ? parseFloat(matches[1])*1000 : parseFloat(matches[1]));
			}
			
			//Parse "transition-timing-function:" (ease | linear | ease-in | ease-out | ease-in-out | cubic-bezier(<number>, <number>, <number>, <number>))
			var matches = ruleMatches[1].match(/transition-timing-function\s*:\s*(.+?)\s*(?:;|$)/i);
			if(matches){
				throw Error("'transition-timing-function:' is not currently supported");
			}
		}
		//Bad rule
		else {
			continue; //return;
		}
		
		//This rule is the transition base state if transition-property is not "none" and if transition-delay and transition-duration are not zero
		if(ruleInfo.transitionProperty[0] != 'none' && (ruleInfo.transitionDelay || ruleInfo.transitionDuration)){
			cssTransitions.baseRules.push({
				selector:that.selectorText,
				index:ruleIndex
			});
			ruleInfo.isBaseRule = true;
		}
		
		//Instead of this, I was going to have 
		//Save the transition property and duration in the target element so that it can cascade
		//if(ruleInfo.transitionProperty || ruleInfo.transitionDuration){
		//	//Try because some selectors are not supported by jQuery (e.g. the pseudo classes)
		//	try {
		//		var els = jQuery(that.selectorText);
		//		if(ruleInfo.transitionProperty.length){
		//			els.data('transitionProperty', ruleInfo.transitionProperty);
		//		}
		//		if(ruleInfo.transitionDuration){
		//			els.data('transitionDuration', ruleInfo.transitionDuration);
		//		}
		//	}
		//	catch(e){
		//		if(window.console)
		//			console.error("Unable to use selector: " + that.selectorText);
		//	}
		//}

		//Store all of the styles in this rule so that they can be accessed by the bindings later
		for(var j = 0; j < animatableProperties.length; j++){
			var name = animatableProperties[j];
			
			//Save the style associated with that name
			if(that.style[name])
				ruleInfo.style[name] = that.style[name];
		}
		
		//(The following doesn't work in IE) Store all of the styles in this rule so that they can be accessed by the bindings later
		//for(var j = 0; that.style[j]; j++){
		//	//Convert the name from CSS format to JavaScript format and change make any additional name changes
		//	var name = that.style[j].replace(/-([a-z])/g, cssNameToJsNameCallback);
		//	if(name == 'paddingLeftValue' || name == 'paddingRightValue')
		//		name = name.replace(/Value$/, '');
		//	
		//	//Save the style associated with that name
		//	if(that.style[name])
		//		ruleInfo.style[name] = that.style[name];
		//}

		//Store this rule and associate it with this ruleIndex (so that the binding can call up the rule that it was part of)
		cssTransitions.rules[ruleIndex] = ruleInfo;
		
		//In MSIE, for the behavior in a :hover selector to be activated, some DOM change on the element needs to happen
		//    in a timeout "thread"
		if($.browser.msie){
			var hoverPos;
			if((hoverPos = ruleInfo.selectorText.indexOf(':hover')) != -1 ){
				var beforeHoverSelector = ruleInfo.selectorText.substr(0, hoverPos);
				var domChanger = function(){
					var $this = $(this);
					window.setTimeout(function(){
						$this.addClass('temporary-ie-class').removeClass('temporary-ie-class');
					}, 0)
				};
				
				$(beforeHoverSelector).hover(
					/** mouseover **/
					domChanger,
					/** mouseout **/
					domChanger
				);
			}
		}
		
		
		//Create a function for adding a binding to this rule; this function is called once the binding XML file is successfully loaded in order to avoid flash of unstyled content
		if(isHTC){
			//that.style.binding = "url('" + cssTransitions.bindingURL + "?rule=" + i + "&foo=test.htc')";
			//console.info(that)
			//console.info(that.style)
			//that.style.behavior = 'url(test.htc?rule=' + i + ')';
			
			//console.info(cssTransitions.bindingURL + "?rule=" + i)
			that.style.behavior = 'url("' + cssTransitions.bindingURL + "?rule=" + ruleIndex + '")'; // + "&time=" + (new Date()).valueOf()
		}
		else {

			bindingAppliers.push(
				(function(rule, i){
					//if(isXBL){
						return function(){
							//rule.style.MozBinding = "url('" + cssTransitions.bindingURL + "#rule" + i + "')";
							rule.style.MozBinding = "url('" + cssTransitions.bindingURL + "#rule" + i + "')";
						}
					//}
					//else {
					//	return function(){
					//		//rule.style.MozBinding = "url('" + cssTransitions.bindingURL + "#rule" + i + "')";
					//		console.warn("url('" + cssTransitions.bindingURL + "&rule=" + i + "')");
					//		rule.style.binding = "url('" + cssTransitions.bindingURL + "&rule=" + i + "')";
					//	}
					//}
				})(that, ruleIndex)
			);
		}
		
		ruleIndex++;
	}
	
});
//console.info(bindingAppliers)

//Function which is called by the behaviors whenever one is constructed
cssTransitions.applyRule = function(el, ruleIndex){
	//The following code needs to be placed into a global jQuery.cssTransitions.activate(ruleIndex, this)
	//To keep all code possible in the JS file; we also need to put cssTransitions.rules into jQuery.cssTransitions.rules
	
	
	var $el = jQuery(el);
	var baseRuleIndex;
	if(cssTransitions.rules[ruleIndex].isBaseRule){
		baseRuleIndex = cssTransitions.baseRuleLookup[ruleIndex] = ruleIndex;
	}
	//Since not the base rule, we need to search to find which rule is the base
	else {
		baseRuleIndex = cssTransitions.baseRuleLookup[ruleIndex];
		//If a baseRuleIndex is -1, then it's already been determined to not exist
		if(baseRuleIndex == -1)
			return;
		//Find the base rule for this element; this allows elements to be inserted dynamically!
		else if(isNaN(baseRuleIndex)){
			$(cssTransitions.baseRules).each(function(){
				var baseRule = this;
				//The following will not work because: Only simple expressions are supported. Complex expressions,
				//   such as those containing hierarchy selectors (such as +, ~, and >) will always return 'true'.
				//if($el.is(baseRule.selector)){
				//	baseRuleIndex = cssTransitions.rules[baseRule.index];
				//}
				
				//Iterate over each of elements that match the selector, and see if they match this element; if so, then this selector's baseRule should be applied to this
				//   We should cache these queries and only delete them when MutationEvents occur
				//   Note: Two rules may have the same selector
				//if(!baseRule.elementCache)
				//	baseRule.elementCache = $(baseRule.selector);
				//baseRule.elementCache.each(function(){
				$(baseRule.selector).each(function(){
					if(el == this){
						cssTransitions.baseRuleLookup[ruleIndex] = baseRuleIndex = baseRule.index;
						return true;
					}
					return false;
				});
			});
			
			//If no baseRule was found, then this selector is not associated with any transition; -1 means this
			if(isNaN(baseRuleIndex)){
				cssTransitions.baseRuleLookup[ruleIndex] = -1;
				return;
			}
		}
	}
	
	//If this rule is not the base rule, then we need to animate? As in :target. Can this be done to animate the appearance of new elements?
	var rule = cssTransitions.rules[ruleIndex];
	var baseRule = cssTransitions.rules[baseRuleIndex];
	var transitionStyle = {};

	//Transition all properties
	if(baseRule.transitionProperty[0] == 'all'){
		for(var name in rule.style){
			//Initialize the style state
			if(!el.style[name])
				$el.css(name, $el.css(name));
			transitionStyle[name] = rule.style[name];
		}
	}
	//Only transition the properties that were explicitly provided
	else {
		jQuery(baseRule.transitionProperty).each(function(){
			var name = this;
			
			if(!el.style[name])
				$el.css(name, $el.css(name));
			if(cssTransitions.rules[ruleIndex].style[name])
				transitionStyle[name] = rule.style[name];
		});
		
	}
	
	var animate = function(){
		$el.stop().animate(transitionStyle, baseRule.transitionDuration);
	};
	
	//Start animation after delay (and clear any pending delayed transition)
	if(baseRule.transitionDelay){
		//window.clearTimeout($el.data('transitionDelayTimer'));
		//$el.data('transitionDelayTimer', window.setTimeout(animate, baseRule.transitionDelay));
		window.setTimeout(animate, baseRule.transitionDelay);
	}
	//Execute the animation immediately
	else {
		animate();
	}
	
	//#### We really should find out when a binding is REMOVED
	//document.defaultView.getComputedStyle($('#foo')[0], null).MozBinding
	//We does this only return 1? It should return a list of bindings that are applied!
	//We need to get all of the bindings that are applied in the cascade
};

//Create the URL to the bindings document
cssTransitions.bindingURL += "?count=" + ruleIndex + "&time=" + (new Date()).valueOf();
//cssTransitions.bindingURL = window.location.href.replace(/#.*/,'') + cssTransitions.bindingURL;


//Prefetch the binding document and then apply the bindings once loaded
if(isXBL){
	$.get(cssTransitions.bindingURL, null, function(data, textStatus){
		$(bindingAppliers).each(function(){
			this()
		});
	});
}
//else {
//	$(bindingAppliers).each(function(){
//		this()
//	});
//}



function cssNameToJsNameCallback(c, b){
	return b.toUpperCase();
	
	if(c[1])
		return c[1].toUpperCase();
	else
		return c.toUpperCase();
}
function regExpEscape(text) { //from Simon Willison <http://simonwillison.net/2006/Jan/20/escape/>
  if (!arguments.callee.sRE) {
    var specials = [
      '/', '.', '*', '+', '?', '|',
      '(', ')', '[', ']', '{', '}', '\\'
    ];
    arguments.callee.sRE = new RegExp(
      '(\\' + specials.join('|\\') + ')', 'g'
    );
  }
  return text.replace(arguments.callee.sRE, '\\$1');
}


}); //end jQuery.ready

})(); //end scope