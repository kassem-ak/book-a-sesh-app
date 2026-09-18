// Dynamic config. Everything static still lives in app.json, which Expo reads
// first and hands to this function as `config`; this file only adds what has to
// come from the environment at build time.
//
// The Google Maps key cannot sit in app.json: it differs per environment, and
// committing it would publish a key tied to a billing account. react-native-maps
// needs it baked into the native project (an Android manifest meta-data entry
// and an iOS AppDelegate call), so it must be present when `expo prebuild` runs
// rather than read at runtime like the EXPO_PUBLIC_* values.
//
// Set it before building, or in EAS:
//   eas env:set --name GOOGLE_MAPS_API_KEY --value "..." --environment production
//
// Deliberately NOT prefixed EXPO_PUBLIC_: nothing in the JS bundle needs the
// key. The plugin puts it in the native project, and the app only needs to know
// WHETHER it was configured, which travels in `extra` below.
//
// Restrict the key in the Google Cloud console before shipping: Android by
// package name + SHA-1, iOS by bundle id. An unrestricted Maps key found in an
// APK can be used by anyone, billed to you.
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

module.exports = ({ config }) => {
  // Without a key, leave the plugin out entirely. Adding it with an empty key
  // produces a build whose map is a blank grey grid with "Authorization
  // failure" only in the device log -- a silent break that looks like a bug in
  // our code. Absent, react-native-maps simply is not configured, which is
  // honest and obvious.
  const plugins = [...(config.plugins ?? [])];
  if (!GOOGLE_MAPS_API_KEY) {
    // Said here, at prebuild/build time, because the difference is otherwise
    // invisible until someone opens the Maps tab on a phone.
    console.warn(
      '[app.config] GOOGLE_MAPS_API_KEY is not set - the native build '
      + 'will use the raster tile map instead of Google Maps. See expo-app/DEPLOY.md.',
    );
  }
  if (GOOGLE_MAPS_API_KEY) {
    plugins.push([
      'react-native-maps',
      {
        androidGoogleMapsApiKey: GOOGLE_MAPS_API_KEY,
        iosGoogleMapsApiKey: GOOGLE_MAPS_API_KEY,
      },
    ]);
  }

  return {
    ...config,
    plugins,
    extra: {
      ...(config.extra ?? {}),
      // The renderer decision, resolved at build time and read at runtime via
      // expo-constants. NOT the key itself: the key belongs in the native
      // project (manifest / AppDelegate), which the plugin above handles.
      //
      // This is deliberately not a process.env read in the app code. Metro
      // inlines EXPO_PUBLIC_* from whatever environment the bundler subprocess
      // happens to have, and Gradle's embed step did not have it -- the var
      // silently became `undefined` and the map fell back to raster tiles in a
      // build that otherwise looked fine. app.extra travels with the config
      // itself, so it cannot disagree with the plugin that consumed the key.
      googleMapsConfigured: Boolean(GOOGLE_MAPS_API_KEY),
    },
  };
};
