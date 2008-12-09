<?php

header('expires: ' . str_replace('+0000', 'GMT', gmdate('r', time() + 3600*24))); //one day later

//XBL
if(strpos($_SERVER['HTTP_USER_AGENT'], 'MSIE') === false):
header('content-type:application/xml');
echo '<?'.'xml version="1.0"?'.'>';
?>
<bindings xmlns="http://www.mozilla.org/xbl" xmlns:html="http://www.w3.org/1999/xhtml">
<?php for($i = 0; $i < @$_GET['count']; $i++): ?>
	<binding id="rule<?php echo $i; ?>">
		<implementation>
			<constructor>
			<![CDATA[
			cssTransitions.applyRule(this, <?php echo $i ?>);
			]]>
			</constructor>
			<?php if(false): ?>
			<!--
			We cannot use the destructor to determine when a rule is removed. See Bug 83635 -  XBL binding not deleted on removal from document tree  https://bugzilla.mozilla.org/show_bug.cgi?id=83635
			This sucks.
			-->
			<!--<destructor>
			<![CDATA[
				if(xblConsole)
					xblConsole.info('destruct');
				var $el = jQuery(this);
				$el.removeData('transitionProperty');
				$el.removeData('transitionDuration')
			]]>
			</destructor>-->
			<?php endif; ?>
		</implementation>
	</binding>
<?php endfor; ?>
</bindings>
<?php
//HTC
else:
header('content-type:text/x-component');
?>
<PUBLIC:COMPONENT NAME="rule<?php echo (int)($_GET['rule']); ?>">
	<SCRIPT LANGUAGE="JScript">
		window.cssTransitions.applyRule(element, <?php echo (int)($_GET['rule']) ?>);
	</SCRIPT>
</PUBLIC:COMPONENT>
<?php endif ?>