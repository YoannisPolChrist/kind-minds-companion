const { withAndroidManifest } = require('@expo/config-plugins');

const withMindfulTracking = (config) => {
    return withAndroidManifest(config, async (config) => {
        const androidManifest = config.modResults;
        const manifestInfo = androidManifest.manifest;

        if (!manifestInfo['uses-permission']) {
            manifestInfo['uses-permission'] = [];
        }

        // Safely add permissions if they don't exist
        const addPermission = (name) => {
            if (!manifestInfo['uses-permission'].some(p => p.$['android:name'] === name)) {
                manifestInfo['uses-permission'].push({ $: { 'android:name': name } });
            }
        };

        addPermission('android.permission.PACKAGE_USAGE_STATS');
        addPermission('android.permission.SYSTEM_ALERT_WINDOW');

        const application = manifestInfo.application[0];
        if (!application.service) {
            application.service = [];
        }

        // Register Accessibility Service
        const hasService = application.service.some(s => s.$['android:name'] === 'expo.modules.mindfultracking.MindfulAccessibilityService');

        if (!hasService) {
            application.service.push({
                $: {
                    'android:name': 'expo.modules.mindfultracking.MindfulAccessibilityService',
                    'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
                    'android:exported': 'true'
                },
                'intent-filter': [{
                    action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }]
                }],
                'meta-data': [{
                    $: {
                        'android:name': 'android.accessibilityservice',
                        'android:resource': '@xml/accessibility_service_config'
                    }
                }]
            });
        }

        return config;
    });
};

module.exports = withMindfulTracking;
