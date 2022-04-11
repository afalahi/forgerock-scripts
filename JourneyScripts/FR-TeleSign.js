/* TeleSign SMS OTP Sender
 *
 * Author: ali.falahi@forgerock.com
 * Credit: volker.scheuber@forgerock.com
 *
 * This script will send an SMS containing the OTP to the phone number in the user's profile.
 * 
 * This script needs to be parametrized. It will not work properly as is. 
 * It requires the Identify Existing User node and HOTP Generator node before it is being called.
 * 
 * The Scripted Decision Node needs the following outcomes defined:
 * - sent
 * - invalid_code
 * - invalid_phone
 * - failed
 */
(function () {
  //Import ForgeRock Classes to base64 and handle bytes
  var frJava = JavaImporter(
    org.forgerock.util.encode.Base64,
    java.lang.String
  );
  logger.warning("TeleSign SMS OTP Sender: start");
  //We check if the user already started authentication and check if they have a phone number. This relies on Identify Existing User
  //For IDC, we replace the <username> with <_id> attribute for uniqueness
  //sharedState and idRepository are ForgeRock bindings from Java injected to this JavaScript Engine
  var username = sharedState.get('username') || sharedState.get('objectAttributes').get('userName')
  var id = sharedState.get('_id');
  var telephoneNumber = idRepository.getAttribute(id, 'telephoneNumber').iterator().hasNext() || sharedState.get('objectAttributes').get('telephoneNumber')
  if (username && telephoneNumber || id && telephoneNumber) {
    /* BEGIN SCRIPT CONFIGURATION
     *
     * REPLACE WITH YOUR OWN TeleSign SETTINGS. In productions these values can be stored in Forgerock Secrets secrets
     * TeleSign SMS Message API Configuration
     */
    var TELESIGN_CUSTOMER_ID = '';
    var TELESIGN_API_KEY = '';
    var TELESIGN_SENDER_ID = ''; //if left empty then click send will use a shared number

    var TELESIGN_URI = 'https://rest-api.telesign.com/v1/messaging';
    var TELESIGN_TO = idRepository.getAttribute(id, 'telephoneNumber').iterator().hasNext() ? idRepository.getAttribute(id, 'telephoneNumber').iterator().next() : sharedState.get('objectAttributes').get('telephoneNumber')
    var SMS_BODY = 'SMS code for ' + username + ': ' + transientState.get('oneTimePassword');

    var AUTHZ = 'Basic ' + frJava.Base64.encode(new frJava.String(TELESIGN_CUSTOMER_ID + ':' + TELESIGN_API_KEY).getBytes());

    //frFetch is just an API wrapper that makes it easier to handle HTTP requests. The function is defined at the bottom
    var response = frFetch(TELESIGN_URI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: AUTHZ,
      },
      formBody: {
        message: SMS_BODY,
        message_type: 'ARN',
        phone_number: TELESIGN_TO,
        sender_id: TELESIGN_SENDER_ID
      },
    });
    var result = JSON.parse(response.getEntity().getString());

    if (response.getStatus().getCode() === 400) {
      if(result.status.code.includes(11001)) {
        outcome = 'invalid_code';
      } else if (result.status.code.includes(11000)) {
        outcome = 'invalid_phone'
      }
      logger.error('TeleSign SMS OTP Sender: error_code = ' + result.status.code);
      logger.error('TeleSign SMS OTP Sender: outcome = ' + result.status.description);
    } else {
      outcome = 'sent';
      logger.warning('TeleSign SMS OTP Sender: outcome = sent');
    }
  } else {
    outcome = 'failed';
    logger.error("TeleSign SMS OTP Sender: No user or phone number found! Use 'Identify Existing User node before this script to populate the user's _id or username in shared state!'");
    logger.error('TeleSign SMS OTP Sender: outcome = failed');
  }

// Helper Functions go here
/**
 * @param {string} url - the full url value
 * @param {object} options - Headers, body, method, etc.
 * @param {string} options.method - The HTTP method used to make the request
 * @param {object} options.headers - An object containing key value pairs for HTTP Headers
 * @param {object} options.formBody - If you're working with forms this should be an object containing the form key/value pairs
 * @param {object} options.body - If communicating with a JSON API, use this property to send your JSON payload. This needs to be a javascript object
 * @returns
 */
  function frFetch(url, options) {
    var request = new org.forgerock.http.protocol.Request();
    request.setMethod(options.method);
    request.setUri(url);
    if (options.headers) {
      Object.keys(options.headers).forEach(function (key) {
        request.getHeaders().add(key, options.headers[key]);
      });
    }
    if (options.headers['Content-Type'] == 'application/x-www-form-urlencoded') {
      var params = request.getForm();
      Object.keys(options.formBody).forEach(function (key) {
        params.add(key, options.formBody[key]);
      });
      request.getEntity().setString(params.toString());
    } else if (
      options.headers['Content-Type'] == 'application/json' &&
      options.method == 'POST'
    ) {
      request.getEntity().setJson(options.body);
    }
    var response = httpClient.send(request).get();
    return response;
  }
})()