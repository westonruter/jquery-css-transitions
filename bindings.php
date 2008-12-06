<?php
header('content-type:application/xml');
header('expires: ' . str_replace('+0000', 'GMT', gmdate('r', time() + 3600*24))); //one day later
echo '<?'.'xml version="1.0"?'.'>';?>
<bindings xmlns="http://www.mozilla.org/xbl" xmlns:html="http://www.w3.org/1999/xhtml">
<?php for($i = 0; $i < @$_GET['count']; $i++): ?>
	<binding id="rule<?php echo $i+1; ?>">
		<implementation>
			<constructor>
			<![CDATA[
try {
				var i = <?php echo $i ?>;
				
				var $this = jQuery(this);
				xblConsole.info(cssTransitionRules[i].selectorText)
				//xblConsole.info(cssTransitionRules[i].transitionProperty)
				
				//Make sure that the transition property and duration are stored for this element, because it
				//  may have been dynamically generated
				if(cssTransitionRules[i].transitionProperty.length)
					$this.data('transitionProperty', cssTransitionRules[i].transitionProperty);
				if(cssTransitionRules[i].transitionDuration)
					$this.data('transitionDuration', cssTransitionRules[i].transitionDuration);
				
				//For each of the transition properties, set the style to the current property so that subsequent rules don't override immediately
				var transitionProperties = $this.data('transitionProperty');
				var that = this;
				var transitionStyle = {};
				var currentStyle = {};
				var previousStyle = $this.data('transitionPreviousStyle') || {};
				//xblConsole.info(cssTransitionRules[i]);
				jQuery(transitionProperties).each(function(){
					currentStyle[this] = $this.css(this);
					if(!that.style[this]){
						$this.css(this, currentStyle[this]);
					}
					if(cssTransitionRules[i].style[this]){
						//xblConsole.info(this, currentStyle[this])
						transitionStyle[this] = cssTransitionRules[i].style[this];
					}
					else {
						//xblConsole.warn(this, currentStyle[this])
					}
					//xblConsole.warn(cssTransitionRules[i].style)
					
					//else if(previousStyle[this])
					//	transitionStyle[this] = previousStyle[this];
				});
				//xblConsole.info(transitionStyle)
				//xblConsole.warn(transitionProperties)
				
				$this.stop().animate(transitionStyle, $this.data('transitionDuration'));
				
				for(var name in currentStyle){
					previousStyle[name] = currentStyle[name];
				}
				$this.data('transitionPreviousStyle', previousStyle);
				
				//xblConsole.info(cssTransitionRules[i].selectorText)
				
				//xblConsole.info(cssTransitionRules[i].selectorText)
				//console.info($this.data('transitionProperty'));
				//console.info($this.data('transitionDuration'));
				
				
				//Note: This doesn't work with :not(:target)
				//var selectorWithoutPseudoClasses = cssTransitionRules[i].selectorText.replace();
				
				//if(cssTransitionRules[i].selectorText.indexOf(':target') == -1){
				//	var selectorWithoutTarget = cssTransitionRules[i].selectorText.replace(/:target/, '');
				//}
				
				
				//var selector = "<?php echo urldecode(stripslashes(@$_GET['selector'])) ?>";
				if(xblConsole){
					//xblConsole.info(cssTransitionRules[i].selectorText);
					//xblConsole.info(cssTransitionRules[i].transitionProperty);
				}
}catch(e){
	xblConsole.error(e)
}
			]]>
			</constructor>
			<destructor>
			<![CDATA[
				if(xblConsole)
					xblConsole.info('destruct');
				var $this = jQuery(this);
				$this.removeData('transitionProperty');
				$this.removeData('transitionDuration')
			]]>
			</destructor>
		</implementation>
	</binding>
<?php endfor; ?>
</bindings>