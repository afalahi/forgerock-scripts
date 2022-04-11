 /**
  * Author: jon.knight@forgerock.com
  * Description: Display and capture a user's profile image
  * Required variables:
  * ATTRIB and IDM_ATTRIB - the AM and IDM equivalent attributes to hold the user profile image
  * ICON - default placeholder image
  * SIZE - size of profile image to display
  * IMGBB_KEY - an API - please obtain free from https://imgbb.com
  */

var ATTRIB = "labeledURI";
var IDM_ATTRIB = "profileImage";
var IMGBB_KEY = "781eb986d3015f8ea6fea8259ce868c0";
var ICON = "https://icons-for-free.com/iconfiles/png/512/boy+man+person+user+woman+icon-1320085967769585303.png"
var SIZE = "120";


var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    com.sun.identity.authentication.callbacks.ScriptTextOutputCallback
)


with(fr) {
    var script;
    function createScript() {
        return String("if (!document.getElementById('video')) { var selfie = document.createElement('div'); \n\
            var cb = document.getElementById('callbacksPanel'); \n\
            cb.insertBefore(selfie, cb.firstChild); \n\
            selfie.innerHTML = '<div><video id=\"selfie\" onClick=\"go()\" autoplay style=\"-webkit-mask-image: -webkit-radial-gradient(circle, white 100%, black 100%); object-fit:cover; margin-bottom:10px; padding:2px; border:solid silver 1px; border-radius:50%; height:" + SIZE + "px; width:" + SIZE + "px;\" poster=\"" + ICON + "\"></video></div>' \n\
            var scr = document.createElement('script'); \n\
            scr.text =  'var step=0; var v; var handleSuccessFace = function(s){window.localStream = s;v.srcObject = s;};' + \n\
                        'function readImage(f) {if (f.type && f.type.indexOf(\\\'image\\\') === -1) {return;}; const r = new FileReader();r.addEventListener(\\\'load\\\', (event) => {document.getElementById(\\\'selfie\\\').poster = event.target.result;document.getElementById(\\\'clientScriptOutputData\\\').value = event.target.result.split(\\\',\\\')[1];});r.readAsDataURL(f);};' + \n\
                        'document.getElementById(\\\'selfie\\\').ondrop = function(ev) { ev.preventDefault(); f=ev.dataTransfer.items[0].getAsFile(); readImage(f); };' + \n\
                        'document.getElementById(\\\'selfie\\\').ondragover = function(ev) { ev.preventDefault(); };' + \n\
                        'var handleError = function(e) {console.log(\\\'Error: \\\' + e.name);};' + \n\
                        'var go = function() {' + \n\
                        '   if (step == 0) { '+ \n\
                        '       v = document.getElementById(\\\'selfie\\\');' + \n\
                        '       document.getElementById(\\\'selfie\\\').style.borderColor = \\\'lightgreen\\\';' + \n\
                        '       document.getElementById(\\\'selfie\\\').style.borderWidth = \\\'2px\\\';' + \n\
                        '       navigator.mediaDevices.getUserMedia({video: {aspectRadion:1.7778, width:320}}).then(handleSuccessFace).catch(handleError);' + \n\
                        '       step=1;' + \n\
                        '   } else if (step == 1) {' + \n\
                        '       document.getElementById(\\\'selfie\\\').style.borderColor = \\\'silver\\\';' + \n\
                        '       document.getElementById(\\\'selfie\\\').style.borderWidth = \\\'1px\\\';' + \n\
                        '       c=document.createElement(\\\'canvas\\\');' + \n\
                        '       c.width=320;c.height=240;c.getContext(\\\'2d\\\').drawImage(v,0,0);' + \n\
                        '       i = c.toDataURL(\\\'image/jpeg\\\').split(\\\',\\\')[1];' + \n\
                        '       document.getElementById(\\\'clientScriptOutputData\\\').value=i;v.pause();step=0;' + \n\
                        '   }' + \n\
                        '}' \n\
            document.body.append(scr); \n\
            if (!document.body.querySelector('button[type=submit]')) { \n\
                var b = document.createElement('button'); \n\
                b.id = 'selfieButton' \n\
                b.onclick = function() { document.getElementById('loginButton_0').click(); document.getElementById('selfieButton').remove(); document.getElementById('selfie').remove(); }; \n\
                b.classList.add(\"btn\", \"btn-block\", \"mt-3\", \"btn-primary\"); \n\
                b.innerHTML = \"Next\"; \n\
                document.getElementById('wrapper').appendChild(b); \n\
            } \n\
        }");
    }
function clientSideScript(t) {
  var i = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    com.sun.identity.authentication.callbacks.ScriptTextOutputCallback
  );
  callbacks.isEmpty()
    ? (action = i.Action.send(
        new i.ScriptTextOutputCallback(t.toString() + ' ' + t.name + '()')
      ).build())
    : (action = i.Action.goTo((!0).toString()).build());
}
    if (callbacks.isEmpty()) {
        // Display current profile image is available
        var username = sharedState.get("_id");
        if (username) {
            if (idRepository.getAttribute(username, ATTRIB).size() > 0) {
                ICON = String(String(idRepository.getAttribute(username, ATTRIB).iterator().next().toString()));
            }
        }
        action = Action.send(
            new HiddenValueCallback("clientScriptOutputData", "false"),
            new ScriptTextOutputCallback(createScript())).build()
    } else {
        if (callbacks.get(0).getValue() != "clientScriptOutputData") {
            var request = new org.forgerock.http.protocol.Request();
            request.setMethod('POST');
            request.setUri('https://api.imgbb.com/1/upload?key=' + IMGBB_KEY);
            request.getHeaders().add("Content-Type", "application/x-www-form-urlencoded");
            request.getEntity().setString("image=" + encodeURIComponent(callbacks.get(0).getValue()));
            var response = httpClient.send(request).get();
            if (response.getStatus().getCode() === 200) {
                var jsonResult = JSON.parse(response.getEntity().getString());

                // If existing user then update profile directly
                var username = sharedState.get("_id");
                if (username) idRepository.setAttribute(username, ATTRIB, [jsonResult.data.url]);

                // And also set objectAttributes in sharedState
                var objAttribs = sharedState.get("objectAttributes");
                if (!objAttribs) objAttribs = new java.util.LinkedHashMap();
                objAttribs.put(IDM_ATTRIB, jsonResult.data.url);
                sharedState.put("objectAttributes", objAttribs);
            }
        }
        action = Action.goTo("true").build();
    }
}