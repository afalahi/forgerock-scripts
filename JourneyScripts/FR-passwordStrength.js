/**
 * Author: jon.knight@forgerock.com
 * Description: A scripted auth node password strength-o-meter. Combine this script with a standard password node in a page node based on this external password strength project (https://github.com/dropbox/zxcvbn)
 * outcomes: true
 */

(function () {
  var fr = JavaImporter(
    org.forgerock.openam.auth.node.api,
    com.sun.identity.authentication.callbacks.ScriptTextOutputCallback
);

var script;
function createScript() {
  return String(
    " \n\
      var s = document.createElement('style'); \n\
      s.innerHTML = 'meter { margin-top: 5px; width: 100%; height: 20px; } meter[value=\"1\"]::-webkit-meter-optimum-value { background: red; } meter[value=\"2\"]::-webkit-meter-optimum-value { background: orange; } meter[value=\"3\"]::-webkit-meter-optimum-value { background: yellow; } meter[value=\"4\"]::-webkit-meter-optimum-value { background: green; } meter[value=\"1\"]::-moz-meter-bar { background: red; } meter[value=\"2\"]::-moz-meter-bar { background: orange; } meter[value=\"3\"]::-moz-meter-bar { background: yellow; } meter[value=\"4\"]::-moz-meter-bar { background: green; }' \n\
      document.head.appendChild(s); \n\
      var strength = { 0: 'Worst', 1: 'Bad', 2: 'Weak', 3: 'Good', 4: 'Strong' }; \n\
      var script = document.createElement('script'); \n\
      script.onload = function () { \n\
		    var p = document.querySelectorAll('input[data-vv-as=\"Password\"]')[0]; \n\
        var m = document.createElement('meter'); \n\
        m.id = 'meter'; \n\
        m.max = '4'; \n\
			  m.style.display = 'none'; \n\
			  p.parentNode.insertBefore(m, p.nextSibling); \n\
			  var t = document.createElement('p'); \n\
			  m.parentNode.insertBefore(t, m.nextSibling); \n\
			  p.addEventListener('input', function() { \n\
				  var v = p.value; \n\
				  var r = zxcvbn(p.value); \n\
				  m.value = r.score; \n\
				  if (p.value != '') t.innerHTML = strength[r.score]; else t.innerHTML = ''; \n\
				  if (p.value != '') m.style.display = 'block'; else m.style.display = 'none'; \n\
			  }) \n\
		  } \n\
		  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/zxcvbn/4.2.0/zxcvbn.js'; \n\
		  document.body.appendChild(script); \n\
    "
  );
}

if (callbacks.isEmpty()) {
  action = fr.Action.send(
    new fr.ScriptTextOutputCallback(createScript())
  ).build();
} else {
  action = fr.Action.goTo('true').build();
}}())
