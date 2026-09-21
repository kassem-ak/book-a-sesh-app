// Put the web app's manifest, icons and head tags into an export.
//
// There is no document head to edit at build time: Expo's +html.tsx hook comes
// with expo-router, and this app does not use a router. So the export is
// patched afterwards. The alternative is adding a router to place two <link>
// tags, which is a large change for a small one.
//
// Run from expo-app/, after `expo export --platform web`:
//   node assets/web/link-manifest.mjs
//
// Idempotent by refusing rather than by skipping: a second run means the export
// step ran twice, and that is worth failing over.

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '../../dist');

for (const file of ['manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  copyFileSync(join(here, file), join(dist, file));
}

const head = [
  '<link rel="manifest" href="/manifest.webmanifest">',
  // iOS ignores the manifest's icons and reads this instead.
  '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  // Safari colours an installed app's status bar from this, not from
  // theme_color.
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="theme-color" content="#0D0E11">',
].join('');

const file = join(dist, 'index.html');
const html = readFileSync(file, 'utf8');
if (html.includes('rel="manifest"')) throw new Error('dist/index.html already links a manifest');
if (!html.includes('</head>')) throw new Error('no </head> in the export to patch');
writeFileSync(file, html.replace('</head>', `${head}</head>`));
console.log('linked the manifest, the apple-touch-icon and the theme colour');
