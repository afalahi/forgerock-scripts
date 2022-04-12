/* MessageBird SMS OTP Sender
 *
 * Author: ali.falahi@forgerock.com
 *
 * This script will send an SMS containing the OTP to the phone number in the user's profile.
 * 
 * This script needs to be parametrized. It will not work properly as is. 
 * It requires the Identify Existing User node and HOTP Generator node before it is being called.
 * 
 * The Scripted Decision Node needs the following outcomes defined:
 * - sent
 * - failed
 */
(function () {
  //Import ForgeRock Classes to base64 and handle bytes
  var frJava = JavaImporter(
    org.forgerock.util.encode.Base64,
    java.lang.String
  );
  logger.warning("MessageBird SMS OTP Sender: start");
  //We check if the user already started authentication and check if they have a phone number. This relies on Identify Existing User
  //For IDC, we replace the <username> with <_id> attribute for uniqueness
  //sharedState and idRepository are ForgeRock bindings from Java injected to this JavaScript Engine
  var username = sharedState.get('username') || sharedState.get('objectAttributes').get('userName')
  var id = sharedState.get('_id')
  var telephoneNumber = idRepository.getAttribute(id, 'telephoneNumber').iterator().hasNext() || sharedState.get('objectAttributes').get('telephoneNumber')
  if (username && telephoneNumber || id && telephoneNumber) {
    /* BEGIN SCRIPT CONFIGURATION
     *
     * REPLACE WITH YOUR OWN MessageBird SETTINGS. In productions these values can be stored in secrets
     */
    // var MessageBird_API_SID = '';
    var ACCESS_KEY = '';
    var ORIGINATOR = '';
    /*
     * END SCRIPT CONFIGURATION
     */

    // MessageBird SMS Message API Configuration
    // Change <username> var to id in IDC
    var MESSAGE_URL = 'https://rest.messagebird.com/messages';
    var RECIPIENTS = idRepository.getAttribute(id, 'telephoneNumber').iterator().hasNext() ? idRepository.getAttribute(id, 'telephoneNumber').iterator().next() : sharedState.get('objectAttributes').get('telephoneNumber')
    var MESSAGE_BODY = 'SMS code for ' + username + ': ' + transientState.get('oneTimePassword');
    //logger.warning("MessageBird SMS OTP Sender: To: ".concat(MessageBird_API_TO));
    //logger.warning("MessageBird SMS OTP Sender: Message: ".concat(MessageBird_API_BODY));
    var AUTHZ = 'AccessKey ' + ACCESS_KEY;
    //logger.warning("MessageBird SMS OTP Sender: AUTHZ - ".concat(AUTHZ));
    //frFetch is just an API wrapper that makes it easier to handle HTTP requests. The function is defined at the bottom
    var response = frFetch(MESSAGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        Authorization: AUTHZ,
      },
      body: {
        originator: ORIGINATOR,
        body: MESSAGE_BODY,
        recipients: RECIPIENTS,
      },
    });
    var result = JSON.parse(response.getEntity().getString());
    //logger.warning("MessageBird SMS OTP Sender: JSON result: " + JSON.stringify(result));

    if (result['errors']) {
      outcome = 'failed';
      logger.error('MessageBird SMS OTP Sender: error_code = ' + result['errors'][0]['code']);
      logger.error('MessageBird SMS OTP Sender: error_description = ' + result['errors'][0]['description']);
      logger.error('MessageBird SMS OTP Sender: outcome = failed');
    } else if (result['code']) {
      outcome = 'failed';
      logger.error('MessageBird SMS OTP Sender: code = ' + result['code']);
      logger.error('MessageBird SMS OTP Sender: message = ' + result['message']);
    } else {
      outcome = 'sent';
      logger.warning('MessageBird SMS OTP Sender: outcome = sent');
    }
  } else {
    outcome = 'failed';
    logger.error("MessageBird SMS OTP Sender: No user or phone number found! Use 'Identify Existing User node before this script to populate the user's _id in shared state!'");
    logger.error('MessageBird SMS OTP Sender: outcome = failed');
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