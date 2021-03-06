/**
 * Author: ali.falahi@forgerock.com.
 * Credits: https://community.shopify.com/c/shopify-apis-and-sdks/multipass-integration-token-generation-in-java/td-p/197796
 * The script utilizes Shopify Multipass to log users to a Shopify store using ForgeRock's established sessions/registrations
 * This script was tested on AM 7.1 and will not work in identity cloud until the classes are whitelisted
 * output = true
 * 
 * DISCLAIMER: This code is provided to you expressly as an example  (“Sample Code”). 
 * It is the responsibility of the individual recipient user, in his/her sole discretion, to diligence such Sample Code for accuracy, completeness, security, and final determination for appropriateness of use.
 * ANY SAMPLE CODE IS PROVIDED ON AN “AS IS” IS BASIS, WITHOUT WARRANTY OF ANY KIND. 
 * FORGEROCK AND ITS LICENSORS EXPRESSLY DISCLAIM ALL WARRANTIES,  WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION, THE IMPLIED WARRANTIES  OF MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.
 * FORGEROCK SHALL NOT HAVE ANY LIABILITY ARISING OUT OF OR RELATING TO ANY USE, IMPLEMENTATION, INTEGRATION, OR CONFIGURATION OF ANY SAMPLE CODE IN ANY PRODUCTION ENVIRONMENT OR FOR ANY COMMERCIAL DEPLOYMENT(S).
 */
(function () {
  var fr = JavaImporter(
    javax.crypto.Cipher,
    javax.crypto.Mac,
    javax.crypto.spec.SecretKeySpec,
    java.security.MessageDigest,
    java.lang.String,
    java.security.SecureRandom,
    javax.crypto.spec.IvParameterSpec,
    java.io.ByteArrayOutputStream,
    org.forgerock.util.encode.Base64
  );

  //You'll need your shopify Multipass secret and your shopify store hostname/domain
  //https://shopify.dev/api/multipass#1-enable-multipass-login-in-the-shopify-admin
  var multipassSecret = '';
  var shopifyDomain = '';

  /**
   * @username - Used for StandAlone AM deployment
   * @id - Used for platform/cloud deployment (cloud requires class whitelist request)
   */

  var username = sharedState.get('username');
  var id = sharedState.get('_id');

  //You'll need to wrap idpRepository in the JS String interface or else you'll get an error: Access to Java class \"java.lang.Class\" is prohibited
  //additional properties: https://shopify.dev/api/multipass#2-encode-your-customer-information-using-json
  var shopifyToken = {
    email: String(idRepository.getAttribute(username, 'mail').toArray()[0]),
    created_at: new Date().toISOString()
  };
  if(requestParameters.get('return_to') && String(requestParameters.get('return_to').get(0))) {
    shopifyToken['return_to']= String(requestParameters.get('return_to').get(0));
  }
  var jsonToken = JSON.stringify(shopifyToken);

  //Derive the Encryption and Signing keys
  var md = fr.MessageDigest.getInstance('SHA-256');
  var hash = md.digest(new fr.String(multipassSecret).getBytes('UTF-8'));
  var encryptionKey = hash.slice(0, 16);
  var signatureKey = hash.slice(16, 32);

  //Encrypt the JSON string and create the cipher text, then add the IV and the cipher text to a byte array
  var secureRandom = new fr.SecureRandom();
  /**
   * This function will produce a byte array for our Initialization Vector
   * @param {number} length
   * @returns {array} ByteArray
   */
  function byteArray(length) {
    var result = '';
    var byteArray = [];
    var characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charLength));
      byteArray.push(parseInt(result.charCodeAt(i)));
    }
    return byteArray;
  }
  var iv = byteArray(16);
  secureRandom.nextBytes(iv);
  var ivSpec = new fr.IvParameterSpec(iv);
  var sKeySpec = new fr.SecretKeySpec(encryptionKey, 'AES');
  var cipher = fr.Cipher.getInstance('AES/CBC/PKCS5PADDING');
  cipher.init(fr.Cipher.ENCRYPT_MODE, sKeySpec, ivSpec);

  var byteArray = new fr.ByteArrayOutputStream();
  byteArray.write(iv);
  byteArray.write(cipher.doFinal(new fr.String(jsonToken).getBytes()));
  var cipherText = byteArray.toByteArray();

  //Sign the cipher text with HMACSHA 256 with the signing key and add everything to the final byte array
  var hmacSHA256 = fr.Mac.getInstance('HmacSHA256');
  var signingKey = new fr.SecretKeySpec(signatureKey, 'HmacSHA256');
  hmacSHA256.init(signingKey);
  var signature = hmacSHA256.doFinal(cipherText);

  byteArray.reset();
  byteArray.write(cipherText);
  byteArray.write(signature);

  //base64 encode the byte array, and remove non url safe symbols
  var base64Token = fr.Base64.encode(byteArray.toByteArray());
  var urlToken = String(base64Token).replace(/\+/g, '-').replace(/\//g, '_');
  sharedState.put('successUrl', 'https://' + shopifyDomain + '/account/login/multipass/' + urlToken);

  outcome = 'true';
})();