<h1>CSS Transitions via jQuery Animation</h1>

<p><em>(This project was published back in January 2009, and since the browser landscape has significantly changed. This code is made available here for historical purproses but it is not advisable to incorporate.)</em></p>

<p>The WebKit team has been developing some cutting-edge <a href="http://webkit.org/specs/CSSVisualEffects/" title="CSS Effects proposed specifications">proposals</a> to extend CSS with the ability to do declarative animations and other effects. This ability is key to maintaining the <a href="http://www.sitepoint.com/article/simply-javascript/" title="Simply JavaScript: The Three Layers of the Web">three-fold separation</a> of HTML content, CSS presentation, and JavaScript behavior. Animation effects on the Web today are accomplished with JavaScript code which repeatedly changes an element's style at a certain interval in order to create an animated effect. This practice, however, violates the separation between presentation and behavior because the animation behaviors are directly changing the document's presentation (i.e. modifying the <code>style</code> property). Ideally, all of the animation triggers and presentation states would be declared in CSS. And this is exactly what the WebKit team has <a href="http://webkit.org/blog/138/css-animation/" title="CSS Animation @ Surfin' Safari">proposed</a> in its <a href="http://webkit.org/specs/CSSVisualEffects/CSSTransitions.html">CSS Transitions</a> specification.</p>

<p>Since it's a new WebKit proposal, however, CSS Transitions has only been implemented in WebKit-based browsers like Safari and Chrome. While a <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=435441" title="Bug 435441: Implement Webkit's CSS Transitions proposal">enhancement bug</a> has been filed to add CSS Transitions to Mozilla, it isn't likely going to land in the near future; likewise, support in MSIE may not even land in the <em>distant</em> future. Nevertheless, declarative animation in CSS is still an attractive solution, and I wanted to use the technology today. I therefore developed a prototype <a href="http://github.com/westonruter/jquery-css-transitions/blob/master/jquery.css-transitions.js" title="CSS Transitions via jQuery Animation on GitHub">script</a> (<a href="http://github.com/westonruter/jquery-css-transitions/raw/master/jquery.css-transitions.js" title="Raw Javascript source for CSS Transitions via jQuery Animation">raw</a>) which implements a subset of CSS Transitions via <a href="http://docs.jquery.com/Effects/animate" title="jQuery Animate">jQuery Animation</a> (inspired by Chris Schneider's <a href="http://playground.chrisbk.de/moofx/">CSS Effects powered by mootools</a>).</p>

<p>This implementation requires a binding language such as Mozilla's <a href="https://developer.mozilla.org/en/XBL" title="XML Binding Language (XBL) on MDC">XBL</a> or MSIE's <a href="http://msdn.microsoft.com/en-us/library/ms531079.aspx" title="Introduction to DHTML Behaviors">DHTML Behaviors</a>. Because of this, the script works in Firefox 2, Firefox 3, and MSIE 7 (IE 6 is not supported, but it does have limited functionality); in WebKit-based browsers the script does nothing since CSS Transitions are supported natively. Opera is not supported because it has no binding language. Why is a binding language required? The script parses the stylesheet rules looking for <code>transition-*</code> properties, and when it finds one, it adds a binding to that style rule so that when the rule gets applied, the binding's code is executed on each of the newly selected elements. This enables transitions to get triggered when a class name is changed. The binding code knows the transition style properties which were defined in its containing style rule, so when it gets executed it transitions the elements' styles from the previously matched style rule to the styles defined in the newly matched style rule. Each of these style rules I'm calling <dfn>transition states</dfn>.</p>

<p>Now, as I already mentioned, this script implements a functional <em>subset</em> of CSS Transitions. It is important to remember and to follow the following restrictions:</p>

