// Custom HealthKit config plugin that ONLY adds basic HealthKit entitlement.
// The react-native-health plugin always adds "com.apple.developer.healthkit.access"
// which requires Apple approval and a paid developer account — we don't need it
// for basic step count and energy data.

const { withEntitlementsPlist, withInfoPlist } = require("@expo/config-plugins");

function withHealthKit(config, { healthSharePermission, healthUpdatePermission } = {}) {
  // Add the Info.plist usage descriptions (required by Apple)
  config = withInfoPlist(config, (config) => {
    config.modResults.NSHealthShareUsageDescription =
      healthSharePermission || "Allow $(PRODUCT_NAME) to read health data";
    config.modResults.NSHealthUpdateUsageDescription =
      healthUpdatePermission || "Allow $(PRODUCT_NAME) to write health data";
    return config;
  });

  // Add ONLY the basic HealthKit entitlement — no healthkit.access
  config = withEntitlementsPlist(config, (config) => {
    config.modResults["com.apple.developer.healthkit"] = true;
    // Explicitly remove healthkit.access if it was added by another plugin
    delete config.modResults["com.apple.developer.healthkit.access"];
    return config;
  });

  return config;
}

module.exports = withHealthKit;