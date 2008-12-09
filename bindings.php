<?php

$expires = str_replace('+0000', 'GMT', gmdate('r', time() + 3600*24*7));
header('Expires: ' . $expires); //one day later
header('Cache-Control: public');
header('Last-Modified: ' . str_replace('+0000', 'GMT', gmdate('r', filemtime(__FILE__))));

/*
IE ISSUE: 
There is a small side effect to this however... IE reloads the HTC file for each and every input that uses it. Since, the file is
cached on your local hard drive, this is usually not a huge deal and is very fast. However, if a person has a slow PC and your site
is SSL secured and the person has disabled caching for secured sites (which is normal), IE will be VERY slow in rendering the page.
http://forums.intomobile.com/htc/10151-who-uses-microsoft-htc-files-if-so-what-reasons-how-large-project.html
*/


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
<PUBLIC:COMPONENT NAME="rule<?php echo (int)($_GET['rule']); ?>" xmlns:PUBLIC="urn:HTMLComponent">
	<SCRIPT LANGUAGE="JScript">
		//alert("<?php echo date('r') . "\\n$expires" ?>")
		window.cssTransitions.applyRule(element, <?php echo (int)($_GET['rule']) ?>);
	</SCRIPT>
</PUBLIC:COMPONENT>
<?php endif ?>