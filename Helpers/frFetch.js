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
  } else if (options.headers['Content-Type'] == 'application/json' && options.method == 'POST') {
    request.getEntity().setJson(options.body);
  }
  var response = httpClient.send(request).get();
  return response;
}