<ol>
    <li><p>Due in part to a <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=83635" title="Bug 83635: XBL binding not deleted on removal from document tree">bug</a> in XBL which prevents a binding's <code>destructor</code> from being called, <strong>only one transition state (style rule) may be applied at a time</strong>, thus transitioned properties may not be cascaded.</p></li>

    <li><p>Additionally, <strong>all of the style properties specified by <code>transition-property</code> must be specified in each transition state</strong> (the <code>all</code> keyword is not currently supported).</p></li>

    <li><p>XBL and HTC bindings cannot be dynamically created on the client (except in Firefox 3.1), so <strong>a server-side script is required to generate the necessary bindings</strong>. A provided <a href="http://github.com/westonruter/jquery-css-transitions/blob/master/bindings.php">PHP script</a> demonstrates what the server-side script must generate. The client by default expects this file to be called “bindings.php” and located in the same directory as the JS file. This path and filename and may be overridden by setting a global variable <code>cssTransitionsBindingURL</code> before the inclusion of the script in the HTML page.</p></li>

    <li><p>In order to prevent a <dfn>flash of unbound content</dfn> in Firefox (all of the transitioned elements will flicker when the XBL bindings get applied; cf. <a href="http://en.wikipedia.org/wiki/Flash_of_unstyled_content"><abbr title="Flash of unstyled content">FOUC</abbr></a>), it is best to <strong>include the script in the <code>head</code> of the page</strong> along with jQuery and any dependent jQuery plugins, such as jQuery <a href="http://plugins.jquery.com/project/color">Color Animations</a> (even though inclusion in the <code>head</code> is not the <a href="http://developer.yahoo.com/performance/rules.html#js_bottom" title="Put Scripts at the Bottom">best practice</a> for performance).</p></li>
    
    <li><p>Since the CSS specification requires that parsers ignore any unrecognized properties, as already mentioned, the script loads each of the referenced stylesheets and re-parses them for rules containing <code>transition-*</code> properties; IE doesn't allow you to get the text content of a <code>style</code> element so <strong>all stylesheets containing CSS Transitions must be referenced via <code>link</code> elements</strong>, and <strong>the stylesheets must be accessible without violating the <a href="https://developer.mozilla.org/en/Same_origin_policy_for_JavaScript" title="Same origin policy for JavaScript on MDC">same-origin policy</a></strong> (since they are loaded via XMLHttpRequest).</p></li>
    
    <li><p>Furthermore, since the transition-initializing bindings should only be added to rules which are actually transition states, for performance reasons <strong>this implementation requires that a comment <code>/*@transition-rule@*/</code> be added to each transition rule</strong>.</p></li>

    <li><p>IE has difficulty applying bindings in rules with selectors like “<code>#foo.baz #bar</code>” (where the <code>baz</code> class name gets added or removed): the binding does not get fired on <code>#bar</code> unless a DOM mutation happens on that element. This mutation can be accomplished by doing something like this:</p>
<pre><code>$('#foo').addClass('baz');
if(jQuery.browser.msie)
    $('#foo #bar').addClass('temp-ie-class').removeClass('temp-ie-class');</code></pre>
    </li>
    
    <li><p>Likewise, a similar workaround was built into the script to support <code>:hover</code> selectors for transition rules in IE. If another element is dynamically added to the page after the DOM is loaded, you must call <code>cssTransitions.refreshDOMForMSIE()</code>. Currently neither the <code>:active</code> nor <code>:target</code> pseudo classes are working in IE for transition rules.</p></li>
</ol>

<p>See a <strong><a href="http://westonruter.github.com/jquery-css-transitions/example.html">lightweight example</a></strong>.</p>

<p>Fork the <a href="http://github.com/westonruter/jquery-css-transitions">project on GitHub</a>.</p>

<h3 id="todo">Unimplemented Features and To-do Items</h3>
<ul>
    <li>Implement <code>transition-timing-function</code> property (currently only the default <code>ease</code> is supported).</li>
    <li>Implement <code>transition</code> shorthand property.</li>
    <li>Allow <code>transition-property:all</code>.</li>
    <li>Allow different <code>transition-duration</code>s for each transition state.</li>
    <li>Add support for <code>:active</code> (in IE) and <code>:focus</code>.</li>
    <li>Implement Transition Events.</li>
</ul>
