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
@todo Implement transition-delay and transition-timing-function
@todo Impement transition events?
 */

var cssTransitionRules = [];

jQuery(function($){
	
//Return of if CSS Transitions are supported natively
var test = $('<div style="-moz-transition-duration:1s; -webkit-transition-duration:1s; transition-duration:1s; "></div>');
if(test[0].style.transitionDuration || test[0].style.mozTransitionDuration || test[0].style.webkitTransitionDuration)
	return;

//var xml = document.createElement('xml');
//var xblns = 'http://www.mozilla.org/xbl';
//var bindings = document.createElementNS(xblns, 'bindings');
//xml.appendChild(bindings);
//document.getElementsByTagName('head')[0].appendChild(xml);


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


var head = document.getElementsByTagName('head')[0];

var bindingURL = "bindings.php?";
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
		cssTransitionRules[bindingIndex] = rule;
		
		//Create a function for adding a binding to this rule; this function is called once the binding XML file is successfully loaded in order to avoid flash of unstyled content
		bindingAppliers.push(
			(function(i){
				return function(){
					style.MozBinding = "url('" + bindingURL + "#rule" + (i+1) + "')";
				}
			})(bindingIndex)
		);
		
		bindingIndex++;
	});
	
});

//Create the URL to the bindings document
bindingURL += "count=" + bindingIndex + "&time=" + (new Date()).valueOf();

//Prefetch the binding document and then apply the bindings once loaded
$.get(bindingURL, null, function(data, textStatus){
	//style.MozBinding = "url('" + bindingURL + "#default')";
	$(bindingAppliers).each(function(){
		this()
	});
});


//console.info(cssTransitionRules)

//$(bindingAppliers).each(function(){
//	this()
//});












return;


//Script needs to be able to find all of the transition-property and transition-duration properties and all
//   of the elements that they are defined for. We also need to add mouseenter/mouseleave handlers for the
//   selected elements or the ancestors of the selected elements that have the :hover pseudoclass and then
//   prevent the *cascaded rules* from being applied immediately, but rather have them transition from the
//   default state to the state that is defined with the pseudoclass selector.
//   We can add behaviors (htc and xbl) to both the on and off states and so we can detect when the class is modified



//var bindings = document.createElementNS('http://www.mozilla.org/xbl', 'bindings');
//var binding = document.createElementNS('http://www.mozilla.org/xbl', 'binding');
//binding.setAttribute('id', 'xbl-test');
//bindings.appendChild(binding);
//
//var imp = document.createElementNS('http://www.mozilla.org/xbl', 'implementation');
//binding.appendChild(imp);
//
//var constructor = document.createElementNS('http://www.mozilla.org/xbl', 'constructor');
//constructor.appendChild(document.createTextNode("alert('construct')"));
//imp.appendChild(constructor);
//
//var destructor = document.createElementNS('http://www.mozilla.org/xbl', 'destructor');
//imp.appendChild(destructor);
//destructor.appendChild(document.createTextNode("alert('destruct')"));
//
//var content = document.createElementNS('http://www.mozilla.org/xbl', 'content');
//content.appendChild(document.createElementNS('http://www.mozilla.org/xbl', 'children'));
//binding.appendChild(content);
//
//var style = document.createElement('style');
//style.type = 'text/css';
//style.appendChild(document.createTextNode(".foobar { -moz-binding:url(#xbl-test) } "));
//
//$('img:last').addClass('foobar');
//
//
//try {
//	document.getElementsByTagName('head')[0].appendChild(bindings);
//	document.getElementsByTagName('head')[0].appendChild(style);
//}
//catch(e){
//	alert(e)
//}

