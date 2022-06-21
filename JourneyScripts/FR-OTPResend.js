/**
 * Author: jon.knight@forgerock.com
 * Description: This is a custom OTP sender script with a count-down timer that will prompt the user to resend the HOTP code
 * outcomes: resend, false, true
 * This script depends on the Scripted Decision Node having a 'Script Input' variable defined for 'oneTimePassword'
 * This promotes the transientState value set by the OTP Generator node to secureState so that it securely persists between client interactions
 */
 DELAY=20;

 var fr = JavaImporter(
     org.forgerock.openam.auth.node.api.Action,
     javax.security.auth.callback.NameCallback,
     com.sun.identity.authentication.callbacks.ScriptTextOutputCallback
 )
 
 //Creating a client-side script that's sent to the browser via the Journey API
 function createScript() {
     return String(" \n\
         var COUNT = " + DELAY + "; \n\
         function go(obs) { \n\
             const p = document.querySelectorAll('input[data-vv-as=\"One Time Passcode\"]')[0]; \n\
             if (p) { \n\
                 var b = document.createElement('button'); \n\
                 b.id = 'resendButton'; \n\
                 b.classList.add(\"btn\", \"mt-3\", \"btn-secondary\", \"btn-sm\"); \n\
                 b.onclick = function() { p.value='___RESEND___'; p.dispatchEvent(new Event('input')); }; \n\
                 b.innerHTML = 'Resend Code ... ' + COUNT + 's'; \n\
                 b.disabled = true; \n\
                 p.parentNode.insertBefore(b, p.nextSibling); \n\
                 var t = setInterval(function() { \n\
                     if (COUNT == 1) { \n\
                         clearInterval(t); \n\
                         b.disabled = false; \n\
                         b.innerHTML = 'Resend Code'; \n\
                     } else { \n\
                         COUNT--; \n\
                         b.innerHTML = 'Resend Code ... ' + COUNT + 's'; \n\
                     } \n\
                 }, 1000 ); \n\
                 if (obs) obs.disconnect(); \n\
                 return; \n\
             } \n\
         } \n\
         if (document.querySelectorAll('input[data-vv-as=\"One Time Passcode\"]')[0]) go(); \n\
         else { \n\
             const observer = new MutationObserver((mutations, obs) => { go(obs); }); \n\
             observer.observe(document, { childList: true, subtree: true }); \n\
         } \n\
     ");
 }
 
 //handle resending the code, validating or failing if the code is invalid
 if (callbacks.isEmpty()) {
     action = fr.Action.send(
         new fr.ScriptTextOutputCallback(createScript()),
         new fr.NameCallback("One Time Passcode")
     ).build()
 } else {
     var otp = callbacks.get(1).getName();
     if (otp === "___RESEND___") {
         action = fr.Action.goTo("resend").build();
     } else {
         sentOpt = nodeState.get("oneTimePassword").asString();      
         if (sentOpt == otp) action = fr.Action.goTo("true").build();
         else action = fr.Action.goTo("false").build();
     }
 }