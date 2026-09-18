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
    // Say it here, at prebuild/build time, because the failure it prevents is
    // invisible: a native build without the key renders a blank grey map and
    // logs "Authorization failure" only to the device console.
    console.warn(
      '[app.config] GOOGLE_MAPS_API_KEY is not set - the native map will not render. '
      + 'Web is unaffected (it uses the raster tile map). See expo-app/DEPLOY.md.',
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
    extra: { ...(config.extra ?? {}) },
  };
};
