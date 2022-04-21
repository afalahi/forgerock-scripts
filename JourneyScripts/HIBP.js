/* HIBP Password Breach Analysis
 *
 * Authors: jon.knight@forgerock.com, volker.scheuber@forgerock.com
 *
 * Use Have I Been Pwned Password to check if password has been breached.
 * Calls HIBP API to retrieve the count of matching passwords in breached
 * password database
 *
 * This script needs to be parametrized. It will not work properly as is.
 * It requires the Password or Platform Password collector nodes before
 * it can operate.
 *
 * The Scripted Decision Node needs the following outcomes defined:
 * - clear
 *   The number of breaches for password was either zero or less than the
 *   value of THRESHOLD
 * - breached
 *   The number of incidents of the password in the breached password
 *   database exceeds THRESHOLD
 * - failed
 *   The API call was rejected.
 * 
 * DISCLAIMER: This code is provided to you expressly as an example  (“Sample Code”). 
 * It is the responsibility of the individual recipient user, in his/her sole discretion, to diligence such Sample Code for accuracy, completeness, security, and final determination for appropriateness of use.
 * ANY SAMPLE CODE IS PROVIDED ON AN “AS IS” IS BASIS, WITHOUT WARRANTY OF ANY KIND. 
 * FORGEROCK AND ITS LICENSORS EXPRESSLY DISCLAIM ALL WARRANTIES,  WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION, THE IMPLIED WARRANTIES  OF MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * FORGEROCK SHALL NOT HAVE ANY LIABILITY ARISING OUT OF OR RELATING TO ANY USE, IMPLEMENTATION, INTEGRATION, OR CONFIGURATION OF ANY SAMPLE CODE IN ANY PRODUCTION ENVIRONMENT OR FOR ANY COMMERCIAL DEPLOYMENT(S).
 */
(function () {
  var USER_AGENT = 'ForgeRock';
  // Please replace with your HIBP key
  var HIBP_API_KEY = '';
  var THRESHOLD = 0;

  function toHexString(byteArray) {
    var s = '';
    byteArray.forEach(function (byte) {
      s += ('0' + (byte & 0xff).toString(16)).slice(-2);
    });
    return s;
  }

  outcome = 'failed';

  var md = java.security.MessageDigest.getInstance('SHA-1');
  var byteArray = java.lang.String(transientState.get('password')).getBytes('UTF-8');
  md.update(byteArray);
  var digest = md.digest();
  var hex = String(toHexString(digest)).toUpperCase();

  var request = new org.forgerock.http.protocol.Request();
  request.setMethod('GET');
  request.setUri('https://api.pwnedpasswords.com/range/' + hex.substring(0, 5));
  request.getHeaders().add('Accept', '*/*');
  request.getHeaders().add('Content-Type', 'application/json');
  request.getHeaders().add('User-Agent', USER_AGENT);
  request.getHeaders().add('hibp-api-key', HIBP_API_KEY);

  var response = httpClient.send(request).get();

  if (response.getStatus().getCode() === 200) {
    var max = 0;
    outcome = 'clear';
    var result = response.getEntity().getString();
    var lines = result.split('\n');
    for (i = 0; i < lines.length; i++) {
      var prefix = lines[i].split(':')[0];
      if (String(hex.substring(0, 5) + prefix) == hex) {
        var count = lines[i].split(':')[1];
        if (count > max) max = count;
      }
    }
    if (max > THRESHOLD) outcome = 'breached';
    sharedState.put('hibp_password_count', max);
  }
})();
