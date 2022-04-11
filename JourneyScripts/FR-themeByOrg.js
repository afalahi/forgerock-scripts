// not setting a theme by default
var setTheme = false;
/* define a user attribute to test
   see https://backstage.forgerock.com/docs/idcloud/latest/identities/user-profile-properties-attributes-reference.html
   for an attribute mapping reference */
var attributeToTest = 'fr-idm-managed-organization-member';
// define the value of the user attribute to test (aka uuid of an org/role/authzRole/etc...)
var testValue = '6e1e7356-9f2c-48d7-b106-c27f0b0b5b1c';
// define a themeId to set if testValue is found
var themeId = 'Contrast';
// get the value of the logged in user's attribute
var username = sharedState.get('_id');
var userAttributeValue = idRepository.getAttribute(username, attributeToTest);
/* If there is a userAttributeValue turn it into an array, loop over each value, stringify the value,
   test using the uid regex below which looks into a string like this =>

   '{"firstResourceCollection":"managed/user","firstResourceId":"9e3ccb14-9842-41ce-a24e-ddcfe9a1e800",
   "firstPropertyName":"memberOfOrg","secondResourceCollection":"managed/organization",
   "secondResourceId":"014793c9-4c64-4397-89dc-98e0466b62c6","secondPropertyName":"members",
   "properties":{},"_rev":"a4dc9c49-983d-497b-ab7d-3f53f5f1a40b-20782","_id":"6903d039-b7b2-48c7-b339-958cdac11867"}
   uid=014793c9-4c64-4397-89dc-98e0466b62c6,ou=organization,ou=managed,dc=openidm,dc=forgerock,dc=io'

   for the string 'uid=6e1e7356-9f2c-48d7-b106-c27f0b0b5b1c'

   If that string exists further extract the uuid then compare it to the testValue to determine whether or not to
   change the themeId.
   If there is no regex match it means the value is not an object like the above example it's just a string.
   In that case test the string against the test value to determine whether or not to change the themeId.*/
if (userAttributeValue) {
  userAttributeValue.toArray().forEach(function (val) {
    var uidRegex =
      /uid=(\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b)/;
    var strVal = String(val);
    var uid = strVal.match(uidRegex);

    if ((uid && uid[1] === testValue) || strVal === testValue) {
      setTheme = true;
    }
  });
}

var fr = JavaImporter(
  org.forgerock.openam.auth.node.api.Action,
  org.forgerock.openam.authentication.callbacks.PollingWaitCallback
);

if (callbacks.isEmpty()) {
  if (setTheme) {
    action = fr.Action.send(new fr.PollingWaitCallback('0', 'Please wait ...'))
      .withStage('themeId=' + themeId)
      .build();
  } else {
    action = Action.send(
      new fr.PollingWaitCallback('0', 'Please wait ...')
    ).build();
  }
} else {
  action = fr.Action.goTo('true').build();
}
