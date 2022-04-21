/**
 * Author: jon.knight@forgerock.com
 * Description: Display and capture a user's profile image
 * Required variables:
 * ATTRIB and IDM_ATTRIB - the AM and IDM equivalent attributes to hold the user profile image
 * ICON - default placeholder image
 * SIZE - size of profile image to display
 * IMGBB_KEY - an API - please obtain free from https://imgbb.com
 */

// Drop in library for fast client side script writing
// outcomes 'true' or 'false'
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
var ATTRIB = 'labeledURI';
var IDM_ATTRIB = 'profileImage';
var IMGBB_KEY = '781eb986d3015f8ea6fea8259ce868c0';
var ICON = 'https://icons-for-free.com/iconfiles/png/512/boy+man+person+user+woman+icon-1320085967769585303.png';
var SIZE = '120';

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  com.sun.identity.authentication.callbacks.HiddenValueCallback,
  com.sun.identity.authentication.callbacks.ScriptTextOutputCallback
);

with (fr) {
  function getSelfie() {
    if (!document.getElementById('video')) { 
      var selfie = document.createElement('div');
      var cb = document.getElementById('callbacksPanel');
      cb.insertBefore(selfie, cb.firstChild); 
      selfie.innerHTML =
        '<div><video id="selfie" onClick="scriptText()" autoplay style="-webkit-mask-image: -webkit-radial-gradient(circle, white 100%, black 100%); object-fit:cover; margin-bottom:10px; padding:2px; border:solid silver 1px; border-radius:50%; height:' +
        '120' +
        'px; width:' +
        '120' +
        'px;" poster=' +
        'https://icons-for-free.com/iconfiles/png/512/boy+man+person+user+woman+icon-1320085967769585303.png' +
        '></video></div>';
      var src = document.createElement('script');
      function scriptText() {
        var step=0; 
        var v; 
        var handleSuccessFace = function(s){
          window.localStream = s;
          v.srcObject = s;
        };
        function readImage(f) {
          if (f.type && f.type.indexOf('image') === -1) {return;}; 
            const r = new FileReader();
            r.addEventListener('load', (event) => {
              document.getElementById('selfie').poster = event.target.result;
              document.getElementById('clientScriptOutputData').value = event.target.result.split(',')[1];
            });
            r.readAsDataURL(f);
          };
        document.getElementById('selfie').ondrop = function(ev) { 
          ev.preventDefault(); 
          f=ev.dataTransfer.items[0].getAsFile(); 
          readImage(f); 
        };
        document.getElementById('selfie').ondragover = function(ev) { ev.preventDefault(); };
        var handleError = function(e) {console.log('Error: ' + e.name);};
        var go = (function() {
          if (step == 0) { 
            v = document.getElementById('selfie');
            document.getElementById('selfie').style.borderColor = 'lightgreen';
            document.getElementById('selfie').style.borderWidth = '2px';
            navigator.mediaDevices.getUserMedia({
              video: {
                aspectRadion:1.7778, 
                width:320
              }
            }).then(handleSuccessFace).catch(handleError);
            step=1;
          } else if (step == 1) {
            document.getElementById('selfie').style.borderColor = 'silver';
            document.getElementById('selfie').style.borderWidth = '1px';
            c=document.createElement('canvas');
            c.width=320;c.height=240;c.getContext('2d').drawImage(v,0,0);
            i = c.toDataURL('image/jpeg').split(',')[1];
            document.getElementById('clientScriptOutputData').value=i;v.pause();step=0;
          } 
        })()
      }
      src.text = scriptText.toString()
      document.body.append(src); 
      if (!document.body.querySelector('button[type=submit]')) { 
        var b = document.createElement('button'); 
        b.id = 'selfieButton' 
        b.onclick = function() { document.getElementById('loginButton_0').click(); document.getElementById('selfieButton').remove(); document.getElementById('selfie').remove(); }; 
        b.classList.add("btn", "btn-block", "mt-3", "btn-primary"); 
        b.innerHTML = "Next";
        document.getElementById('wrapper').appendChild(b);
      } 
    }
  }
  if (callbacks.isEmpty()) {
    // Display current profile image is available
    var username = sharedState.get('_id');
    if (username) {
      if (idRepository.getAttribute(username, ATTRIB).size() > 0) {
        ICON = String(String(idRepository.getAttribute(username, ATTRIB).iterator().next().toString()));
      }
    }
    action = Action.send(
      new HiddenValueCallback('clientScriptOutputData', 'false'),
      new ScriptTextOutputCallback(getSelfie.toString() + ' ' + getSelfie.name + '()')
    ).build();
  } else {
    if (callbacks.get(0).getValue() != 'clientScriptOutputData') {
      var request = new org.forgerock.http.protocol.Request();
      request.setMethod('POST');
      request.setUri('https://api.imgbb.com/1/upload?key=' + IMGBB_KEY);
      request.getHeaders().add('Content-Type', 'application/x-www-form-urlencoded');
      request.getEntity().setString('image=' + encodeURIComponent(callbacks.get(0).getValue()));
      var response = httpClient.send(request).get();
      if (response.getStatus().getCode() === 200) {
        var jsonResult = JSON.parse(response.getEntity().getString());

        // If existing user then update profile directly
        var username = sharedState.get('_id');
        if (username) idRepository.setAttribute(username, ATTRIB, [jsonResult.data.url]);

        // And also set objectAttributes in sharedState
        var objAttribs = sharedState.get('objectAttributes');
        if (!objAttribs) objAttribs = new java.util.LinkedHashMap();
        objAttribs.put(IDM_ATTRIB, jsonResult.data.url);
        sharedState.put('objectAttributes', objAttribs);
      }
    }
    action = Action.goTo('true').build();
  }
}