var regexpCssParse = /^\s*([^{}]+)\s*{\s*((?:[^{}"]+|"[^"]+")+)\s*}\s*/g;
$(document.styleSheets).each(function(){
	//Only do transitions for screen media
	for(var i = 0; i < this.media.length; i++){
		var media = this.media.item ? this.media.item(i) : this.media;
		if(media && media != 'screen' && media != 'all')
			return;
	}
	
	//We actually have to load the stylesheet in via XHR (inspired by moofx)
	var el = this[this.ownerNode ? 'ownerNode' : 'owningElement'];
	var cssText;
	switch(el.nodeName.toLowerCase()){
		case 'style':
			cssText = el.innerHTML;
			break;
		case 'link':
			var xhr = $.ajax({
				url:el.href,
				async:false
			});
			cssText = xhr.responseText;
			break;
		default:
			return;
	}
	
	//Find each rule that has a transition defined, and then add the transition properties to them to keep
	//  track in case they are not supported natively
	//We will need to activate transitions when a :hover (mouseover/mouseout) is done, and when a class is added or removed
	
	//Remove all comments and normalize whitespace
	cssText = cssText.replace(/\/\*(.|\s)*?\*\//g, ' ');
	cssText = cssText.replace(/\s+/g, ' ');
	
	//var t = cssText.match(regexpCssParse);
	
	var parserCallback = function(rule, selector, properties){
		var transitionProperties = [];
		var transitionDuration = -1;
		
		var transitionPropertyMatch = properties.match(/transition-property:\s*([^;]+)\s*(?:;|$)/);
		var transitionDurationMatch = properties.match(/transition-duration:\s*(\d*\.?\d*)(ms|s)\s*(?:;|$)/);
		
		//Parse the properties
		if(transitionPropertyMatch){
			//transitionProperties = transitionPropertyMatch[1].split(/\s*,\s*/);
			//Convert CSS property naming convention to JavaScript camelCase naming convention
			$(transitionPropertyMatch[1].split(/\s*,\s*/)).each(function(){
				transitionProperties.push(this.replace(/-([a-z])/g, function(a, b){ return b.toUpperCase(); }));
			});
		}
		if(transitionDurationMatch){
			if(transitionDurationMatch[2] == 'ms')
				transitionDuration = parseFloat(transitionDurationMatch[1]);
			else
				transitionDuration = parseFloat(transitionDurationMatch[1])*1000;
			
			if(isNaN(transitionDuration))
				transitionDuration = 0;
		}
		
		//Add hover() handler for the 
		// Immediately upon discovering that a transition has been detected, reset the style so that the intial values are being used, and then
		// animate to them.
		
		$(selector.split(/\s*,\s*/)).each(function(){
			var subSelector = this;
			
			if(subSelector.indexOf(':hover') != -1){
				var selectorHoverSplit = subSelector.split(/:hover\s*/);
				
				//Get all of the hover elements states
				var hoverStyles = {};
				$(properties.split(/\s*;\s*/)).each(function(){
					if(!this)
						return;
					var propParts = this.split(/\s*:\s*/);
					if(propParts[0] && propParts[1]){
						var propName = propParts[0].toLowerCase().replace(/-([a-z])/g, function(a, b){ return b.toUpperCase(); });
						if(propName != 'textShadow' && propName != 'zIndex' && propName != 'filter'){
								hoverStyles[propName] = propParts[1];
						}
					}
				});
				
				var hoverableElements = $(selectorHoverSplit[0]);
				
				hoverableElements.each(function(){
					var hoverElements;
					
					
					//If decendents specified, apply on it
					if(selectorHoverSplit[1]){
						hoverElements = $(this).find(selectorHoverSplit[1]);
						if(!hoverElements.length)
							return;
					}
					//Otherwise just select this one
					else
						hoverElements = $(this);
					
					//Save all of the hover states into each hoverElement
					var hs = hoverElements.data('hover-styles');
					if(!hs){
						hoverElements.data('hover-styles', {});
						hs = hoverElements.data('hover-styles');
					}
					for(var propName in hoverStyles){
						hs[propName] = hoverStyles[propName];
					}
				});
				
				
				//return; //DEBUG
				
				//Get all of the elements that will be hovered and add a hover() handler to each of them
				hoverableElements.hover(
					/* mouseenter */
					function(){
						var els;
						
						//If decendents specified, apply on it
						if(selectorHoverSplit[1])
							els = $(this).find(selectorHoverSplit[1]);
						//Otherwise just select this one
						else
							els = $(this);
						
						//For each of the targetted elements for animation, animate them each
						$(els).stop().each(function(){
							var el = $(this);
							var startStyles = el.data('start-styles');
							if(!startStyles)
								return;
							//console.info("start bgcolor = " + startStyles.backgroundColor);
							//console.info("end bgcolor = " + this.currentStyle.backgroundColor);
							
							//Get the end-styles if they haven't been found yet
							var endStyles = el.data('hover-styles');
							for(var propName in endStyles){
								if(typeof startStyles[propName] != 'undefined'){
									el.css(propName, startStyles[propName]);
								}
							}
							
							//console.info(endStyles)
							//if(false && !endStyles){
							//	endStyles = {};
							//	
							//	//if(jQuery.browser.msie){
							//	//	
							//	//	
							//	//	
							//	//}
							//	//else {
							//		//This does not work in IE, so we need to look up the explicit values defined in the stylesheet
							//		for(var propName in startStyles){
							//			endStyles[propName] = el.css(propName);
							//			el.css(propName, startStyles[propName]);
							//		}
							//	//}
							//	el.data('end-styles', endStyles);
							//}
							//console.info([startStyles['background-color'], endStyles['background-color']])
							//console.warn(el.data('transition-duration'))
							//console.info(endStyles)
							//console.info(endStyles.backgroundColor);
							
							//We need to verify all of the propNames
							el.animate(endStyles, el.data('transition-duration'));
							//el.animate({'background-color':'#FFFFFF'}, el.data('transition-duration'));
							//el.css(endStyles);
							
						});
					},
					
					/* mouseleave */
					function(){
						var els;
						
						//If decendents specified, apply on it
						if(selectorHoverSplit[1])
							els = $(this).find(selectorHoverSplit[1]);
						//Otherwise just select this one
						else
							els = $(this);
						
						$(els).stop().each(function(){
							var el = $(this);
							var startStyles = el.data('start-styles');
							if(!startStyles)
								return;
							el.animate(startStyles, el.data('transition-duration'));
						});
					}
				);
			}
		});
		
		
		//If there was a match, then store the transition properties in the DOM elements
		if(transitionProperties.length || transitionDuration != -1){
			try {
				$(selector).each(function(){
					var startStyles = {};
					if(transitionProperties.length){
						var el = this;
						$(el).data("transition-property", transitionProperties);
						
						//Save the initial styles which will be transitioned into
						$(transitionProperties).each(function(){
							var value = $(el).css(this);
							if(value){
								startStyles[this] = value;
							}
							
						});
						$(this).data("start-styles", startStyles);
					}
					if(transitionDuration != -1)
						$(this).data("transition-duration", transitionDuration);
				});
			}
			catch(e){
				if(window.console && window.console.warn){
					console.warn(rule);
					console.warn(e);
				}
			}
			
		}
		return '';
	};
	
	var lastCssText;
	while(cssText && cssText != lastCssText){
		lastCssText = cssText;
		cssText = cssText.replace(regexpCssParse, parserCallback)
	}
	
});

}); //end jQuery.ready