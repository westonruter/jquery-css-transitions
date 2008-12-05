<?php
header('content-type:application/xml');
header('expires: ' . str_replace('+0000', 'GMT', gmdate('r', time() + 3600*24))); //one day later
echo '<?'.'xml version="1.0"?'.'>';?>
<bindings xmlns="http://www.mozilla.org/xbl" xmlns:html="http://www.w3.org/1999/xhtml">
<?php for($i = 0; $i < @$_GET['count']; $i++): ?>
	<binding id="rule<?php echo $i+1; ?>">
		<implementation>
			<constructor>
				var i = <?php echo $i ?>;
				
				//Note: This doesn't work with :not(:target)
				var selectorWithoutPseudoClasses = cssTransitionRules[i].selectorText.replace();
				
				if(cssTransitionRules[i].selectorText.indexOf(':target') == -1){
					var selectorWithoutTarget = cssTransitionRules[i].selectorText.replace(/:target/, '');
				}
				
				
				//var selector = "<?php echo urldecode(stripslashes(@$_GET['selector'])) ?>";
				if(xblConsole)
					xblConsole.info(cssTransitionRules[i].selectorText);
				
			</constructor>
			<destructor>
				if(xblConsole)
					xblConsole.info('destruct');
			</destructor>
		</implementation>
	</binding>
<?php endfor; ?>
</bindings>