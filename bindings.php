<?php

//Make sure that this file is cached because otherwise there may be some UI lag
$deltaSeconds = 3600*24;
$expires = str_replace('+0000', 'GMT', gmdate('r', time() + $deltaSeconds));
header('Expires: ' . $expires); //one day later
header('Cache-Control: max-age=' . $deltaSeconds);
header('Last-Modified: ' . str_replace('+0000', 'GMT', gmdate('r', filemtime(__FILE__))));

//### XBL ####################################################################################
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

//### HTC ####################################################################################
else:
header('content-type:text/x-component');

if(isset($_GET['rule'])){
	$rule = (int)$_GET['rule'];
}
else if(preg_match("{rule/(\d+)/?}", $_SERVER['REQUEST_URI'], $matches)){
	$rule = (int)$matches[1];
}
else {
	die("No rule number provided");
}
/*
IE ISSUE: 
There is a small side effect to this however... IE reloads the HTC file for each and every input that uses it. Since, the file is
cached on your local hard drive, this is usually not a huge deal and is very fast. However, if a person has a slow PC and your site
is SSL secured and the person has disabled caching for secured sites (which is normal), IE will be VERY slow in rendering the page.
http://forums.intomobile.com/htc/10151-who-uses-microsoft-htc-files-if-so-what-reasons-how-large-project.html

This is apparently solved by adding the lightWeight=true attribute!
*/
?>
<PUBLIC:COMPONENT xmlns:PUBLIC="urn:HTMLComponent" lightWeight="true">
<SCRIPT LANGUAGE="JScript">if(element.parentElement) window.cssTransitions.applyRule(element, <?php echo $rule ?>);</SCRIPT>
</PUBLIC:COMPONENT>
<?php endif ?>