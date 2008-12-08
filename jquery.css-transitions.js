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
@todo Implement transition-property:all? This would require the use of SWAP?
@todo Implement transition-delay and transition-timing-function
@todo Impement transition events?
 */




jQuery(function($){
	
//Return of if CSS Transitions are supported natively
var test = $('<div style="-moz-transition-duration:1s; -webkit-transition-duration:1s; transition-duration:1s; "></div>');
if(test[0].style.transitionDuration || test[0].style.mozTransitionDuration || test[0].style.webkitTransitionDuration)
	return;

//Set up global bookkeeping object
var cssTransitions = window.cssTransitions = {
	rules:[],
	initialRules:[],
	bindingURL:'bindings.php'
};




var head = document.getElementsByTagName('head')[0];

var bindingAppliers = [];
var bindingIndex = 0;

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
	
	//Remove all comments and normalize whitespace
	sheetCssText = sheetCssText.replace(/\/\*(.|\s)*?\*\//g, ' ');
	sheetCssText = sheetCssText.replace(/\s+/g, ' ');
	
	//We now need to parse the cssText for the transition properties and their corresponding selectors
	
	//Note: For each rule that contains transition-property, we can set the styles on the element itself
	//      so that they can't be overridden; and then for IE we can apply the new ones that come into
	//      view when the behavior is constructed. This is a workaround for the swap()
	
	//If MSIE, we need to get the selectorText for each of the rules that have transition-property
	//       and we need to find to opacity? Or we can just use the filter: property
	
	var rules = this.cssRules ? this.cssRules : this.rules;
	$(rules).each(function(){
		var rule = {
			selectorText:this.selectorText,
			style:{},
			//previousStyle:{},
			transitionProperty:[],
			transitionDuration:0 //ms
		};
		
		//Parse out the transition properties that exist in this rule
		var regexpParseStyles = '(?:^|})\\s*' + RegExpEscape(this.selectorText) + '\\s*{((?:[^{}"]+|"[^"]+")+)}';
		var matches = sheetCssText.match(new RegExp(regexpParseStyles));
		if(matches){
			//Get the comma separated transition-property 
			var transitionPropertyMatch = matches[1].match(/transition-property\s*:\s*(.+?)\s*;/);
			if(transitionPropertyMatch){
				$(transitionPropertyMatch[1].split(/\s*,\s*/)).map(function(){
					rule.transitionProperty.push(this.replace(/-([a-z])/, cssNameToJsNameCallback));
				});
			}
			
			//Get the transition duration which is in seconds or milliseconds
			var transitionDurationMatch = matches[1].match(/transition-duration\s*:\s*(\d*\.?\d*)(ms|s)\s*;/);
			if(transitionDurationMatch){
				if(transitionDurationMatch[2] == 's')
					rule.transitionDuration = parseFloat(transitionDurationMatch[1])*1000;
				else
					rule.transitionDuration = parseFloat(transitionDurationMatch[1]);
			}
		}
		
		//Save the transition property and duration in the target element so that it can cascade
		if(rule.transitionProperty || rule.transitionDuration){
			//Try because some selectors are not supported by jQuery (e.g. the pseudo classes)
			try {
				var els = jQuery(this.selectorText);
				if(rule.transitionProperty.length){
					els.data('transitionProperty', rule.transitionProperty);
				}
				if(rule.transitionDuration){
					els.data('transitionDuration', rule.transitionDuration);
				}
			}
			catch(e){
				if(window.console)
					console.error("Unable to use selector: " + this.selectorText);
			}
		}
		
		//Store all of the styles in this rule so that they can be accessed by the bindings later
		var style = this.style;
		//$(rule.transitionProperty).each(function(){
		//	console.info(this)
		//	if(style[this]){
		//		rule.style[this] = style[this];
		//	}
		//});

		//Store all of the styles in this rule so that they can be accessed by the bindings later
		for(var i = 0; this.style[i]; i++){
			var name = this.style[i].replace(/-([a-z])/g, cssNameToJsNameCallback);
			if(name == 'paddingLeftValue' || name == 'paddingRightValue')
				name = name.replace(/Value$/, '');
			
			if(this.style[name]){
				rule.style[name] = this.style[name];
			}
			//else {
			//	console.warn(jsName)
			//}
		}

		//console.warn(rule.style)
		cssTransitions.rules[bindingIndex] = rule;
		
		//Create a function for adding a binding to this rule; this function is called once the binding XML file is successfully loaded in order to avoid flash of unstyled content
		bindingAppliers.push(
			(function(i){
				return function(){
					style.MozBinding = "url('" + cssTransitions.bindingURL + "#rule" + i + "')";
				}
			})(bindingIndex)
		);
		
		bindingIndex++;
	});
	
});


cssTransitions.applyRule = function(i, el){
	//The following code needs to be placed into a global jQuery.cssTransitions.activate(i, this)
	//To keep all code possible in the JS file; we also need to put cssTransitions.rules into jQuery.cssTransitions.rules
	
	var $el = jQuery(el);
	var isInitialized = !!$el.data('transitionInitialized');

	//Here we need to see if cssTransitions.rules[i].selectorText is actually 
	if(isInitialized){
		
	}
	

	xblConsole.info(cssTransitions.rules[i].selectorText)
	//xblConsole.info(cssTransitions.rules[i].transitionProperty)
	
	//Make sure that the transition property and duration are stored for this element, because it
	//  may have been dynamically generated
	if(cssTransitions.rules[i].transitionProperty.length)
		$el.data('transitionProperty', cssTransitions.rules[i].transitionProperty);
	if(cssTransitions.rules[i].transitionDuration)
		$el.data('transitionDuration', cssTransitions.rules[i].transitionDuration);
		
		//@todo: We need to get the transition property of this rule, not of the initial rule so that we can TURN ON animateions
	
	//For each of the transition properties, set the style to the current property so that subsequent rules don't override immediately
	var transitionProperties = $el.data('transitionProperty');
	if(!transitionProperties)
		return;
	var transitionDuration = $el.data('transitionDuration');
	if(!transitionDuration || transitionProperties[0] == 'none')
		transitionDuration = 0;
	var transitionStyle = {};
	//var currentStyle = {};
	//var previousStyle = $el.data('transitionPreviousStyle') || {};
	//xblConsole.info(cssTransitions.rules[i]);
	
	if(transitionProperties[0] == 'all' || transitionProperties[0] == 'none'){
		for(var name in cssTransitions.rules[i].style){
			if(!el.style[name])
				$el.css(name, $el.css(name));
			transitionStyle[name] = cssTransitions.rules[i].style[name];
		}
	}
	//Only transition the properties that were explicitly provided
	else {
		jQuery(transitionProperties).each(function(){
			//currentStyle[this] = $el.css(this);
			if(!el.style[this]){
				//$el.css(this, currentStyle[this]);
				$el.css(this, $el.css(this));
			}
			if(cssTransitions.rules[i].style[this]){
				//xblConsole.info(this, currentStyle[this])
				transitionStyle[this] = cssTransitions.rules[i].style[this];
			}
			//else if(previousStyle[this]){
			//	transitionStyle[this] = previousStyle[this];
			//}
			
			//xblConsole.warn(cssTransitions.rules[i].style)
			
		});
		
	}
	
	//xblConsole.info(transitionStyle)
	//xblConsole.warn(transitionProperties)
	
	$el.stop().animate(transitionStyle, transitionDuration);
	
	//for(var name in currentStyle){
	//	previousStyle[name] = currentStyle[name];
	//}
	//$el.data('transitionPreviousStyle', previousStyle);
	
	
	//#### We really need to find out when a binding is REMOVED
	//document.defaultView.getComputedStyle($('#foo')[0], null).MozBinding
	//We does this only return 1? It should return a list of bindings that are applied!
	//We need to get all of the bindings that are applied in the cascade
	
	//xblConsole.info(cssTransitions.rules[i].selectorText)
	
	//xblConsole.info(cssTransitions.rules[i].selectorText)
	//console.info($el.data('transitionProperty'));
	//console.info($el.data('transitionDuration'));
	
	
	//Note: This doesn't work with :not(:target)
	//var selectorWithoutPseudoClasses = cssTransitions.rules[i].selectorText.replace();
	
	//if(cssTransitions.rules[i].selectorText.indexOf(':target') == -1){
	//	var selectorWithoutTarget = cssTransitions.rules[i].selectorText.replace(/:target/, '');
	//}
};

//Create the URL to the bindings document
cssTransitions.bindingURL += "?count=" + bindingIndex + "&time=" + (new Date()).valueOf();

//Prefetch the binding document and then apply the bindings once loaded
$.get(cssTransitions.bindingURL, null, function(data, textStatus){
	//style.MozBinding = "url('" + cssTransitions.bindingURL + "#default')";
	$(bindingAppliers).each(function(){
		this()
	});
});




function cssNameToJsNameCallback(c){
	return c[1].toUpperCase();
}
function RegExpEscape(text) { //from Simon Willison <http://simonwillison.net/2006/Jan/20/escape/>
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