/**
 * Author: jon.knight@forgerock.com
 * Description: This script perform pass-through authentication against SalesForce SOAP API.
 * outcomes: failed, success
 */
(function () {
  outcome = "failed";

  // CUSTOMER'S Salesforce configuration
  var SFDC_BASE_URL = '';
  var SOAP_ENDPOINT = SFDC_BASE_URL + '/services/Soap/c/53.0';
  var SF_ORG_ID = '';

  var soapTemplate = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:enterprise.soap.sforce.com"><soapenv:Header><urn:LoginScopeHeader><urn:organizationId>'+SF_ORG_ID+'</urn:organizationId></urn:LoginScopeHeader></soapenv:Header><soapenv:Body><urn:login><urn:username>___USERNAME___</urn:username><urn:password>___PASSWORD___</urn:password></urn:login></soapenv:Body></soapenv:Envelope>';
  var username = sharedState.get("username");
  var password = transientState.get("password");

  var soapRequest = soapTemplate.replace("___USERNAME___", username).replace("___PASSWORD___", password);

  var request = new org.forgerock.http.protocol.Request();
  request.setMethod('POST');
  request.setUri(SOAP_ENDPOINT);
  request.getHeaders().add("SOAPAction","''");
  request.getHeaders().add("Content-Type","text/xml");
  request.getEntity().setString(soapRequest);

  var response = httpClient.send(request).get();
  var status = response.getStatus().getCode();

  if (status == 200) {
      var reg = new RegExp(/<userName>((.|\n)*?)<\/userName>/g);
      var m = reg.exec(response.getEntity().getString());
      sharedState.put("userName", m[1]);
      outcome = "success";
  }
}())