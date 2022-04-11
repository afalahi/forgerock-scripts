// GeoVelocity / Impossible Journey authentication script
//
// Outcomes for this script are:
//     "noLocation" - the device's current location is not available in sharedState
//     "noHistory"  - the user's profile doesn't yet contain previous device history
//     "ok"         - the user's geovelocity is lower than the max acceptable speed
//	   "impossible" - the user's geovelocity exceeds max acceptable speed
(function () {
  MAX_VELOCITY = 300;
  function calculateDistance(first, second) {
    var factor = Math.PI / 180,
      theta,
      dist;
    function degreesToRadians(degrees) {
      return degrees * factor;
    }
    function radiansToDegrees(radians) {
      return radians / factor;
    }
    theta = first.longitude - second.longitude;
    dist =
      Math.sin(degreesToRadians(first.latitude)) *
        Math.sin(degreesToRadians(second.latitude)) +
      Math.cos(degreesToRadians(first.latitude)) *
        Math.cos(degreesToRadians(second.latitude)) *
        Math.cos(degreesToRadians(theta));
    dist = Math.acos(dist);
    dist = radiansToDegrees(dist);
    dist = dist * 60 * 1.1515;
    return dist;
  }
  var username = sharedState.get('_id');
  //devices = idRepository.getAttribute(username, "deviceProfiles").toArray();
  loginHistory = idRepository.getAttribute(username, 'fr-attr-imulti1').toArray();
  if (loginHistory.length == 0) outcome = 'noHistory';
  else {
    outcome = 'noLocation';
    if (
      sharedState.containsKey('forgeRock.device.profile') &&
      sharedState.get('forgeRock.device.profile').containsKey('location')
    ) {
      var thisDevice = sharedState.get('forgeRock.device.profile');
      outcome = 'ok';
      var now = new Date();
      for (i = 0; i < loginHistory.length; i++) {
        var entry = JSON.parse(loginHistory[i]);
        var lastSelectedDate = entry['lastSelectedDate'];
        var lastLocation = entry['location'];
        var timeDiff = now - parseInt(lastSelectedDate);
        var distance = calculateDistance(
          {
            latitude: thisDevice.get('location').get('latitude'),
            longitude: thisDevice.get('location').get('longitude'),
          },
          lastLocation
        );
        velocity = distance / (timeDiff / 3600000);
        if (velocity > MAX_VELOCITY) outcome = 'impossible';
      }
    }
  }
})()