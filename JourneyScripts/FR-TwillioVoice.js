/**
 * Authentication Node that calls Twilio Voice API to call a user's phone
 * and reads the OTP currently in sharedState (set using HOTP Generator node)
 *
 * The following ESV variables should be defined in your tenant:
 *  esv-twilio-account-sid - Twilio Account SID
 *  esv-twilio-auth-token  - Twilio Auth Token
 *  esv-twilio-from-number - Twilio "From" telephone number
 * 
 * outcomes: noOTP
 *           noPhone
 *           success
 *           error
 * 
 * DISCLAIMER: This code is provided to you expressly as an example  (“Sample Code”). 
 * It is the responsibility of the individual recipient user, in his/her sole discretion, to diligence such Sample Code for accuracy, completeness, security, and final determination for appropriateness of use.
 * ANY SAMPLE CODE IS PROVIDED ON AN “AS IS” IS BASIS, WITHOUT WARRANTY OF ANY KIND. 
 * FORGEROCK AND ITS LICENSORS EXPRESSLY DISCLAIM ALL WARRANTIES,  WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION, THE IMPLIED WARRANTIES  OF MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * FORGEROCK SHALL NOT HAVE ANY LIABILITY ARISING OUT OF OR RELATING TO ANY USE, IMPLEMENTATION, INTEGRATION, OR CONFIGURATION OF ANY SAMPLE CODE IN ANY PRODUCTION ENVIRONMENT OR FOR ANY COMMERCIAL DEPLOYMENT(S).
 */

(function () {
  logger.error('TwilioOTP : Started');

  // Retrieve Twilio credentials from ESV
  var AccountSID = systemEnv.getProperty('esv.twilio.account.sid');
  var AuthToken = systemEnv.getProperty('esv.twilio.auth.token');
  var TwilioFromNumber = systemEnv.getProperty('esv.twilio.from.number');

  var Voice = 'Polly.Emma'; // Substitute your favorite Google polly voice

  function getBytes(s) {
    var result = [];
    for (var i = 0; i < s.length; i++) {
      result[i] = s.charCodeAt(i);
    }
    return result;
  }

  function greeting() {
    var myDate = new Date();
    var hrs = myDate.getHours();
    var greet;

    if (hrs < 12) greet = 'Good morning ';
    else if (hrs >= 12 && hrs <= 17) greet = 'Good afternoon ';
    else if (hrs >= 17 && hrs <= 24) greet = 'Good evening ';
    return greet;
  }

  var otpCode = sharedState.get('oneTimePassword');
  if (otpCode == null || otpCode == '') {
    outcome = 'noOTP';
  } else {
    var phone = sharedState.get('objectAttributes').get('telephoneNumber');
    var givenName = sharedState.get('objectAttributes').get('givenName');
    // If phone number not in sharedState then try to retrieve from user profile instead
    if (phone == null || phone == '') {
      var username = sharedState.get('_id');
      phone = String(idRepository.getAttribute(username, 'telephoneNumber').toString());
      givenName = String(idRepository.getAttribute(username, 'givenName').toString());
    }
    if (phone == null || phone == '') {
      outcome = 'noPhone';
    } else {
      var body = String(
        'Twiml=<Response><Pause length="2"/><Say voice="' +
          Voice +
          '">' +
          greeting() +
          givenName +
          '. Here is your one time pass code</Say>'
      );
      for (i = 0; i < otpCode.length; i++) {
        body = String(
          body +
            '<Pause length="1"/><Say voice="' +
            Voice +
            '">' +
            otpCode[i] +
            '</Say>'
        );
      }
      body = String(
        body +
          '<Pause length="1"/><Say voice="' +
          Voice +
          '">Thank you.</Say></Response>' +
          '&From=' +
          TwilioFromNumber +
          '&To=' +
          phone
      );

      var request = new org.forgerock.http.protocol.Request();
      request.setMethod('POST');
      request.setUri(
        'https://api.twilio.com/2010-04-01/Accounts/' +
          AccountSID +
          '/Calls.json'
      );
      var fr = JavaImporter(org.forgerock.util.encode.Base64);
      var basicAuthn = fr.Base64.encode(getBytes(AccountSID + ':' + AuthToken));
      request.getHeaders().add('Authorization', 'Basic ' + basicAuthn);
      request.getHeaders().add('Content-Type', 'application/x-www-form-urlencoded');
      request.getEntity().setString(encodeURI(body));
      var response = httpClient.send(request).get();
      var jsonResult = JSON.parse(response.getEntity().getString());
      if (jsonResult.hasOwnProperty('sid')) {
        outcome = 'success';
      } else {
        outcome = 'error';
        sharedState.put('ERROR', response.getEntity().getString());
      }
    }
  }
})();