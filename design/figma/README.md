# Spotter Figma Design Files

This folder contains Figma-importable design artifacts generated for the Spotter mobile app.

## Files

- `spotter-figma-board.svg` - 16 mobile frames covering core tabs, booking, shop, community, chat, profile, accounting, and one light-theme example.
- `spotter-design-tokens.json` - colors, typography, radius, spacing, and frame tokens in a design-token-friendly JSON shape.
- `generate-figma-assets.mjs` - the generator used to recreate both files.

## Import Into Figma

1. Open Figma and create a new design file.
2. Drag `spotter-figma-board.svg` onto the canvas, or use `File > Place image`.
3. Install or activate the fonts used by the app: Archivo and Hanken Grotesk. Local font files are in `app/src/main/res/font/`.
4. Import `spotter-design-tokens.json` with your preferred tokens/variables plugin, or use it as a manual reference when creating Figma variables.

Figma's native `.fig` file format is proprietary, so this repo generates SVG and token JSON instead. The SVG imports as editable vector/text layers in Figma, and the token JSON keeps the design system portable.

## Regenerate

```powershell
node design\figma\generate-figma-assets.mjs
```

The original HTML handoff remains the behavioral source of truth in `extracted/design_handoff_spotter_app/`.
