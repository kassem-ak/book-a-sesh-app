const { withAndroidManifest, withAppBuildGradle } = require('expo/config-plugins');

// The android/ directory is generated and gitignored, so anything hand-edited
// there disappears on the next `expo prebuild`. Two changes have to survive:
//
//  1. The `bookd://` intent filter. Without it Android has no handler for the
//     OAuth redirect, so `WebBrowser.openAuthSessionAsync` never gets its
//     callback and SSO hangs after the provider approves.
//  2. `debuggableVariants = []`, which makes the debug variant embed the JS
//     bundle. Release builds cannot run on this machine because the C++ codegen
//     paths overflow the Windows 260-character path limit, so the standalone
//     APK is produced from the debug variant instead.

const SCHEME = 'bookd';

function addSchemeIntentFilter(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    const activity = app?.activity?.find(
      (a) => a.$['android:name'] === '.MainActivity',
    );
    if (!activity) return cfg;

    activity['intent-filter'] = activity['intent-filter'] ?? [];
    const already = activity['intent-filter'].some((f) =>
      f.data?.some((d) => d.$?.['android:scheme'] === SCHEME),
    );
    if (already) return cfg;

    activity['intent-filter'].push({
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
      ],
      data: [{ $: { 'android:scheme': SCHEME } }],
    });
    return cfg;
  });
}

function embedBundleInDebug(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes('debuggableVariants = []')) return cfg;
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /^(\s*)\/\/ debuggableVariants = .*$/m,
      '$1debuggableVariants = []',
    );
    return cfg;
  });
}

module.exports = (config) => embedBundleInDebug(addSchemeIntentFilter(config));
