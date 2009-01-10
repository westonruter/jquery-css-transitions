/* 
 * CSS Transitions via jQuery Animation 0.3 <http://weston.ruter.net/projects/jquery-css-transitions/>
 *  by Weston Ruter <http://weston.ruter.net/>
 *  inspired by Chris Schneider's CSS Effects powered by mootools <http://playground.chrisbk.de/moofx/>
 *  Copyright 2009, Weston Ruter, Shepherd Interactive <http://www.shepherd-interactive.com/>
 *  License: GPL 3.0 <http://www.gnu.org/licenses/gpl.html>
 *
 */

(function(){
var $ = jQuery;

//Return of if CSS Transitions are supported natively
var test = $('<div style="-moz-transition-duration:1s; -webkit-transition-duration:1s; transition-duration:1s; -moz-binding:none; behavior:none; -ms-behavior:none;"></div>')[0];
if(test.style.transitionDuration || test.style.mozTransitionDuration || test.style.webkitTransitionDuration)
	return;

//Get the CSS property name that is used by the browser
var bindingPropertyName;
var isXBL = false, isHTC = false;
if(test.style.MozBinding){ //for Mozilla
	bindingPropertyName = 'MozBinding';
	isXBL = true;
}
else if(test.style.behavior){ //for MSIE
	bindingPropertyName = 'behavior';
	isHTC = true;
}
else if(test.style.MsBehavior){ //for MSIE
	bindingPropertyName = 'MsBehavior';
	isHTC = true;
}
else //Quit since behaviors/bindings aren't supported
	return;

//Not all of these are supported by jQuery, so additional jQuery animation plugins
//  may beed to be included, such as jQuery Color Animations: http://plugins.jquery.com/project/color
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
	hackedSelectors:[],
	//hoverSelectors:[], //for MSIE
	//activeSelectors:[], //for MSIE
	baseRules:[],
	baseRuleLookup:{} //keys are rules
};
var types = {
	HOVER  : 1,
	ACTIVE : 2
}

//If IE, add event handlers to provide support for :hover and :active pseudo classes
if($.browser.msie){
	cssTransitions.refreshDOMForMSIE = function(){
		//if(!context)
		//	context = document.documentElement;
		
		$(cssTransitions.hackedSelectors).each(function(){
			var selector = this;
			$(selector.primarySelector).each(function(){
				var $this = $(this);
				
				//Don't assign hover event handler twice (store the decendent selectors in dictionary)
				if(!$this.data('cssTransitionDescendantSelectors'))
					$this.data('cssTransitionDescendantSelectors', {});
				var data = $this.data('cssTransitionDescendantSelectors');
				if(data[selector.descendantSelector] & selector.type)
					return;
				data[selector.descendantSelector] |= selector.type;
				
				//Attach the mutator to the appropriate event depending on the type of the pseudo class
				switch(selector.type){
					case types.HOVER:
				
						//Mutate the document for MSIE so that it will attach the behavior
						var touchDOM = function(){
							window.setTimeout(function(){
								$this.addClass('temporary-ie-class').removeClass('temporary-ie-class');
								if(selector.descendantSelector)
									$this.find(selector.descendantSelector).addClass('temporary-ie-class').removeClass('temporary-ie-class');
							}, 0)
						};
						
						$this.hover(touchDOM, touchDOM);
						break;
					
					case types.ACTIVE:
						$this.mousedown(touchDOM).mouseup(touchDOM); //this isn't doing it; we'll need to explicitly run the selector 
						
						////Manually apply the selector to the elements on the page
						//$this.mousedown(function(){
						//	//Only apply :active rule if another :active rule hasn't already been applied or if the previously applied :active
						//	//  rule's index is less than this selector's rule's index
						//	//  (QUESTION: How is cascade being computed? We should allow it to override if rule index is greater)
						//	if(selector.descendantSelector){
						//		$this.find(selector.descendantSelector).each(function(){
						//			var history = $(this).data('cssTransitionRuleIndexHistory');
						//			if(!history || cssTransitions.rules[history[0]].selectorText.indexOf(':active') == -1){
						//				if(history){
						//					if(selector.ruleIndex > history[0]){
						//						cssTransitions.applyRule(this, selector.ruleIndex);
						//						$(this).data('cssTransitionRuleNonActiveRuleIndex', history[0]);
						//					}
						//				}
						//				else {
						//					cssTransitions.applyRule(this, selector.ruleIndex);
						//				}
						//				
						//			}	
						//		});
						//	}
						//	else {
						//		var history = $this.data('cssTransitionRuleIndexHistory');
						//		if(!history || cssTransitions.rules[history[0]].selectorText.indexOf(':active') == -1){
						//			if(history){
						//				if(selector.ruleIndex > history[0]){
						//					cssTransitions.applyRule(this, selector.ruleIndex);
						//					$this.data('cssTransitionRuleNonActiveRuleIndex', history[0]);
						//				}
						//			}
						//			else {
						//				cssTransitions.applyRule(this, selector.ruleIndex);
						//			}
						//		}
						//	}
						//})
						////Unapply the applied :active selector
						//.mouseup(function(){
						//	//Apply the previous non-:active rule (stored in data cssTransitionRuleNonActiveRuleIndex)
						//	if(selector.descendantSelector){
						//		$this.find(selector.descendantSelector).each(function(){
						//			var previousRuleIndex = $(this).data('cssTransitionRuleNonActiveRuleIndex');
						//			if(!previousRuleIndex)
						//				return;
						//			$(this).removeData('cssTransitionRuleNonActiveRuleIndex');
						//			cssTransitions.applyRule(this, previousRuleIndex);
						//		});
						//	}
						//	else {
						//		var previousRuleIndex = $this.data('cssTransitionRuleNonActiveRuleIndex');
						//		if(!previousRuleIndex)
						//			return;
						//		$(this).removeData('cssTransitionRuleNonActiveRuleIndex');
						//		cssTransitions.applyRule(this, previousRuleIndex);
						//	}
						//	
						//});
						//break;
				}
			});
			
		});
		
	};
	
	//Refresh for IE upon DOM load
	$(cssTransitions.refreshDOMForMSIE);
}
else {
	cssTransitions.refreshDOMForMSIE = function(){};
}

//If binding URL is provided use it
if(window.cssTransitionsBindingURL){
	cssTransitions.bindingURL = cssTransitionsBindingURL;
}
//Default binding URL should be the same directory as this script itself.
else {
	var baseURL = '/';
	//Get the base URL to where this script is located
	$(document.getElementsByTagName('script')).each(function(){
		if(this.src.indexOf('css-transitions') != -1){
			baseURL = this.src.replace(/[^\/]+$/, '');
			return true;
		}
		return this.src.indexOf('jquery-css-transitions') == -1
	});
	cssTransitions.bindingURL = baseURL + 'bindings.php';
}

var bindingAppliers = [];
var prefetchURLs = [];

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
			var pos;
			if((pos = ruleInfo.selectorText.indexOf(':hover')) != -1 ){
				cssTransitions.hackedSelectors.push({
					primarySelector    : ruleInfo.selectorText.substr(0, pos),
					descendantSelector : ruleInfo.selectorText.substr(pos+6).replace(/^\s+$/, ''),
					type               : types.HOVER,
					ruleIndex          : ruleIndex
				});
			}
			
			if((pos = ruleInfo.selectorText.indexOf(':active')) != -1 ){
				cssTransitions.hackedSelectors.push({
					primarySelector    : ruleInfo.selectorText.substr(0, pos),
					descendantSelector : ruleInfo.selectorText.substr(pos+7).replace(/^\s+$/, ''),
					type               : types.ACTIVE,
					ruleIndex          : ruleIndex
				});
			}
		}
		
		
		//Create a function for adding a binding to this rule; this function is called once the binding XML file is successfully loaded in order to avoid flash of unstyled content
		//To avoid using external files altogether, it would be best if we could assign the behaviors to :url("javascript:cssTransitions.applyRule(this, ' + i + '); void(0);")
		//Or we can do this: behavior:expression("")
		if(isHTC){
			var url = cssTransitions.bindingURL + "?rule=" + ruleIndex;
			//var url = cssTransitions.bindingURL + "/rule/" + ruleIndex; //do this to help ensure it is cached
			//Loathing the fact that IE apparently doesn't implement setExpression on a CSSStyleRule's CSSStyleDeclaration "style" object
			that.style[bindingPropertyName] = 'url("' + url + '")';
			
			//Prefetch the binding so that there is no delay later
			//Calling $.get(url) doesn't do it; behaviors attached via CSS seem to have a separate cache so if this is done then everything is downloaded twice
			//In order to successfully cache the behavior, we have to attach the behavior to a temporary element that is thrown away
			var span = document.createElement('span');
			span.style[bindingPropertyName] = that.style[bindingPropertyName];
			
			//If Gears is available, we could store the file in a LocalServer but this would cause there to be a dialog box
			//that.style[bindingPropertyName] = 'url("javascript://alert(1); void(0);")';
			//that.style.setExpression('width', "cssTransitions.applyRule(this, " + i + ")");
			//that.style.setExpression(bindingPropertyName, "cssTransitions.applyRule(this, " + i + ")");
			//if we reference an HTML page will it avoid refreshing?
			//is there really no way to put multiple behaviors in one file?
			//The only way that we can use expressions is if we statically put something in the rule like:
			//  unusedProperty:expression("notifyAppliedRule(rule.selectorText))")
		}
		else {

			bindingAppliers.push(
				(function(rule, i){
					//if(isXBL){
						return function(){
							//rule.style.MozBinding = "url('" + cssTransitions.bindingURL + "#rule" + i + "')";
							rule.style[bindingPropertyName] = "url('" + cssTransitions.bindingURL + "#rule" + i + "')";
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

//Function which is called by the behaviors whenever one is constructed
cssTransitions.applyRule = function(el, ruleIndex){
	var $el = $(el);
	//if(!$el.data('cssTransitionRuleIndexHistory'))
	//	$el.data('cssTransitionRuleIndexHistory', []);
	//$el.data('cssTransitionRuleIndexHistory').unshift(ruleIndex); //store this for :active support
	//for MSIE, if an :active rule has been applied, don't proceed until the mouseup has been executed
	//if($el.data('cssTransitionRuleNonActiveRuleIndex'))
	//	return;
	
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
				//The following will not work because: Only simple expressions are supported. Complex expressions,
				//   such as those containing hierarchy selectors (such as +, ~, and >) will always return 'true'.
				//if($el.is(baseRule.selector)){
				//	baseRuleIndex = cssTransitions.rules[baseRule.index];
				//}
				
				//Iterate over each of elements that match the selector, and see if they match this element; if so, then this selector's baseRule should be applied to this
				//   We should cache these queries and only delete them when MutationEvents occur
				//   Note: Two rules may have the same selector
				var els = $(this.selector);
				for(var i = 0; i < els.length; i++){ //using for loop here because unknown error when doing element identity tests inside
					if(el == els[i]){
						cssTransitions.baseRuleLookup[ruleIndex] = baseRuleIndex = this.index;
						break;
					}
				}
			});
			
			//If no baseRule was found, then this selector is not associated with any transition; -1 means this
			if(isNaN(baseRuleIndex)){
				if(window.console && console.error)
					console.error("No base match for ", el);
				cssTransitions.baseRuleLookup[ruleIndex] = -1;
				return;
			}
		}
	}
	
	//If this rule is not the base rule, then we need to animate? As in :target. Can this be done to animate the appearance of new elements?
	var rule = cssTransitions.rules[ruleIndex];
	var baseRule = cssTransitions.rules[baseRuleIndex];
	var transitionStyle = {};

	if(window.console && console.info)
		console.info("CSS Transition Rule: " + rule.selectorText);

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
		$(baseRule.transitionProperty).each(function(){
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


//Prefetch the binding document and then apply the bindings once loaded
if(isXBL){
	//Create the URL to the bindings document
	cssTransitions.bindingURL += "?count=" + ruleIndex;
	$.get(cssTransitions.bindingURL, null, function(data, textStatus){
		$(bindingAppliers).each(function(){
			this()
		});
	});
}
//Only prefetch if IE 8 because IE 7 cannot cache HTC files (huge problem) (TODO)
//"Internet Explorer contains several caching bugs; it often fails to cache pages that are served with gzip compression (used
//   by many, many sites, including Google, this site, all sites hosted by Dreamhosts, etc etc etc). It usually fails to cache
//   .htc behaviour files, or images/CSS/JavaScript files that are loaded as a result of running a .htc file, and will often load them once
//   for every element they apply to, and again every time the mouse moves over them. This can result in hundreds of extra requests for a
//   single page (400 per visitor on one of my pages, until I removed the behaviour), and as a result, Internet Explorer can look far more
//   popular than it actually is." <http://www.howtocreate.co.uk/nostats.html>
// See: http://support.microsoft.com/kb/319176
//else if(isHTC /*&& $.browser.msie && parseFloat($.browser.version) >= 8*/){
//	$(prefetchURLs).each(function(){
//		$.get(this);
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


})(); //end scope