// Every icon PNG in assets/, from the one vector in this folder.
//
// The brand file draws the mark twice side by side -- once on the dark
// background and once on the light one -- which is a fine way to look at a pair
// but not a thing any platform can consume. This takes the geometry out of it
// and renders each slot at the size and on the background that slot expects.
//
// Not a build step and not a dependency: the mark changes about as often as the
// company name does. When it does:
//
//   npm i --no-save sharp && node assets/brand/build-icons.mjs
//
// Run from expo-app/. Re-run after editing BOOKD_app_icon.svg.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const out = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = 1024;

// Taken from BOOKD_app_icon.svg. The squircle radius, the ring's stroke and the
// swoosh are the mark; only the two colours change between appearances.
const RADIUS = 210;
const RING = { cx: 512, cy: 512, r: 260, width: 108 };
const SWOOSH = 'M540.6,419l209-209h97l-169,285-90,48-47-124Z';
const VOLT = '#c8ff3d';
const INK = '#0b0e11';
const BONE = '#dee0da';
const SLATE = '#212121';

// The mark's own bounding box: the ring's outer edge on three sides, the
// swoosh's tip on the fourth. Needed because Android only guarantees the middle
// 2/3 of an adaptive icon is visible -- the launcher may mask the rest into a
// circle, a squircle or a teardrop, so anything outside that circle is a corner
// somebody's phone will cut off.
const BOX = { x0: RING.cx - RING.r - RING.width / 2, y0: RING.cy - RING.r - RING.width / 2,
              x1: 846.6, y1: RING.cy + RING.r + RING.width / 2 };
const CENTRE = { x: (BOX.x0 + BOX.x1) / 2, y: (BOX.y0 + BOX.y1) / 2 };
const SAFE = 0.72; // corner-to-centre 451px * 0.72 = 325 < the 341px safe radius
// The notification icon is the opposite problem: Android draws it at 24dp in a
// crowded status bar, so it fills its canvas instead of hiding inside a mask.
const BLEED = (S / (BOX.x1 - BOX.x0)) * 0.95;

const mark = (ring, swoosh, scale) => {
  const inner = `<circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.r}" fill="none"`
    + ` stroke="${ring}" stroke-width="${RING.width}"/>`
    + `<path d="${SWOOSH}" fill="${swoosh}"/>`;
  if (!scale) return inner;
  return `<g transform="translate(${RING.cx},${RING.cy}) scale(${scale})`
    + ` translate(${-CENTRE.x},${-CENTRE.y})">${inner}</g>`;
};

const svg = (body) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">${body}</svg>`,
);

// A rounded rectangle, not a plain one: iOS masks the icon itself, but the web
// favicon and the Play Store listing show exactly what we give them.
const tile = (bg) => `<rect width="${S}" height="${S}" rx="${RADIUS}" ry="${RADIUS}" fill="${bg}"/>`;

const png = async (name, body, size = S) => {
  const buf = await sharp(svg(body), { density: 384 }).resize(size, size).png().toBuffer();
  const target = join(out, name);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buf);
  console.log(`${name}  ${size}x${size}  ${(buf.length / 1024).toFixed(1)} kB`);
};

await Promise.all([
  // The app icon, per appearance. iOS picks between them; everywhere else gets
  // the dark one, which is the mark as it was drawn.
  png('icon.png', tile(INK) + mark('#fff', VOLT)),
  png('icon-light.png', tile(BONE) + mark(SLATE, VOLT)),
  // iOS's tinted appearance recolours by brightness, so the volt has to become
  // a grey that is still darker than the ring or the swoosh disappears into it.
  png('icon-tinted.png', tile(INK) + mark('#fff', '#9a9a9a')),

  // Android draws the background and the foreground as separate layers and
  // animates them apart, so the foreground is the mark alone, inside the safe
  // circle. The background is a flat colour set in app.json.
  png('android-icon-foreground.png', mark('#fff', VOLT, SAFE)),
  // Themed icons: Android throws away our colours and tints the silhouette, so
  // this is one flat white shape. The swoosh crosses the ring rather than
  // sitting inside it, which is what keeps it readable once both are one colour.
  png('android-icon-monochrome.png', mark('#fff', '#fff', SAFE)),

  // Splash: no tile, because expo-splash-screen paints the background itself.
  png('splash-icon-dark.png', mark('#fff', VOLT)),
  png('splash-icon-light.png', mark(SLATE, VOLT)),

  // Android strips every colour out of a status-bar icon and draws the alpha
  // channel in one tint, so this is white-on-transparent by necessity, not
  // taste. It is its own file rather than the launcher's monochrome one: that
  // one is 1024px and inset for the launcher mask, which at 24dp leaves a
  // pinprick in the middle of an empty square.
  png('notification-icon.png', mark('#fff', '#fff', BLEED), 96),

  // Browsers show the favicon on their own chrome, which is light as often as
  // it is dark, so it keeps its tile.
  png('favicon.png', tile(INK) + mark('#fff', VOLT), 196),

  // The web app, installed. iOS ignores the manifest's icons and reads the
  // apple-touch-icon link instead, and it does not round the corners itself, so
  // all three keep the tile.
  png('web/apple-touch-icon.png', tile(INK) + mark('#fff', VOLT), 180),
  png('web/icon-192.png', tile(INK) + mark('#fff', VOLT), 192),
  png('web/icon-512.png', tile(INK) + mark('#fff', VOLT), 512),
]);
