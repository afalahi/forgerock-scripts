/**
 * outcomes: true
 */
(function () {
  outcome = "Default";
  var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    javax.security.auth.callback.ChoiceCallback
  )
  /* define a user attribute to test
    see https://backstage.forgerock.com/docs/idcloud/latest/identities/user-profile-properties-attributes-reference.html
    for an attribute mapping reference */
  var attributeToTest = "fr-attr-imulti2";
  // get the value of the logged in user's attribute
  //var username = sharedState.get("username");
  var username = sharedState.get("_id")
  var userAttributeValue = idRepository.getAttribute(username, attributeToTest).toString();
  var userAttributeArray = idRepository.getAttribute(username, attributeToTest);
    // Add entry to multi value
  var entries = idRepository.getAttribute(username, attributeToTest).toArray();
  var choices = [];
  entries.forEach(function (entry, index) {
      choices.push(entry);
      logger.error("ThemeSwitcherGetThemeName: returned entries " + index + ': ' + entry);
  });
  //Callback to present and retrieve selected org and set
  //selected theme for setting in the next node
  if (callbacks.isEmpty()) {
    action = fr.Action.send(
    new fr.ChoiceCallback("Organization to invite user to", choices, 0, false)).build();
  } else {
      var selectedThemeIndex = callbacks.get(0).getSelectedIndexes()[0];
      logger.error("Themeswitcher: selected theme name equals: " + selectedThemeIndex);
      var selectedThemeName = entries[selectedThemeIndex];
      sharedState.put("selectedTheme", selectedThemeName);
      logger.error("Themeswitcher: selected theme name equals: " + selectedThemeName);
      action = fr.Action.goTo(selectedThemeName).build();
  }
}())