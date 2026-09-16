# Design artboard extraction

Source: `C:\Users\kasse\Documents\Claued proj\Book-a-sesh\design\svg\`.

**25 artboards · 35 distinct declared hex colour values · 7 unique navigation-tab labels across 3 five-item variations.**

## Reading conventions and limits

- This is an extraction of the SVG files only. Screen names describe supplied content; controls are identified by their drawn appearance. No routes, click handlers, transitions or implementation behavior are inferred.
- All coordinates and geometry are SVG user units in the original artboard coordinate system. Each SVG supplies a viewBox, not a physical screen size. Font sizes are the literal CSS px values. The 24 phone compositions use nominal 390 × 844 geometry; the navigation comparison artboard is separate.
- Text tables include external artboard headings, status text and red designer notes, as well as screen content. They sort by the exact text baseline y, then x for ties; near-aligned labels can therefore appear in a different order from a visual left-to-right row. Parent and nested tspan fragments are joined only on the same baseline. Explicit line breaks remain separate entries. No missing spaces, spelling, capitalization, punctuation or duplicate labels are repaired.
- Quoted strings preserve source leading/trailing and repeated spaces. T numbers identify text lines within one artboard; E numbers are zero-based XML element positions in document order, including definitions. They are report references, not invented SVG IDs.
- All source text is inventoried even when clipped, dimmed or covered by later shapes. Such source-only or partially visible content is flagged where identifiable. Exact glyph clipping cannot be quantified without the named fonts. Text converted to outlines is separately identified; no font metadata is invented for path glyphs.
- The colour count includes the artboard backdrops, annotations, reusable patterns, gradient stops, and declared paints covered by later elements. It counts base colour values, not alpha-composited pixel colours. Source `#fff` = `#ffffff`; source `#000` = `#000000`; shorthand and expanded spelling are not separate colours. Implicit black fill is explicitly marked and does not add a new base colour to the 35-value palette.
- No embedded photographs or raster image elements occur in these files. Diagonal stripes and the map grid are actual vector patterns. There are no SVG animation elements; animation/scroll behavior is only present as literal designer notes.

### Font reference keys

| Key | Exact font-family declaration |
| --- | --- |
| F1 | `ArchivoExtraCondensed-Bold, 'Archivo ExtraCondensed'` |
| F2 | `ArchivoRoman-Black, Archivo` |
| F3 | `ArchivoRoman-Bold, Archivo` |
| F4 | `ArchivoRoman-ExtraBold, Archivo` |
| F5 | `ArchivoRoman-Regular, Archivo` |
| F6 | `ArchivoRoman-Thin, Archivo` |
| F7 | `HankenGrotesk-Bold, 'Hanken Grotesk'` |
| F8 | `HankenGrotesk-Regular, 'Hanken Grotesk'` |
| F9 | `MyriadPro-Regular, 'Myriad Pro'` |

## Artboards
## 1. Calender 1.svg

**Screen:** Book Marcus — month calendar, time slot, package and payment summary. **Module:** Booking/Calendar.

**ViewBox:** `0 0 472.81 1213.97`. **Source:** [Calender 1.svg](../design/svg/Calender%201.svg).

### Layout, dimensions and spacing

- External “Calender” heading, then external “Calender ” caption; phone begins at (46.12, 265.76). Status bar → back control and “Book Marcus” → “JULY 2026” → weekday row → five date rows → “TIME SLOT” → two rows of three time chips → “PACKAGE” → single-session card → total → “Confirm and pay”.
- Phone base is 390 × 844, rx/ry 28; inner content x=64.12, width 354, giving 18-unit side margins. Dates are 42 × 40, rx/ry 13, on 50-unit horizontal and 47-unit vertical pitches (8- and 7-unit gaps). “2” has a lime background; “3”, “10”, “17”, “24” have darker tiles and muted text; “31” has a normal tile but muted text.
- Time chips are 106 × 34, curved ends of 17, at y=719.76 and 765.76; horizontal pitch 118. “6:30 PM” is lime. Package card 354 × 64, radius 16; total 354 × 54, radius 16; primary button 354 × 52, radius 15.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E226) | 67.64 | 149.18 | `"Calender"` | F4 40.57px; #f2f3f5 | Outside phone, above frame; scale(.86 1) |
| T2 (E229) | 222.91 | 142.54 | `"Calender "` | F3 19px; #f2f3f5 | Outside phone, above frame |
| T3 (E11) | 290.76 | 70.12 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E21) | 343.76 | 118.12 | `"Book Marcus"` | F3 19px; #f2f3f5 |  |
| T5 (E27) | 391.76 | 64.12 | `"JULY 2026"` | F3 12px; #6b7280 |  |
| T6 (E32) | 421.76 | 84.54 | `"M"` | F3 11px; #6b7280 |  |
| T7 (E34) | 421.76 | 135.76 | `"T"` | F3 11px; #6b7280 |  |
| T8 (E36) | 421.76 | 183.93 | `"W"` | F3 11px; #6b7280 |  |
| T9 (E38) | 421.76 | 235.76 | `"T"` | F3 11px; #6b7280 |  |
| T10 (E40) | 421.76 | 285.76 | `"F"` | F3 11px; #6b7280 |  |
| T11 (E42) | 421.76 | 335.45 | `"S"` | F3 11px; #6b7280 |  |
| T12 (E44) | 421.76 | 385.45 | `"S"` | F3 11px; #6b7280 |  |
| T13 (E48) | 462.76 | 83.51 | `"1"` | F3 13px; #f2f3f5 |  |
| T14 (E52) | 462.76 | 133.51 | `"2"` | F3 13px; #0d0e11 |  |
| T15 (E56) | 462.76 | 183.51 | `"3"` | F3 13px; #6b7280 |  |
| T16 (E60) | 462.76 | 233.51 | `"4"` | F3 13px; #f2f3f5 |  |
| T17 (E64) | 462.76 | 283.51 | `"5"` | F3 13px; #f2f3f5 |  |
| T18 (E68) | 462.76 | 333.51 | `"6"` | F3 13px; #f2f3f5 |  |
| T19 (E72) | 462.76 | 383.51 | `"7"` | F3 13px; #f2f3f5 |  |
| T20 (E76) | 509.76 | 83.51 | `"8"` | F3 13px; #f2f3f5 |  |
| T21 (E80) | 509.76 | 133.51 | `"9"` | F3 13px; #f2f3f5 |  |
| T22 (E84) | 509.76 | 179.89 | `"10"` | F3 13px; #6b7280 |  |
| T23 (E88) | 509.76 | 230.25 | `"11"` | F3 13px; #f2f3f5 |  |
| T24 (E92) | 509.76 | 279.89 | `"12"` | F3 13px; #f2f3f5 |  |
| T25 (E96) | 509.76 | 329.89 | `"13"` | F3 13px; #f2f3f5 |  |
| T26 (E100) | 509.76 | 379.89 | `"14"` | F3 13px; #f2f3f5 |  |
| T27 (E104) | 556.76 | 79.89 | `"15"` | F3 13px; #f2f3f5 |  |
| T28 (E108) | 556.76 | 129.89 | `"16"` | F3 13px; #f2f3f5 |  |
| T29 (E112) | 556.76 | 179.89 | `"17"` | F3 13px; #6b7280 |  |
| T30 (E116) | 556.76 | 229.89 | `"18"` | F3 13px; #f2f3f5 |  |
| T31 (E120) | 556.76 | 279.89 | `"19"` | F3 13px; #f2f3f5 |  |
| T32 (E124) | 556.76 | 329.89 | `"20"` | F3 13px; #f2f3f5 |  |
| T33 (E128) | 556.76 | 379.89 | `"21"` | F3 13px; #f2f3f5 |  |
| T34 (E132) | 603.76 | 79.89 | `"22"` | F3 13px; #f2f3f5 |  |
| T35 (E136) | 603.76 | 129.89 | `"23"` | F3 13px; #f2f3f5 |  |
| T36 (E140) | 603.76 | 179.89 | `"24"` | F3 13px; #6b7280 |  |
| T37 (E144) | 603.76 | 229.89 | `"25"` | F3 13px; #f2f3f5 |  |
| T38 (E148) | 603.76 | 279.89 | `"26"` | F3 13px; #f2f3f5 |  |
| T39 (E152) | 603.76 | 329.89 | `"27"` | F3 13px; #f2f3f5 |  |
| T40 (E156) | 603.76 | 379.89 | `"28"` | F3 13px; #f2f3f5 |  |
| T41 (E160) | 650.76 | 79.89 | `"29"` | F3 13px; #f2f3f5 |  |
| T42 (E164) | 650.76 | 129.89 | `"30"` | F3 13px; #f2f3f5 |  |
| T43 (E168) | 650.76 | 179.89 | `"31"` | F3 13px; #f2f3f5 |  |
| T44 (E170) | 703.76 | 64.12 | `"TIME SLOT"` | F3 12px; #6b7280 |  |
| T45 (E177) | 740.76 | 94.34 | `"6:30 AM"` | F3 12px; #c5cad2 |  |
| T46 (E181) | 740.76 | 212.34 | `"8:00 AM"` | F3 12px; #c5cad2 |  |
| T47 (E185) | 740.76 | 327.11 | `"12:00 PM"` | F3 12px; #c5cad2 |  |
| T48 (E189) | 786.76 | 94.45 | `"5:30 PM"` | F3 12px; #c5cad2 |  |
| T49 (E193) | 786.76 | 212.45 | `"6:30 PM"` | F3 12px; #0d0e11 |  |
| T50 (E197) | 786.76 | 330.45 | `"7:30 PM"` | F3 12px; #c5cad2 |  |
| T51 (E199) | 847.76 | 64.12 | `"PACKAGE"` | F3 12px; #6b7280 |  |
| T52 (E208) | 887.76 | 80.12 | `"Single session"` | F3 15px; #f2f3f5 |  |
| T53 (E212) | 901.76 | 365.76 | `"$45"` | F3 17px; #c6f24e |  |
| T54 (E210) | 908.76 | 80.12 | `"60 minutes - confirm and pay"` | F3 12.5px; #9ba1ac |  |
| T55 (E216) | 987.76 | 80.12 | `"Total"` | F3 14px; #f2f3f5 |  |
| T56 (E219) | 987.76 | 364.09 | `"$45"` | F3 18px; #c6f24e |  |
| T57 (E222) | 1054.7562 | 178.006 | `"Confirm and pay"` | F3 16px; #0d0e11 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T14, T49, T57<br>Shape/background fill: E9 rect |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E18 rect, E46 rect, E58 rect, E62 rect, E66 rect, E70 rect, E74 rect, E78 rect, E86 rect, E90 rect, E94 rect, E98 rect, E102 rect, E106 rect, E114 rect, E118 rect, E122 rect, E126 rect, E130 rect, E134 rect, E142 rect, E146 rect, E150 rect, E154 rect, E158 rect, E162 rect, E166 rect, E206 rect<br>Path fill: E175 start (81.12, 719.76), E179 start (199.12, 719.76), E183 start (317.12, 719.76), E187 start (81.12, 765.76), E195 start (317.12, 765.76) |
| `#1c1f26` | Shape/background fill: E54 rect, E82 rect, E110 rect, E138 rect, E214 rect |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a3f47` | Shape/background fill: E13 circle α=.65 |
| `#6b7280` | Text fill: T5, T6, T7, T8, T9, T10, T11, T12, T15, T22, T29, T36, T44, T51 |
| `#9ba1ac` | Text fill: T54 |
| `#c5cad2` | Text fill: T45, T46, T47, T48, T50 |
| `#c6f24e` | Text fill: T53, T56<br>Shape/background fill: E50 rect, E221 rect<br>Path fill: E191 start (199.12, 765.76)<br>Path stroke: E192 start (199.12, 765.76) α=.07 |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T13, T16, T17, T18, T19, T20, T21, T23, T24, T25, T26, T27, T28, T30, T31, T32, T33, T34, T35, T37, T38, T39, T40, T41, T42, T43, T52, T55<br>Shape/background fill: E17 rect<br>Border/icon stroke: E16 rect, E17 rect<br>Path stroke: E14 start (364.12, 288.76), E15 start (368.12, 292.76), E20 start (89.12, 329.76) |
| `#fff` | Border/icon stroke: E19 rect α=.07, E47 rect α=.07, E51 rect α=.07, E55 rect α=.07, E59 rect α=.07, E63 rect α=.07, E67 rect α=.07, E71 rect α=.07, E75 rect α=.07, E79 rect α=.07, E83 rect α=.07, E87 rect α=.07, E91 rect α=.07, E95 rect α=.07, E99 rect α=.07, E103 rect α=.07, E107 rect α=.07, E111 rect α=.07, E115 rect α=.07, E119 rect α=.07, E123 rect α=.07, E127 rect α=.07, E131 rect α=.07, E135 rect α=.07, E139 rect α=.07, E143 rect α=.07, E147 rect α=.07, E151 rect α=.07, E155 rect α=.07, E159 rect α=.07, E163 rect α=.07, E167 rect α=.07, E207 rect α=.07, E215 rect α=.07, E225 rect α=.12<br>Path stroke: E176 start (81.12, 719.76) α=.07, E180 start (199.12, 719.76) α=.07, E184 start (317.12, 719.76) α=.07, E188 start (81.12, 765.76) α=.07, E196 start (317.12, 765.76) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (0, 0), 474.51 × 1211.49, rx=0, ry=0 | fill #2e4949 |
| E9, E224 | rect: (46.12, 265.76), 390 × 844, rx=28, ry=28 | E9: fill #0d0e11<br>E224: fill none |
| E10 | rect: (46.12, 265.76), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E13 | circle: centre (241.12, 283.76), r=9 | fill #3a3f47; opacity .65 |
| E16 | rect: (391.12, 280.76), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E17 | rect: (411.12, 284.76), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E18, E19 | rect: (64.12, 317.76), 40 × 40, rx=12, ry=12 | E18: fill #16181d<br>E19: fill none; stroke #fff; opacity .07 |
| E46, E47 | rect: (66.12, 437.76), 42 × 40, rx=13, ry=13 | E46: fill #16181d<br>E47: fill none; stroke #fff; opacity .07 |
| E50, E51 | rect: (116.12, 437.76), 42 × 40, rx=13, ry=13 | E50: fill #c6f24e<br>E51: fill none; stroke #fff; opacity .07 |
| E54, E55 | rect: (166.12, 437.76), 42 × 40, rx=13, ry=13 | E54: fill #1c1f26<br>E55: fill none; stroke #fff; opacity .07 |
| E58, E59 | rect: (216.12, 437.76), 42 × 40, rx=13, ry=13 | E58: fill #16181d<br>E59: fill none; stroke #fff; opacity .07 |
| E62, E63 | rect: (266.12, 437.76), 42 × 40, rx=13, ry=13 | E62: fill #16181d<br>E63: fill none; stroke #fff; opacity .07 |
| E66, E67 | rect: (316.12, 437.76), 42 × 40, rx=13, ry=13 | E66: fill #16181d<br>E67: fill none; stroke #fff; opacity .07 |
| E70, E71 | rect: (366.12, 437.76), 42 × 40, rx=13, ry=13 | E70: fill #16181d<br>E71: fill none; stroke #fff; opacity .07 |
| E74, E75 | rect: (66.12, 484.76), 42 × 40, rx=13, ry=13 | E74: fill #16181d<br>E75: fill none; stroke #fff; opacity .07 |
| E78, E79 | rect: (116.12, 484.76), 42 × 40, rx=13, ry=13 | E78: fill #16181d<br>E79: fill none; stroke #fff; opacity .07 |
| E82, E83 | rect: (166.12, 484.76), 42 × 40, rx=13, ry=13 | E82: fill #1c1f26<br>E83: fill none; stroke #fff; opacity .07 |
| E86, E87 | rect: (216.12, 484.76), 42 × 40, rx=13, ry=13 | E86: fill #16181d<br>E87: fill none; stroke #fff; opacity .07 |
| E90, E91 | rect: (266.12, 484.76), 42 × 40, rx=13, ry=13 | E90: fill #16181d<br>E91: fill none; stroke #fff; opacity .07 |
| E94, E95 | rect: (316.12, 484.76), 42 × 40, rx=13, ry=13 | E94: fill #16181d<br>E95: fill none; stroke #fff; opacity .07 |
| E98, E99 | rect: (366.12, 484.76), 42 × 40, rx=13, ry=13 | E98: fill #16181d<br>E99: fill none; stroke #fff; opacity .07 |
| E102, E103 | rect: (66.12, 531.76), 42 × 40, rx=13, ry=13 | E102: fill #16181d<br>E103: fill none; stroke #fff; opacity .07 |
| E106, E107 | rect: (116.12, 531.76), 42 × 40, rx=13, ry=13 | E106: fill #16181d<br>E107: fill none; stroke #fff; opacity .07 |
| E110, E111 | rect: (166.12, 531.76), 42 × 40, rx=13, ry=13 | E110: fill #1c1f26<br>E111: fill none; stroke #fff; opacity .07 |
| E114, E115 | rect: (216.12, 531.76), 42 × 40, rx=13, ry=13 | E114: fill #16181d<br>E115: fill none; stroke #fff; opacity .07 |
| E118, E119 | rect: (266.12, 531.76), 42 × 40, rx=13, ry=13 | E118: fill #16181d<br>E119: fill none; stroke #fff; opacity .07 |
| E122, E123 | rect: (316.12, 531.76), 42 × 40, rx=13, ry=13 | E122: fill #16181d<br>E123: fill none; stroke #fff; opacity .07 |
| E126, E127 | rect: (366.12, 531.76), 42 × 40, rx=13, ry=13 | E126: fill #16181d<br>E127: fill none; stroke #fff; opacity .07 |
| E130, E131 | rect: (66.12, 578.76), 42 × 40, rx=13, ry=13 | E130: fill #16181d<br>E131: fill none; stroke #fff; opacity .07 |
| E134, E135 | rect: (116.12, 578.76), 42 × 40, rx=13, ry=13 | E134: fill #16181d<br>E135: fill none; stroke #fff; opacity .07 |
| E138, E139 | rect: (166.12, 578.76), 42 × 40, rx=13, ry=13 | E138: fill #1c1f26<br>E139: fill none; stroke #fff; opacity .07 |
| E142, E143 | rect: (216.12, 578.76), 42 × 40, rx=13, ry=13 | E142: fill #16181d<br>E143: fill none; stroke #fff; opacity .07 |
| E146, E147 | rect: (266.12, 578.76), 42 × 40, rx=13, ry=13 | E146: fill #16181d<br>E147: fill none; stroke #fff; opacity .07 |
| E150, E151 | rect: (316.12, 578.76), 42 × 40, rx=13, ry=13 | E150: fill #16181d<br>E151: fill none; stroke #fff; opacity .07 |
| E154, E155 | rect: (366.12, 578.76), 42 × 40, rx=13, ry=13 | E154: fill #16181d<br>E155: fill none; stroke #fff; opacity .07 |
| E158, E159 | rect: (66.12, 625.76), 42 × 40, rx=13, ry=13 | E158: fill #16181d<br>E159: fill none; stroke #fff; opacity .07 |
| E162, E163 | rect: (116.12, 625.76), 42 × 40, rx=13, ry=13 | E162: fill #16181d<br>E163: fill none; stroke #fff; opacity .07 |
| E166, E167 | rect: (166.12, 625.76), 42 × 40, rx=13, ry=13 | E166: fill #16181d<br>E167: fill none; stroke #fff; opacity .07 |
| E206, E207 | rect: (64.12, 863.76), 354 × 64, rx=16, ry=16 | E206: fill #16181d<br>E207: fill none; stroke #fff; opacity .07 |
| E214, E215 | rect: (64.12, 953.76), 354 × 54, rx=16, ry=16 | E214: fill #1c1f26<br>E215: fill none; stroke #fff; opacity .07 |
| E221 | rect: (64.12, 1021.76), 354 × 52, rx=15, ry=15 | fill #c6f24e |
| E225 | rect: (46.62, 266.26), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=4008.21; y1=1461.21; x2=4008.21; y2=1460.21; gradientTransform=translate(-1562959.3132 1233527.1506) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E10 rect (46.12, 265.76), 390 × 844, rx=0, ry=0.

### Interactive-looking elements

- Unlabelled back chevron in a 40 × 40 control, radius 12.
- Date tiles labelled 1 through 31; visual styles only, availability semantics are not encoded.
- Time chips: “6:30 AM”, “8:00 AM”, “12:00 PM”, “5:30 PM”, “6:30 PM”, “7:30 PM”.
- “Single session” package card and “Confirm and pay” button.

### Ambiguities and literal-source observations

- The file and both external headings spell the word “Calender”. The date layout is transcribed as drawn; no calendar correction is applied.

**Other explicit styling:** letter-spacing values `-.08em`, `-.03em`, `-.02em`, `-.01em`, `0em`, `.07em`, `.09em`, `.1em`, `.12em`; stroke-width values `1.8px`, `2.2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 2. Calender 2.svg

**Screen:** Book Marcus — day view. **Module:** Booking/Calendar.

**ViewBox:** `0 0 472.81 1213.97`. **Source:** [Calender 2.svg](../design/svg/Calender%202.svg).

### Layout, dimensions and spacing

- External headings → phone/status bar → back and “Book Marcus” → “JULY 2026” → seven weekdays and dates 1–7, with left/right chevrons → “TIME ” → six session rows → “Mark as Done”.
- Phone gradient rectangle (49.71,270.58), 390 × 844; outer border 389 × 843, radius 28. Date tiles 37.86 × 36.06, radius 11.72, pitch about 45.07. Date “2” is lime.
- Session rows are path-based pills, approximately 339.56 × 34, y=521.19,570.14,619.08,668.02,716.97,765.91. Each has time, person, and a right progress-count pill approximately 39.74 × 21.12. First row lime; remaining rows #16181d with #414042 outlines. Action button (67.71,829.73), 354 × 52, radius 15.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E10) | 67.64 | 149.18 | `"Calender"` | F4 40.57px; #f2f3f5 | Outside phone, above frame; scale(.86 1) |
| T2 (E152) | 227.73 | 162.98 | `"Calender- Day view "` | F3 19px; #f2f3f5 | Outside phone, above frame |
| T3 (E14) | 295.58 | 73.71 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E26) | 348.58 | 121.71 | `"Book Marcus"` | F3 19px; #f2f3f5 |  |
| T5 (E32) | 396.58 | 67.71 | `"JULY 2026"` | F3 12px; #6b7280 |  |
| T6 (E37) | 428.88 | 103.17 | `"M"` | F3 9.92px; #6b7280 |  |
| T7 (E39) | 428.88 | 149.35 | `"T"` | F3 9.92px; #6b7280 |  |
| T8 (E41) | 428.88 | 192.77 | `"W"` | F3 9.92px; #6b7280 |  |
| T9 (E43) | 428.88 | 239.49 | `"T"` | F3 9.92px; #6b7280 |  |
| T10 (E45) | 428.88 | 284.56 | `"F"` | F3 9.92px; #6b7280 |  |
| T11 (E47) | 428.88 | 329.35 | `"S"` | F3 9.92px; #6b7280 |  |
| T12 (E49) | 428.88 | 374.42 | `"S"` | F3 9.92px; #6b7280 |  |
| T13 (E53) | 465.84 | 102.24 | `"1"` | F3 11.72px; #f2f3f5 |  |
| T14 (E57) | 465.84 | 147.31 | `"2"` | F3 11.72px; #0d0e11 |  |
| T15 (E61) | 465.84 | 192.38 | `"3"` | F3 11.72px; #f2f3f5 |  |
| T16 (E65) | 465.84 | 237.45 | `"4"` | F3 11.72px; #f2f3f5 |  |
| T17 (E69) | 465.84 | 282.53 | `"5"` | F3 11.72px; #f2f3f5 |  |
| T18 (E73) | 465.84 | 327.6 | `"6"` | F3 11.72px; #f2f3f5 |  |
| T19 (E77) | 465.84 | 372.67 | `"7"` | F3 11.72px; #f2f3f5 |  |
| T20 (E79) | 509.58 | 67.71 | `"TIME "` | F3 12px; #6b7280 |  |
| T21 (E95) | 541.15 | 364.7 | `"1/10"` | F7 10px; #c6f24e |  |
| T22 (E88) | 541.73 | 79.36 | `"6:30 AM"` | F3 12px; implicit black |  |
| T23 (E91) | 541.88 | 137.25 | `"Sally Sanders."` | F8 12.5px; implicit black |  |
| T24 (E104) | 590.19 | 137.25 | `"Nour kaawar "` | F8 12.5px; #9ba1ac |  |
| T25 (E102) | 590.75 | 364.7 | `"3/10"` | F7 10px; #9ba1ac |  |
| T26 (E99) | 591.15 | 79.95 | `"8:00 AM"` | F3 12px; #c5cad2 |  |
| T27 (E113) | 639.7 | 367.5 | `"5/5"` | F7 10px; #9ba1ac |  |
| T28 (E110) | 640.36 | 78.76 | `"12:00 PM"` | F3 12px; #c5cad2 |  |
| T29 (E115) | 640.36 | 137.25 | `"mohammad mahmoud"` | F8 12.5px; #9ba1ac |  |
| T30 (E122) | 688.64 | 367.5 | `"1/1"` | F7 10px; #9ba1ac |  |
| T31 (E119) | 690.17 | 79.25 | `"5:30 PM"` | F3 12px; #c5cad2 |  |
| T32 (E124) | 690.19 | 137.6 | `"Ali hassan "` | F8 12.5px; #9ba1ac |  |
| T33 (E132) | 737.58 | 364.7 | `"6/12"` | F7 10px; #9ba1ac |  |
| T34 (E129) | 737.93 | 80.15 | `"6:30 PM"` | F3 12px; #c5cad2 |  |
| T35 (E134) | 738.08 | 137.25 | `"Elias koko"` | F8 12.5px; #9ba1ac |  |
| T36 (E145) | 786.53 | 367.5 | `"5/5"` | F7 10px; #9ba1ac |  |
| T37 (E142) | 787 | 80.15 | `"7:30 PM"` | F3 12px; #c5cad2 |  |
| T38 (E147) | 787.14 | 137.25 | `"Sally Sanders."` | F8 12.5px; #9ba1ac |  |
| T39 (E82) | 862.73 | 181.6 | `"Mark as Done"` | F3 16px; #0d0e11 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T14, T39 |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E21 rect, E51 rect, E59 rect, E63 rect, E67 rect, E71 rect, E75 rect<br>Path fill: E98 start (83.31, 570.14), E101 start (365.89, 576.58), E109 start (83.31, 619.08), E112 start (365.89, 625.52), E118 start (83.31, 668.02), E121 start (365.89, 674.47), E128 start (83.31, 716.97), E131 start (365.89, 723.41), E141 start (83.31, 765.91), E144 start (365.89, 772.35) |
| `#2e4949` | Shape/background fill: E8 rect |
| `#3a3f47` | Shape/background fill: E16 circle α=.65 |
| `#414042` | Path stroke: E98 start (83.31, 570.14), E101 start (365.89, 576.58), E109 start (83.31, 619.08), E112 start (365.89, 625.52), E118 start (83.31, 668.02), E121 start (365.89, 674.47), E128 start (83.31, 716.97), E131 start (365.89, 723.41), E141 start (83.31, 765.91), E144 start (365.89, 772.35) |
| `#6b7280` | Text fill: T5, T6, T7, T8, T9, T10, T11, T12, T20 |
| `#9ba1ac` | Text fill: T24, T25, T27, T29, T30, T32, T33, T35, T36, T38 |
| `#c5cad2` | Text fill: T26, T28, T31, T34, T37 |
| `#c6f24e` | Text fill: T21<br>Shape/background fill: E55 rect, E81 rect<br>Path fill: E87 start (83.31, 521.19)<br>Path stroke: E87 start (83.31, 521.19) |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T13, T15, T16, T17, T18, T19<br>Shape/background fill: E20 rect<br>Border/icon stroke: E19 rect, E20 rect<br>Path stroke: E17 start (367.71, 293.58), E18 start (371.71, 297.58), E23 start (92.71, 334.58), E24 start (402.07, 470.58), E25 start (77.96, 454.58) |
| `#fff` | Border/icon stroke: E22 rect α=.07, E52 rect α=.07, E56 rect α=.07, E60 rect α=.07, E64 rect α=.07, E68 rect α=.07, E72 rect α=.07, E76 rect α=.07, E151 rect α=.12 |

The first session’s time/person use implicit black (`#000000` by the SVG initial value); no black hex token is written for those text nodes.

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E8 | rect: (0, 0), 474.51 × 1211.49, rx=0, ry=0 | fill #2e4949 |
| E13 | rect: (49.71, 270.58), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E16 | circle: centre (244.71, 288.58), r=9 | fill #3a3f47; opacity .65 |
| E19 | rect: (394.71, 285.58), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E20 | rect: (414.71, 289.58), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E21, E22 | rect: (67.71, 322.58), 40 × 40, rx=12, ry=12 | E21: fill #16181d<br>E22: fill none; stroke #fff; opacity .07 |
| E51, E52 | rect: (86.57, 443.3), 37.86 × 36.06, rx=11.72, ry=11.72 | E51: fill #16181d<br>E52: fill none; stroke #fff; opacity .07 |
| E55, E56 | rect: (131.64, 443.3), 37.86 × 36.06, rx=11.72, ry=11.72 | E55: fill #c6f24e<br>E56: fill none; stroke #fff; opacity .07 |
| E59, E60 | rect: (176.71, 443.3), 37.86 × 36.06, rx=11.72, ry=11.72 | E59: fill #16181d<br>E60: fill none; stroke #fff; opacity .07 |
| E63, E64 | rect: (221.78, 443.3), 37.86 × 36.06, rx=11.72, ry=11.72 | E63: fill #16181d<br>E64: fill none; stroke #fff; opacity .07 |
| E67, E68 | rect: (266.85, 443.3), 37.86 × 36.06, rx=11.72, ry=11.72 | E67: fill #16181d<br>E68: fill none; stroke #fff; opacity .07 |
| E71, E72 | rect: (311.93, 443.3), 37.86 × 36.06, rx=11.72, ry=11.72 | E71: fill #16181d<br>E72: fill none; stroke #fff; opacity .07 |
| E75, E76 | rect: (357, 443.3), 37.86 × 36.06, rx=11.72, ry=11.72 | E75: fill #16181d<br>E76: fill none; stroke #fff; opacity .07 |
| E81 | rect: (67.71, 829.73), 354 × 52, rx=15, ry=15 | fill #c6f24e |
| E151 | rect: (50.21, 270.58), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=3458.57; y1=1461.2; x2=3458.57; y2=1460.2; gradientTransform=translate(-1348598.8723 1233527.1506) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E13 rect (49.71, 270.58), 390 × 844, rx=0, ry=0.
- `linear-gradient-2` (linearGradient, E6); inherits `#linear-gradient`: x1=355.33; y1=538.19; x2=395.07; y2=538.19; gradientTransform=matrix(1,0,0,1,0,0). Direct fill uses: E90 path start (365.89, 527.64).

### Interactive-looking elements

- Back chevron; previous/next chevrons flanking the date row; date tiles “1”–“7”.
- Six session rows: 6:30 AM / Sally Sanders. / 1/10; 8:00 AM / Nour kaawar / 3/10; 12:00 PM / mohammad mahmoud / 5/5; 5:30 PM / Ali hassan / 1/1; 6:30 PM / Elias koko / 6/12; 7:30 PM / Sally Sanders. / 5/5.
- “Mark as Done” button.

### Ambiguities and literal-source observations

- The first row’s time and person have no explicit fill: SVG’s initial black fill applies. This is separate from the explicitly declared #0d0e11 text.
- Progress-count and time/person baselines differ slightly; exact baseline order is retained below.

**Other explicit styling:** letter-spacing values `-.03em`, `-.02em`, `-.01em`, `0em`, `.07em`, `.12em`; stroke-width values `.5px`, `1.8px`, `2.2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 3. Calender 3.svg

**Screen:** Day view with session-end confirmation overlay. **Module:** Booking/Calendar.

**ViewBox:** `0 0 436.82 1213.97`. **Source:** [Calender 3.svg](../design/svg/Calender%203.svg).

### Layout, dimensions and spacing

- Same weekday/date and six-session arrangement as Calender 2, shifted to phone origin (23.55,271.89); date “2” and first session row lime; bottom “Mark as Done” retained.
- A 389.75 × 844 gradient overlay at (23.8,271.89), opacity .81, sits above the day-view content. On top is a path-based panel from approximately (53.88,590) to (365.24,765.77), curved corners encoded in the path. It contains “Hey Champ!”, the confirmation question, and “YES” / “NO”.
- Panel outer glow: feOffset dx=0,dy=0; feGaussianBlur stdDeviation=5; flood colour #c6f24e, flood opacity .27. Buttons 97.39 × 36.21, radius 12.52, y=691.53; YES at x=91.18, NO at x=229.5. YES lime; NO #1c1f26.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E85) | 67.64 | 149.18 | `"Calender"` | F4 40.57px; #f2f3f5 | Outside phone, above frame; scale(.86 1) |
| T2 (E184) | 230.04 | 33.04 | `"Calender - session end confirmation "` | F3 19px; #f2f3f5 | Outside phone, above frame |
| T3 (E18) | 296.89 | 47.55 | `"9:30"` | F3 13px; #f2f3f5 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T4 (E30) | 349.89 | 95.55 | `"Book Marcus"` | F3 19px; #f2f3f5 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T5 (E36) | 397.89 | 41.55 | `"JULY 2026"` | F3 12px; #6b7280 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T6 (E41) | 430.19 | 77.02 | `"M"` | F3 9.92px; #6b7280 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T7 (E43) | 430.19 | 123.19 | `"T"` | F3 9.92px; #6b7280 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T8 (E45) | 430.19 | 166.61 | `"W"` | F3 9.92px; #6b7280 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T9 (E47) | 430.19 | 213.33 | `"T"` | F3 9.92px; #6b7280 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T10 (E49) | 430.19 | 258.4 | `"F"` | F3 9.92px; #6b7280 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T11 (E51) | 430.19 | 303.19 | `"S"` | F3 9.92px; #6b7280 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T12 (E53) | 430.19 | 348.26 | `"S"` | F3 9.92px; #6b7280 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T13 (E57) | 467.15 | 76.08 | `"1"` | F3 11.72px; #f2f3f5 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T14 (E61) | 467.15 | 121.15 | `"2"` | F3 11.72px; #0d0e11 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T15 (E65) | 467.15 | 166.23 | `"3"` | F3 11.72px; #f2f3f5 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T16 (E69) | 467.15 | 211.3 | `"4"` | F3 11.72px; #f2f3f5 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T17 (E73) | 467.15 | 256.37 | `"5"` | F3 11.72px; #f2f3f5 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T18 (E77) | 467.15 | 301.44 | `"6"` | F3 11.72px; #f2f3f5 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T19 (E81) | 467.15 | 346.51 | `"7"` | F3 11.72px; #f2f3f5 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T20 (E83) | 510.89 | 41.55 | `"TIME "` | F3 12px; #6b7280 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T21 (E102) | 542.46 | 338.54 | `"1/10"` | F7 10px; #c6f24e | Underlying day view, beneath .81 overlay; dialog may obscure |
| T22 (E95) | 543.04 | 53.2 | `"6:30 AM"` | F3 12px; implicit black | Underlying day view, beneath .81 overlay; dialog may obscure |
| T23 (E98) | 543.19 | 111.09 | `"Sally Sanders."` | F8 12.5px; implicit black | Underlying day view, beneath .81 overlay; dialog may obscure |
| T24 (E111) | 591.5 | 111.09 | `"Nour kaawar "` | F8 12.5px; #9ba1ac | Underlying day view, beneath .81 overlay; dialog may obscure |
| T25 (E109) | 592.06 | 338.54 | `"3/10"` | F7 10px; #9ba1ac | Underlying day view, beneath .81 overlay; dialog may obscure |
| T26 (E106) | 592.46 | 53.79 | `"8:00 AM"` | F3 12px; #c5cad2 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T27 (E120) | 641.01 | 341.34 | `"5/5"` | F7 10px; #9ba1ac | Underlying day view, beneath .81 overlay; dialog may obscure |
| T28 (E117) | 641.67 | 52.6 | `"12:00 PM"` | F3 12px; #c5cad2 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T29 (E122) | 641.67 | 111.09 | `"mohammad mahmoud"` | F8 12.5px; #9ba1ac | Underlying day view, beneath .81 overlay; dialog may obscure |
| T30 (E173) | 643.1 | 77.16 | `"Hey Champ!"` | F3 17px; #c6f24e |  |
| T31 (E165) | 664.22 | 77.16 | `"Did you finish your 6:30 pm session?"` | `"Did you finish your "`: F3 15px; #f2f3f5; `"6:30"`: F3 17px; #c6f24e; `" "`: F3 15px; #f2f3f5; `"pm"`: F3 17px; #c6f24e; `" session?"`: F3 15px; #f2f3f5 |  |
| T32 (E129) | 689.95 | 341.34 | `"1/1"` | F7 10px; #9ba1ac | Underlying day view, beneath .81 overlay; dialog may obscure |
| T33 (E126) | 691.48 | 53.09 | `"5:30 PM"` | F3 12px; #c5cad2 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T34 (E131) | 691.5 | 111.44 | `"Ali hassan "` | F8 12.5px; #9ba1ac | Underlying day view, beneath .81 overlay; dialog may obscure |
| T35 (E181) | 714.71 | 264.19 | `"NO"` | F2 16px; #f2f3f5 |  |
| T36 (E177) | 714.9 | 123.38 | `"YES"` | F2 16px; #0d0e11 |  |
| T37 (E139) | 738.89 | 338.54 | `"6/12"` | F7 10px; #9ba1ac | Underlying day view, beneath .81 overlay; dialog may obscure |
| T38 (E136) | 739.24 | 53.99 | `"6:30 PM"` | F3 12px; #c5cad2 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T39 (E141) | 739.39 | 111.09 | `"Elias koko"` | F8 12.5px; #9ba1ac | Underlying day view, beneath .81 overlay; dialog may obscure |
| T40 (E152) | 787.84 | 341.34 | `"5/5"` | F7 10px; #9ba1ac | Underlying day view, beneath .81 overlay; dialog may obscure |
| T41 (E149) | 788.31 | 53.99 | `"7:30 PM"` | F3 12px; #c5cad2 | Underlying day view, beneath .81 overlay; dialog may obscure |
| T42 (E154) | 788.45 | 111.09 | `"Sally Sanders."` | F8 12.5px; #9ba1ac | Underlying day view, beneath .81 overlay; dialog may obscure |
| T43 (E89) | 864.04 | 155.44 | `"Mark as Done"` | F3 16px; #0d0e11 | Underlying day view, beneath .81 overlay; dialog may obscure |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T14, T36, T43 |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E25 rect, E55 rect, E63 rect, E67 rect, E71 rect, E75 rect, E79 rect<br>Path fill: E105 start (57.15, 571.45), E108 start (339.73, 577.89), E116 start (57.15, 620.39), E119 start (339.73, 626.83), E125 start (57.15, 669.33), E128 start (339.73, 675.78), E135 start (57.15, 718.28), E138 start (339.73, 724.72), E148 start (57.15, 767.22), E151 start (339.73, 773.66), E162 start (67.95, 590) |
| `#1c1f26` | Shape/background fill: E180 rect |
| `#2e4949` | Shape/background fill: E15 rect |
| `#3a3f47` | Shape/background fill: E20 circle α=.65 |
| `#414042` | Path stroke: E105 start (57.15, 571.45), E108 start (339.73, 577.89), E116 start (57.15, 620.39), E119 start (339.73, 626.83), E125 start (57.15, 669.33), E128 start (339.73, 675.78), E135 start (57.15, 718.28), E138 start (339.73, 724.72), E148 start (57.15, 767.22), E151 start (339.73, 773.66) |
| `#6b7280` | Text fill: T5, T6, T7, T8, T9, T10, T11, T12, T20 |
| `#9ba1ac` | Text fill: T24, T25, T27, T29, T32, T34, T37, T39, T40, T42 |
| `#c5cad2` | Text fill: T26, T28, T33, T38, T41 |
| `#c6f24e` | Text fill: T21, T30, T31<br>Shape/background fill: E59 rect, E88 rect, E176 rect<br>Path fill: E94 start (57.15, 522.5)<br>Path stroke: E94 start (57.15, 522.5)<br>flood-color: E11 in outer-glow-1, flood-opacity .27 |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T13, T15, T16, T17, T18, T19, T31, T35<br>Shape/background fill: E24 rect<br>Border/icon stroke: E23 rect, E24 rect<br>Path stroke: E21 start (341.55, 294.89), E22 start (345.55, 298.89), E27 start (66.55, 335.89), E28 start (375.91, 471.89), E29 start (51.8, 455.89) |
| `#fff` | Border/icon stroke: E26 rect α=.07, E56 rect α=.07, E60 rect α=.07, E64 rect α=.07, E68 rect α=.07, E72 rect α=.07, E76 rect α=.07, E80 rect α=.07, E183 rect α=.12<br>Path stroke: E163 start (67.95, 590) α=.07 |

The first session’s time/person use implicit black (`#000000` by the SVG initial value); no black hex token is written for those text nodes.

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E15 | rect: (0, 0), 436.82 × 1211.49, rx=0, ry=0 | fill #2e4949 |
| E17 | rect: (23.55, 271.89), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E20 | circle: centre (218.55, 289.89), r=9 | fill #3a3f47; opacity .65 |
| E23 | rect: (368.55, 286.89), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E24 | rect: (388.55, 290.89), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E25, E26 | rect: (41.55, 323.89), 40 × 40, rx=12, ry=12 | E25: fill #16181d<br>E26: fill none; stroke #fff; opacity .07 |
| E55, E56 | rect: (60.41, 444.61), 37.86 × 36.06, rx=11.72, ry=11.72 | E55: fill #16181d<br>E56: fill none; stroke #fff; opacity .07 |
| E59, E60 | rect: (105.48, 444.61), 37.86 × 36.06, rx=11.72, ry=11.72 | E59: fill #c6f24e<br>E60: fill none; stroke #fff; opacity .07 |
| E63, E64 | rect: (150.55, 444.61), 37.86 × 36.06, rx=11.72, ry=11.72 | E63: fill #16181d<br>E64: fill none; stroke #fff; opacity .07 |
| E67, E68 | rect: (195.63, 444.61), 37.86 × 36.06, rx=11.72, ry=11.72 | E67: fill #16181d<br>E68: fill none; stroke #fff; opacity .07 |
| E71, E72 | rect: (240.7, 444.61), 37.86 × 36.06, rx=11.72, ry=11.72 | E71: fill #16181d<br>E72: fill none; stroke #fff; opacity .07 |
| E75, E76 | rect: (285.77, 444.61), 37.86 × 36.06, rx=11.72, ry=11.72 | E75: fill #16181d<br>E76: fill none; stroke #fff; opacity .07 |
| E79, E80 | rect: (330.84, 444.61), 37.86 × 36.06, rx=11.72, ry=11.72 | E79: fill #16181d<br>E80: fill none; stroke #fff; opacity .07 |
| E88 | rect: (41.55, 831.04), 354 × 52, rx=15, ry=15 | fill #c6f24e |
| E158 | rect: (23.8, 271.89), 389.75 × 844, rx=0, ry=0 | fill url(#linear-gradient-3); opacity .81 |
| E176 | rect: (91.18, 691.53), 97.39 × 36.21, rx=12.52, ry=12.52 | fill #c6f24e |
| E180 | rect: (229.5, 691.53), 97.39 × 36.21, rx=12.52, ry=12.52 | fill #1c1f26 |
| E183 | rect: (24.05, 272.89), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=2959.76; y1=1461.2; x2=2959.76; y2=1460.2; gradientTransform=translate(-1154086.6203 1233527.1506) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E17 rect (23.55, 271.89), 390 × 844, rx=0, ry=0.
- `linear-gradient-2` (linearGradient, E6); inherits `#linear-gradient`: x1=329.18; y1=539.5; x2=368.91; y2=539.5; gradientTransform=matrix(1,0,0,1,0,0). Direct fill uses: E97 path start (339.73, 528.95).
- `linear-gradient-3` (linearGradient, E7); inherits `#linear-gradient`: x1=218.68; y1=271.89; x2=218.68; y2=1115.89; gradientTransform=matrix(1,0,0,1,0,0). Direct fill uses: E158 rect (23.8, 271.89), 389.75 × 844, rx=0, ry=0.

### Interactive-looking elements

- Overlay buttons “YES” and “NO”.
- Underlying back, date chevrons, dates “1”–“7”, six session rows and “Mark as Done” are still present in source. Their interaction availability under the overlay is not encoded.

### Ambiguities and literal-source observations

- Source text behind the opaque panel is retained in the inventory but may be obscured; the .81 overlay dims the rest.
- The highlighted first row says “6:30 AM”; the dialog literally asks about “6:30 pm”. Neither is changed.
- The first row’s time/person have implicit black fill. The question mixes white 15px text with lime 17px “6:30” and “pm”.

**Other explicit styling:** letter-spacing values `-.03em`, `-.02em`, `-.01em`, `0em`, `.07em`, `.12em`; stroke-width values `.5px`, `1.8px`, `2.2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 4. Calender 4.svg

**Screen:** Booking confirmed. **Module:** Booking/Calendar.

**ViewBox:** `0 0 472.81 1213.97`. **Source:** [Calender 4.svg](../design/svg/Calender%204.svg).

### Layout, dimensions and spacing

- External headings → status bar → back and “Booking confirmed” → large lime circle with check → “You are booked!” → two explanatory lines → Google Calendar confirmation panel → “View in bookings”.
- Phone (28.51,247.68), 390 × 844, radius 28. Check circle centre (223.51,495.68), radius 54. Calendar panel (70.51,687.68), 306 × 92, radius 18, lime fill at .12 and lime stroke at .24. Button (82.51,859.68), 282 × 52, radius 15. The central content is widely spaced and horizontally centred.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E9) | 67.64 | 149.18 | `"Calender"` | F4 40.57px; #f2f3f5 | Outside phone, above frame; scale(.86 1) |
| T2 (E74) | 202.83 | 84.66 | `"Calender - Booking confirmed"` | F3 19px; #f2f3f5 | Outside phone, above frame |
| T3 (E14) | 272.68 | 52.51 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E24) | 325.68 | 100.51 | `"Booking confirmed"` | F3 19px; #f2f3f5 |  |
| T5 (E28) | 583.68 | 122.63 | `"You are booked!"` | F3 26px; #f2f3f5 |  |
| T6 (E35) | 619.68 | 138.43 | `"Marcus approved Thursday"` | F8 14px; #9ba1ac |  |
| T7 (E46) | 641.68 | 140.9 | `"6:30 PM at Iron Yard Gym."` | F8 14px; #9ba1ac |  |
| T8 (E58) | 721.68 | 122.62 | `"Added to Google Calendar"` | F3 16px; #f2f3f5 |  |
| T9 (E61) | 747.68 | 141.26 | `"Changes sync automatically."` | F8 13px; #9ba1ac |  |
| T10 (E70) | 892.68 | 158.32 | `"View in bookings"` | F3 16px; #0d0e11 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T10<br>Shape/background fill: E12 rect<br>Path stroke: E27 start (199.51, 495.68) |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E21 rect |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a3f47` | Shape/background fill: E16 circle α=.65 |
| `#9ba1ac` | Text fill: T6, T7, T9 |
| `#c6f24e` | Shape/background fill: E26 circle, E56 rect α=.12, E69 rect<br>Border/icon stroke: E57 rect α=.24 |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T5, T8<br>Shape/background fill: E20 rect<br>Border/icon stroke: E19 rect, E20 rect<br>Path stroke: E17 start (346.51, 270.68), E18 start (350.51, 274.68), E23 start (71.51, 311.68) |
| `#fff` | Border/icon stroke: E22 rect α=.07, E73 rect α=.12 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (0, 0), 474.51 × 1211.49, rx=0, ry=0 | fill #2e4949 |
| E12, E72 | rect: (28.51, 247.68), 390 × 844, rx=28, ry=28 | E12: fill #0d0e11<br>E72: fill none |
| E13 | rect: (28.51, 247.68), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E16 | circle: centre (223.51, 265.68), r=9 | fill #3a3f47; opacity .65 |
| E19 | rect: (373.51, 262.68), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E20 | rect: (393.51, 266.68), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E21, E22 | rect: (46.51, 299.68), 40 × 40, rx=12, ry=12 | E21: fill #16181d<br>E22: fill none; stroke #fff; opacity .07 |
| E26 | circle: centre (223.51, 495.68), r=54 | fill #c6f24e |
| E56, E57 | rect: (70.51, 687.68), 306 × 92, rx=18, ry=18 | E56: fill #c6f24e; opacity .12<br>E57: fill none; stroke #c6f24e; opacity .24 |
| E69 | rect: (82.51, 859.68), 282 × 52, rx=15, ry=15 | fill #c6f24e |
| E73 | rect: (29.01, 248.18), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=2494.88; y1=1462.35; x2=2494.88; y2=1461.35; gradientTransform=translate(-972779.2817 1234471.1506) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E13 rect (28.51, 247.68), 390 × 844, rx=0, ry=0.

### Interactive-looking elements

- Unlabelled back control; “View in bookings” button.

### Ambiguities and literal-source observations

- “Added to Google Calendar” and “Changes sync automatically.” are literal displayed claims; no integration behavior is established by this SVG.

**Other explicit styling:** letter-spacing values `-.1em`, `-.08em`, `-.03em`, `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2.2px`, `6px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 5. Calender 5.svg

**Screen:** Bookings — active package, upcoming and past sessions. **Module:** Booking/Calendar.

**ViewBox:** `0 0 472.81 1213.97`. **Source:** [Calender 5.svg](../design/svg/Calender%205.svg).

### Layout, dimensions and spacing

- External headings → status bar → back and “Bookings” → “ACTIVE PACKAGE” card → “UPCOMING” with two rows → “PAST” with one row.
- Phone (19.03,247.68), 390 × 844, radius 28. Content x=37.03, width 354. Package card y=391.68, 354 × 112, radius 18; thin curved progress paths span 322 × 10 with a lime 161-unit half.
- Session cards 354 × 68, radius 16, at y=565.68,645.68,787.68. Right pills approximately 88 × 28, curved ends 14: “In calendar” lime tint/outline; “Change” and “Rate” dark.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E9) | 67.64 | 149.18 | `"Calender"` | F4 40.57px; #f2f3f5 | Outside phone, above frame; scale(.86 1) |
| T2 (E101) | 202.83 | 58.03 | `"Calender - My session overview"` | F3 19px; #f2f3f5 | Outside phone, above frame |
| T3 (E14) | 272.68 | 43.03 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E24) | 325.68 | 91.03 | `"Bookings"` | F3 19px; #f2f3f5 |  |
| T5 (E26) | 375.68 | 37.03 | `"ACTIVE PACKAGE"` | F3 12px; #6b7280 |  |
| T6 (E38) | 421.68 | 53.03 | `"Marcus Reyes - 4-session block"` | F3 15px; #f2f3f5 |  |
| T7 (E47) | 445.68 | 53.03 | `"2 of 4 sessions used"` | F3 13px; #9ba1ac |  |
| T8 (E51) | 549.68 | 37.03 | `"UPCOMING"` | F3 12px; #6b7280 |  |
| T9 (E55) | 591.68 | 53.03 | `"Strength technique"` | F3 15px; #f2f3f5 |  |
| T10 (E63) | 603.68 | 299.35 | `"In calendar"` | F3 12px; #c6f24e |  |
| T11 (E59) | 613.68 | 53.03 | `"Thu 09 - 6:30 PM"` | F8 12.5px; #9ba1ac |  |
| T12 (E68) | 671.68 | 53.03 | `"Tempo run"` | F3 15px; #f2f3f5 |  |
| T13 (E75) | 683.68 | 309.03 | `"Change"` | F3 12px; #c5cad2 |  |
| T14 (E71) | 693.68 | 53.03 | `"Sat 11 - 7:00 AM"` | F8 12.5px; #9ba1ac |  |
| T15 (E77) | 771.68 | 37.03 | `"PAST"` | F3 12px; #6b7280 |  |
| T16 (E82) | 813.68 | 53.03 | `"Boxing footwork"` | F3 15px; #f2f3f5 |  |
| T17 (E96) | 825.68 | 318.02 | `"Rate"` | F3 12px; #c5cad2 |  |
| T18 (E89) | 835.68 | 53.03 | `"Mon 29 - complete"` | F8 12.5px; #9ba1ac |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Shape/background fill: E12 rect |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E21 rect, E36 rect, E53 rect, E66 rect, E80 rect |
| `#1c1f26` | Path fill: E49 start (214.03, 465.68), E73 start (301.03, 665.68), E94 start (301.03, 807.68) |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a3f47` | Shape/background fill: E16 circle α=.65 |
| `#6b7280` | Text fill: T5, T8, T15 |
| `#9ba1ac` | Text fill: T7, T11, T14, T18 |
| `#c5cad2` | Text fill: T13, T17 |
| `#c6f24e` | Text fill: T10<br>Path fill: E50 start (133.53, 465.68), E61 start (301.03, 585.68) α=.12<br>Path stroke: E62 start (301.03, 585.68) α=.2 |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T6, T9, T12, T16<br>Shape/background fill: E20 rect<br>Border/icon stroke: E19 rect, E20 rect<br>Path stroke: E17 start (337.03, 270.68), E18 start (341.03, 274.68), E23 start (62.03, 311.68) |
| `#fff` | Border/icon stroke: E22 rect α=.07, E37 rect α=.07, E54 rect α=.07, E67 rect α=.07, E81 rect α=.07, E100 rect α=.12<br>Path stroke: E74 start (301.03, 665.68) α=.2, E95 start (301.03, 807.68) α=.2 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (0, 0), 474.51 × 1211.49, rx=0, ry=0 | fill #2e4949 |
| E12, E99 | rect: (19.03, 247.68), 390 × 844, rx=28, ry=28 | E12: fill #0d0e11<br>E99: fill none |
| E13 | rect: (19.03, 247.68), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E16 | circle: centre (214.03, 265.68), r=9 | fill #3a3f47; opacity .65 |
| E19 | rect: (364.03, 262.68), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E20 | rect: (384.03, 266.68), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E21, E22 | rect: (37.03, 299.68), 40 × 40, rx=12, ry=12 | E21: fill #16181d<br>E22: fill none; stroke #fff; opacity .07 |
| E36, E37 | rect: (37.03, 391.68), 354 × 112, rx=18, ry=18 | E36: fill #16181d<br>E37: fill none; stroke #fff; opacity .07 |
| E53, E54 | rect: (37.03, 565.68), 354 × 68, rx=16, ry=16 | E53: fill #16181d<br>E54: fill none; stroke #fff; opacity .07 |
| E66, E67 | rect: (37.03, 645.68), 354 × 68, rx=16, ry=16 | E66: fill #16181d<br>E67: fill none; stroke #fff; opacity .07 |
| E80, E81 | rect: (37.03, 787.68), 354 × 68, rx=16, ry=16 | E80: fill #16181d<br>E81: fill none; stroke #fff; opacity .07 |
| E100 | rect: (19.53, 248.18), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=2007.23; y1=1462.35; x2=2007.23; y2=1461.35; gradientTransform=translate(-782607.6224 1234471.1506) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E13 rect (19.03, 247.68), 390 × 844, rx=0, ry=0.

### Interactive-looking elements

- Back control; upcoming cards “Strength technique” and “Tempo run”; past card “Boxing footwork”.
- “In calendar” is drawn as a status pill; clickability is ambiguous. “Change” and “Rate” are button-like pills.

**Other explicit styling:** letter-spacing values `-.08em`, `-.03em`, `-.02em`, `-.01em`, `0em`, `.04em`, `.07em`, `.1em`, `.12em`; stroke-width values `1.8px`, `2.2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 6. Chat 1.svg

**Screen:** Conversation list and session reminder. **Module:** Chat.

**ViewBox:** `0 0 458.08 1070.66`. **Source:** [Chat 1.svg](../design/svg/Chat%201.svg).

### Layout, dimensions and spacing

- Status bar → “Chat” and subtitle → four conversation cards → “Session reminders” card with “Open booking” → five-item bottom navigation.
- Phone (38.21,84.98), 390 × 844, radius 28; gradient is a rounded path. Conversation cards x=56.21, width 354, height 78, radius 16, at y=248.98,338.98,428.98,518.98 (12-unit gaps). Avatars 52 × 52, radius 14.
- First two avatars have lime dots, radius 5. Marcus row has a lime “2” badge, approximately 24 × 24. Reminder panel (56.21,644.98), 354 × 147.69, radius 18; “Open booking” pill approximately 118 × 28. Bottom bar starts y=848.98, height 80; Chat is lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E11) | 109.98 | 62.21 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T2 (E18) | 164.98 | 56.21 | `"Chat"` | F3 27px; #f2f3f5 |  |
| T3 (E20) | 200.98 | 56.21 | `"Conversations and session updates"` | F3 13px; #9ba1ac |  |
| T4 (E28) | 276.98 | 134.21 | `"Marcus Reyes"` | F3 15px; #f2f3f5 |  |
| T5 (E41) | 276.98 | 370.93 | `"2m"` | F8 11px; #6b7280 |  |
| T6 (E25) | 293.98 | 82.77 | `"MR"` | F3 16px; #f2f3f5 |  |
| T7 (E34) | 298.98 | 134.21 | `"Great session today. Same"` | F3 12.5px; #9ba1ac |  |
| T8 (E44) | 306.98 | 373.15 | `"2"` | F3 11px; #0d0e11 |  |
| T9 (E34) | 313.98 | 134.21 | `"time Thursday?"` | F3 12.5px; #9ba1ac |  |
| T10 (E52) | 366.98 | 134.21 | `"Mei Lin"` | F3 15px; #f2f3f5 |  |
| T11 (E60) | 366.98 | 373.98 | `"1h"` | F8 11px; #6b7280 |  |
| T12 (E49) | 383.98 | 83.66 | `"ML"` | F3 16px; #f2f3f5 |  |
| T13 (E54) | 388.98 | 134.21 | `"Meet at the south wall around 8?"` | F3 12.5px; #9ba1ac |  |
| T14 (E68) | 456.98 | 134.21 | `"Jordan K."` | F3 15px; #f2f3f5 |  |
| T15 (E75) | 456.98 | 373.98 | `"3h"` | F8 11px; #6b7280 |  |
| T16 (E65) | 473.98 | 84.99 | `"JK"` | F3 16px; #f2f3f5 |  |
| T17 (E72) | 478.98 | 134.21 | `"You crushed that pace."` | F3 12.5px; #9ba1ac |  |
| T18 (E82) | 546.98 | 134.21 | `"Aicha Bennani"` | F3 15px; #f2f3f5 |  |
| T19 (E94) | 546.98 | 365.21 | `"Yest"` | F8 11px; #6b7280 |  |
| T20 (E80) | 563.98 | 83.66 | `"AB"` | F3 16px; #f2f3f5 |  |
| T21 (E84) | 568.98 | 134.21 | `"Do not forget your wraps next time"` | F3 12.5px; #9ba1ac |  |
| T22 (E99) | 676.98 | 74.21 | `"Session reminders"` | F3 17px; #f2f3f5 |  |
| T23 (E103) | 704.98 | 74.21 | `"Marcus approved your Thursday"` | F3 13px; #9ba1ac |  |
| T24 (E111) | 724.98 | 74.21 | `"6:30 PM strength session."` | F8 13px; #9ba1ac |  |
| T25 (E117) | 758.98 | 92.88 | `"Open booking"` | F3 12px; #0d0e11 |  |
| T26 (E140) | 908.05 | 378.17 | `"Chat"` | F3 10px; #c6f24e |  |
| T27 (E147) | 908.42 | 142.24 | `"Maps"` | F3 10px; #6b7280 |  |
| T28 (E126) | 909.05 | 56.09 | `"Discover"` | F3 10px; #6b7280 |  |
| T29 (E136) | 909.43 | 218.52 | `"Courts"` | F3 10px; #6b7280 |  |
| T30 (E134) | 909.55 | 283.86 | `"Community"` | F3 10px; #6b7280 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T8, T25<br>Shape/background fill: E9 rect<br>Border/icon stroke: E27 circle, E51 circle |
| `#101216` | Path fill: E122 start (38.21, 848.98) |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E22 rect, E46 rect, E62 rect, E77 rect |
| `#1c1f26` | Shape/background fill: E97 rect |
| `#262b33` | Shape/background fill: E24 rect, E48 rect, E64 rect, E79 rect |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a3f47` | Shape/background fill: E13 circle α=.65 |
| `#6b7280` | Text fill: T5, T11, T15, T19, T27, T28, T29, T30<br>Border/icon stroke: E124 circle, E131 circle, E132 circle, E133 circle, E151 circle, E152 line<br>Path stroke: E125 start (81.21, 876.05), E144 start (150.78, 881.48), E145 start (165.76, 881.48), E146 start (152.38, 881.48), E150 start (249.36, 882.24), E153 start (251.59, 880.67), E154 start (217.7, 880.67) |
| `#9ba1ac` | Text fill: T3, T7, T9, T13, T17, T21, T23, T24 |
| `#c6f24e` | Text fill: T26<br>Shape/background fill: E27 circle, E51 circle<br>Path fill: E43 start (376.21, 290.98), E115 start (88.21, 740.98)<br>Path stroke: E43 start (376.21, 290.98), E116 start (88.21, 740.98) α=.07, E139 start (377.28, 863.05) |
| `#f2f3f5` | Text fill: T1, T2, T4, T6, T10, T12, T14, T16, T18, T20, T22<br>Shape/background fill: E17 rect<br>Border/icon stroke: E16 rect, E17 rect<br>Path stroke: E14 start (356.21, 107.98), E15 start (360.21, 111.98) |
| `#fff` | Border/icon stroke: E23 rect α=.07, E47 rect α=.07, E63 rect α=.07, E78 rect α=.07, E98 rect α=.07, E119 line α=.07, E155 rect α=.12 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (0, 0), 458.08 × 1071.05, rx=0, ry=0 | fill #2e4949 |
| E9, E120 | rect: (38.21, 84.98), 390 × 844, rx=28, ry=28 | E9: fill #0d0e11<br>E120: fill none |
| E13 | circle: centre (233.21, 102.98), r=9 | fill #3a3f47; opacity .65 |
| E16 | rect: (383.21, 99.98), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E17 | rect: (403.21, 103.98), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E22, E23 | rect: (56.21, 248.98), 354 × 78, rx=16, ry=16 | E22: fill #16181d<br>E23: fill none; stroke #fff; opacity .07 |
| E24 | rect: (69.21, 261.98), 52 × 52, rx=14, ry=14 | fill #262b33 |
| E27 | circle: centre (110.21, 304.98), r=5 | fill #c6f24e; stroke #0d0e11; stroke-width 2px |
| E46, E47 | rect: (56.21, 338.98), 354 × 78, rx=16, ry=16 | E46: fill #16181d<br>E47: fill none; stroke #fff; opacity .07 |
| E48 | rect: (69.21, 351.98), 52 × 52, rx=14, ry=14 | fill #262b33 |
| E51 | circle: centre (110.21, 394.98), r=5 | fill #c6f24e; stroke #0d0e11; stroke-width 2px |
| E62, E63 | rect: (56.21, 428.98), 354 × 78, rx=16, ry=16 | E62: fill #16181d<br>E63: fill none; stroke #fff; opacity .07 |
| E64 | rect: (69.21, 441.98), 52 × 52, rx=14, ry=14 | fill #262b33 |
| E77, E78 | rect: (56.21, 518.98), 354 × 78, rx=16, ry=16 | E77: fill #16181d<br>E78: fill none; stroke #fff; opacity .07 |
| E79 | rect: (69.21, 531.98), 52 × 52, rx=14, ry=14 | fill #262b33 |
| E97, E98 | rect: (56.21, 644.98), 354 × 147.69, rx=18, ry=18 | E97: fill #1c1f26<br>E98: fill none; stroke #fff; opacity .07 |
| E119 | line: (38.21, 848.98) → (428.21, 848.98) | fill none; stroke #fff; opacity .07 |
| E124 | circle: centre (75.21, 870.05), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E131 | circle: centre (313.41, 867.34), r=5.79 | fill none; stroke #6b7280; stroke-width 2px |
| E132 | circle: centre (302.99, 878.92), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E133 | circle: centre (323.83, 878.92), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E151 | circle: centre (234.64, 873.15), r=2.17 | fill none; stroke #6b7280 |
| E152 | line: (234.64, 882.24) → (234.64, 864.06) | fill none; stroke #6b7280 |
| E155 | rect: (38.71, 85.48), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=517; y1=2655.27; x2=517; y2=2654.27; gradientTransform=translate(-201397.7073 2241134.8241) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E10 path start (68.32, 84.98).

### Interactive-looking elements

- Conversation rows “Marcus Reyes”, “Mei Lin”, “Jordan K.”, “Aicha Bennani”.
- “Open booking” button; bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- No external artboard title text appears in this file.

**Other explicit styling:** letter-spacing values `-.11em`, `-.1em`, `-.08em`, `-.05em`, `-.03em`, `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 7. Chat 2.svg

**Screen:** Marcus Reyes conversation. **Module:** Chat.

**ViewBox:** `0 0 448.87 1070.66`. **Source:** [Chat 2.svg](../design/svg/Chat%202.svg).

### Layout, dimensions and spacing

- External “Chat” title → status bar → back and “Marcus Reyes” → five alternating message bubbles → bottom message field and plus-shaped circular control.
- Phone (22.74,71.75), 390 × 844, radius 28. Left bubbles x=40.74, width 276, height 54, radius 18, at y=217.75,361.75,519.75. Lime bubbles at (112.74,289.75) and (160.74,447.75), each 232 × 54, radius 18.
- Composer (40.74,827.75), 354 × 52, radius 16; lime circle centre (366.74,853.75), radius 18, containing a plus. There is no bottom tab bar.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E8) | 49.37 | 131.2 | `"Chat"` | F4 31px; #f2f3f5 | Outside phone, above frame |
| T2 (E13) | 96.75 | 46.74 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T3 (E23) | 149.75 | 94.74 | `"Marcus Reyes"` | F3 19px; #f2f3f5 |  |
| T4 (E31) | 241.75 | 56.74 | `"Hey! Ready for the strength block"` | F3 13px; #f2f3f5 |  |
| T5 (E42) | 259.75 | 56.74 | `"this week?"` | F3 13px; #f2f3f5 |  |
| T6 (E45) | 313.75 | 128.74 | `"Born ready. Same 6:30 slot works?"` | F3 13px; #0d0e11 |  |
| T7 (E55) | 385.75 | 56.74 | `"Locked in. Heavy squats first, the"` | F3 13px; #f2f3f5 |  |
| T8 (E59) | 403.75 | 56.74 | `"n accessories."` | F3 13px; #f2f3f5 |  |
| T9 (E62) | 471.75 | 176.74 | `"Perfect. See you at Iron Yard."` | F8 13px; #0d0e11 |  |
| T10 (E77) | 543.75 | 56.74 | `"Bring your A-game."` | F3 13px; #f2f3f5 |  |
| T11 (E83) | 860.75 | 56.74 | `"Message Marcus"` | F8 14px; #6b7280 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T6, T9<br>Shape/background fill: E11 rect<br>Path stroke: E90 start (359.74, 853.75) |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E20 rect, E29 rect, E53 rect, E75 rect, E81 rect |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a3f47` | Shape/background fill: E15 circle α=.65 |
| `#6b7280` | Text fill: T11 |
| `#c6f24e` | Shape/background fill: E44 rect, E61 rect, E89 circle |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T5, T7, T8, T10<br>Shape/background fill: E19 rect<br>Border/icon stroke: E18 rect, E19 rect<br>Path stroke: E16 start (340.74, 94.75), E17 start (344.74, 98.75), E22 start (65.74, 135.75) |
| `#fff` | Border/icon stroke: E21 rect α=.07, E30 rect α=.07, E54 rect α=.07, E76 rect α=.07, E82 rect α=.07, E92 rect α=.12 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (.06, 0), 449.01 × 1071.05, rx=0, ry=0 | fill #2e4949 |
| E11, E91 | rect: (22.74, 71.75), 390 × 844, rx=28, ry=28 | E11: fill #0d0e11<br>E91: fill none |
| E15 | circle: centre (217.74, 89.75), r=9 | fill #3a3f47; opacity .65 |
| E18 | rect: (367.74, 86.75), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E19 | rect: (387.74, 90.75), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E20, E21 | rect: (40.74, 123.75), 40 × 40, rx=12, ry=12 | E20: fill #16181d<br>E21: fill none; stroke #fff; opacity .07 |
| E29, E30 | rect: (40.74, 217.75), 276 × 54, rx=18, ry=18 | E29: fill #16181d<br>E30: fill none; stroke #fff; opacity .07 |
| E44 | rect: (112.74, 289.75), 232 × 54, rx=18, ry=18 | fill #c6f24e |
| E53, E54 | rect: (40.74, 361.75), 276 × 54, rx=18, ry=18 | E53: fill #16181d<br>E54: fill none; stroke #fff; opacity .07 |
| E61 | rect: (160.74, 447.75), 232 × 54, rx=18, ry=18 | fill #c6f24e |
| E75, E76 | rect: (40.74, 519.75), 276 × 54, rx=18, ry=18 | E75: fill #16181d<br>E76: fill none; stroke #fff; opacity .07 |
| E81, E82 | rect: (40.74, 827.75), 354 × 52, rx=16, ry=16 | E81: fill #16181d<br>E82: fill none; stroke #fff; opacity .07 |
| E89 | circle: centre (366.74, 853.75), r=18 | fill #c6f24e |
| E92 | rect: (23.24, 72.25), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=31.77; y1=2657.52; x2=31.77; y2=2656.52; gradientTransform=translate(-12173.5359 2243022.8241) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E12 path start (52.92, 71.75).

### Interactive-looking elements

- Back control; input-like “Message Marcus” field; unlabelled plus control in a lime circle. Its action is not specified.

### Ambiguities and literal-source observations

- Literal wrapping splits “then” into “the” and “n accessories.” on separate lines; both are preserved.

**Other explicit styling:** letter-spacing values `-.11em`, `-.08em`, `-.03em`, `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2.2px`, `2.4px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 8. Community 1.svg

**Screen:** Community overview with events, advertisement and community list. **Module:** Community.

**ViewBox:** `0 0 452.75 1187.77`. **Source:** [Community 1.svg](../design/svg/Community%201.svg).

### Layout, dimensions and spacing

- Two external “Community” headings → status bar → “Community”, subtitle, unlabelled lime pictogram and plus control → “HAPPENING SOON” horizontal cards → FuelUp advertisement → “COMMUNITIES” list → bottom navigation.
- Phone (27.84,196.76), 390 × 844, radius 28, with a rounded clip at (28.34,197.26), 389 × 843. Event cards 216 × 162, radius 18, at x=45.84 and 275.84, y=376.76; stripe panels 192 × 70, radius 14. Second card has an additional clip x=272.48,width=145.36, so its right-side text is clipped.
- Ad (45.84,568.76), 354 × 92, radius 18. Community cards x=45.84, 354 × 80, radius 16, y=720.76,812.76,904.76; avatars 52 × 52, radius 14; join-state pills 56 × 28. Plus button 44 × 44, radius 14. Bottom bar y=961.33, height 80; Community is lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E19) | 92.67 | 52.37 | `"Community"` | F4 64.69px; #f2f3f5 | Outside phone, above frame |
| T2 (E17) | 141.19 | 125.06 | `"Community"` | F4 31px; #f2f3f5 | Outside phone, above frame |
| T3 (E26) | 221.76 | 51.84 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E235) | 221.91 | 254.4 | `"My Communities"` | F1 12.33px; #ed1c24 | Designer annotation |
| T5 (E33) | 276.76 | 45.84 | `"Community"` | F3 27px; #f2f3f5 |  |
| T6 (E35) | 312.76 | 45.84 | `"Train with crews around you"` | F3 13px; #9ba1ac |  |
| T7 (E46) | 360.76 | 45.84 | `"HAPPENING SOON"` | F3 12px; #6b7280 |  |
| T8 (E54) | 415.76 | 81.34 | `"Meetup"` | F3 10px; #c6f24e |  |
| T9 (E186) | 415.76 | 315.22 | `"Event"` | F3 10px; #c6f24e | Second event card, right-clipped |
| T10 (E56) | 481.76 | 59.84 | `"Saturday Long Run"` | F3 15px; #f2f3f5 |  |
| T11 (E188) | 481.76 | 289.84 | `"Open Sparring Night"` | F3 15px; #f2f3f5 | Second event card, right-clipped |
| T12 (E62) | 502.76 | 59.84 | `"Sat 05 - 7:00 AM"` | F3 12.5px; #9ba1ac |  |
| T13 (E190) | 502.76 | 289.84 | `"Fri 04 - 6:00 PM"` | F3 12.5px; #9ba1ac | Second event card, right-clipped |
| T14 (E64) | 522.76 | 59.84 | `"Corniche - 18 going"` | F8 12px; #6b7280 |  |
| T15 (E192) | 522.76 | 289.84 | `"Mar Mikhael - 22 going"` | F8 12px; #6b7280 | Second event card, right-clipped |
| T16 (E78) | 598.76 | 123.84 | `"FuelUp Nutrition"` | F3 16px; #f2f3f5 |  |
| T17 (E76) | 598.76 | 360.34 | `"AD"` | F3 9px; #c6f24e |  |
| T18 (E71) | 618.76 | 75.18 | `"FN"` | F3 16px; #f2f3f5 |  |
| T19 (E80) | 619.28 | 124.36 | `"20% off recovery packs for crews."` | F3 12.5px; #c6f24e |  |
| T20 (E92) | 704.76 | 45.84 | `"COMMUNITIES"` | F3 12px; #6b7280 |  |
| T21 (E99) | 747.76 | 123.84 | `"Running"` | F3 16px; #f2f3f5 |  |
| T22 (E116) | 762.76 | 343.51 | `"Join"` | F3 12px; #0d0e11 |  |
| T23 (E97) | 765.76 | 73.28 | `"RN"` | F3 16px; #f2f3f5 |  |
| T24 (E102) | 769.76 | 123.84 | `"3.2k members "` | `"3.2k members"`: F5 12.5px; #c6f24e; `" "`: F6 12.5px; #9ba1ac |  |
| T25 (E102) | 784.76 | 123.84 | `"Pacing crews and race-day meetups."` | F6 12.5px; #9ba1ac |  |
| T26 (E123) | 839.76 | 123.84 | `"Strength"` | F3 16px; #f2f3f5 |  |
| T27 (E142) | 854.76 | 336.5 | `"Joined"` | F3 12px; #c5cad2 |  |
| T28 (E121) | 857.76 | 74.62 | `"ST"` | F3 16px; #f2f3f5 |  |
| T29 (E127) | 861.76 | 123.84 | `"2.8k members "` | `"2.8k members"`: F5 12.5px; #c6f24e; `" "`: F6 12.5px; #9ba1ac |  |
| T30 (E127) | 876.76 | 123.84 | `"Barbell, hypertrophy and form checks."` | F6 12.5px; #9ba1ac |  |
| T31 (E150) | 931.76 | 123.84 | `"Boxing"` | F3 16px; #f2f3f5 |  |
| T32 (E173) | 946.76 | 343.51 | `"Join"` | F3 12px; #0d0e11 |  |
| T33 (E147) | 949.76 | 73.73 | `"BX"` | F3 16px; #f2f3f5 |  |
| T34 (E154) | 953.76 | 123.84 | `"1.6k members "` | `"1.6k members"`: F5 12.5px; #c6f24e; `" "`: F6 12.5px; #c6f24e |  |
| T35 (E154) | 968.76 | 123.84 | `"Footwork, pad work and controlled sparring."` | F6 12.5px; #9ba1ac | Source text behind later bottom bar |
| T36 (E215) | 1020.4021 | 367.7967 | `"Chat"` | F3 10px; #6b7280 |  |
| T37 (E222) | 1020.7629 | 131.8719 | `"Maps"` | F3 10px; #6b7280 |  |
| T38 (E201) | 1021.4021 | 45.7166 | `"Discover"` | F3 10px; #6b7280 |  |
| T39 (E211) | 1021.7771 | 208.1438 | `"Courts"` | F3 10px; #6b7280 |  |
| T40 (E209) | 1021.9021 | 273.4871 | `"Community"` | F3 10px; #c6f24e |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E7 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T22, T32<br>Shape/background fill: E24 rect<br>Path stroke: E45 start (372.54, 274.76) |
| `#101216` | Path fill: E197 start (27.84, 961.33) |
| `#15171c` | stop-color: E6 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E48 rect, E94 rect, E118 rect, E144 rect, E180 rect |
| `#1c1f26` | Shape/background fill: E68 rect<br>Path fill: E140 start (341.84, 836.76) |
| `#1f3a36` | Shape/background fill: E96 rect |
| `#22262e` | Shape/background fill: E11 rect (pattern definition) |
| `#22324a` **ONE ARTBOARD ONLY** | Shape/background fill: E120 rect |
| `#2d333d` | Shape/background fill: E12 rect (pattern definition) |
| `#2e4949` | Shape/background fill: E16 rect |
| `#3a2330` **ONE ARTBOARD ONLY** | Shape/background fill: E146 rect |
| `#3a322a` **ONE ARTBOARD ONLY** | Shape/background fill: E70 rect |
| `#3a3f47` | Shape/background fill: E28 circle α=.65 |
| `#6b7280` | Text fill: T7, T14, T15, T20, T36, T37, T38, T39<br>Border/icon stroke: E178 circle, E199 circle, E226 circle, E227 line<br>Path stroke: E177 start (217.84, 976.76), E200 start (70.84, 988.4), E214 start (366.91, 975.4), E219 start (140.41, 993.83), E220 start (155.39, 993.83), E221 start (142.01, 993.83), E225 start (238.99, 994.59), E228 start (241.22, 993.02), E229 start (207.32, 993.02) |
| `#9ba1ac` | Text fill: T6, T12, T13, T24, T25, T29, T30, T35 |
| `#c5cad2` | Text fill: T27 |
| `#c6f24e` | Text fill: T8, T9, T17, T19, T24, T29, T34, T40<br>Shape/background fill: E44 rect<br>Path fill: E52 start (78.84, 400.76) α=.13, E74 start (359.84, 584.76) α=.12, E114 start (341.84, 744.76), E171 start (341.84, 928.76), E184 start (308.84, 400.76) α=.13, E230 start (316.92, 291.55)<br>Border/icon stroke: E176 circle, E206 circle, E207 circle, E208 circle<br>Path stroke: E53 start (78.84, 400.76) α=.2, E75 start (359.84, 584.76) α=.2, E115 start (341.84, 744.76) α=.07, E172 start (341.84, 928.76) α=.07, E185 start (308.84, 400.76) α=.2 |
| `#ed1c24` | Text fill: T4<br>Path fill: E234 start (296.9, 261.16)<br>Path stroke: E233 start (284.89, 252.23) |
| `#f2f3f5` | Text fill: T1, T2, T3, T5, T10, T11, T16, T18, T21, T23, T26, T28, T31, T33<br>Shape/background fill: E32 rect<br>Border/icon stroke: E31 rect, E32 rect<br>Path stroke: E29 start (345.84, 219.76), E30 start (349.84, 223.76) |
| `#fff` | Border/icon stroke: E49 rect α=.07, E51 rect α=.05, E69 rect α=.07, E95 rect α=.07, E119 rect α=.07, E145 rect α=.07, E175 line α=.07, E181 rect α=.07, E183 rect α=.05<br>Path stroke: E141 start (341.84, 836.76) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E4 | Definition: rect: (28.34, 197.26), 389 × 843, rx=28, ry=28 | fill none |
| E10, E11 | Definition: rect: (0, 0), 18 × 18, rx=0, ry=0 | E10: fill none<br>E11: fill #22262e |
| E12 | Definition: rect: (0, 0), 7 × 18, rx=0, ry=0 | fill #2d333d |
| E14 | Definition: rect: (272.48, 372.71), 145.36 × 166.05, rx=0, ry=0 | fill none |
| E16 | rect: (-.25, 0), 454.35 × 1187.77, rx=0, ry=0 | fill #2e4949 |
| E23, E24 | rect: (27.84, 196.76), 390 × 844, rx=28, ry=28 | E23: fill none<br>E24: fill #0d0e11 |
| E25 | rect: (27.84, 196.76), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E28 | circle: centre (222.84, 214.76), r=9 | fill #3a3f47; opacity .65 |
| E31 | rect: (372.84, 211.76), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E32 | rect: (392.84, 215.76), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E44 | rect: (355.84, 252.76), 44 × 44, rx=14, ry=14 | fill #c6f24e |
| E48, E49 | rect: (45.84, 376.76), 216 × 162, rx=18, ry=18 | E48: fill #16181d<br>E49: fill none; stroke #fff; opacity .07 |
| E50, E51 | rect: (57.84, 388.76), 192 × 70, rx=14, ry=14 | E50: fill url(#stripe)<br>E51: fill none; stroke #fff; opacity .05 |
| E68, E69 | rect: (45.84, 568.76), 354 × 92, rx=18, ry=18 | E68: fill #1c1f26<br>E69: fill none; stroke #fff; opacity .07 |
| E70 | rect: (59.84, 586.76), 52 × 52, rx=14, ry=14 | fill #3a322a |
| E94, E95 | rect: (45.84, 720.76), 354 × 80, rx=16, ry=16 | E94: fill #16181d<br>E95: fill none; stroke #fff; opacity .07 |
| E96 | rect: (58.84, 733.76), 52 × 52, rx=14, ry=14 | fill #1f3a36 |
| E118, E119 | rect: (45.84, 812.76), 354 × 80, rx=16, ry=16 | E118: fill #16181d<br>E119: fill none; stroke #fff; opacity .07 |
| E120 | rect: (58.84, 825.76), 52 × 52, rx=14, ry=14 | fill #22324a |
| E144, E145 | rect: (45.84, 904.76), 354 × 80, rx=16, ry=16 | E144: fill #16181d<br>E145: fill none; stroke #fff; opacity .07 |
| E146 | rect: (58.84, 917.76), 52 × 52, rx=14, ry=14 | fill #3a2330 |
| E175 | line: (27.84, 960.76) → (417.84, 960.76) | fill none; stroke #fff; opacity .07 |
| E176 | circle: centre (144.84, 977.76), r=5 | fill none; stroke #c6f24e; stroke-width 2px |
| E178 | circle: centre (378.84, 977.76), r=7 | fill none; stroke #6b7280; stroke-width 2px |
| E180, E181 | rect: (275.84, 376.76), 216 × 162, rx=18, ry=18 | E180: fill #16181d<br>E181: fill none; stroke #fff; opacity .07 |
| E182, E183 | rect: (287.84, 388.76), 192 × 70, rx=14, ry=14 | E182: fill url(#stripe)<br>E183: fill none; stroke #fff; opacity .05 |
| E199 | circle: centre (64.84, 982.4), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E206 | circle: centre (303.04, 979.69), r=5.79 | fill none; stroke #c6f24e; stroke-width 2px |
| E207 | circle: centre (292.62, 991.27), r=4.63 | fill none; stroke #c6f24e; stroke-width 2px |
| E208 | circle: centre (313.46, 991.27), r=4.63 | fill none; stroke #c6f24e; stroke-width 2px |
| E226 | circle: centre (224.27, 985.5), r=2.17 | fill none; stroke #6b7280; stroke-width 2px |
| E227 | line: (224.27, 994.59) → (224.27, 976.4) | fill none; stroke #6b7280; stroke-width 2px |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E5): x1=-2507.27; y1=2649.36; x2=-2507.27; y2=2648.36; gradientTransform=translate(978059.0175 2236252.6803) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E25 rect (27.84, 196.76), 390 × 844, rx=0, ry=0.
- `stripe` (pattern, E8): x=0; y=0; width=18; height=18; patternTransform=translate(1766.9493 -5197.4701) rotate(45) scale(1 -1); patternUnits=userSpaceOnUse; viewBox=0 0 18 18. Direct fill uses: E50 rect (57.84, 388.76), 192 × 70, rx=14, ry=14; E182 rect (287.84, 388.76), 192 × 70, rx=14, ry=14.

### Interactive-looking elements

- Plus control; nearby unlabelled lime pictogram called out by the annotation “My Communities”.
- “Saturday Long Run” and partially clipped “Open Sparring Night” cards; FuelUp Nutrition ad card.
- Running: “Join”; Strength: “Joined”; Boxing: “Join”. Community cards are also card-like targets.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- “My Communities” is red annotation copy in the notes group, not a rendered menu row.
- The Boxing description baseline y=968.76 is behind the later-painted bottom bar. The literal source string is retained and flagged.
- Image areas contain real diagonal SVG stripe patterns, not photos.

**Other explicit styling:** letter-spacing values `-.07em`, `-.04em`, `-.03em`, `-.02em`, `-.01em`, `0em`, `.12em`; stroke-width values `1.8px`, `2px`, `2.4px`, `4px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 9. Community 2.svg

**Screen:** Community registration form. **Module:** Community.

**ViewBox:** `0 0 452.75 1187.77`. **Source:** [Community 2.svg](../design/svg/Community%202.svg).

### Layout, dimensions and spacing

- External title → status bar → back and “Community registration” → COMMUNITY NAME field → CATEGORY field with chevron → PHONE field → EMAIL field → official-entity question → YES/NO chips → document-upload area → “Send request to admins”.
- Phone (32.75,210.97), 390 × 844, radius 28. Four fields x=50.75, 354 × 44, radius 14, y=344.97,422.97,500.97,578.97 (78-unit pitch).
- YES/NO pills about 70 × 34 with 17-unit curved ends; YES is lime. Upload outline extends from about (54.54,722.08) to (400.03,851.62), with a 2-unit white stroke at .07 opacity, image-plus pictogram and grey caption. Submit button (53.76,883.2), 354 × 52, radius 15.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E8) | 92.67 | 45.57 | `"Community"` | F4 64.69px; #f2f3f5 | Outside phone, above frame |
| T2 (E13) | 235.97 | 56.75 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T3 (E23) | 288.97 | 104.75 | `"Community registration"` | F3 19px; #f2f3f5 |  |
| T4 (E29) | 334.97 | 50.75 | `"COMMUNITY NAME"` | F3 12px; #6b7280 |  |
| T5 (E36) | 372.97 | 64.75 | `"e.g. Summit Trail Co."` | F3 14px; #6b7280 |  |
| T6 (E41) | 412.97 | 50.75 | `"CATEGORY"` | F3 12px; #6b7280 |  |
| T7 (E49) | 450.97 | 64.75 | `"Running"` | F3 14px; #f2f3f5 |  |
| T8 (E53) | 490.97 | 50.75 | `"PHONE"` | F3 12px; #6b7280 |  |
| T9 (E57) | 528.97 | 64.75 | `"e.g. +961 3 123 456"` | F3 14px; #6b7280 |  |
| T10 (E59) | 568.97 | 50.75 | `"EMAIL"` | F3 12px; #6b7280 |  |
| T11 (E63) | 606.97 | 64.75 | `"hello@yourshop.com"` | F3 14px; #f2f3f5 |  |
| T12 (E65) | 652.59 | 50.75 | `"Is it an official Entity? (federation, Institute, etc..)"` | F3 12px; #6b7280 |  |
| T13 (E73) | 689.14 | 74.25 | `"YES"` | F3 12px; #0d0e11 |  |
| T14 (E77) | 689.14 | 158.82 | `"NO"` | F3 12px; #c5cad2 |  |
| T15 (E79) | 814.68 | 152.23 | `"Upload official Documents"` | F3 12px; #6d6e71 |  |
| T16 (E82) | 916.2 | 145.74 | `"Send request to admins"` | F3 15px; #0d0e11 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T13, T16<br>Shape/background fill: E11 rect |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E20 rect, E34 rect, E47 rect, E55 rect, E61 rect<br>Path fill: E75 start (150.11, 668.14) |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a3f47` | Shape/background fill: E15 circle α=.65 |
| `#6b7280` | Text fill: T4, T5, T6, T8, T9, T10, T12<br>Path stroke: E52 start (378.75, 443.97) |
| `#6d6e71` **ONE ARTBOARD ONLY** | Text fill: T15<br>Path fill: E89 start (212.29, 790.28) |
| `#c5cad2` | Text fill: T14 |
| `#c6f24e` | Shape/background fill: E81 rect<br>Path fill: E71 start (72.26, 668.14), E72 start (72.26, 668.14) |
| `#f2f3f5` | Text fill: T1, T2, T3, T7, T11<br>Shape/background fill: E19 rect<br>Border/icon stroke: E18 rect, E19 rect<br>Path stroke: E16 start (350.75, 233.97), E17 start (354.75, 237.97), E22 start (75.75, 274.97) |
| `#fff` | Border/icon stroke: E21 rect α=.07, E35 rect α=.07, E48 rect α=.07, E56 rect α=.07, E62 rect α=.07, E87 rect α=.12<br>Path stroke: E76 start (150.11, 668.14) α=.07, E88 start (79.73, 722.08) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (-.25, 0), 454.35 × 1187.77, rx=0, ry=0 | fill #2e4949 |
| E11, E86 | rect: (32.75, 210.97), 390 × 844, rx=28, ry=28 | E11: fill #0d0e11<br>E86: fill none |
| E12 | rect: (32.75, 210.97), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E15 | circle: centre (227.75, 228.97), r=9 | fill #3a3f47; opacity .65 |
| E18 | rect: (377.75, 225.97), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E19 | rect: (397.75, 229.97), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E20, E21 | rect: (50.75, 262.97), 40 × 40, rx=12, ry=12 | E20: fill #16181d<br>E21: fill none; stroke #fff; opacity .07 |
| E34, E35 | rect: (50.75, 344.97), 354 × 44, rx=14, ry=14 | E34: fill #16181d<br>E35: fill none; stroke #fff; opacity .07 |
| E47, E48 | rect: (50.75, 422.97), 354 × 44, rx=14, ry=14 | E47: fill #16181d<br>E48: fill none; stroke #fff; opacity .07 |
| E55, E56 | rect: (50.75, 500.97), 354 × 44, rx=14, ry=14 | E55: fill #16181d<br>E56: fill none; stroke #fff; opacity .07 |
| E61, E62 | rect: (50.75, 578.97), 354 × 44, rx=14, ry=14 | E61: fill #16181d<br>E62: fill none; stroke #fff; opacity .07 |
| E81 | rect: (53.76, 883.2), 354 × 52, rx=15, ry=15 | fill #c6f24e |
| E87 | rect: (33.25, 211.47), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=-3030.87; y1=2651.58; x2=-3030.87; y2=2650.58; gradientTransform=translate(1182265.7576 2238140.6802) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E12 rect (32.75, 210.97), 390 × 844, rx=0, ry=0.

### Interactive-looking elements

- Back control; fields “e.g. Summit Trail Co.”, “Running” with dropdown chevron, “e.g. +961 3 123 456”, “hello@yourshop.com”.
- “YES” and “NO” chips; “Upload official Documents” area; “Send request to admins” button.

### Ambiguities and literal-source observations

- The email literally contains “yourshop”, despite the screen heading “Community registration”.

**Other explicit styling:** letter-spacing values `-.07em`, `-.01em`, `0em`, `.02em`, `.06em`, `.09em`, `.1em`, `.11em`; stroke-width values `1.8px`, `2px`, `2.2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 10. Community 3.svg

**Screen:** Lebanese Running FED. profile — Gallery tab. **Module:** Community.

**ViewBox:** `0 0 452.75 1187.77`. **Source:** [Community 3.svg](../design/svg/Community%203.svg).

### Layout, dimensions and spacing

- External headings → status bar → back/header and lime verification-shaped mark → profile card → News / Events / Gallery tabs → unlabelled three-dot control → six album tiles in 3 × 2 grid → “Load More” and double down chevrons → image-plus floating control → bottom navigation.
- Profile card (43.49,322.6), 354 × 202.9, radius 18; avatar (62.49,344.6), 72 × 72, radius 17. Card includes truncated name, Official Federation badge, member count, sport and bio, plus an unlabelled pencil-shaped icon.
- Album rectangles 100.46 × 100.46, radius 9.59; x=44.49,170.67,298.04; first y≈570.06, second y≈727.06. Labels beneath each. Lower fade rectangle (25.19,814.58), 390 × 158.54, from transparent #101216 to #000.
- Floating image-plus control approximately 51.73 × 54.33 at (347.15,898.46), #101216 fill, lime outline/icon. Bottom bar y=966.78, height 80; Community lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E21) | 92.67 | 45.56 | `"Community"` | F4 64.69px; #f2f3f5 | Outside phone, above frame |
| T2 (E42) | 180.97 | 113.99 | `"Community Profile- gallery"` | F3 19px; #f2f3f5 | Outside phone, above frame |
| T3 (E26) | 235.97 | 48.99 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E36) | 288.97 | 96.99 | `"Lebanese Running FED."` | F3 19px; #f2f3f5 |  |
| T5 (E60) | 358.6 | 152.49 | `"Lebanese Running F..."` | F3 19px; #f2f3f5 |  |
| T6 (E125) | 381.96 | 162.73 | `"Official Federation"` | F3 10px; #c6f24e |  |
| T7 (E66) | 382.5 | 265.42 | `"4.9k Members"` | F8 13px; #c6f24e |  |
| T8 (E58) | 386.6 | 83.72 | `"MR"` | F3 19px; #f2f3f5 |  |
| T9 (E70) | 408.25 | 153.94 | `"Sports, Running"` | F8 13px; #9ba1ac |  |
| T10 (E78) | 441.2 | 62.49 | `"Bio:"` | F3 13px; #c5cad2 |  |
| T11 (E86) | 466.6 | 64.3 | `"Welcome to the official Lebanese Running Federation."` | F8 13px; #c5cad2 |  |
| T12 (E82) | 505.89 | 197.44 | `"Events"` | F3 13px; #c5cad2 |  |
| T13 (E80) | 506.05 | 79.47 | `"News"` | F3 13px; #c5cad2 |  |
| T14 (E84) | 506.05 | 318.71 | `"Gallery"` | F3 13px; #c6f24e |  |
| T15 (E101) | 698.6 | 70.84 | `"Album 1"` | F8 13px; #c5cad2 |  |
| T16 (E104) | 698.6 | 197.02 | `"Album 2"` | F8 13px; #c5cad2 |  |
| T17 (E107) | 698.7 | 324.39 | `"Album 3"` | F8 13px; #c5cad2 |  |
| T18 (E113) | 855.6 | 70.84 | `"Album 4"` | F8 13px; #c5cad2 |  |
| T19 (E116) | 855.6 | 197.02 | `"Album 5"` | F8 13px; #c5cad2 |  |
| T20 (E119) | 855.71 | 324.39 | `"Album 6"` | F8 13px; #c5cad2 |  |
| T21 (E175) | 874.21 | 151.08 | `"Icon Disappears when scrolling Down and "` | F1 12.33px; #ed1c24 | Designer annotation |
| T22 (E175) | 889 | 151.08 | `"appears when scrolling up "` | F1 12.33px; #ed1c24 | Designer annotation |
| T23 (E74) | 909.29 | 191.32 | `"Load More"` | F3 12px; #c5cad2 |  |
| T24 (E155) | 1025.857 | 366.4361 | `"Chat"` | F3 10px; #6b7280 |  |
| T25 (E162) | 1026.2179 | 130.5113 | `"Maps"` | F3 10px; #6b7280 |  |
| T26 (E141) | 1026.857 | 44.3558 | `"Discover"` | F3 10px; #6b7280 |  |
| T27 (E151) | 1027.232 | 206.7835 | `"Courts"` | F3 10px; #6b7280 |  |
| T28 (E149) | 1027.357 | 272.1268 | `"Community"` | F3 10px; #c6f24e |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#000` | stop-color: E8 in linear-gradient-2, offset 1 |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Shape/background fill: E24 rect |
| `#101216` | Path fill: E50 start (362.67, 898.46), E137 start (26.48, 966.78)<br>stop-color: E7 in linear-gradient-2, offset 0, stop-opacity 0 |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E33 rect, E55 rect |
| `#22262e` | Shape/background fill: E12 rect (pattern definition) |
| `#2d333d` | Shape/background fill: E13 rect (pattern definition) |
| `#2e4949` | Shape/background fill: E20 rect |
| `#3a331c` | Shape/background fill: E57 rect |
| `#3a3f47` | Shape/background fill: E28 circle α=.65<br>Path fill: E170 start (359.41, 547.37)<br>Border/icon stroke: E132 line α=.65, E133 line α=.65 |
| `#6b7280` | Text fill: T24, T25, T26, T27<br>Border/icon stroke: E139 circle, E166 circle, E167 line<br>Path stroke: E140 start (69.48, 993.86), E154 start (365.55, 980.86), E159 start (139.05, 999.28), E160 start (154.03, 999.28), E161 start (140.64, 999.28), E165 start (237.63, 1000.04), E168 start (239.86, 998.47), E169 start (205.96, 998.47) |
| `#9ba1ac` | Text fill: T9 |
| `#c5cad2` | Text fill: T10, T11, T12, T13, T15, T16, T17, T18, T19, T20, T23<br>Path fill: E134 start (193.71, 916.45), E135 start (193.71, 926.12) |
| `#c6f24e` | Text fill: T6, T7, T14, T28<br>Path fill: E51 start (360.52, 940.63), E122 start (366.43, 360.63), E124 start (164.57, 367.38) α=.13, E131 start (326.63, 284.6)<br>Border/icon stroke: E146 circle, E147 circle, E148 circle<br>Path stroke: E50 start (362.67, 898.46) |
| `#ed1c24` | Text fill: T21, T22<br>Path fill: E174 start (341.11, 917.96)<br>Path stroke: E173 start (329.1, 909.03) |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T5, T8<br>Shape/background fill: E32 rect<br>Border/icon stroke: E31 rect, E32 rect<br>Path stroke: E29 start (342.99, 233.97), E30 start (346.99, 237.97), E35 start (67.99, 274.97) |
| `#fff` | Border/icon stroke: E34 rect α=.07, E48 rect α=.12, E56 rect α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E11, E12 | Definition: rect: (0, 0), 18 × 18, rx=0, ry=0 | E11: fill none<br>E12: fill #22262e |
| E13 | Definition: rect: (0, 0), 7 × 18, rx=0, ry=0 | fill #2d333d |
| E20 | rect: (-.25, 0), 454.35 × 1187.77, rx=0, ry=0 | fill #2e4949 |
| E24, E46 | rect: (26.48, 210.97), 390 × 844, rx=28, ry=28 | E24: fill #0d0e11<br>E46: fill none |
| E25 | rect: (26.48, 210.97), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E28 | circle: centre (219.99, 228.97), r=9 | fill #3a3f47; opacity .65 |
| E31 | rect: (369.99, 225.97), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E32 | rect: (389.99, 229.97), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E33, E34 | rect: (42.99, 262.97), 40 × 40, rx=12, ry=12 | E33: fill #16181d<br>E34: fill none; stroke #fff; opacity .07 |
| E47 | rect: (25.19, 814.58), 390 × 158.54, rx=0, ry=0 | fill url(#linear-gradient-2) |
| E48 | rect: (26.98, 211.47), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |
| E52 | rect: (44.49, 570.06), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe) |
| E53 | rect: (170.67, 570.06), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-2) |
| E54 | rect: (298.04, 570.16), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-3) |
| E55, E56 | rect: (43.49, 322.6), 354 × 202.9, rx=18, ry=18 | E55: fill #16181d<br>E56: fill none; stroke #fff; opacity .07 |
| E57 | rect: (62.49, 344.6), 72 × 72, rx=17, ry=17 | fill #3a331c |
| E110 | rect: (44.49, 727.06), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-4) |
| E111 | rect: (170.67, 727.06), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-5) |
| E112 | rect: (298.04, 727.17), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-6) |
| E132 | line: (157.48, 486.69) → (157.48, 515.69) | fill none; stroke #3a3f47; opacity .65 |
| E133 | line: (287.94, 486.69) → (287.94, 515.69) | fill none; stroke #3a3f47; opacity .65 |
| E139 | circle: centre (63.48, 987.86), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E146 | circle: centre (301.68, 985.15), r=5.79 | fill none; stroke #c6f24e; stroke-width 2px |
| E147 | circle: centre (291.26, 996.73), r=4.63 | fill none; stroke #c6f24e; stroke-width 2px |
| E148 | circle: centre (312.1, 996.73), r=4.63 | fill none; stroke #c6f24e; stroke-width 2px |
| E166 | circle: centre (222.91, 990.95), r=2.17 | fill none; stroke #6b7280; stroke-width 2px |
| E167 | line: (222.91, 1000.04) → (222.91, 981.86) | fill none; stroke #6b7280; stroke-width 2px |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=-3509.28; y1=2651.58; x2=-3509.28; y2=2650.58; gradientTransform=translate(1368838.734 2238140.6802) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E25 rect (26.48, 210.97), 390 × 844, rx=0, ry=0.
- `linear-gradient-2` (linearGradient, E6): x1=220.19; y1=822.03; x2=220.19; y2=976.04; gradientUnits=userSpaceOnUse. Direct fill uses: E47 rect (25.19, 814.58), 390 × 158.54, rx=0, ry=0.
- `stripe` (pattern, E9): x=0; y=0; width=18; height=18; patternTransform=translate(-5302.2332 -4730.257) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768); patternUnits=userSpaceOnUse; viewBox=0 0 18 18. Direct fill uses: E52 rect (44.49, 570.06), 100.46 × 100.46, rx=9.59, ry=9.59.
- `stripe-2` (pattern, E14); inherits `#stripe`: patternTransform=translate(-5291.6813 -4730.257) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E53 rect (170.67, 570.06), 100.46 × 100.46, rx=9.59, ry=9.59.
- `stripe-3` (pattern, E15); inherits `#stripe`: patternTransform=translate(-5267.0921 -4730.1537) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E54 rect (298.04, 570.16), 100.46 × 100.46, rx=9.59, ry=9.59.
- `stripe-4` (pattern, E16); inherits `#stripe`: patternTransform=translate(-5302.2332 -4717.6018) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E110 rect (44.49, 727.06), 100.46 × 100.46, rx=9.59, ry=9.59.
- `stripe-5` (pattern, E17); inherits `#stripe`: patternTransform=translate(-5291.6813 -4717.6018) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E111 rect (170.67, 727.06), 100.46 × 100.46, rx=9.59, ry=9.59.
- `stripe-6` (pattern, E18); inherits `#stripe`: patternTransform=translate(-5267.0921 -4717.4986) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E112 rect (298.04, 727.17), 100.46 × 100.46, rx=9.59, ry=9.59.

### Interactive-looking elements

- Back; pencil-shaped control; profile tabs “News”, “Events”, “Gallery” (Gallery lime).
- Three-dot control; “Album 1” through “Album 6”; “Load More” and paired down chevrons; unlabelled image-plus floating control.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- Red annotation literally states when the icon disappears/appears. The SVG itself contains no animation.
- Album tiles are stripe-pattern fills; no album images or contents are supplied.

**Other explicit styling:** letter-spacing values `-.06em`, `-.05em`, `-.03em`, `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2px`, `2.2px`, `4px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 11. Community 4.svg

**Screen:** Lebanese Running FED. profile — Events tab. **Module:** Community.

**ViewBox:** `0 0 452.75 1187.77`. **Source:** [Community 4.svg](../design/svg/Community%204.svg).

### Layout, dimensions and spacing

- External headings → status bar/back/header → profile/bio card with News / Events / Gallery tabs → three-dot control → two repeated event cards → lower fade and “Load More” → plus floating control → bottom navigation.
- Profile card (40.62,321.33), 354 × 202.9, radius 18; avatar 72 × 72, radius 17. Events is lime; News/Gallery muted. Both event cards 326.52 × 162, radius 18, x=54.36,y=563.9 and 753.18; stripe image panels 302.52 × 70, radius 14.
- Lower fade (23.61,806.98), 390 × 158.54. Floating plus panel approximately 51.73 × 54.33 at (338.15,897.68), dark fill and lime outline. Bottom bar y=965.51, height 80; Community lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E17) | 92.67 | 45.56 | `"Community"` | F4 64.69px; #f2f3f5 | Outside phone, above frame |
| T2 (E20) | 183.27 | 83.57 | `"Community Profile- Events"` | F3 19px; #f2f3f5 | Outside phone, above frame |
| T3 (E27) | 234.7 | 46.12 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E38) | 287.7 | 94.12 | `"Lebanese Running FED."` | F3 19px; #f2f3f5 |  |
| T5 (E67) | 357.33 | 149.62 | `"Lebanese Running F..."` | F3 19px; #f2f3f5 |  |
| T6 (E112) | 380.69 | 159.86 | `"Official Federation"` | F3 10px; #c6f24e |  |
| T7 (E73) | 381.23 | 262.55 | `"4.9k Members"` | F8 13px; #c6f24e |  |
| T8 (E65) | 385.33 | 80.85 | `"MR"` | F3 19px; #f2f3f5 |  |
| T9 (E77) | 406.99 | 151.07 | `"Sports, Running"` | F8 13px; #9ba1ac |  |
| T10 (E86) | 439.93 | 59.62 | `"Bio:"` | F3 13px; #c5cad2 |  |
| T11 (E94) | 465.33 | 61.43 | `"Welcome to the official Lebanese Running Federation."` | F8 13px; #c5cad2 |  |
| T12 (E90) | 504.63 | 194.56 | `"Events"` | F3 13px; #c6f24e |  |
| T13 (E88) | 504.78 | 76.6 | `"News"` | F3 13px; #c5cad2 |  |
| T14 (E92) | 504.78 | 315.84 | `"Gallery"` | F3 13px; #c5cad2 |  |
| T15 (E164) | 602.9 | 93.75 | `"Event"` | F3 10px; #c6f24e |  |
| T16 (E166) | 668.9 | 68.36 | `"Open Night Run"` | F3 15px; #f2f3f5 |  |
| T17 (E170) | 689.9 | 68.36 | `"Fri 04 - 6:00 PM"` | F3 12.5px; #9ba1ac |  |
| T18 (E172) | 709.9 | 68.36 | `"Mar Mikhael - 22 going"` | F8 12px; #6b7280 |  |
| T19 (E52) | 792.18 | 93.75 | `"Event"` | F3 10px; #c6f24e |  |
| T20 (E54) | 858.18 | 68.36 | `"Open Night Run"` | F3 15px; #f2f3f5 |  |
| T21 (E58) | 879.18 | 68.36 | `"Fri 04 - 6:00 PM"` | F3 12.5px; #9ba1ac |  |
| T22 (E60) | 899.18 | 68.36 | `"Mar Mikhael - 22 going"` | F8 12px; #6b7280 |  |
| T23 (E82) | 908.03 | 188.45 | `"Load More"` | F3 12px; #c5cad2 |  |
| T24 (E142) | 1024.5881 | 363.5648 | `"Chat"` | F3 10px; #6b7280 |  |
| T25 (E149) | 1024.9489 | 127.6395 | `"Maps"` | F3 10px; #6b7280 |  |
| T26 (E128) | 1025.5881 | 41.4842 | `"Discover"` | F3 10px; #6b7280 |  |
| T27 (E138) | 1025.9631 | 203.9114 | `"Courts"` | F3 10px; #6b7280 |  |
| T28 (E136) | 1026.0881 | 269.2557 | `"Community"` | F3 10px; #c6f24e |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#000` | stop-color: E13 in linear-gradient-2, offset 1 |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Shape/background fill: E24 rect |
| `#101216` | Path fill: E124 start (23.61, 965.51)<br>stop-color: E12 in linear-gradient-2, offset 0, stop-opacity 0 |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E26 rect, E34 rect, E46 rect, E158 rect<br>Path fill: E177 start (353.67, 897.68) |
| `#22262e` | Shape/background fill: E9 rect (pattern definition) |
| `#2d333d` | Shape/background fill: E10 rect (pattern definition) |
| `#2e4949` | Shape/background fill: E16 rect |
| `#3a331c` | Shape/background fill: E64 rect |
| `#3a3f47` | Shape/background fill: E29 circle α=.65<br>Path fill: E157 start (356.54, 546.1)<br>Border/icon stroke: E119 line α=.65, E120 line α=.65 |
| `#6b7280` | Text fill: T18, T22, T24, T25, T26, T27<br>Border/icon stroke: E126 circle, E153 circle, E154 line<br>Path stroke: E127 start (66.61, 992.59), E141 start (362.68, 979.59), E146 start (136.18, 998.01), E147 start (151.16, 998.01), E148 start (137.77, 998.01), E152 start (234.76, 998.77), E155 start (236.98, 997.2), E156 start (203.09, 997.2) |
| `#9ba1ac` | Text fill: T9, T17, T21 |
| `#c5cad2` | Text fill: T10, T11, T13, T14, T23<br>Path fill: E121 start (190.84, 915.18), E122 start (190.84, 924.85) |
| `#c6f24e` | Text fill: T6, T7, T12, T15, T19, T28<br>Path fill: E50 start (87.36, 777.18) α=.13, E109 start (363.56, 359.36), E111 start (161.69, 366.11) α=.13, E118 start (323.76, 283.33), E162 start (87.36, 587.9) α=.13, E178 start (362.51, 926.83)<br>Border/icon stroke: E133 circle, E134 circle, E135 circle<br>Path stroke: E51 start (87.36, 777.18) α=.2, E163 start (87.36, 587.9) α=.2, E177 start (353.67, 897.68) |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T5, T8, T16, T20<br>Shape/background fill: E33 rect<br>Border/icon stroke: E32 rect, E33 rect<br>Path stroke: E30 start (340.12, 232.7), E31 start (344.12, 236.7), E36 start (65.12, 273.7) |
| `#fff` | Border/icon stroke: E35 rect α=.07, E37 rect α=.07, E45 rect α=.12, E47 rect α=.07, E49 rect α=.05, E159 rect α=.07, E161 rect α=.05 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E8, E9 | Definition: rect: (0, 0), 18 × 18, rx=0, ry=0 | E8: fill none<br>E9: fill #22262e |
| E10 | Definition: rect: (0, 0), 7 × 18, rx=0, ry=0 | fill #2d333d |
| E16 | rect: (-.25, 0), 454.35 × 1187.77, rx=0, ry=0 | fill #2e4949 |
| E24, E44 | rect: (23.61, 209.7), 390 × 844, rx=28, ry=28 | E24: fill #0d0e11<br>E44: fill none |
| E25 | rect: (23.61, 209.7), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E26, E37 | rect: (54.36, 753.18), 326.52 × 162, rx=18, ry=18 | E26: fill #16181d<br>E37: fill none; stroke #fff; opacity .07 |
| E29 | circle: centre (217.12, 227.7), r=9 | fill #3a3f47; opacity .65 |
| E32 | rect: (367.12, 224.7), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E33 | rect: (387.12, 228.7), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E34, E35 | rect: (40.12, 261.7), 40 × 40, rx=12, ry=12 | E34: fill #16181d<br>E35: fill none; stroke #fff; opacity .07 |
| E45 | rect: (24.11, 210.2), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |
| E46, E47 | rect: (40.62, 321.33), 354 × 202.9, rx=18, ry=18 | E46: fill #16181d<br>E47: fill none; stroke #fff; opacity .07 |
| E48, E49 | rect: (66.36, 765.18), 302.52 × 70, rx=14, ry=14 | E48: fill url(#stripe)<br>E49: fill none; stroke #fff; opacity .05 |
| E64 | rect: (59.62, 343.33), 72 × 72, rx=17, ry=17 | fill #3a331c |
| E81 | rect: (23.61, 806.98), 390 × 158.54, rx=0, ry=0 | fill url(#linear-gradient-2) |
| E119 | line: (154.61, 485.42) → (154.61, 514.42) | fill none; stroke #3a3f47; opacity .65 |
| E120 | line: (285.07, 485.42) → (285.07, 514.42) | fill none; stroke #3a3f47; opacity .65 |
| E126 | circle: centre (60.61, 986.59), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E133 | circle: centre (298.81, 983.88), r=5.79 | fill none; stroke #c6f24e; stroke-width 2px |
| E134 | circle: centre (288.39, 995.46), r=4.63 | fill none; stroke #c6f24e; stroke-width 2px |
| E135 | circle: centre (309.23, 995.46), r=4.63 | fill none; stroke #c6f24e; stroke-width 2px |
| E153 | circle: centre (220.04, 989.68), r=2.17 | fill none; stroke #6b7280; stroke-width 2px |
| E154 | line: (220.04, 998.77) → (220.04, 980.59) | fill none; stroke #6b7280; stroke-width 2px |
| E158, E159 | rect: (54.36, 563.9), 326.52 × 162, rx=18, ry=18 | E158: fill #16181d<br>E159: fill none; stroke #fff; opacity .07 |
| E160, E161 | rect: (66.36, 575.9), 302.52 × 70, rx=14, ry=14 | E160: fill url(#stripe-2)<br>E161: fill none; stroke #fff; opacity .05 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=-3984.28; y1=2651.58; x2=-3984.28; y2=2650.58; gradientTransform=translate(1554088.4978 2238140.6802) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E25 rect (23.61, 209.7), 390 × 844, rx=0, ry=0.
- `linear-gradient-2` (linearGradient, E11): x1=218.61; y1=814.43; x2=218.61; y2=968.44; gradientUnits=userSpaceOnUse. Direct fill uses: E81 rect (23.61, 806.98), 390 × 158.54, rx=0, ry=0.
- `stripe` (pattern, E6): x=0; y=0; width=18; height=18; patternTransform=translate(323.5912 -5151.9787) rotate(45) scale(1 -1); patternUnits=userSpaceOnUse; viewBox=0 0 18 18. Direct fill uses: E48 rect (66.36, 765.18), 302.52 × 70, rx=14, ry=14.
- `stripe-2` (pattern, E14); inherits `#stripe`: patternTransform=translate(323.5912 -5163.0651) rotate(45) scale(1 -1). Direct fill uses: E160 rect (66.36, 575.9), 302.52 × 70, rx=14, ry=14.

### Interactive-looking elements

- Back; pencil-shaped profile control; “News”, “Events”, “Gallery” tabs.
- Three-dot control; both “Open Night Run” cards; “Load More” / double down chevrons; unlabelled plus floating control.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- Both cards repeat the same event name, date/time and attendance/location copy exactly.
- The lower fade is painted after the second card and its text.

**Other explicit styling:** letter-spacing values `-.06em`, `-.05em`, `-.03em`, `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2px`, `2.2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 12. Community 5.svg

**Screen:** Lebanese Running FED. profile — News tab. **Module:** Community.

**ViewBox:** `0 0 452.75 1187.77`. **Source:** [Community 5.svg](../design/svg/Community%205.svg).

### Layout, dimensions and spacing

- External headings → status bar/back/header → profile/bio card and News / Events / Gallery tabs → large striped post/media block with NM avatar and “Naji Mohammad” → three dots and reaction/comment/share-shaped controls → plus floating control → bottom navigation.
- Phone (24.14,209.7), 390 × 844, radius 28, solid #0d0e11 (no gradient definition). Profile card (41.15,321.33), 354 × 202.9, radius 18; avatar 72 × 72, radius 17. News is lime.
- Striped media rectangle (24.14,569.64), 389.5 × 300.5; circular NM avatar radius 12.94. Three white dots near y=885.7; grey face, speech-bubble and share-network shapes near y=884–905. Floating plus panel approximately 51.73 × 54.33 at (338.68,897.68). Bottom bar y=965.51, height 80; Community lime.
- A #2a2b2b line at y=1104.24 extends x=117.96–507.46, outside the phone and partly outside the artboard.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E10) | 92.67 | 45.57 | `"Community"` | F4 64.69px; #f2f3f5 | Outside phone, above frame |
| T2 (E14) | 183.27 | 84.1 | `"Community Profile- News"` | F3 19px; #f2f3f5 | Outside phone, above frame |
| T3 (E19) | 234.7 | 46.65 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E29) | 287.7 | 94.65 | `"Lebanese Running FED."` | F3 19px; #f2f3f5 |  |
| T5 (E42) | 357.33 | 150.15 | `"Lebanese Running F..."` | F3 19px; #f2f3f5 |  |
| T6 (E82) | 380.69 | 160.39 | `"Official Federation"` | F3 10px; #c6f24e |  |
| T7 (E48) | 381.23 | 263.08 | `"4.9k Members"` | F8 13px; #c6f24e |  |
| T8 (E40) | 385.33 | 81.38 | `"MR"` | F3 19px; #f2f3f5 |  |
| T9 (E52) | 406.99 | 151.6 | `"Sports, Running"` | F8 13px; #9ba1ac |  |
| T10 (E56) | 439.93 | 60.15 | `"Bio:"` | F3 13px; #c5cad2 |  |
| T11 (E64) | 465.33 | 61.96 | `"Welcome to the official Lebanese Running Federation."` | F8 13px; #c5cad2 |  |
| T12 (E60) | 504.63 | 195.09 | `"Events"` | F3 13px; #c5cad2 |  |
| T13 (E58) | 504.78 | 77.13 | `"News"` | F3 13px; #c6f24e |  |
| T14 (E62) | 504.78 | 316.37 | `"Gallery"` | F3 13px; #c5cad2 |  |
| T15 (E137) | 593.91 | 39.31 | `"NM"` | F3 9.06px; #f2f3f5 |  |
| T16 (E133) | 596.04 | 65.65 | `"Naji Mohammad"` | F8 13px; #c5cad2 |  |
| T17 (E110) | 1024.5882 | 364.0945 | `"Chat"` | F3 10px; #6b7280 |  |
| T18 (E117) | 1024.9491 | 128.1697 | `"Maps"` | F3 10px; #6b7280 |  |
| T19 (E96) | 1025.5882 | 42.0144 | `"Discover"` | F3 10px; #6b7280 |  |
| T20 (E106) | 1025.9632 | 204.4422 | `"Courts"` | F3 10px; #6b7280 |  |
| T21 (E104) | 1026.0882 | 269.7854 | `"Community"` | F3 10px; #c6f24e |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#0d0e11` | Shape/background fill: E18 rect |
| `#101216` | Path fill: E92 start (24.14, 965.51) |
| `#16181d` | Shape/background fill: E26 rect, E37 rect<br>Path fill: E126 start (354.2, 897.68) |
| `#22262e` | Shape/background fill: E6 rect (pattern definition) |
| `#2a2b2b` | Border/icon stroke: E13 line |
| `#2d333d` | Shape/background fill: E7 rect (pattern definition) |
| `#2e4949` | Shape/background fill: E9 rect |
| `#3a331c` | Shape/background fill: E39 rect, E136 circle |
| `#3a3f47` | Shape/background fill: E21 circle α=.65<br>Path fill: E130 start (72.94, 892.87), E132 start (134.47, 904.94)<br>Border/icon stroke: E89 line α=.65, E90 line α=.65, E128 rect<br>Path stroke: E131 start (89.08, 884.27) |
| `#6b7280` | Text fill: T17, T18, T19, T20<br>Border/icon stroke: E94 circle, E121 circle, E122 line<br>Path stroke: E95 start (67.14, 992.59), E109 start (363.21, 979.59), E114 start (136.71, 998.01), E115 start (151.69, 998.01), E116 start (138.3, 998.01), E120 start (235.29, 998.77), E123 start (237.51, 997.2), E124 start (203.62, 997.2) |
| `#9ba1ac` | Text fill: T9 |
| `#c5cad2` | Text fill: T10, T11, T12, T14, T16 |
| `#c6f24e` | Text fill: T6, T7, T13, T21<br>Path fill: E79 start (364.09, 359.36), E81 start (162.22, 366.11) α=.13, E88 start (324.29, 283.33), E127 start (363.04, 926.83)<br>Border/icon stroke: E101 circle, E102 circle, E103 circle<br>Path stroke: E126 start (354.2, 897.68) |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T5, T8, T15<br>Shape/background fill: E25 rect<br>Border/icon stroke: E24 rect, E25 rect<br>Path stroke: E22 start (340.65, 232.7), E23 start (344.65, 236.7), E28 start (65.65, 273.7) |
| `#fff` | Path fill: E129 start (206.96, 888.07)<br>Border/icon stroke: E27 rect α=.07, E36 rect α=.12, E38 rect α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E5, E6 | Definition: rect: (0, 0), 18 × 18, rx=0, ry=0 | E5: fill none<br>E6: fill #22262e |
| E7 | Definition: rect: (0, 0), 7 × 18, rx=0, ry=0 | fill #2d333d |
| E9 | rect: (-.25, 0), 454.35 × 1187.77, rx=0, ry=0 | fill #2e4949 |
| E13 | line: (117.96, 1104.24) → (507.46, 1104.24) | fill none; stroke #2a2b2b |
| E18, E35 | rect: (24.14, 209.7), 390 × 844, rx=28, ry=28 | E18: fill #0d0e11<br>E35: fill none |
| E21 | circle: centre (217.65, 227.7), r=9 | fill #3a3f47; opacity .65 |
| E24 | rect: (367.65, 224.7), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E25 | rect: (387.65, 228.7), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E26, E27 | rect: (40.65, 261.7), 40 × 40, rx=12, ry=12 | E26: fill #16181d<br>E27: fill none; stroke #fff; opacity .07 |
| E36 | rect: (24.64, 210.2), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |
| E37, E38 | rect: (41.15, 321.33), 354 × 202.9, rx=18, ry=18 | E37: fill #16181d<br>E38: fill none; stroke #fff; opacity .07 |
| E39 | rect: (60.15, 343.33), 72 × 72, rx=17, ry=17 | fill #3a331c |
| E89 | line: (155.14, 485.42) → (155.14, 514.42) | fill none; stroke #3a3f47; opacity .65 |
| E90 | line: (285.6, 485.42) → (285.6, 514.42) | fill none; stroke #3a3f47; opacity .65 |
| E94 | circle: centre (61.14, 986.59), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E101 | circle: centre (299.34, 983.88), r=5.79 | fill none; stroke #c6f24e; stroke-width 2px |
| E102 | circle: centre (288.92, 995.46), r=4.63 | fill none; stroke #c6f24e; stroke-width 2px |
| E103 | circle: centre (309.76, 995.46), r=4.63 | fill none; stroke #c6f24e; stroke-width 2px |
| E121 | circle: centre (220.57, 989.68), r=2.17 | fill none; stroke #6b7280; stroke-width 2px |
| E122 | line: (220.57, 998.77) → (220.57, 980.59) | fill none; stroke #6b7280; stroke-width 2px |
| E128 | rect: (24.14, 569.64), 389.5 × 300.5, rx=0, ry=0 | fill url(#stripe); stroke #3a3f47 |
| E136 | circle: centre (46.68, 591.95), r=12.94 | fill #3a331c |

**Gradient/pattern definitions and uses:**

- `stripe` (pattern, E3): x=0; y=0; width=18; height=18; patternTransform=translate(4896.3313 -2845.8375) rotate(69.4084) scale(2.8462 -1.8741) skewX(-36.9655); patternUnits=userSpaceOnUse; viewBox=0 0 18 18. Direct fill uses: E128 rect (24.14, 569.64), 389.5 × 300.5, rx=0, ry=0.

### Interactive-looking elements

- Back; pencil-shaped profile control; “News”, “Events”, “Gallery” tabs.
- Post author/avatar and striped media are possible card targets; unlabelled three-dot, face/reaction, comment-shaped and share-shaped controls; plus floating control.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- The post has no body text beyond “NM” and “Naji Mohammad”. The striped rectangle is the only supplied media.

**Other explicit styling:** letter-spacing values `-.06em`, `-.05em`, `-.03em`, `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2px`, `2.2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 13. Community 6.svg

**Screen:** Running community — location groups and event. **Module:** Community.

**ViewBox:** `0 0 452.75 1187.77`. **Source:** [Community 6.svg](../design/svg/Community%206.svg).

### Layout, dimensions and spacing

- External title → status bar/back/Running → Running profile summary → LOCATION GROUPS → three location rows → EVENTS → one event card → “Create event”.
- Phone (21.65,197.02), 390 × 844, radius 28. Summary card (39.65,311.02), 354 × 142, radius 18; RN avatar 64 × 64, radius 17. Location cards 354 × 58, radius 16, at y=517.02,585.02,653.02 (10-unit gaps).
- Event card (39.65,773.02), 354 × 162, radius 18; stripe image panel 330 × 70, radius 14. Bottom action (39.65,953.02), 354 × 52, radius 15. No bottom navigation bar.
- A #2a2b2b line at y=1104.24 extends from x=-354.86 to 34.64 outside the phone, mostly outside the artboard.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E13) | 92.67 | 45.57 | `"Community"` | F4 64.69px; #f2f3f5 | Outside phone, above frame |
| T2 (E18) | 222.02 | 45.65 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T3 (E28) | 275.02 | 93.65 | `"Running"` | F3 19px; #f2f3f5 |  |
| T4 (E36) | 349.02 | 137.65 | `"Running"` | F3 22px; #f2f3f5 |  |
| T5 (E34) | 373.02 | 75.93 | `"RN"` | F3 19px; #f2f3f5 |  |
| T6 (E39) | 375.02 | 137.65 | `"3.2k members - official"` | F8 13px; #9ba1ac |  |
| T7 (E45) | 425.02 | 57.65 | `"Runners of every pace, from first 5k to"` | F8 13px; #c5cad2 |  |
| T8 (E61) | 445.02 | 57.65 | `"marathon crews and race-day meetups."` | F8 13px; #c5cad2 |  |
| T9 (E73) | 501.02 | 39.65 | `"LOCATION GROUPS"` | F3 12px; #6b7280 |  |
| T10 (E83) | 540.02 | 55.65 | `"Corniche Runners"` | F3 15px; #f2f3f5 |  |
| T11 (E87) | 560.02 | 55.65 | `"420 members nearby"` | F8 12px; #9ba1ac |  |
| T12 (E96) | 608.02 | 55.65 | `"Horsh Beirut Pacers"` | F3 15px; #f2f3f5 |  |
| T13 (E100) | 628.02 | 55.65 | `"310 members nearby"` | F3 12px; #9ba1ac |  |
| T14 (E105) | 676.02 | 55.65 | `"Jounieh Bay Run Club"` | F3 15px; #f2f3f5 |  |
| T15 (E109) | 696.02 | 55.65 | `"180 members nearby"` | F8 12px; #9ba1ac |  |
| T16 (E116) | 757.02 | 39.65 | `"EVENTS"` | F3 12px; #6b7280 |  |
| T17 (E124) | 812.02 | 75.15 | `"Meetup"` | F3 10px; #c6f24e |  |
| T18 (E126) | 878.02 | 53.65 | `"Saturday Long Run"` | F3 15px; #f2f3f5 |  |
| T19 (E132) | 899.02 | 53.65 | `"Sat 05 - 7:00 AM"` | F3 12.5px; #9ba1ac |  |
| T20 (E134) | 919.02 | 53.65 | `"Corniche - 18 going"` | F8 12px; #6b7280 |  |
| T21 (E139) | 986.02 | 168.63 | `"Create event"` | F3 16px; #0d0e11 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T21<br>Shape/background fill: E16 rect |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E25 rect, E31 rect, E81 rect, E94 rect, E103 rect, E118 rect |
| `#1f3a36` | Shape/background fill: E33 rect |
| `#22262e` | Shape/background fill: E9 rect (pattern definition) |
| `#2a2b2b` | Border/icon stroke: E145 line |
| `#2d333d` | Shape/background fill: E10 rect (pattern definition) |
| `#2e4949` | Shape/background fill: E12 rect |
| `#3a3f47` | Shape/background fill: E20 circle α=.65 |
| `#6b7280` | Text fill: T9, T16, T20<br>Path stroke: E93 start (375.65, 545.02), E102 start (375.65, 613.02), E115 start (375.65, 681.02) |
| `#9ba1ac` | Text fill: T6, T11, T13, T15, T19 |
| `#c5cad2` | Text fill: T7, T8 |
| `#c6f24e` | Text fill: T17<br>Shape/background fill: E138 rect<br>Path fill: E122 start (72.65, 797.02) α=.13<br>Path stroke: E123 start (72.65, 797.02) α=.2 |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T5, T10, T12, T14, T18<br>Shape/background fill: E24 rect<br>Border/icon stroke: E23 rect, E24 rect<br>Path stroke: E21 start (339.65, 220.02), E22 start (343.65, 224.02), E27 start (64.65, 261.02) |
| `#fff` | Border/icon stroke: E26 rect α=.07, E32 rect α=.07, E82 rect α=.07, E95 rect α=.07, E104 rect α=.07, E119 rect α=.07, E121 rect α=.05, E144 rect α=.12 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E8, E9 | Definition: rect: (0, 0), 18 × 18, rx=0, ry=0 | E8: fill none<br>E9: fill #22262e |
| E10 | Definition: rect: (0, 0), 7 × 18, rx=0, ry=0 | fill #2d333d |
| E12 | rect: (-.25, 0), 454.35 × 1187.77, rx=0, ry=0 | fill #2e4949 |
| E16, E143 | rect: (21.65, 197.02), 390 × 844, rx=28, ry=28 | E16: fill #0d0e11<br>E143: fill none |
| E17 | rect: (21.65, 197.02), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E20 | circle: centre (216.65, 215.02), r=9 | fill #3a3f47; opacity .65 |
| E23 | rect: (366.65, 212.02), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E24 | rect: (386.65, 216.02), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E25, E26 | rect: (39.65, 249.02), 40 × 40, rx=12, ry=12 | E25: fill #16181d<br>E26: fill none; stroke #fff; opacity .07 |
| E31, E32 | rect: (39.65, 311.02), 354 × 142, rx=18, ry=18 | E31: fill #16181d<br>E32: fill none; stroke #fff; opacity .07 |
| E33 | rect: (57.65, 335.02), 64 × 64, rx=17, ry=17 | fill #1f3a36 |
| E81, E82 | rect: (39.65, 517.02), 354 × 58, rx=16, ry=16 | E81: fill #16181d<br>E82: fill none; stroke #fff; opacity .07 |
| E94, E95 | rect: (39.65, 585.02), 354 × 58, rx=16, ry=16 | E94: fill #16181d<br>E95: fill none; stroke #fff; opacity .07 |
| E103, E104 | rect: (39.65, 653.02), 354 × 58, rx=16, ry=16 | E103: fill #16181d<br>E104: fill none; stroke #fff; opacity .07 |
| E118, E119 | rect: (39.65, 773.02), 354 × 162, rx=18, ry=18 | E118: fill #16181d<br>E119: fill none; stroke #fff; opacity .07 |
| E120, E121 | rect: (51.65, 785.02), 330 × 70, rx=14, ry=14 | E120: fill url(#stripe)<br>E121: fill none; stroke #fff; opacity .05 |
| E138 | rect: (39.65, 953.02), 354 × 52, rx=15, ry=15 | fill #c6f24e |
| E144 | rect: (22.15, 197.52), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |
| E145 | line: (-354.86, 1104.24) → (34.64, 1104.24) | fill none; stroke #2a2b2b |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=-4925.28; y1=2652.71; x2=-4925.28; y2=2651.71; gradientTransform=translate(1921077.6001 2239084.6802) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E17 rect (21.65, 197.02), 390 × 844, rx=0, ry=0.
- `stripe` (pattern, E6): x=0; y=0; width=18; height=18; patternTransform=translate(-1141.2047 -8136.7115) rotate(45) scale(1 -1); patternUnits=userSpaceOnUse; viewBox=0 0 18 18. Direct fill uses: E120 rect (51.65, 785.02), 330 × 70, rx=14, ry=14.

### Interactive-looking elements

- Back; chevron rows “Corniche Runners”, “Horsh Beirut Pacers”, “Jounieh Bay Run Club”.
- “Saturday Long Run” card; “Create event” button.

**Other explicit styling:** letter-spacing values `-.03em`, `-.02em`, `-.01em`, `0em`, `.03em`, `.09em`, `.11em`, `.12em`; stroke-width values `1.8px`, `2px`, `2.2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 14. COURTS 1.svg

**Screen:** Let’s Go Paddle venue profile — Courts tab. **Module:** Courts.

**ViewBox:** `0 0 489.96 1072.13`. **Source:** [COURTS 1.svg](../design/svg/COURTS%201.svg).

### Layout, dimensions and spacing

- External “Courts” and “Courts profile” → status bar/back/Courts, grey unlabelled header icon and lime plus → striped cover with overlapping LGP circle → venue name/OPEN/hours/location → Courts / Events / Gallery → Court A and Court B cards → bottom navigation.
- Phone (72.16,123.79), 390 × 844, radius 28. Cover (72.66,240.06), 389.5 × 126.78, opacity .47; avatar circle centre (131.13,366.84), radius 34.43. OPEN pill approximately 65.73 × 21.38, lime tint and outline.
- Court card paths approximately 343.72 × 151.55, x=100.57,y=544.19 and 716.19; their corner control offsets are 18.12 horizontally and 15.86 vertically. Image panels 317.44 × 82, radius 14. RSVP pills 58 × 30. Header plus 33.87 × 33.87, radius 10.78. Bottom bar y=889.4,height=80; Courts lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E19) | 60.95 | 151.19 | `"Courts"` | F4 64.69px; #f2f3f5 | Outside phone, above frame |
| T2 (E15) | 101.68 | 162.89 | `"Courts profile"` | F5 31px; #f2f3f5 | Outside phone, above frame |
| T3 (E24) | 148.79 | 96.16 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E35) | 201.79 | 144.16 | `"Courts"` | F3 19px; #f2f3f5 |  |
| T5 (E147) | 374.38 | 112.81 | `"LGP"` | F3 19px; #f2f3f5 |  |
| T6 (E93) | 427.93 | 96.69 | `"Let’s Go Paddle"` | F3 19px; #f2f3f5 |  |
| T7 (E111) | 428.59 | 396.26 | `"OPEN"` | F3 10px; #c6f24e |  |
| T8 (E99) | 448.93 | 98.14 | `"Open : Mon  to Sat"` | F3 13px; #9ba1ac |  |
| T9 (E99) | 466.93 | 98.14 | `"Operation hours : 11:00 am -  12:00 am"` | F3 13px; #9ba1ac |  |
| T10 (E99) | 484.93 | 98.14 | `"Beirut, Lebanon"` | F3 13px; #c6f24e |  |
| T11 (E139) | 518.89 | 178.95 | `"Courts"` | F3 13px; #c6f24e |  |
| T12 (E141) | 519.05 | 258.21 | `"Events"` | F3 13px; #c5cad2 |  |
| T13 (E143) | 519.21 | 337.32 | `"Gallery"` | F3 13px; #c5cad2 |  |
| T14 (E43) | 662.19 | 112.57 | `"PADDLE COURT A"` | F3 13px; #f2f3f5 |  |
| T15 (E52) | 669.68 | 382.22 | `"RSVP"` | F3 12px; #0d0e11 |  |
| T16 (E115) | 673.28 | 319.59 | `"$40/h"` | F3 16px; #c6f24e |  |
| T17 (E113) | 678.24 | 112.57 | `"4 Players"` | F3 13px; #9ba1ac |  |
| T18 (E123) | 834.19 | 112.57 | `"PADDLE COURT B"` | F3 13px; #f2f3f5 |  |
| T19 (E132) | 841.68 | 382.22 | `"RSVP"` | F3 12px; #0d0e11 |  |
| T20 (E137) | 845.28 | 319.59 | `"$20/h"` | F3 16px; #c6f24e |  |
| T21 (E135) | 850.24 | 112.57 | `"2 Players"` | F3 13px; #9ba1ac |  |
| T22 (E76) | 948.48 | 413.26 | `"Chat"` | F3 10px; #6b7280 |  |
| T23 (E83) | 948.84 | 177.33 | `"Maps"` | F3 10px; #6b7280 |  |
| T24 (E62) | 949.48 | 91.18 | `"Discover"` | F3 10px; #6b7280 |  |
| T25 (E72) | 949.85 | 253.61 | `"Courts"` | F3 10px; #c6f24e |  |
| T26 (E70) | 949.98 | 318.95 | `"Community"` | F3 10px; #6b7280 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T15, T19<br>Shape/background fill: E23 rect<br>Path stroke: E153 start (422.21, 197.32) |
| `#101216` | Path fill: E58 start (73.3, 889.4) |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E32 rect<br>Path fill: E38 start (118.69, 544.19), E118 start (118.69, 716.19) |
| `#22262e` | Shape/background fill: E9 rect (pattern definition) |
| `#2a3a2e` | Shape/background fill: E92 circle |
| `#2d333d` | Shape/background fill: E10 rect (pattern definition) |
| `#2e4949` | Shape/background fill: E14 rect |
| `#3a3f47` | Shape/background fill: E26 circle α=.65<br>Border/icon stroke: E145 line α=.65, E146 line α=.65 |
| `#58595b` | Path fill: E154 start (368.04, 190.8) |
| `#6b7280` | Text fill: T22, T23, T24, T26<br>Border/icon stroke: E60 circle, E67 circle, E68 circle, E69 circle<br>Path stroke: E61 start (116.3, 916.48), E75 start (412.37, 903.48), E80 start (185.87, 921.9), E81 start (200.85, 921.9), E82 start (187.47, 921.9) |
| `#9ba1ac` | Text fill: T8, T9, T17, T21 |
| `#c5cad2` | Text fill: T12, T13 |
| `#c6f24e` | Text fill: T7, T10, T11, T16, T20, T25<br>Shape/background fill: E152 rect<br>Path fill: E50 start (384.78, 650.68), E110 start (388.95, 414.19) α=.13, E130 start (384.78, 822.68)<br>Border/icon stroke: E87 circle, E88 line<br>Path stroke: E51 start (384.78, 650.68) α=.07, E86 start (284.45, 922.66), E89 start (286.68, 921.09), E90 start (252.78, 921.09), E109 start (388.95, 414.19) α=.2, E131 start (384.78, 822.68) α=.07 |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T5, T6, T14, T18<br>Shape/background fill: E30 rect<br>Border/icon stroke: E29 rect, E30 rect<br>Path stroke: E27 start (390.16, 146.79), E28 start (394.16, 150.79), E34 start (115.16, 187.79) |
| `#fff` | Border/icon stroke: E33 rect α=.07, E42 rect α=.05, E56 rect α=.12, E122 rect α=.05<br>Path stroke: E39 start (118.69, 544.19) α=.07, E119 start (118.69, 716.19) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E8, E9 | Definition: rect: (0, 0), 18 × 18, rx=0, ry=0 | E8: fill none<br>E9: fill #22262e |
| E10 | Definition: rect: (0, 0), 7 × 18, rx=0, ry=0 | fill #2d333d |
| E14 | rect: (0, -.13), 495.74 × 1069.72, rx=0, ry=0 | fill #2e4949 |
| E22 | rect: (72.16, 123.79), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E23, E55 | rect: (72.16, 123.79), 390 × 844, rx=28, ry=28 | E23: fill #0d0e11<br>E55: fill none |
| E26 | circle: centre (267.16, 141.79), r=9 | fill #3a3f47; opacity .65 |
| E29 | rect: (417.16, 138.79), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E30 | rect: (437.16, 142.79), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E32, E33 | rect: (90.16, 175.79), 40 × 40, rx=12, ry=12 | E32: fill #16181d<br>E33: fill none; stroke #fff; opacity .07 |
| E41, E42 | rect: (112.57, 556.19), 317.44 × 82, rx=14, ry=14 | E41: fill url(#stripe)<br>E42: fill none; stroke #fff; opacity .05 |
| E56 | rect: (72.66, 124.29), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |
| E60 | circle: centre (110.3, 910.48), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E67 | circle: centre (348.5, 907.77), r=5.79 | fill none; stroke #6b7280; stroke-width 2px |
| E68 | circle: centre (338.08, 919.34), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E69 | circle: centre (358.92, 919.34), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E87 | circle: centre (269.73, 913.57), r=2.17 | fill none; stroke #c6f24e; stroke-width 2px |
| E88 | line: (269.73, 922.66) → (269.73, 904.48) | fill none; stroke #c6f24e; stroke-width 2px |
| E91 | rect: (72.66, 240.06), 389.5 × 126.78, rx=0, ry=0 | fill url(#stripe-2); opacity .47 |
| E92 | circle: centre (131.13, 366.84), r=34.43 | fill #2a3a2e |
| E121, E122 | rect: (112.57, 728.19), 317.44 × 82, rx=14, ry=14 | E121: fill url(#stripe-3)<br>E122: fill none; stroke #fff; opacity .05 |
| E145 | line: (234.55, 499.54) → (234.55, 528.53) | fill none; stroke #3a3f47; opacity .65 |
| E146 | line: (320.79, 499.54) → (320.79, 528.53) | fill none; stroke #3a3f47; opacity .65 |
| E152 | rect: (409.35, 180.38), 33.87 × 33.87, rx=10.78, ry=10.78 | fill #c6f24e |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=-469.45; y1=2656.34; x2=-469.45; y2=2655.34; gradientTransform=translate(183351.3622 2242078.8241) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E22 rect (72.16, 123.79), 390 × 844, rx=0, ry=0.
- `stripe` (pattern, E6): x=0; y=0; width=18; height=18; patternTransform=translate(3777.9684 -7127.582) rotate(45) scale(1 -1); patternUnits=userSpaceOnUse; viewBox=0 0 18 18. Direct fill uses: E41 rect (112.57, 556.19), 317.44 × 82, rx=14, ry=14.
- `stripe-2` (pattern, E11); inherits `#stripe`: patternTransform=translate(3812.5725 -6849.5802) rotate(33.4737) scale(.8477 -.78) skewX(21.3842). Direct fill uses: E91 rect (72.66, 240.06), 389.5 × 126.78, rx=0, ry=0.
- `stripe-3` (pattern, E12); inherits `#stripe`: patternTransform=translate(3777.9684 -7108.3171) rotate(45) scale(1 -1). Direct fill uses: E121 rect (112.57, 728.19), 317.44 × 82, rx=14, ry=14.

### Interactive-looking elements

- Back; unlabelled grey header pictogram (action unspecified); lime plus.
- “Courts”, “Events”, “Gallery” tabs (Courts lime); Court A/B cards; two “RSVP” pills.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- Gradient rectangle is painted before the opaque #0d0e11 phone rectangle; its declared colours remain recorded although the base rectangle covers it.
- Court spelling is “PADDLE”; no correction to another sport name is made.

**Other explicit styling:** letter-spacing values `-.06em`, `-.05em`, `-.03em`, `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2px`, `2.2px`, `2.4px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 15. COURTS 2.svg

**Screen:** Let’s Go Paddle venue profile — Events tab. **Module:** Courts.

**ViewBox:** `0 0 450.01 1079.33`. **Source:** [COURTS 2.svg](../design/svg/COURTS%202.svg).

### Layout, dimensions and spacing

- External headings → status bar/back/Courts and header controls → striped cover/LGP circle → venue name/OPEN/hours/location → Courts / Events / Gallery → adult and junior tournament cards → bottom navigation.
- Phone (29.55,123.79), 390 × 844, radius 28; cover (30.05,240.06), 389.5 × 126.78, opacity .47; avatar radius 34.43. Events is lime; Courts is #fff and Gallery #c5cad2.
- Tournament cards approximately 343.72 × 151.55, x=56.96,y=544.97 and 716.97; image panels 317.44 × 82, radius 14. RSVP pills 58 × 30. Prices appear at the lower right. Header plus 33.87 square, radius 10.78. Bottom bar y=889.4,height=80; Courts lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E19) | 61.73 | 136.92 | `"Courts"` | F4 64.69px; #f2f3f5 | Outside phone, above frame |
| T2 (E15) | 101.68 | 132.02 | `"Courts Events"` | F5 31px; #f2f3f5 | Outside phone, above frame |
| T3 (E24) | 148.79 | 53.55 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E35) | 201.79 | 101.55 | `"Courts"` | F3 19px; #f2f3f5 |  |
| T5 (E173) | 374.38 | 71.5 | `"LGP"` | F3 19px; #f2f3f5 |  |
| T6 (E95) | 427.93 | 54.08 | `"Let’s Go Paddle"` | F3 19px; #f2f3f5 |  |
| T7 (E113) | 428.59 | 353.26 | `"OPEN"` | F3 10px; #c6f24e |  |
| T8 (E101) | 448.93 | 55.53 | `"Open : Mon  to Sat"` | F3 13px; #9ba1ac |  |
| T9 (E101) | 466.93 | 55.53 | `"Operation hours : 11:00 am -  12:00 am"` | F3 13px; #9ba1ac |  |
| T10 (E101) | 484.93 | 55.53 | `"Beirut, Lebanon"` | F3 13px; #c6f24e |  |
| T11 (E163) | 518.89 | 136.34 | `"Courts"` | F3 13px; #fff |  |
| T12 (E165) | 519.05 | 215.6 | `"Events"` | F3 13px; #c6f24e |  |
| T13 (E167) | 519.2 | 294.71 | `"Gallery"` | F3 13px; #c5cad2 |  |
| T14 (E43) | 662.97 | 68.96 | `"PADDLE ADULT TOURNAMENT"` | F3 13px; #f2f3f5 |  |
| T15 (E54) | 670.46 | 338.61 | `"RSVP"` | F3 12px; #0d0e11 |  |
| T16 (E117) | 674.69 | 84.46 | `"nd"` | F3 13px; #9ba1ac | scale(.58); Separate superscript text |
| T17 (E123) | 674.69 | 146.04 | `"th"` | F3 13px; #9ba1ac | scale(.58); Separate superscript text |
| T18 (E115) | 679.02 | 68.96 | `"21"` | F3 13px; #9ba1ac |  |
| T19 (E119) | 679.02 | 93.63 | `" Aug - 15"` | F3 13px; #9ba1ac |  |
| T20 (E125) | 679.02 | 153.2 | `" AUG"` | F3 13px; #9ba1ac |  |
| T21 (E129) | 682.4 | 239.31 | `"$40/TEAM"` | F3 16px; #c6f24e |  |
| T22 (E137) | 834.97 | 68.96 | `"PADDLE JUNIOR TOURNAMENT"` | F3 13px; #f2f3f5 |  |
| T23 (E146) | 842.46 | 338.61 | `"RSVP"` | F3 12px; #0d0e11 |  |
| T24 (E151) | 846.69 | 84.46 | `"th"` | F3 13px; #9ba1ac | scale(.58); Separate superscript text |
| T25 (E157) | 846.69 | 144.03 | `"th"` | F3 13px; #9ba1ac | scale(.58); Separate superscript text |
| T26 (E149) | 851.02 | 68.96 | `"18"` | F3 13px; #9ba1ac |  |
| T27 (E153) | 851.02 | 91.61 | `" Aug - 20"` | F3 13px; #9ba1ac |  |
| T28 (E159) | 851.02 | 151.18 | `" AUG"` | F3 13px; #9ba1ac |  |
| T29 (E171) | 853.53 | 238.53 | `"$40/TEAM"` | F3 16px; #c6f24e |  |
| T30 (E78) | 948.48 | 370.65 | `"Chat"` | F3 10px; #6b7280 |  |
| T31 (E85) | 948.84 | 134.72 | `"Maps"` | F3 10px; #6b7280 |  |
| T32 (E64) | 949.48 | 48.57 | `"Discover"` | F3 10px; #6b7280 |  |
| T33 (E74) | 949.85 | 211 | `"Courts"` | F3 10px; #c6f24e |  |
| T34 (E72) | 949.98 | 276.34 | `"Community"` | F3 10px; #6b7280 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T15, T23<br>Shape/background fill: E23 rect<br>Path stroke: E179 start (380.38, 198.1) |
| `#101216` | Path fill: E60 start (30.69, 889.4) |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E32 rect<br>Path fill: E38 start (75.08, 544.97), E132 start (75.08, 716.97) |
| `#22262e` | Shape/background fill: E9 rect (pattern definition) |
| `#2a3a2e` | Shape/background fill: E94 circle |
| `#2d333d` | Shape/background fill: E10 rect (pattern definition) |
| `#2e4949` | Shape/background fill: E14 rect |
| `#3a3f47` | Shape/background fill: E26 circle α=.65<br>Border/icon stroke: E169 line α=.65, E170 line α=.65 |
| `#58595b` | Path fill: E180 start (326.21, 191.58) |
| `#6b7280` | Text fill: T30, T31, T32, T34<br>Border/icon stroke: E62 circle, E69 circle, E70 circle, E71 circle<br>Path stroke: E63 start (73.69, 916.48), E77 start (369.76, 903.48), E82 start (143.26, 921.9), E83 start (158.24, 921.9), E84 start (144.86, 921.9) |
| `#9ba1ac` | Text fill: T8, T9, T16, T17, T18, T19, T20, T24, T25, T26, T27, T28 |
| `#c5cad2` | Text fill: T13 |
| `#c6f24e` | Text fill: T7, T10, T12, T21, T29, T33<br>Shape/background fill: E178 rect<br>Path fill: E52 start (341.17, 651.46), E112 start (345.95, 414.19) α=.13, E144 start (341.17, 823.46)<br>Border/icon stroke: E89 circle, E90 line<br>Path stroke: E53 start (341.17, 651.46) α=.07, E88 start (241.84, 922.66), E91 start (244.07, 921.09), E92 start (210.17, 921.09), E111 start (345.95, 414.19) α=.2, E145 start (341.17, 823.46) α=.07 |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T5, T6, T14, T22<br>Shape/background fill: E30 rect<br>Border/icon stroke: E29 rect, E30 rect<br>Path stroke: E27 start (350.94, 147.05), E28 start (354.94, 151.05), E34 start (72.55, 187.79) |
| `#fff` | Text fill: T11<br>Border/icon stroke: E33 rect α=.07, E42 rect α=.05, E58 rect α=.12, E136 rect α=.05<br>Path stroke: E39 start (75.08, 544.97) α=.07, E133 start (75.08, 716.97) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E8, E9 | Definition: rect: (0, 0), 18 × 18, rx=0, ry=0 | E8: fill none<br>E9: fill #22262e |
| E10 | Definition: rect: (0, 0), 7 × 18, rx=0, ry=0 | fill #2d333d |
| E14 | rect: (-2.27, -.13), 453.54 × 1083.32, rx=0, ry=0 | fill #2e4949 |
| E22 | rect: (29.55, 123.79), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E23, E57 | rect: (29.55, 123.79), 390 × 844, rx=28, ry=28 | E23: fill #0d0e11<br>E57: fill none |
| E26 | circle: centre (224.55, 141.79), r=9 | fill #3a3f47; opacity .65 |
| E29 | rect: (377.94, 139.05), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E30 | rect: (397.94, 143.05), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E32, E33 | rect: (47.55, 175.79), 40 × 40, rx=12, ry=12 | E32: fill #16181d<br>E33: fill none; stroke #fff; opacity .07 |
| E41, E42 | rect: (68.96, 556.97), 317.44 × 82, rx=14, ry=14 | E41: fill url(#stripe)<br>E42: fill none; stroke #fff; opacity .05 |
| E58 | rect: (30.05, 124.29), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |
| E62 | circle: centre (67.69, 910.48), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E69 | circle: centre (305.89, 907.77), r=5.79 | fill none; stroke #6b7280; stroke-width 2px |
| E70 | circle: centre (295.47, 919.34), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E71 | circle: centre (316.31, 919.34), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E89 | circle: centre (227.12, 913.57), r=2.17 | fill none; stroke #c6f24e; stroke-width 2px |
| E90 | line: (227.12, 922.66) → (227.12, 904.48) | fill none; stroke #c6f24e; stroke-width 2px |
| E93 | rect: (30.05, 240.06), 389.5 × 126.78, rx=0, ry=0 | fill url(#stripe-2); opacity .47 |
| E94 | circle: centre (88.52, 366.84), r=34.43 | fill #2a3a2e |
| E135, E136 | rect: (68.96, 728.97), 317.44 × 82, rx=14, ry=14 | E135: fill url(#stripe-3)<br>E136: fill none; stroke #fff; opacity .05 |
| E169 | line: (191.94, 499.54) → (191.94, 528.53) | fill none; stroke #3a3f47; opacity .65 |
| E170 | line: (278.18, 499.54) → (278.18, 528.53) | fill none; stroke #3a3f47; opacity .65 |
| E178 | rect: (367.53, 181.16), 33.87 × 33.87, rx=10.78, ry=10.78 | fill #c6f24e |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=-993.43; y1=2656.34; x2=-993.43; y2=2655.34; gradientTransform=translate(387662.2098 2242078.8241) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E22 rect (29.55, 123.79), 390 × 844, rx=0, ry=0.
- `stripe` (pattern, E6): x=0; y=0; width=18; height=18; patternTransform=translate(3085.2369 -7164.9847) rotate(45) scale(1 -1); patternUnits=userSpaceOnUse; viewBox=0 0 18 18. Direct fill uses: E41 rect (68.96, 556.97), 317.44 × 82, rx=14, ry=14.
- `stripe-2` (pattern, E11); inherits `#stripe`: patternTransform=translate(3146.2944 -6874.8283) rotate(33.4737) scale(.8477 -.78) skewX(21.3842). Direct fill uses: E93 rect (30.05, 240.06), 389.5 × 126.78, rx=0, ry=0.
- `stripe-3` (pattern, E12); inherits `#stripe`: patternTransform=translate(3085.2369 -7145.7198) rotate(45) scale(1 -1). Direct fill uses: E135 rect (68.96, 728.97), 317.44 × 82, rx=14, ry=14.

### Interactive-looking elements

- Back; unlabelled grey header pictogram; lime plus; “Courts”, “Events”, “Gallery”.
- “PADDLE ADULT TOURNAMENT” and “PADDLE JUNIOR TOURNAMENT” cards, each with “RSVP”.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- Date fragments are separate text nodes. Read together spatially, they say “21ⁿᵈ Aug - 15ᵗʰ AUG” and “18ᵗʰ Aug - 20ᵗʰ AUG”; the source has the suffix “nd” after 21. Superscripts are scaled .58; the literal fragments and exact baselines are separately listed.
- Gradient is covered by the later opaque phone base.

**Other explicit styling:** letter-spacing values `-.09em`, `-.06em`, `-.05em`, `-.03em`, `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2px`, `2.2px`, `2.4px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 16. COURTS 3.svg

**Screen:** Let’s Go Paddle venue profile — Gallery tab. **Module:** Courts.

**ViewBox:** `0 0 450.01 1079.33`. **Source:** [COURTS 3.svg](../design/svg/COURTS%203.svg).

### Layout, dimensions and spacing

- External headings → status bar/back/Courts and header controls → striped cover/LGP avatar → venue details/OPEN → Courts / Events / Gallery → six-album 3 × 2 grid → lower fade, “Load More” and double down chevrons → image-plus floating control → bottom navigation. Two red callouts overlay the composition.
- Phone (27.43,150.95), 390 × 844, radius 28. Cover (26.03,267.21), 389.5 × 133.8, opacity .47; LGP circle radius 34.43 with lime outline. Gallery lime; Courts and Events #fff.
- Album tiles 100.46 square, radius 9.59, x≈45.43,171.6,298.97, rows y≈580.36 and 737.36. Lower fade (24.95,771.01), 392.47 × 224.92. Floating image-plus panel approximately 51.73 × 54.33 at (348.01,838.09), implicit black fill, lime outline. Bottom bar y=916.56,height=80; Courts lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E22) | 61.73 | 137.42 | `"Courts"` | F4 64.69px; #f2f3f5 | Outside phone, above frame |
| T2 (E24) | 123.75 | 140.33 | `"Courts Gallery"` | F5 31px; #f2f3f5 | Outside phone, above frame |
| T3 (E29) | 175.95 | 49.53 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E40) | 228.95 | 97.53 | `"Courts"` | F3 19px; #f2f3f5 |  |
| T5 (E162) | 330.43 | 29.75 | `"Stories can be added"` | F1 12.33px; #ed1c24 | Designer annotation |
| T6 (E81) | 401.54 | 67.48 | `"LGP"` | F3 19px; #f2f3f5 |  |
| T7 (E46) | 455.08 | 50.06 | `"Let’s Go Paddle"` | F3 19px; #f2f3f5 |  |
| T8 (E64) | 455.75 | 351.33 | `"OPEN"` | F3 10px; #c6f24e |  |
| T9 (E52) | 476.09 | 51.51 | `"Open : Mon  to Sat"` | F3 13px; #9ba1ac |  |
| T10 (E52) | 494.09 | 51.51 | `"Operation hours : 11:00 am -  12:00 am"` | F3 13px; #9ba1ac |  |
| T11 (E52) | 512.09 | 51.51 | `"Beirut, Lebanon"` | F3 13px; #c6f24e |  |
| T12 (E67) | 546.05 | 121.72 | `"Courts"` | F3 13px; #fff |  |
| T13 (E69) | 546.21 | 200.98 | `"Events"` | F3 13px; #fff |  |
| T14 (E71) | 546.36 | 280.09 | `"Gallery"` | F3 13px; #c6f24e |  |
| T15 (E89) | 708.9 | 71.78 | `"Album 1"` | F8 13px; #c5cad2 |  |
| T16 (E92) | 708.9 | 197.95 | `"Album 2"` | F8 13px; #c5cad2 |  |
| T17 (E95) | 709 | 325.32 | `"Album 3"` | F8 13px; #c5cad2 |  |
| T18 (E113) | 792.94 | 159.06 | `"Icon Disappears when scrolling Down and "` | F1 12.33px; #ed1c24 |  |
| T19 (E113) | 807.73 | 159.06 | `"appears when scrolling up "` | F1 12.33px; #ed1c24 |  |
| T20 (E101) | 865.9 | 71.78 | `"Album 4"` | F8 13px; #c5cad2 |  |
| T21 (E104) | 865.9 | 197.95 | `"Album 5"` | F8 13px; #c5cad2 |  |
| T22 (E107) | 866 | 325.32 | `"Album 6"` | F8 13px; #c5cad2 |  |
| T23 (E75) | 919.59 | 191.25 | `"Load More"` | F3 12px; #c5cad2 | Source text behind later bottom bar |
| T24 (E139) | 975.63 | 366.63 | `"Chat"` | F3 10px; #6b7280 |  |
| T25 (E146) | 975.99 | 130.7 | `"Maps"` | F3 10px; #6b7280 |  |
| T26 (E125) | 976.63 | 44.55 | `"Discover"` | F3 10px; #6b7280 |  |
| T27 (E135) | 977.01 | 206.98 | `"Courts"` | F3 10px; #c6f24e |  |
| T28 (E133) | 977.13 | 272.32 | `"Community"` | F3 10px; #6b7280 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#000` | stop-color: E19 in linear-gradient-2, offset 1 |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Shape/background fill: E28 rect<br>Path stroke: E156 start (377.4, 224.86) |
| `#101216` | Path fill: E121 start (26.67, 916.56)<br>stop-color: E18 in linear-gradient-2, offset 0, stop-opacity 0 |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E37 rect |
| `#22262e` | Shape/background fill: E9 rect (pattern definition) |
| `#2a3a2e` | Shape/background fill: E45 circle |
| `#2d333d` | Shape/background fill: E10 rect (pattern definition) |
| `#2e4949` | Shape/background fill: E21 rect |
| `#3a3f47` | Shape/background fill: E31 circle α=.65<br>Border/icon stroke: E73 line α=.65, E74 line α=.65 |
| `#58595b` | Path fill: E157 start (323.23, 218.35) |
| `#6b7280` | Text fill: T24, T25, T26, T28<br>Border/icon stroke: E123 circle, E130 circle, E131 circle, E132 circle<br>Path stroke: E124 start (69.67, 943.63), E138 start (365.74, 930.63), E143 start (139.24, 949.06), E144 start (154.22, 949.06), E145 start (140.84, 949.06) |
| `#9ba1ac` | Text fill: T9, T10 |
| `#c5cad2` | Text fill: T15, T16, T17, T20, T21, T22, T23<br>Path fill: E79 start (193.64, 926.74), E80 start (193.64, 936.41) |
| `#c6f24e` | Text fill: T8, T11, T14, T27<br>Shape/background fill: E155 rect<br>Path fill: E63 start (344.02, 441.35) α=.13, E119 start (361.38, 880.26)<br>Border/icon stroke: E45 circle, E150 circle, E151 line<br>Path stroke: E62 start (344.02, 441.35) α=.2, E118 start (363.53, 838.09), E149 start (237.82, 949.82), E152 start (240.05, 948.25), E153 start (206.15, 948.25) |
| `#ed1c24` | Text fill: T5, T18, T19<br>Path fill: E112 start (349.09, 836.69), E161 start (101.86, 375.74)<br>Path stroke: E111 start (337.08, 827.76), E160 start (89.85, 366.81) |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T6, T7<br>Shape/background fill: E35 rect<br>Border/icon stroke: E34 rect, E35 rect<br>Path stroke: E32 start (343.53, 173.95), E33 start (347.53, 177.95), E39 start (68.53, 214.95) |
| `#fff` | Text fill: T12, T13<br>Border/icon stroke: E38 rect α=.07, E43 rect α=.12 |

The floating-control panel E118 uses implicit black fill because its class supplies a stroke but no fill.

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E8, E9 | Definition: rect: (0, 0), 18 × 18, rx=0, ry=0 | E8: fill none<br>E9: fill #22262e |
| E10 | Definition: rect: (0, 0), 7 × 18, rx=0, ry=0 | fill #2d333d |
| E21 | rect: (-1.77, -.13), 453.54 × 1083.32, rx=0, ry=0 | fill #2e4949 |
| E27 | rect: (27.43, 150.95), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E28, E42 | rect: (27.43, 150.95), 390 × 844, rx=28, ry=28 | E28: fill #0d0e11<br>E42: fill none |
| E31 | circle: centre (220.53, 168.95), r=9 | fill #3a3f47; opacity .65 |
| E34 | rect: (370.53, 165.95), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E35 | rect: (390.53, 169.95), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E37, E38 | rect: (43.53, 202.95), 40 × 40, rx=12, ry=12 | E37: fill #16181d<br>E38: fill none; stroke #fff; opacity .07 |
| E43 | rect: (27.93, 151.45), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |
| E44 | rect: (26.03, 267.21), 389.5 × 133.8, rx=0, ry=0 | fill url(#stripe); opacity .47 |
| E45 | circle: centre (84.5, 393.99), r=34.43 | fill #2a3a2e; stroke #c6f24e; stroke-width 3px |
| E73 | line: (177.32, 526.69) → (177.32, 555.68) | fill none; stroke #3a3f47; opacity .65 |
| E74 | line: (263.56, 526.69) → (263.56, 555.68) | fill none; stroke #3a3f47; opacity .65 |
| E86 | rect: (45.43, 580.36), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-2) |
| E87 | rect: (171.6, 580.36), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-3) |
| E88 | rect: (298.97, 580.46), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-4) |
| E98 | rect: (45.43, 737.36), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-5) |
| E99 | rect: (171.6, 737.36), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-6) |
| E100 | rect: (298.97, 737.46), 100.46 × 100.46, rx=9.59, ry=9.59 | fill url(#stripe-7) |
| E116 | rect: (24.95, 771.01), 392.47 × 224.92, rx=0, ry=0 | fill url(#linear-gradient-2) |
| E123 | circle: centre (63.67, 937.63), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E130 | circle: centre (301.87, 934.92), r=5.79 | fill none; stroke #6b7280; stroke-width 2px |
| E131 | circle: centre (291.45, 946.5), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E132 | circle: centre (312.29, 946.5), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E150 | circle: centre (223.1, 940.73), r=2.17 | fill none; stroke #c6f24e; stroke-width 2px |
| E151 | line: (223.1, 949.82) → (223.1, 931.63) | fill none; stroke #c6f24e; stroke-width 2px |
| E155 | rect: (364.55, 207.93), 33.87 × 33.87, rx=10.78, ry=10.78 | fill #c6f24e |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=-1502.14; y1=2656.31; x2=-1502.14; y2=2655.31; gradientTransform=translate(586055.8876 2242078.8241) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E27 rect (27.43, 150.95), 390 × 844, rx=0, ry=0.
- `linear-gradient-2` (linearGradient, E17): x1=221.18; y1=781.59; x2=221.18; y2=1000.08; gradientUnits=userSpaceOnUse. Direct fill uses: E116 rect (24.95, 771.01), 392.47 × 224.92, rx=0, ry=0.
- `stripe` (pattern, E6): x=0; y=0; width=18; height=18; patternTransform=translate(2671.3411 -6877.5759) rotate(34.9092) scale(.8623 -.8093) skewX(19.0343); patternUnits=userSpaceOnUse; viewBox=0 0 18 18. Direct fill uses: E44 rect (26.03, 267.21), 389.5 × 133.8, rx=0, ry=0.
- `stripe-2` (pattern, E11); inherits `#stripe`: patternTransform=translate(-3290.7147 -4954.5247) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E86 rect (45.43, 580.36), 100.46 × 100.46, rx=9.59, ry=9.59.
- `stripe-3` (pattern, E12); inherits `#stripe`: patternTransform=translate(-3280.1628 -4954.5247) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E87 rect (171.6, 580.36), 100.46 × 100.46, rx=9.59, ry=9.59.
- `stripe-4` (pattern, E13); inherits `#stripe`: patternTransform=translate(-3255.5736 -4954.4214) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E88 rect (298.97, 580.46), 100.46 × 100.46, rx=9.59, ry=9.59.
- `stripe-5` (pattern, E14); inherits `#stripe`: patternTransform=translate(-3290.7147 -4941.8696) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E98 rect (45.43, 737.36), 100.46 × 100.46, rx=9.59, ry=9.59.
- `stripe-6` (pattern, E15); inherits `#stripe`: patternTransform=translate(-3280.1628 -4941.8696) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E99 rect (171.6, 737.36), 100.46 × 100.46, rx=9.59, ry=9.59.
- `stripe-7` (pattern, E16); inherits `#stripe`: patternTransform=translate(-3255.5736 -4941.7663) rotate(70.4039) scale(1.064 -.6724) skewX(-37.7768). Direct fill uses: E100 rect (298.97, 737.46), 100.46 × 100.46, rx=9.59, ry=9.59.

### Interactive-looking elements

- Back; unlabelled grey header pictogram; header plus; “Courts”, “Events”, “Gallery”.
- “Album 1”–“Album 6”; “Load More” / double chevrons; image-plus floating control.
- Avatar is the target of the literal “Stories can be added” annotation; no story content is supplied.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- The annotation says the icon disappears when scrolling down and appears when scrolling up; no animation is encoded.
- “Load More” is at y=919.59 and its chevrons below; the later-painted bottom bar begins y=916.56 and covers these elements.
- Base gradient is covered by the later opaque phone base.

**Other explicit styling:** letter-spacing values `-.06em`, `-.05em`, `-.03em`, `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2px`, `2.2px`, `2.4px`, `3px`, `4px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 17. COURTS 4.svg

**Screen:** ALL Courts view — venue list. **Module:** Courts.

**ViewBox:** `0 0 450.01 1079.33`. **Source:** [COURTS 4.svg](../design/svg/COURTS%204.svg).

### Layout, dimensions and spacing

- External headings → status bar/back/Courts and header controls → “All sports and hobbies” selector → “Search Coach, Mentor” field → three repeated Go Paddle venue cards → bottom navigation.
- Phone (29.33,157.6), 390 × 844, radius 28, solid background. Selector is a path-based pill about 354.79 × 38, y=283.53; search field (47.98,332.93), 354 × 46, radius 14.
- Cards approximately 343.72 × 151.55, x=53.28,y=399.56,572.12,748.21. Striped image panels 317.44 × 82, radius 14. Header plus 33.87 square, radius 10.78. Bottom bar y=921.04,height=80; Courts lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E12) | 61.73 | 142.87 | `"Courts"` | F4 64.69px; #f2f3f5 | Outside phone, above frame |
| T2 (E14) | 113.84 | 145.78 | `"ALL Courts view"` | F5 31px; #f2f3f5 | Outside phone, above frame |
| T3 (E18) | 182.6 | 51.43 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T4 (E29) | 235.6 | 99.43 | `"Courts"` | F3 19px; #f2f3f5 |  |
| T5 (E140) | 306.53 | 77.62 | `"All sports and hobbies"` | F3 12px; #c5cad2 |  |
| T6 (E128) | 360.93 | 91.98 | `"Search Coach, Mentor"` | F8 14px; #6b7280 |  |
| T7 (E77) | 517.56 | 65.28 | `"Go Paddle"` | F3 13px; #f2f3f5 |  |
| T8 (E81) | 533.6 | 65.28 | `"Tyre, Lebanon "` | F3 13px; #9ba1ac |  |
| T9 (E86) | 533.6 | 342.71 | `"1.6 km"` | F3 13px; #c6f24e |  |
| T10 (E95) | 690.12 | 65.28 | `"Go Paddle"` | F3 13px; #f2f3f5 |  |
| T11 (E99) | 706.17 | 65.28 | `"Tyre, Lebanon "` | F3 13px; #9ba1ac |  |
| T12 (E104) | 706.17 | 342.71 | `"1.6 km"` | F3 13px; #c6f24e |  |
| T13 (E113) | 866.21 | 65.28 | `"Go Paddle"` | F3 13px; #f2f3f5 |  |
| T14 (E117) | 882.25 | 65.28 | `"Tyre, Lebanon "` | F3 13px; #9ba1ac |  |
| T15 (E122) | 882.25 | 342.71 | `"1.6 km"` | F3 13px; #c6f24e |  |
| T16 (E55) | 980.11 | 370.64 | `"Chat"` | F3 10px; #6b7280 |  |
| T17 (E62) | 980.48 | 134.71 | `"Maps"` | F3 10px; #6b7280 |  |
| T18 (E41) | 981.11 | 48.56 | `"Discover"` | F3 10px; #6b7280 |  |
| T19 (E51) | 981.49 | 210.99 | `"Courts"` | F3 10px; #c6f24e |  |
| T20 (E49) | 981.61 | 276.33 | `"Community"` | F3 10px; #6b7280 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#0d0e11` | Shape/background fill: E17 rect<br>Path stroke: E35 start (376.26, 232.06) |
| `#101216` | Path fill: E37 start (30.68, 921.04) |
| `#16181d` | Shape/background fill: E26 rect, E126 rect<br>Path fill: E72 start (71.4, 399.56), E90 start (71.4, 572.12), E108 start (71.4, 748.21), E138 start (66.19, 283.53) |
| `#22262e` | Shape/background fill: E6 rect (pattern definition) |
| `#2d333d` | Shape/background fill: E7 rect (pattern definition) |
| `#2e4949` | Shape/background fill: E11 rect |
| `#3a3f47` | Shape/background fill: E20 circle α=.65 |
| `#58595b` | Path fill: E143 start (322.09, 225.54)<br>Path stroke: E142 start (371.2, 299.53) |
| `#6b7280` | Text fill: T6, T16, T17, T18, T20<br>Border/icon stroke: E39 circle, E46 circle, E47 circle, E48 circle, E134 circle<br>Path stroke: E40 start (73.68, 948.11), E54 start (369.75, 935.11), E59 start (143.25, 953.54), E60 start (158.23, 953.54), E61 start (144.84, 953.54), E135 start (73.98, 358.93) |
| `#9ba1ac` | Text fill: T8, T11, T14 |
| `#c5cad2` | Text fill: T5 |
| `#c6f24e` | Text fill: T9, T12, T15, T19<br>Shape/background fill: E34 rect<br>Border/icon stroke: E66 circle, E67 line<br>Path stroke: E65 start (241.83, 954.3), E68 start (244.06, 952.73), E69 start (210.16, 952.73) |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T7, T10, T13<br>Shape/background fill: E24 rect<br>Border/icon stroke: E23 rect, E24 rect<br>Path stroke: E21 start (345.43, 180.6), E22 start (349.43, 184.6), E28 start (70.43, 221.6) |
| `#fff` | Border/icon stroke: E27 rect α=.07, E32 rect α=.12, E76 rect α=.05, E94 rect α=.05, E112 rect α=.05, E127 rect α=.07<br>Path stroke: E73 start (71.4, 399.56) α=.07, E91 start (71.4, 572.12) α=.07, E109 start (71.4, 748.21) α=.07, E139 start (66.19, 283.53) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E5, E6 | Definition: rect: (0, 0), 18 × 18, rx=0, ry=0 | E5: fill none<br>E6: fill #22262e |
| E7 | Definition: rect: (0, 0), 7 × 18, rx=0, ry=0 | fill #2d333d |
| E11 | rect: (3.68, -.13), 453.54 × 1083.32, rx=0, ry=0 | fill #2e4949 |
| E17, E31 | rect: (29.33, 157.6), 390 × 844, rx=28, ry=28 | E17: fill #0d0e11<br>E31: fill none |
| E20 | circle: centre (222.43, 175.6), r=9 | fill #3a3f47; opacity .65 |
| E23 | rect: (372.43, 172.6), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E24 | rect: (392.43, 176.6), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E26, E27 | rect: (45.43, 209.6), 40 × 40, rx=12, ry=12 | E26: fill #16181d<br>E27: fill none; stroke #fff; opacity .07 |
| E32 | rect: (29.83, 158.1), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |
| E34 | rect: (363.41, 215.12), 33.87 × 33.87, rx=10.78, ry=10.78 | fill #c6f24e |
| E39 | circle: centre (67.68, 942.11), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E46 | circle: centre (305.88, 939.4), r=5.79 | fill none; stroke #6b7280; stroke-width 2px |
| E47 | circle: centre (295.46, 950.98), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E48 | circle: centre (316.3, 950.98), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E66 | circle: centre (227.11, 945.21), r=2.17 | fill none; stroke #c6f24e; stroke-width 2px |
| E67 | line: (227.11, 954.3) → (227.11, 936.12) | fill none; stroke #c6f24e; stroke-width 2px |
| E75, E76 | rect: (65.28, 411.56), 317.44 × 82, rx=14, ry=14 | E75: fill url(#stripe)<br>E76: fill none; stroke #fff; opacity .05 |
| E93, E94 | rect: (65.28, 584.12), 317.44 × 82, rx=14, ry=14 | E93: fill url(#stripe-2)<br>E94: fill none; stroke #fff; opacity .05 |
| E111, E112 | rect: (65.28, 760.21), 317.44 × 82, rx=14, ry=14 | E111: fill url(#stripe-3)<br>E112: fill none; stroke #fff; opacity .05 |
| E126, E127 | rect: (47.98, 332.93), 354 × 46, rx=14, ry=14 | E126: fill #16181d<br>E127: fill none; stroke #fff; opacity .07 |
| E134 | circle: centre (68.98, 353.93), r=7 | fill none; stroke #6b7280; stroke-width 2px |

**Gradient/pattern definitions and uses:**

- `stripe` (pattern, E3): x=0; y=0; width=18; height=18; patternTransform=translate(2139.6876 -7183.1212) rotate(45) scale(1 -1); patternUnits=userSpaceOnUse; viewBox=0 0 18 18. Direct fill uses: E75 rect (65.28, 411.56), 317.44 × 82, rx=14, ry=14.
- `stripe-2` (pattern, E8); inherits `#stripe`: patternTransform=translate(2139.6876 -7163.291) rotate(45) scale(1 -1). Direct fill uses: E93 rect (65.28, 584.12), 317.44 × 82, rx=14, ry=14.
- `stripe-3` (pattern, E9); inherits `#stripe`: patternTransform=translate(2139.6876 -7139.9391) rotate(45) scale(1 -1). Direct fill uses: E111 rect (65.28, 760.21), 317.44 × 82, rx=14, ry=14.

### Interactive-looking elements

- Back; grey unlabelled header pictogram; lime plus; dropdown “All sports and hobbies”; search field “Search Coach, Mentor”.
- Three “Go Paddle” cards, each showing “Tyre, Lebanon ” and “1.6 km”.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- All three venue rows repeat the same strings. The search placeholder refers literally to Coach/Mentor.

**Other explicit styling:** letter-spacing values `-.03em`, `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2px`, `2.2px`, `2.4px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 18. Discover 2.svg

**Screen:** Map/grid view with coach markers (artboard heading: Discover). **Module:** Maps.

**ViewBox:** `0 0 433.13 1070.66`. **Source:** [Discover 2.svg](../design/svg/Discover%202.svg).

### Layout, dimensions and spacing

- External Discover heading → status bar → search field → three category chips → grid with four circular coach markers, attached rating pills and lime location marker → nearest boosted coach summary → bottom navigation.
- Phone (27.12,98.68), 390 × 844, radius 28, rounded clip. Grid rectangle (26.34,150.68), 390 × 713.44; source pattern is a 32 × 32 transparent tile with a white .05-opacity L-shaped grid line, vertically scaled -.9338. It contains no geographical map image or street labels.
- Search field (45.12,150.16), 354 × 46, radius 14. Category chips about 62 × 22 (GYM’S/BOXING), 65.73 × 21.38 (FOOTBALL). Marker circles radius 26 at (129.12,328.68),(283.12,384.68),(203.12,542.68),(337.12,624.68), opacity .96. MR/AB gold fills and dark text; DS/JK dark fills and white text. Rating pills 42 × 21.
- Location marker centre (232.12,468.68), inner radius 8 and outer radius 18, outer opacity .14. Nearest-coach avatar 56 × 56, radius 15; summary text beside it, without a separate enclosing card rectangle. Bottom bar y=862.68,height=80; Maps lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E14) | 49.74 | 126.85 | `"Discover"` | F4 31px; #f2f3f5 | Outside phone, above frame |
| T2 (E23) | 123.68 | 51.12 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T3 (E35) | 178.16 | 89.12 | `"Search this area"` | F8 14px; #6b7280 |  |
| T4 (E106) | 218.07 | 193.37 | `"FOOTBALL"` | F3 10px; #c6f24e |  |
| T5 (E94) | 218.36 | 68.54 | `"GYM’S"` | F3 10px; #c6f24e |  |
| T6 (E99) | 218.36 | 131.24 | `"BOXING"` | F3 10px; #c6f24e |  |
| T7 (E46) | 314.18 | 161.17 | `"4.9"` | F3 10px; #f2c84b |  |
| T8 (E42) | 334.68 | 119.01 | `"MR"` | F3 13px; #0d0e11 |  |
| T9 (E53) | 370.18 | 315.17 | `"4.8"` | F3 10px; #f2c84b |  |
| T10 (E49) | 390.68 | 274.09 | `"DS"` | F3 13px; #f2f3f5 |  |
| T11 (E148) | 488.24 | 241.52 | `"blinking marker"` | F4 16px; #ed1c24 | Designer annotation |
| T12 (E61) | 528.18 | 235.17 | `"4.9"` | F3 10px; #f2c84b |  |
| T13 (E56) | 548.68 | 194.81 | `"JK"` | F3 13px; #f2f3f5 |  |
| T14 (E68) | 610.18 | 369.17 | `"4.9"` | F3 10px; #f2c84b |  |
| T15 (E64) | 630.68 | 327.73 | `"AB"` | F3 13px; #0d0e11 |  |
| T16 (E75) | 784.68 | 129.12 | `"Nearest boosted coach"` | F3 11px; #6b7280 |  |
| T17 (E73) | 808.68 | 74.68 | `"MR"` | F3 16px; #f2f3f5 |  |
| T18 (E79) | 810.68 | 129.12 | `"Marcus Reyes"` | F3 16px; #f2f3f5 |  |
| T19 (E85) | 832.68 | 129.12 | `"Strength - 1.2 km - $45"` | F8 13px; #9ba1ac |  |
| T20 (E129) | 921.76 | 367.08 | `"Chat"` | F3 10px; #6b7280 |  |
| T21 (E136) | 922.12 | 131.15 | `"Maps"` | F3 10px; #c6f24e |  |
| T22 (E115) | 922.76 | 45 | `"Discover"` | F3 10px; #6b7280 |  |
| T23 (E125) | 923.13 | 207.42 | `"Courts"` | F3 10px; #6b7280 |  |
| T24 (E123) | 923.26 | 272.77 | `"Community"` | F3 10px; #6b7280 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E7 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T8, T15<br>Shape/background fill: E19 rect |
| `#101216` | Path fill: E111 start (27.12, 862.68) |
| `#15171c` | stop-color: E6 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E31 rect, E48 circle α=.96, E55 circle α=.96<br>Path fill: E44 start (157.62, 299.68), E51 start (311.62, 355.68), E59 start (231.62, 513.68), E66 start (365.62, 595.68) |
| `#2e4949` | Shape/background fill: E13 rect |
| `#3a331c` | Shape/background fill: E72 rect |
| `#3a3f47` | Shape/background fill: E25 circle α=.65 |
| `#6b7280` | Text fill: T3, T16, T20, T22, T23, T24<br>Border/icon stroke: E33 circle, E113 circle, E120 circle, E121 circle, E122 circle, E140 circle, E141 line<br>Path stroke: E34 start (70.12, 177.16), E114 start (70.12, 889.76), E128 start (366.19, 876.76), E139 start (238.27, 895.94), E142 start (240.5, 894.37), E143 start (206.6, 894.37) |
| `#9ba1ac` | Text fill: T19 |
| `#be1e2d` **ONE ARTBOARD ONLY** | Shape/background fill: E147 polygon<br>Border/icon stroke: E146 line |
| `#c6f24e` | Text fill: T4, T5, T6, T21<br>Shape/background fill: E70 circle, E71 circle α=.14<br>Path fill: E93 start (65.2, 203.36) α=.13, E98 start (131.54, 203.36) α=.13, E105 start (197.88, 203.67) α=.13<br>Border/icon stroke: E41 circle α=.96, E48 circle α=.96, E55 circle α=.96, E63 circle α=.96<br>Path stroke: E92 start (65.2, 203.36) α=.2, E97 start (131.54, 203.36) α=.2, E104 start (197.88, 203.67) α=.2, E133 start (139.69, 895.18), E134 start (154.67, 895.18), E135 start (141.28, 895.18) |
| `#ed1c24` | Text fill: T11 |
| `#f2c84b` | Text fill: T7, T9, T12, T14<br>Shape/background fill: E41 circle α=.96, E63 circle α=.96 |
| `#f2f3f5` | Text fill: T1, T2, T10, T13, T17, T18<br>Shape/background fill: E29 rect<br>Border/icon stroke: E28 rect, E29 rect<br>Path stroke: E26 start (345.12, 121.68), E27 start (349.12, 125.68) |
| `#fff` | Border/icon stroke: E11 polyline (pattern definition) α=.05, E32 rect α=.07, E90 line α=.07<br>Path stroke: E45 start (157.62, 299.68) α=.07, E52 start (311.62, 355.68) α=.07, E60 start (231.62, 513.68) α=.07, E67 start (365.62, 595.68) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E4 | Definition: rect: (27.12, 98.68), 390 × 844, rx=28, ry=28 | fill none |
| E10 | Definition: rect: (0, 0), 32 × 32, rx=0, ry=0 | fill none |
| E11 | Definition: polyline: points=32 32 0 32 0 0 | fill none; stroke #fff; opacity .05 |
| E13 | rect: (-.02, 0), 435.42 × 1072.14, rx=0, ry=0 | fill #2e4949 |
| E19 | rect: (27.12, 98.68), 390 × 844, rx=28, ry=28 | fill #0d0e11 |
| E20 | rect: (26.12, 98.68), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E21 | rect: (26.62, 98.68), 389 × 843, rx=28, ry=28 | fill none |
| E22 | rect: (26.34, 150.68), 390 × 713.44, rx=0, ry=0 | fill url(#map-grid) |
| E25 | circle: centre (222.12, 116.68), r=9 | fill #3a3f47; opacity .65 |
| E28 | rect: (372.12, 113.68), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E29 | rect: (392.12, 117.68), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E31, E32 | rect: (45.12, 150.16), 354 × 46, rx=14, ry=14 | E31: fill #16181d<br>E32: fill none; stroke #fff; opacity .07 |
| E33 | circle: centre (65.12, 172.16), r=7 | fill none; stroke #6b7280; stroke-width 2px |
| E41 | circle: centre (129.12, 328.68), r=26 | fill #f2c84b; stroke #c6f24e; stroke-width 3px; opacity .96 |
| E48 | circle: centre (283.12, 384.68), r=26 | fill #16181d; stroke #c6f24e; stroke-width 2px; opacity .96 |
| E55 | circle: centre (203.12, 542.68), r=26 | fill #16181d; stroke #c6f24e; stroke-width 2px; opacity .96 |
| E63 | circle: centre (337.12, 624.68), r=26 | fill #f2c84b; stroke #c6f24e; stroke-width 3px; opacity .96 |
| E70 | circle: centre (232.12, 468.68), r=8 | fill #c6f24e |
| E71 | circle: centre (232.12, 468.68), r=18 | fill #c6f24e; opacity .14 |
| E72 | rect: (59.12, 774.68), 56 × 56, rx=15, ry=15 | fill #3a331c |
| E90 | line: (27.12, 862.68) → (417.12, 862.68) | fill none; stroke #fff; opacity .07 |
| E113 | circle: centre (64.12, 883.76), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E120 | circle: centre (302.32, 881.05), r=5.79 | fill none; stroke #6b7280; stroke-width 2px |
| E121 | circle: centre (291.9, 892.63), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E122 | circle: centre (312.74, 892.63), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E140 | circle: centre (223.55, 886.85), r=2.17 | fill none; stroke #6b7280 |
| E141 | line: (223.55, 895.94) → (223.55, 877.76) | fill none; stroke #6b7280 |
| E146 | line: (240.12, 468.68) → (326.59, 468.68) | fill none; stroke #be1e2d |
| E147 | polygon: points=325.14 473.67 333.77 468.68 325.14 463.69 325.14 473.67 | fill #be1e2d |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E5): x1=1007.73; y1=2654.14; x2=1007.73; y2=2653.14; gradientTransform=translate(-392794.7782 2240190.8241) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E20 rect (26.12, 98.68), 390 × 844, rx=0, ry=0.
- `map-grid` (pattern, E8): x=0; y=0; width=32; height=32; patternTransform=translate(1811.8428 -13059.5455) scale(1 -.9338); patternUnits=userSpaceOnUse; viewBox=0 0 32 32. Direct fill uses: E22 rect (26.34, 150.68), 390 × 713.44, rx=0, ry=0.

### Interactive-looking elements

- Search field “Search this area”; chips “GYM’S”, “BOXING”, “FOOTBALL”.
- Markers “MR”, “DS”, “JK”, “AB” with rating pills; nearest-coach summary “Marcus Reyes” is a possible target.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- Assigned to Maps because the Maps tab is highlighted and the content is a grid/marker view; the external title remains literally “Discover”.
- “blinking marker” is a red annotation beside the lime marker, with a #be1e2d arrow. No blinking animation is present.

**Other explicit styling:** letter-spacing values `-.05em`, `-.03em`, `-.02em`, `-.01em`, `0em`, `.09em`, `.1em`; stroke-width values `1.8px`, `2px`, `3px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 19. Discover.svg

**Screen:** Coach discovery list with coach/partner selector. **Module:** Discover.

**ViewBox:** `0 0 427.27 1062.51`. **Source:** [Discover.svg](../design/svg/Discover.svg).

### Layout, dimensions and spacing

- External Discover → status bar → “Lets” / “Find your coach” / “or partner”, location, notification and profile controls → “Chosen Sport” and three sports pictograms beside coaches/Partners segmented control → sport selector → search → FEATURED COACHES → two boosted coach cards → advertisement → ALL COACHES and Diego card → bottom navigation.
- Phone (16.21,96.46), 390 × 844, radius 28, with 389 × 843 rounded clip. Notification/profile buttons 44 × 44, radius 14. Segmented container 148 × 42,radius14; inner segments 68 × 34,radius11; coaches lime, Partners #222223 with lime text.
- Sport selector approximately 354.79 × 38, y=321.35; search field 354 × 46,radius14,y=370.75. Featured cards 354 × 88,radius18,y=468.46,568.46; gold-tinted backgrounds and outlines; avatars54 × 54,radius15. Ad354 × 92,radius18,y=668.46. Diego card354 × 88,radius18,y=810.46. Bottom bar y=862.68,height80; Discover lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E10) | 49.74 | 133.64 | `"Discover"` | F4 31px; #f2f3f5 | Outside phone, above frame |
| T2 (E19) | 121.46 | 40.21 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T3 (E26) | 160.46 | 34.21 | `"Lets"` | F3 13px; #9ba1ac |  |
| T4 (E28) | 190.46 | 34.21 | `"Find your coach"` | F3 27px; #f2f3f5 |  |
| T5 (E32) | 215.46 | 34.21 | `"or partner"` | F3 27px; #f2f3f5 |  |
| T6 (E37) | 232.46 | 34.21 | `"Beirut, Lebanon"` | F3 13px; #c6f24e |  |
| T7 (E39) | 276.82 | 36.26 | `"Chosen Sport"` | F3 11px; #9ba1ac |  |
| T8 (E175) | 291.58 | 255.73 | `"coaches "` | F3 13px; #0d0e11 |  |
| T9 (E177) | 291.74 | 325.9 | `"Partners"` | F3 13px; #c6f24e |  |
| T10 (E167) | 344.35 | 65.87 | `"All sports and hobbies"` | F3 12px; #c5cad2 |  |
| T11 (E155) | 398.75 | 80.22 | `"Search Coach, Mentor"` | F8 14px; #6b7280 |  |
| T12 (E49) | 454.46 | 34.21 | `"FEATURED COACHES"` | F3 12px; #6b7280 |  |
| T13 (E68) | 495.46 | 273.95 | `"BOOSTED"` | F3 9px; #f2c84b |  |
| T14 (E60) | 496.46 | 116.21 | `"Marcus Reyes"` | F3 16px; #f2f3f5 |  |
| T15 (E58) | 517.46 | 62.76 | `"MR"` | F3 16px; #f2f3f5 |  |
| T16 (E70) | 518.46 | 116.21 | `"Strength - 1.2 km"` | F8 13px; #9ba1ac |  |
| T17 (E77) | 523.12 | 318.28 | `"$45"` | F3 17px; #c6f24e |  |
| T18 (E79) | 540.12 | 291.82 | `"per session"` | F8 11px; #6b7280 |  |
| T19 (E75) | 540.46 | 116.21 | `"* 4.9 (213)"` | F3 12px; #f2c84b |  |
| T20 (E90) | 595.46 | 273.95 | `"BOOSTED"` | F3 9px; #f2c84b |  |
| T21 (E86) | 596.46 | 116.21 | `"Aicha Bennani"` | F3 16px; #f2f3f5 |  |
| T22 (E84) | 617.46 | 63.65 | `"AB"` | F3 16px; #f2f3f5 |  |
| T23 (E92) | 618.46 | 116.21 | `"Boxing - 2.4 km"` | F8 13px; #9ba1ac |  |
| T24 (E98) | 625.11 | 317.61 | `"$50"` | F3 17px; #c6f24e |  |
| T25 (E100) | 638.14 | 291.94 | `"per session"` | F8 11px; #6b7280 |  |
| T26 (E96) | 640.46 | 116.21 | `"* 4.9 (178)"` | F3 12px; #f2c84b |  |
| T27 (E125) | 694.46 | 363.76 | `"x"` | F3 16px; #6b7280 |  |
| T28 (E109) | 698.46 | 122.71 | `"AD"` | F3 9px; #c6f24e |  |
| T29 (E105) | 718.46 | 63.98 | `"SL"` | F3 16px; #f2f3f5 |  |
| T30 (E111) | 722.46 | 112.21 | `"StrideLab running shoes"` | F3 15px; #f2f3f5 |  |
| T31 (E113) | 740.46 | 112.21 | `"Free gait analysis with first pair."` | F8 13px; #9ba1ac |  |
| T32 (E127) | 796.46 | 34.21 | `"ALL COACHES"` | F3 12px; #6b7280 |  |
| T33 (E136) | 838.46 | 116.21 | `"Diego Santos"` | F3 16px; #f2f3f5 |  |
| T34 (E140) | 854.46 | 317.84 | `"$38"` | F3 17px; #c6f24e |  |
| T35 (E134) | 859.46 | 64.09 | `"DS"` | F3 16px; #f2f3f5 |  |
| T36 (E138) | 860.46 | 116.21 | `"Calisthenics - 0.8 km"` | F8 13px; #9ba1ac |  |
| T37 (E142) | 871.79 | 289.95 | `"per session"` | F8 11px; #6b7280 | Source text behind later bottom bar |
| T38 (E46) | 872.46 | 116.21 | `"* 4.8 (142)"` | F3 12px; #f2c84b | Source text behind later bottom bar |
| T39 (E202) | 921.76 | 356.25 | `"Chat"` | F3 10px; #6b7280 |  |
| T40 (E209) | 922.12 | 120.32 | `"Maps"` | F3 10px; #6b7280 |  |
| T41 (E188) | 922.76 | 34.17 | `"Discover"` | F3 10px; #c6f24e |  |
| T42 (E198) | 923.13 | 196.6 | `"Courts"` | F3 10px; #6b7280 |  |
| T43 (E196) | 923.26 | 261.94 | `"Community"` | F3 10px; #6b7280 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E7 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T8<br>Shape/background fill: E18 rect |
| `#101216` | Path fill: E184 start (16.29, 862.68) |
| `#15171c` | stop-color: E6 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E42 rect, E131 rect, E146 rect, E153 rect, E171 rect<br>Path fill: E165 start (54.43, 321.35) |
| `#1c1f26` | Shape/background fill: E102 rect |
| `#211f18` **ONE ARTBOARD ONLY** | Shape/background fill: E55 rect, E81 rect |
| `#222223` **ONE ARTBOARD ONLY** | Shape/background fill: E174 rect |
| `#262b33` | Shape/background fill: E133 rect |
| `#2a3a2e` | Shape/background fill: E104 rect |
| `#2e4949` | Shape/background fill: E9 rect |
| `#3a331c` | Shape/background fill: E57 rect, E83 rect |
| `#3a3f47` | Shape/background fill: E21 circle α=.65 |
| `#58595b` | Path stroke: E169 start (359.45, 337.36) |
| `#6b7280` | Text fill: T11, T12, T18, T25, T27, T32, T37, T39, T40, T42, T43<br>Border/icon stroke: E16 circle, E161 circle, E193 circle, E194 circle, E195 circle, E213 circle, E214 line<br>Path stroke: E144 start (206.29, 876.91), E162 start (62.22, 396.75), E201 start (355.36, 876.76), E206 start (128.86, 895.18), E207 start (143.84, 895.18), E208 start (130.46, 895.18), E212 start (227.44, 895.94), E215 start (229.67, 894.37), E216 start (195.77, 894.37) |
| `#9ba1ac` | Text fill: T3, T7, T16, T23, T31, T36 |
| `#c5cad2` | Text fill: T10 |
| `#c6f24e` | Text fill: T6, T9, T17, T24, T28, T34, T41<br>Shape/background fill: E45 circle, E173 rect<br>Path fill: E107 start (122.21, 684.46) α=.12, E180 start (37.62, 294.17), E181 start (61.77, 295.79), E182 start (74.39, 302)<br>Border/icon stroke: E186 circle<br>Path stroke: E108 start (122.21, 684.46) α=.2, E187 start (59.29, 889.76) |
| `#f2c84b` | Text fill: T13, T19, T20, T26, T38<br>Path fill: E66 start (271.21, 480.46) α=.18, E88 start (271.21, 580.46) α=.18<br>Border/icon stroke: E56 rect α=.34, E82 rect α=.34<br>Path stroke: E67 start (271.21, 480.46) α=.25, E89 start (271.21, 580.46) α=.25 |
| `#f2f3f5` | Text fill: T1, T2, T4, T5, T14, T15, T21, T22, T29, T30, T33, T35<br>Shape/background fill: E25 rect<br>Border/icon stroke: E24 rect, E25 rect, E149 circle<br>Path stroke: E22 start (334.21, 119.46), E23 start (338.21, 123.46), E44 start (306.21, 171.96), E150 start (356.02, 185.56) |
| `#fff` | Border/icon stroke: E43 rect α=.07, E103 rect α=.07, E132 rect α=.07, E147 rect α=.07, E154 rect α=.07, E172 rect α=.07<br>Path stroke: E166 start (54.43, 321.35) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E4 | Definition: rect: (16.71, 96.96), 389 × 843, rx=28, ry=28 | fill none |
| E9 | rect: (2.27, 0), 424.06 × 1072.14, rx=0, ry=0 | fill #2e4949 |
| E15 | rect: (16.21, 96.46), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E16 | circle: centre (177.68, 955.16), r=2.17 | fill none; stroke #6b7280 |
| E17, E18 | rect: (16.21, 96.46), 390 × 844, rx=28, ry=28 | E17: fill none<br>E18: fill #0d0e11 |
| E21 | circle: centre (211.21, 114.46), r=9 | fill #3a3f47; opacity .65 |
| E24 | rect: (361.21, 111.46), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E25 | rect: (381.21, 115.46), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E42, E43 | rect: (292.21, 152.46), 44 × 44, rx=14, ry=14 | E42: fill #16181d<br>E43: fill none; stroke #fff; opacity .07 |
| E45 | circle: centre (321.21, 166.96), r=4 | fill #c6f24e |
| E55, E56 | rect: (34.21, 468.46), 354 × 88, rx=18, ry=18 | E55: fill #211f18<br>E56: fill none; stroke #f2c84b; opacity .34 |
| E57 | rect: (48.21, 484.46), 54 × 54, rx=15, ry=15 | fill #3a331c |
| E81, E82 | rect: (34.21, 568.46), 354 × 88, rx=18, ry=18 | E81: fill #211f18<br>E82: fill none; stroke #f2c84b; opacity .34 |
| E83 | rect: (48.21, 584.46), 54 × 54, rx=15, ry=15 | fill #3a331c |
| E102, E103 | rect: (34.21, 668.46), 354 × 92, rx=18, ry=18 | E102: fill #1c1f26<br>E103: fill none; stroke #fff; opacity .07 |
| E104 | rect: (48.21, 686.46), 52 × 52, rx=14, ry=14 | fill #2a3a2e |
| E131, E132 | rect: (34.21, 810.46), 354 × 88, rx=18, ry=18 | E131: fill #16181d<br>E132: fill none; stroke #fff; opacity .07 |
| E133 | rect: (48.21, 826.46), 54 × 54, rx=15, ry=15 | fill #262b33 |
| E146, E147 | rect: (344.21, 152.53), 44 × 44, rx=14, ry=14 | E146: fill #16181d<br>E147: fill none; stroke #fff; opacity .07 |
| E149 | circle: centre (366.21, 169.44), r=5.94 | fill none; stroke #f2f3f5; stroke-width 2px |
| E153, E154 | rect: (36.22, 370.75), 354 × 46, rx=14, ry=14 | E153: fill #16181d<br>E154: fill none; stroke #fff; opacity .07 |
| E161 | circle: centre (57.22, 391.75), r=7 | fill none; stroke #6b7280; stroke-width 2px |
| E171, E172 | rect: (242.22, 265.96), 148 × 42, rx=14, ry=14 | E171: fill #16181d<br>E172: fill none; stroke #fff; opacity .07 |
| E173 | rect: (247.04, 269.96), 68 × 34, rx=11, ry=11 | fill #c6f24e |
| E174 | rect: (317.47, 269.96), 68 × 34, rx=11, ry=11 | fill #222223 |
| E186 | circle: centre (53.29, 883.76), r=8 | fill none; stroke #c6f24e; stroke-width 2px |
| E193 | circle: centre (291.49, 881.05), r=5.79 | fill none; stroke #6b7280; stroke-width 2px |
| E194 | circle: centre (281.07, 892.63), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E195 | circle: centre (301.91, 892.63), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E213 | circle: centre (212.72, 886.85), r=2.17 | fill none; stroke #6b7280 |
| E214 | line: (212.72, 895.94) → (212.72, 877.76) | fill none; stroke #6b7280 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E5): x1=1492.89; y1=2654.14; x2=1492.89; y2=2653.14; gradientTransform=translate(-582013.9476 2240190.8241) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E15 rect (16.21, 96.46), 390 × 844, rx=0, ry=0.

### Interactive-looking elements

- Notification bell with lime dot; profile-shaped control.
- Three unlabelled sport pictograms (ball, racket/ball, glove shapes); exact actions are not encoded.
- “coaches ” and “Partners” segments; “All sports and hobbies” dropdown; “Search Coach, Mentor” field.
- Marcus Reyes, Aicha Bennani and Diego Santos cards; StrideLab advertisement and its literal “x” dismissal-looking control.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- “Lets” has no apostrophe; “coaches ” is lowercase with trailing space; ratings use a literal asterisk.
- The bottom bar covers the lower part of Diego’s card, including the source rating at y=872.46 and per-session label at y=871.79; these remain inventoried.
- The background gradient is drawn before the opaque phone base and is covered.

**Other explicit styling:** letter-spacing values `-.1em`, `-.04em`, `-.03em`, `-.02em`, `-.01em`, `0em`, `.03em`, `.1em`, `.12em`; stroke-width values `1.8px`, `2px`, `2.2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 20. Login and signup 2.svg

**Screen:** Role selection. **Module:** Login/Signup.

**ViewBox:** `0 0 442.88 1070.66`. **Source:** [Login and signup 2.svg](../design/svg/Login%20and%20signup%202.svg).

### Layout, dimensions and spacing

- External Login and signup → status bar → large blank upper region → “What” / “Are you?” → two role pills → NEXT.
- Phone (26.96,83.49),390 × 844,radius28. Prompts at y=366.83 and396.83. Role pills around x=88.68 and234.16,y≈459.56, approximately132.34 × 42.18 with21.09 curved ends. Coach/Teacher dark; Trainee/ Student lime.
- NEXT (131.72,558.12),205.66 × 34,radius11, with right chevron.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E8) | 49.37 | 140.07 | `"Login and signup"` | F4 31px; #f2f3f5 | Outside phone, above frame |
| T2 (E16) | 108.49 | 50.95 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T3 (E24) | 366.83 | 55.94 | `"What"` | F3 13px; #9ba1ac |  |
| T4 (E26) | 396.83 | 55.94 | `"Are you?"` | F3 27px; #f2f3f5 |  |
| T5 (E40) | 483.86 | 100.84 | `"Coach/Teacher"` | F3 14.89px; #c5cad2 |  |
| T6 (E48) | 483.86 | 242.18 | `"Trainee/ Student"` | F3 14.89px; #0d0e11 |  |
| T7 (E32) | 580.64 | 211.14 | `"NEXT "` | F3 13px; #0d0e11 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T6, T7<br>Shape/background fill: E12 rect |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Path fill: E38 start (109.77, 459.56)<br>Border/icon stroke: E36 polyline |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a3f47` | Shape/background fill: E18 circle α=.65 |
| `#9ba1ac` | Text fill: T3 |
| `#c5cad2` | Text fill: T5 |
| `#c6f24e` | Shape/background fill: E31 rect<br>Path fill: E46 start (255.25, 459.52)<br>Path stroke: E47 start (256.58, 459.56) α=.07 |
| `#f2f3f5` | Text fill: T1, T2, T4<br>Shape/background fill: E22 rect<br>Border/icon stroke: E21 rect, E22 rect<br>Path stroke: E19 start (344.96, 106.49), E20 start (348.96, 110.49) |
| `#fff` | Path stroke: E39 start (109.77, 459.56) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (.68, 0), 439.57 × 1073.74, rx=0, ry=0 | fill #2e4949 |
| E11, E12 | rect: (26.96, 83.49), 390 × 844, rx=28, ry=28 | E11: fill none<br>E12: fill #0d0e11 |
| E13 | rect: (26.96, 83.49), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E14 | rect: (26.5, 83.74), 390 × 843.5, rx=0, ry=0 | fill none |
| E15 | rect: (27.46, 83.99), 389 × 843, rx=28, ry=28 | fill none |
| E18 | circle: centre (221.96, 101.49), r=9 | fill #3a3f47; opacity .65 |
| E21 | rect: (371.96, 98.49), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E22 | rect: (391.96, 102.49), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E31 | rect: (131.72, 558.12), 205.66 × 34, rx=11, ry=11 | fill #c6f24e |
| E36 | polyline: points=315.13 570.42 320.71 575.99 315.6 581.1 | fill none; stroke #16181d; stroke-width 3px |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=3536.4; y1=2649.81; x2=3536.4; y2=2648.81; gradientTransform=translate(-1378975.9061 2236526.674) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E13 rect (26.96, 83.49), 390 × 844, rx=0, ry=0.

### Interactive-looking elements

- “Coach/Teacher” and “Trainee/ Student” role chips; “NEXT ” button.

### Ambiguities and literal-source observations

- No back control or bottom navigation is present.

**Other explicit styling:** letter-spacing values `-.08em`, `-.07em`, `-.02em`, `0em`; stroke-width values `1.8px`, `3px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 21. Login and signup 3.svg

**Screen:** Location and search radius. **Module:** Login/Signup.

**ViewBox:** `0 0 436.9 1070.66`. **Source:** [Login and signup 3.svg](../design/svg/Login%20and%20signup%203.svg).

### Layout, dimensions and spacing

- External Login and signup → status bar → blank upper region → “Hey Champ -” / “Where are we looking?” → Location field with crosshair-shaped control → Search Radius → horizontal range graphic and endpoint labels → NEXT.
- Phone (20.56,81.2),390 × 844,radius28. Location path approximately334.61 × 38 at(48.25,419.61), with18.08 horizontal/19 vertical corner offsets. Location label scaled .95 horizontally.
- Range line y=511.37 spans x=47.94–378.93; left line lime, right #dff489 under group opacity .53. End ticks2 × 13 at y504.87. A lime running-person path sits near the midpoint; no numerical selected-radius value is written. NEXT(117.81,570.2),205.66 × 34,radius11.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E8) | 49.37 | 83.26 | `"Login and signup"` | F4 31px; #f2f3f5 | Outside phone, above frame |
| T2 (E16) | 106.2 | 44.56 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T3 (E24) | 364.54 | 49.54 | `"Hey Champ -"` | F3 13px; #9ba1ac |  |
| T4 (E26) | 394.54 | 49.54 | `"Where are we looking?"` | F3 27px; #f2f3f5 |  |
| T5 (E42) | 442.61 | 74.26 | `"Location"` | F3 12px; #c5cad2 | scale(.95 1) |
| T6 (E32) | 488.64 | 44.36 | `"Search Radius"` | F3 12px; #f2f3f5 |  |
| T7 (E61) | 536.47 | 41.75 | `"1Km"` | F3 12px; #f2f3f5 |  |
| T8 (E59) | 536.47 | 346.19 | `"100 Km"` | F3 12px; #f2f3f5 |  |
| T9 (E53) | 592.72 | 197.24 | `"NEXT "` | F3 13px; #0d0e11 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T9<br>Shape/background fill: E12 rect |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Path fill: E40 start (66.33, 419.61)<br>Border/icon stroke: E57 polyline |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a3f47` | Shape/background fill: E18 circle α=.65 |
| `#58595b` | Shape/background fill: E47 line, E48 line, E49 line, E50 line |
| `#9ba1ac` | Text fill: T3 |
| `#c5cad2` | Text fill: T5 |
| `#c6f24e` | Shape/background fill: E46 ellipse, E52 rect, E65 rect<br>Path fill: E70 start (210.22, 513.44)<br>Border/icon stroke: E45 ellipse, E47 line, E48 line, E49 line, E50 line, E64 line |
| `#dff489` **ONE ARTBOARD ONLY** | Shape/background fill: E69 rect<br>Border/icon stroke: E68 line |
| `#f2f3f5` | Text fill: T1, T2, T4, T6, T7, T8<br>Shape/background fill: E22 rect<br>Border/icon stroke: E21 rect, E22 rect<br>Path stroke: E19 start (338.56, 104.2), E20 start (342.56, 108.2) |
| `#fff` | Path stroke: E41 start (66.33, 419.61) α=.07 |

`#58595b` is a declared fill on line elements E47–E50, not a visible area fill. Those lines paint `#c6f24e` strokes. The `#dff489` line and tick are inside group E66 at opacity `.53`.

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (-.57, 0), 437.47 × 1073.74, rx=0, ry=0 | fill #2e4949 |
| E11, E12 | rect: (20.56, 81.2), 390 × 844, rx=28, ry=28 | E11: fill none<br>E12: fill #0d0e11 |
| E13 | rect: (20.56, 81.2), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E14 | rect: (20.1, 81.45), 390 × 843.5, rx=0, ry=0 | fill none |
| E15 | rect: (21.06, 81.7), 389 × 843, rx=28, ry=28 | fill none |
| E18 | circle: centre (215.56, 99.2), r=9 | fill #3a3f47; opacity .65 |
| E21 | rect: (365.56, 96.2), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E22 | rect: (385.56, 100.2), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E45 | ellipse: centre (359.28, 438.61), rx=5.7, ry=5.99 | fill none; stroke #c6f24e; stroke-width 2px |
| E46 | ellipse: centre (359.28, 438.61), rx=1.62, ry=1.71 | fill #c6f24e |
| E47 | line: (359.28, 432.62) → (359.28, 429.87) | fill #58595b; stroke #c6f24e; stroke-width 2px |
| E48 | line: (359.28, 447.35) → (359.28, 444.6) | fill #58595b; stroke #c6f24e; stroke-width 2px |
| E49 | line: (364.98, 438.61) → (367.6, 438.61) | fill #58595b; stroke #c6f24e; stroke-width 2px |
| E50 | line: (350.97, 438.61) → (353.58, 438.61) | fill #58595b; stroke #c6f24e; stroke-width 2px |
| E52 | rect: (117.81, 570.2), 205.66 × 34, rx=11, ry=11 | fill #c6f24e |
| E57 | polyline: points=301.23 582.5 306.81 588.07 301.69 593.18 | fill none; stroke #16181d; stroke-width 3px |
| E64 | line: (47.94, 511.37) → (214.28, 511.37) | fill none; stroke #c6f24e; stroke-width 2px |
| E65 | rect: (46.94, 504.87), 2 × 13, rx=0, ry=0 | fill #c6f24e |
| E68 | line: (212.59, 511.37) → (378.93, 511.37) | fill none; stroke #dff489; stroke-width 2px; ancestor E66 opacity .53 |
| E69 | rect: (377.93, 504.87), 2 × 13, rx=0, ry=0 | fill #dff489; ancestor E66 opacity .53 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=3060.74; y1=2649.82; x2=3060.74; y2=2648.82; gradientTransform=translate(-1193471.6426 2236526.674) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E13 rect (20.56, 81.2), 390 × 844, rx=0, ry=0.

### Interactive-looking elements

- “Location” field; unlabelled crosshair-shaped control; slider-like “Search Radius” graphic with endpoints “1Km” and “100 Km”; “NEXT ”.

### Ambiguities and literal-source observations

- #58595b is specified as fill on four crosshair line elements, whose painted strokes are lime; open line geometry does not create a visible filled area.

**Other explicit styling:** letter-spacing values `-.02em`, `-.01em`, `0em`; stroke-width values `1.8px`, `2px`, `3px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 22. Login and signup.svg

**Screen:** Get Started — email and second input with social glyph controls. **Module:** Login/Signup.

**ViewBox:** `0 0 446.34 1070.66`. **Source:** [Login and signup.svg](../design/svg/Login%20and%20signup.svg).

### Layout, dimensions and spacing

- External Login and signup → status bar → blank upper region → “Let’s” / “Get Started ” → Email field → red icon-colour annotation between fields → second field → NEXT → two outlined social-glyph squares → lower “animated gradient” annotation and arrow.
- Phone (30.21,79.06),390 × 844,radius28; gradient rectangle has square corners. Input paths approximately337.8 × 46 at(56.31,413.47) and(56.31,473.04), with13.36 horizontal/14 vertical corner offsets. Second field has password-like underline/asterisk icon geometry but its literal placeholder is “Search Coach, Mentor”.
- NEXT(122.38,547.65),205.66 × 34,radius11. Social squares at(159.5,608.9) and(257.02,608.9),47.43 square,radius8.47,white outlines; path glyphs depict f and G+. Upper camera circle is painted before the opaque phone/gradient rectangles and is covered.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E8) | 55.48 | 92.95 | `"Login and signup"` | F4 31px; #f2f3f5 | Outside phone, above frame |
| T2 (E42) | 104.06 | 54.21 | `"9:30"` | F3 13px; #fff |  |
| T3 (E17) | 362.4 | 59.19 | `"Let’s"` | F3 13px; #9ba1ac | scale(1.03 1) |
| T4 (E21) | 389.4 | 58.19 | `"Get Started "` | F3 27px; #f2f3f5 |  |
| T5 (E25) | 441.47 | 103.21 | `"Email"` | F8 14px; #6b7280 |  |
| T6 (E61) | 470.04 | 36.84 | `"icon switches color when typing to HEX: c6f24e"` | F9 12px; #ed1c24 | Designer annotation |
| T7 (E29) | 501.04 | 104.21 | `"Search Coach, Mentor"` | F8 14px; #6b7280 |  |
| T8 (E37) | 570.17 | 201.8 | `"NEXT "` | F3 13px; #0d0e11 |  |
| T9 (E72) | 862.17 | 202.79 | `"animated gradient"` | F3 17.58px; #ed1c24 | Designer annotation |

Additional icon glyph shapes: lowercase `f` (E54) and `G+` (E58–E59) inside the two social controls. These are path/polygon silhouettes, with no text/font metadata.

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T8<br>Shape/background fill: E13 rect |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Path fill: E23 start (69.67, 413.47), E27 start (69.67, 473.04)<br>Border/icon stroke: E41 polyline |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a3f47` | Shape/background fill: E11 circle α=.65 |
| `#6b7280` | Text fill: T5, T7<br>Path fill: E50 start (80.21, 445.99), E51 start (74.09, 499.4) |
| `#9ba1ac` | Text fill: T3 |
| `#c6f24e` | Shape/background fill: E36 rect |
| `#ed1c24` | Text fill: T6, T9<br>Shape/background fill: E65 polygon, E68 polygon, E71 polygon<br>Path stroke: E64 start (71.41, 437.52), E67 start (69.11, 496.04), E70 start (46.52, 925.53) |
| `#f2f3f5` | Text fill: T1, T4 |
| `#fff` | Text fill: T2<br>Shape/background fill: E59 polygon<br>Path fill: E54 start (179.6, 646.95), E58 start (283.7, 632)<br>Border/icon stroke: E48 rect, E49 rect, E53 rect, E56 rect<br>Path stroke: E24 start (69.67, 413.47) α=.07, E28 start (69.67, 473.04) α=.07, E45 start (348.21, 102.06), E46 start (352.21, 106.06) |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (0, 0), 446.34 × 1073.74, rx=0, ry=0 | fill #2e4949 |
| E11 | circle: centre (225.21, 97.06), r=9 | fill #3a3f47; opacity .65 |
| E12, E13 | rect: (30.21, 79.06), 390 × 844, rx=28, ry=28 | E12: fill none<br>E13: fill #0d0e11 |
| E14 | rect: (30.21, 79.06), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E15 | rect: (30.71, 79.56), 389 × 843, rx=28, ry=28 | fill none |
| E36 | rect: (122.38, 547.65), 205.66 × 34, rx=11, ry=11 | fill #c6f24e |
| E41 | polyline: points=305.79 559.95 311.37 565.53 306.26 570.64 | fill none; stroke #16181d; stroke-width 3px |
| E48 | rect: (375.21, 94.06), 19 × 12, rx=3, ry=3 | fill none; stroke #fff; stroke-width 1.8px |
| E49 | rect: (395.21, 98.06), 3 × 4, rx=1, ry=1 | fill none; stroke #fff; stroke-width 1.8px |
| E53 | rect: (159.5, 608.9), 47.43 × 47.43, rx=8.47, ry=8.47 | fill none; stroke #fff |
| E56 | rect: (257.02, 608.9), 47.43 × 47.43, rx=8.47, ry=8.47 | fill none; stroke #fff |
| E59 | polygon: points=297.47 632.11 293.51 632.11 293.51 628.16 290.99 628.16 290.99 632.11 287.04 632.11 287.04 634.63 290.99 634.63 290.99 638.59 293.51 638.59 293.51 634.63 297.47 634.63 297.47 632.11 | fill #fff |
| E65 | polygon: points=51.16 448.14 47.79 457.53 57.6 455.75 51.16 448.14 | fill #ed1c24 |
| E68 | polygon: points=54.9 477.91 45.06 476.28 48.57 485.61 54.9 477.91 | fill #ed1c24 |
| E71 | polygon: points=212.89 828.91 229.05 792.45 189.38 796.68 212.89 828.91 | fill #ed1c24 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=4011.49; y1=2649.82; x2=4011.49; y2=2648.82; gradientTransform=translate(-1564255.3132 2236526.674) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E14 rect (30.21, 79.06), 390 × 844, rx=0, ry=0.

### Interactive-looking elements

- Input “Email”; second input “Search Coach, Mentor”; “NEXT ” with right chevron.
- Two icon-only outlined social controls containing f and G+ path glyphs; no literal provider names or target actions are encoded.

### Ambiguities and literal-source observations

- The red text explicitly says “icon switches color when typing to HEX: c6f24e”; actual drawn field icons are #6b7280.
- “animated gradient” is an annotation, not SVG animation. No password placeholder is substituted for the actual string.

**Other explicit styling:** letter-spacing values `-.06em`, `-.03em`, `-.02em`, `-.01em`; stroke-width values `1.8px`, `3px`, `4px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 23. NAV Bar variations.svg

**Screen:** Three alternative five-item navigation bars. **Module:** Nav bar.

**ViewBox:** `0 0 544.7 396.6`. **Source:** [NAV Bar variations.svg](../design/svg/NAV%20Bar%20variations.svg).

### Layout, dimensions and spacing

- 544.7 × 396.6 artboard with #1c1f26 background. Three #101216 rectangles, each390 × 80, x=77.35,y=50.78,154,271. Vertical gaps23.22 and37; no corner radius on the bar rectangles.
- Top row left-to-right: Discover, Maps, Courts, Community, Chat. Middle row: Discover, Community, Shop, Chat, Profile. Bottom row: Discover, Maps, Shop, Community, Chat. Discover is lime in all three rows; all remaining icons/labels grey.
- Icons sit above labels. Search circles have radius8, people icons use clustered circles, Shop is a20 × 18 rounded bag with4-unit corners and handle, Chat uses a speech outline, Profile uses head/shoulders, Courts a court outline, Maps folded-panel paths. Stroke-based icons generally use2px strokes.
- Bottom-row Discover, Maps, Community and Chat labels are outlined path glyphs; Shop remains live text. Their words were verified from an in-memory rendering of the source paths.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E48) | 109.86 | 417.31 | `"Chat"` | F3 10px; #6b7280 |  |
| T2 (E55) | 110.22 | 181.38 | `"Maps"` | F3 10px; #6b7280 |  |
| T3 (E34) | 110.86 | 95.23 | `"Discover"` | F3 10px; #c6f24e |  |
| T4 (E44) | 111.23 | 257.65 | `"Courts"` | F3 10px; #6b7280 |  |
| T5 (E42) | 111.36 | 323 | `"Community"` | F3 10px; #6b7280 |  |
| T6 (E8) | 214 | 95.23 | `"Discover"` | F3 10px; #c6f24e |  |
| T7 (E14) | 214 | 166.85 | `"Community"` | F3 10px; #6b7280 |  |
| T8 (E18) | 214 | 259.85 | `"Shop"` | F3 10px; #6b7280 |  |
| T9 (E21) | 214 | 339.24 | `"Chat"` | F3 10px; #6b7280 |  |
| T10 (E25) | 214 | 412.79 | `"Profile"` | F3 10px; #6b7280 |  |
| T11 (E114) | 334.89 | 260.09 | `"Shop"` | F3 10px; #6b7280 |  |

Additional bottom-row labels are outlined paths (verified from the source-path rendering), ordered by their lower-edge/baseline positions:

| Source paths | Approximate y | Approximate x | Visible word | Fill |
| --- | ---: | ---: | --- | --- |
| E107–E110 | 335.54–337.32 | 182.21 | `Maps` | `#6b7280` |
| E94–E97 | 336–336.12 | 417.29 | `Chat` | `#6b7280` |
| E82–E90 | 336.62–338.5 | 323.28 | `Community` | `#6b7280` |
| E69–E76 | 337–337.12 | 95.98 | `Discover` | `#c6f24e` |

These are path silhouettes, so the y values are geometric extents/nominal baseline positions, not recovered text baselines. The live `Shop` label is T11 above. Left-to-right order is given in the layout and consolidated navigation tables.

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#101216` | Shape/background fill: E5 rect, E30 rect, E64 rect |
| `#1c1f26` | Shape/background fill: E3 rect |
| `#6b7280` | Text fill: T1, T2, T4, T5, T7, T8, T9, T10, T11<br>Path fill: E78 start (350.33, 299.62), E79 start (341.33, 308.62), E80 start (359.33, 308.62), E82 start (326.66, 336.74), E83 start (333.22, 336.74), E84 start (336.93, 336.62), E85 start (345.84, 336.62), E86 start (356.45, 336.74), E87 start (360.76, 336.62), E88 start (366.78, 330.59), E89 start (371.02, 336.74), E90 start (373.63, 338.5), E92 start (418.35, 314), E94 start (421.07, 336.12), E95 start (425.21, 336), E96 start (432.62, 336.12), E97 start (438.6, 336.12), E101 start (184.48, 311.72), E103 start (199.46, 311.72), E105 start (197.1, 311.72), E107 start (182.21, 335.54), E108 start (192.2, 335.66), E109 start (196.61, 337.32), E110 start (204.82, 335.66)<br>Border/icon stroke: E11 circle, E12 circle, E13 circle, E16 rect, E23 circle, E39 circle, E40 circle, E41 circle, E59 circle, E60 line, E112 rect<br>Path stroke: E17 start (267.35, 170), E20 start (338.35, 169), E24 start (416.35, 190), E47 start (416.42, 64.86), E52 start (189.92, 83.28), E53 start (204.9, 83.28), E54 start (191.51, 83.28), E58 start (288.5, 84.05), E61 start (290.72, 82.47), E62 start (256.83, 82.47), E113 start (267.59, 290.88) |
| `#c6f24e` | Text fill: T3, T6<br>Path fill: E66 start (114.35, 307), E67 start (127.35, 312), E69 start (95.98, 337), E70 start (103.25, 330.97), E71 start (108.05, 337.12), E72 start (113.79, 337.12), E73 start (119.63, 337.12), E74 start (124.71, 337), E75 start (131.2, 337.12), E76 start (134.66, 337)<br>Border/icon stroke: E6 circle, E32 circle<br>Path stroke: E7 start (120.35, 181), E33 start (120.35, 77.86) |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E3 | rect: (0, 0), 544.7 × 396.6, rx=0, ry=0 | fill #1c1f26 |
| E5 | rect: (77.35, 154), 390 × 80, rx=0, ry=0 | fill #101216 |
| E6 | circle: centre (114.35, 175), r=8 | fill none; stroke #c6f24e; stroke-width 2px |
| E11 | circle: centre (194.35, 171), r=5 | fill none; stroke #6b7280; stroke-width 2px |
| E12 | circle: centre (185.35, 181), r=4 | fill none; stroke #6b7280; stroke-width 2px |
| E13 | circle: centre (203.35, 181), r=4 | fill none; stroke #6b7280; stroke-width 2px |
| E16 | rect: (262.35, 170), 20 × 18, rx=4, ry=4 | fill none; stroke #6b7280; stroke-width 2px |
| E23 | circle: centre (428.35, 171), r=7 | fill none; stroke #6b7280; stroke-width 2px |
| E30 | rect: (77.35, 50.78), 390 × 80, rx=0, ry=0 | fill #101216 |
| E32 | circle: centre (114.35, 71.86), r=8 | fill none; stroke #c6f24e; stroke-width 2px |
| E39 | circle: centre (352.55, 69.15), r=5.79 | fill none; stroke #6b7280; stroke-width 2px |
| E40 | circle: centre (342.13, 80.73), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E41 | circle: centre (362.97, 80.73), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E59 | circle: centre (273.78, 74.95), r=2.17 | fill none; stroke #6b7280 |
| E60 | line: (273.78, 84.05) → (273.78, 65.86) | fill none; stroke #6b7280 |
| E64 | rect: (77.35, 271), 390 × 80, rx=0, ry=0 | fill #101216 |
| E112 | rect: (262.59, 290.88), 20 × 18, rx=4, ry=4 | fill none; stroke #6b7280; stroke-width 2px |

### Interactive-looking elements

- All five icon/label items in each bar variation; seven distinct tab labels across the three variations: Discover, Maps, Courts, Community, Shop, Chat, Profile.

### Ambiguities and literal-source observations

- No variation is marked final, preferred, or numbered in the SVG. “Top/middle/bottom” refer only to geometry.
- Outlined labels have no recoverable font-family/font-size declaration on those path groups; appearance is not used to invent typography.

**Other explicit styling:** letter-spacing values `-.02em`, `-.01em`; stroke-width values `2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 24. Profile 1.svg

**Screen:** Alex Morgan profile and settings. **Module:** Profile.

**ViewBox:** `0 0 534.25 1071.84`. **Source:** [Profile 1.svg](../design/svg/Profile%201.svg).

### Layout, dimensions and spacing

- External Profile → status bar → Profile heading/subtitle, notification and profile-shaped controls → identity card with User/Coach/Admin pills → TRAINING rows → red Add my Communities annotation → SETTINGS rows → bottom navigation.
- Phone(96.52,96.47),390 × 844,radius28. Header controls44 square,radius14. Identity card(114.52,252.47),354 × 112,radius18; avatar68 square,radius17, plus unlabelled pencil-shaped control.
- Role pills28 high: User70 wide,lime; Coach78 wide and Admin72 wide,dark. Training/settings rows354 × 58,radius16,y=426.47,496.47,566.47,688.47,758.47. Right badges/pills38 × 28: “2”, “On”, “1”; chevrons at row ends. Bottom bar y=860.27,height80; Chat is lime. Header profile pictogram is also lime.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E8) | 33.47 | 227.24 | `"Profile"` | F4 31px; #f2f3f5 | Outside phone, above frame |
| T2 (E26) | 126.79 | 120.11 | `"9:30"` | F3 13px; #f2f3f5 |  |
| T3 (E35) | 176.47 | 114.52 | `"Profile"` | F3 27px; #f2f3f5 |  |
| T4 (E39) | 212.47 | 114.52 | `"Alex Morgan - Beirut"` | F3 13px; #9ba1ac |  |
| T5 (E48) | 286.47 | 214.52 | `"Alex Morgan"` | F3 20px; #f2f3f5 |  |
| T6 (E52) | 312.47 | 214.52 | `"Strength - Running - Boxing"` | F3 13px; #9ba1ac |  |
| T7 (E46) | 314.47 | 149.75 | `"AM"` | F3 19px; #f2f3f5 |  |
| T8 (E62) | 344.47 | 236.18 | `"User"` | F3 12px; #0d0e11 |  |
| T9 (E67) | 344.47 | 313.19 | `"Coach"` | F3 12px; #c5cad2 |  |
| T10 (E71) | 344.47 | 395.86 | `"Admin"` | F3 12px; #c5cad2 |  |
| T11 (E73) | 408.47 | 114.52 | `"TRAINING"` | F3 12px; #6b7280 |  |
| T12 (E77) | 449.47 | 130.52 | `"My bookings"` | F3 15px; #f2f3f5 |  |
| T13 (E84) | 459.47 | 418.86 | `"2"` | F3 12px; #c6f24e |  |
| T14 (E79) | 469.47 | 130.52 | `"2 upcoming sessions"` | F3 12px; #9ba1ac |  |
| T15 (E89) | 519.47 | 130.52 | `"Notifications"` | F3 15px; #f2f3f5 |  |
| T16 (E91) | 539.47 | 130.52 | `"Daily plan briefing on"` | F3 12px; #9ba1ac |  |
| T17 (E96) | 589.47 | 130.52 | `"Calendar sync"` | F3 15px; #f2f3f5 |  |
| T18 (E106) | 599.47 | 413.87 | `"On"` | F3 12px; #0d0e11 |  |
| T19 (E102) | 609.47 | 130.52 | `"Google - sessions auto pushed"` | F3 12px; #9ba1ac |  |
| T20 (E181) | 639.89 | 7.15 | `"Add my Communities"` | F1 17px; #ed1c24 | Designer annotation |
| T21 (E109) | 670.47 | 114.52 | `"SETTINGS"` | F3 12px; #6b7280 |  |
| T22 (E113) | 711.47 | 130.52 | `"Appearance"` | F3 15px; #f2f3f5 |  |
| T23 (E117) | 731.47 | 130.52 | `"Dark / light theme"` | F3 12px; #9ba1ac |  |
| T24 (E124) | 781.47 | 130.52 | `"Admin console"` | F3 15px; #f2f3f5 |  |
| T25 (E136) | 791.47 | 418.86 | `"1"` | F3 12px; #c6f24e |  |
| T26 (E126) | 801.47 | 130.52 | `"Approvals, reports, accounting"` | F3 12px; #9ba1ac |  |
| T27 (E161) | 919.35 | 436.48 | `"Chat"` | F3 10px; #c6f24e |  |
| T28 (E168) | 919.71 | 200.56 | `"Maps"` | F3 10px; #6b7280 |  |
| T29 (E147) | 920.35 | 114.4 | `"Discover"` | F3 10px; #6b7280 |  |
| T30 (E157) | 920.72 | 276.83 | `"Courts"` | F3 10px; #6b7280 |  |
| T31 (E155) | 920.85 | 342.17 | `"Community"` | F3 10px; #6b7280 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T8, T18<br>Shape/background fill: E13 rect |
| `#101216` | Path fill: E143 start (96.52, 860.27) |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E16 rect, E21 rect, E43 rect, E75 rect, E87 rect, E94 rect, E111 rect, E122 rect |
| `#1c1f26` | Path fill: E65 start (306.52, 326.47), E69 start (392.52, 326.47), E82 start (417.2, 441.47), E134 start (417.2, 773.47) |
| `#273440` **ONE ARTBOARD ONLY** | Shape/background fill: E45 rect |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a3f47` | Shape/background fill: E28 circle α=.65 |
| `#6b7280` | Text fill: T11, T21, T28, T29, T30, T31<br>Border/icon stroke: E145 circle, E152 circle, E153 circle, E154 circle, E172 circle, E173 line<br>Path stroke: E86 start (450.52, 449.47), E93 start (450.52, 521.61), E108 start (450.52, 589.47), E121 start (450.52, 711.47), E138 start (450.52, 781.47), E146 start (139.52, 887.35), E165 start (209.09, 892.77), E166 start (224.08, 892.77), E167 start (210.69, 892.77), E171 start (307.67, 893.54), E174 start (309.9, 891.96), E175 start (276.01, 891.96) |
| `#9ba1ac` | Text fill: T4, T6, T14, T16, T19, T23, T26 |
| `#c5cad2` | Text fill: T9, T10 |
| `#c6f24e` | Text fill: T13, T25, T27<br>Shape/background fill: E19 circle<br>Path fill: E60 start (228.52, 326.47), E104 start (417.2, 581.47), E141 start (434.2, 289.76)<br>Border/icon stroke: E24 circle<br>Path stroke: E25 start (434.79, 185.08), E61 start (228.52, 326.47) α=.07, E105 start (417.2, 581.47) α=.07, E160 start (435.59, 874.35) |
| `#ed1c24` | Text fill: T20<br>Path fill: E180 start (253.7, 648.84)<br>Path stroke: E179 start (15.59, 551.65) |
| `#f2f3f5` | Text fill: T1, T2, T3, T5, T7, T12, T15, T17, T22, T24<br>Shape/background fill: E34 rect<br>Border/icon stroke: E33 rect, E34 rect<br>Path stroke: E18 start (384.97, 171.47), E30 start (414.11, 121.79), E31 start (418.11, 125.79) |
| `#fff` | Border/icon stroke: E17 rect α=.07, E22 rect α=.07, E44 rect α=.07, E76 rect α=.07, E88 rect α=.07, E95 rect α=.07, E112 rect α=.07, E123 rect α=.07, E139 line α=.07, E176 rect α=.12<br>Path stroke: E66 start (306.52, 326.47) α=.07, E70 start (392.52, 326.47) α=.07, E83 start (417.2, 441.47) α=.07, E135 start (417.2, 773.47) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (0, 1.17), 539.66 × 1073.23, rx=0, ry=0 | fill #2e4949 |
| E13, E140 | rect: (96.52, 96.47), 390 × 844, rx=28, ry=28 | E13: fill #0d0e11<br>E140: fill none |
| E14 | rect: (96.52, 96.47), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E16, E17 | rect: (370.97, 151.97), 44 × 44, rx=14, ry=14 | E16: fill #16181d<br>E17: fill none; stroke #fff; opacity .07 |
| E19 | circle: centre (399.97, 166.47), r=4 | fill #c6f24e |
| E21, E22 | rect: (422.97, 152.05), 44 × 44, rx=14, ry=14 | E21: fill #16181d<br>E22: fill none; stroke #fff; opacity .07 |
| E24 | circle: centre (444.97, 168.96), r=5.94 | fill none; stroke #c6f24e; stroke-width 2px |
| E28 | circle: centre (286.29, 117.71), r=9 | fill #3a3f47; opacity .65 |
| E33 | rect: (441.11, 114.79), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E34 | rect: (461.11, 118.79), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E43, E44 | rect: (114.52, 252.47), 354 × 112, rx=18, ry=18 | E43: fill #16181d<br>E44: fill none; stroke #fff; opacity .07 |
| E45 | rect: (130.52, 274.47), 68 × 68, rx=17, ry=17 | fill #273440 |
| E75, E76 | rect: (114.52, 426.47), 354 × 58, rx=16, ry=16 | E75: fill #16181d<br>E76: fill none; stroke #fff; opacity .07 |
| E87, E88 | rect: (114.52, 496.47), 354 × 58, rx=16, ry=16 | E87: fill #16181d<br>E88: fill none; stroke #fff; opacity .07 |
| E94, E95 | rect: (114.52, 566.47), 354 × 58, rx=16, ry=16 | E94: fill #16181d<br>E95: fill none; stroke #fff; opacity .07 |
| E111, E112 | rect: (114.52, 688.47), 354 × 58, rx=16, ry=16 | E111: fill #16181d<br>E112: fill none; stroke #fff; opacity .07 |
| E122, E123 | rect: (114.52, 758.47), 354 × 58, rx=16, ry=16 | E122: fill #16181d<br>E123: fill none; stroke #fff; opacity .07 |
| E139 | line: (96.52, 860.47) → (486.52, 860.47) | fill none; stroke #fff; opacity .07 |
| E145 | circle: centre (133.52, 881.35), r=8 | fill none; stroke #6b7280; stroke-width 2px |
| E152 | circle: centre (371.72, 878.64), r=5.79 | fill none; stroke #6b7280; stroke-width 2px |
| E153 | circle: centre (361.3, 890.22), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E154 | circle: centre (382.15, 890.22), r=4.63 | fill none; stroke #6b7280; stroke-width 2px |
| E172 | circle: centre (292.95, 884.44), r=2.17 | fill none; stroke #6b7280 |
| E173 | line: (292.95, 893.54) → (292.95, 875.35) | fill none; stroke #6b7280 |
| E176 | rect: (97.02, 96.97), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=2540.31; y1=2655.26; x2=2540.31; y2=2654.26; gradientTransform=translate(-990431.1873 2241134.8241) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E14 rect (96.52, 96.47), 390 × 844, rx=0, ry=0.

### Interactive-looking elements

- Notification bell; profile icon; pencil-shaped control; “User”, “Coach”, “Admin” chips.
- Chevron rows “My bookings”, “Notifications”, “Calendar sync”, “Appearance”, “Admin console”. “On” is shown as a pill, not a drawn switch track/thumb.
- Bottom tabs Discover, Maps, Courts, Community, Chat.

### Ambiguities and literal-source observations

- “Add my Communities” is a red callout with arrow, not an existing settings row.
- Chat is highlighted in the bottom bar despite this being the Profile artboard. This discrepancy is preserved.

**Other explicit styling:** letter-spacing values `-.03em`, `-.02em`, `-.01em`, `0em`, `.12em`; stroke-width values `1.8px`, `2px`, `5px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.

## 25. Profile 2.svg

**Screen:** Marcus Reyes coach profile with packages. **Module:** Profile.

**ViewBox:** `0 0 446.14 1062.51`. **Source:** [Profile 2.svg](../design/svg/Profile%202.svg).

### Layout, dimensions and spacing

- External Profile → status bar → second “9:30” text near back/header → back and Coach profile → Marcus profile card → PACKAGES → two package cards → large blank region → Book a session.
- Phone(33.44,101.64),390 × 844,radius28. Profile card(51.44,215.64),354 × 170,radius18; avatar72 square,radius17. Rating pill82 × 28,gold tint/outline; session-count pill98 × 28,dark; pencil-shaped icon at upper right.
- Package cards354 × 64,radius16,y=443.64 and519.64, a12-unit gap. Primary button(51.44,857.64),354 × 52,radius15. No bottom navigation.

### Literal text — top to bottom

| Ref | Baseline y | Start x | Exact source string | Font / declared size / fill | Location or visibility note |
| --- | ---: | ---: | --- | --- | --- |
| T1 (E8) | 35.74 | 42.44 | `"Profile"` | F4 31px; #f2f3f5 | Outside phone, above frame |
| T2 (E125) | 130.77 | 51.44 | `"9:30"` | F3 13px; #f2f3f5 | Separate duplicate time object |
| T3 (E15) | 163.92 | 57.44 | `"9:30"` | F3 13px; #f2f3f5 | Separate duplicate time object |
| T4 (E27) | 179.64 | 105.44 | `"Coach profile"` | F3 19px; #f2f3f5 |  |
| T5 (E36) | 251.64 | 159.44 | `"Marcus Reyes"` | F3 22px; #f2f3f5 |  |
| T6 (E42) | 277.64 | 159.44 | `"Strength and Conditioning"` | F8 13px; #9ba1ac |  |
| T7 (E34) | 279.64 | 90.67 | `"MR"` | F3 19px; #f2f3f5 |  |
| T8 (E49) | 313.64 | 188.1 | `"* 4.9"` | F3 12px; #f2c84b |  |
| T9 (E53) | 313.64 | 257.58 | `"640+ sessions"` | F3 12px; #c5cad2 |  |
| T10 (E55) | 351.64 | 69.44 | `"Ex-national powerlifter. Durable strength,"` | F3 13px; #c5cad2 |  |
| T11 (E65) | 371.64 | 69.44 | `"flawless technique and progressive overload."` | F8 13px; #c5cad2 |  |
| T12 (E81) | 427.64 | 51.44 | `"PACKAGES"` | F3 12px; #6b7280 |  |
| T13 (E90) | 467.64 | 67.44 | `"Single session"` | F3 15px; #f2f3f5 |  |
| T14 (E97) | 481.64 | 353.07 | `"$45"` | F3 17px; #c6f24e |  |
| T15 (E92) | 488.64 | 67.44 | `"60 minutes - gym or outdoor"` | F3 12.5px; #9ba1ac |  |
| T16 (E101) | 543.64 | 67.44 | `"4-session block"` | F3 15px; #f2f3f5 |  |
| T17 (E115) | 557.64 | 343.62 | `"$160"` | F3 17px; #c6f24e |  |
| T18 (E105) | 564.64 | 67.44 | `"Best for a focused strength cycle"` | F8 12.5px; #9ba1ac |  |
| T19 (E118) | 890.64 | 169.75 | `"Book a session"` | F3 16px; #0d0e11 |  |

### Colours and their applications

Each entry lists the exact uses in this file. Text references identify the affected labels; primitive geometry is given below. Path references include their starting coordinates so icon, border, chip and button paints can be located without assigning an undocumented action.

| Hex as written | Exact applications in this artboard |
| --- | --- |
| `#08090b` | stop-color: E5 in linear-gradient, offset 1 |
| `#0d0e11` | Text fill: T19<br>Shape/background fill: E13 rect |
| `#15171c` | stop-color: E4 in linear-gradient, offset 0 |
| `#16181d` | Shape/background fill: E24 rect, E31 rect, E88 rect, E99 rect |
| `#1c1f26` | Path fill: E51 start (263.44, 295.64) |
| `#2e4949` | Shape/background fill: E7 rect |
| `#3a331c` | Shape/background fill: E33 rect |
| `#3a3f47` | Shape/background fill: E17 circle α=.65 |
| `#6b7280` | Text fill: T12 |
| `#9ba1ac` | Text fill: T6, T15, T18 |
| `#c5cad2` | Text fill: T9, T10, T11 |
| `#c6f24e` | Text fill: T14, T17<br>Shape/background fill: E117 rect<br>Path fill: E124 start (373.37, 253.67) |
| `#f2c84b` | Text fill: T8<br>Path fill: E47 start (173.44, 295.64) α=.14<br>Path stroke: E48 start (173.44, 295.64) α=.28 |
| `#f2f3f5` | Text fill: T1, T2, T3, T4, T5, T7, T13, T16<br>Shape/background fill: E23 rect<br>Border/icon stroke: E22 rect, E23 rect<br>Path stroke: E19 start (351.03, 125.95), E20 start (355.03, 129.95), E26 start (76.44, 165.64) |
| `#fff` | Border/icon stroke: E25 rect α=.07, E32 rect α=.07, E89 rect α=.07, E100 rect α=.07, E123 rect α=.12<br>Path stroke: E52 start (263.44, 295.64) α=.07 |

### Measured primitive geometry

Coincident fill/border primitives are grouped. Path-based cards, chips and controls are dimensioned in the layout above; icon-path paint locations are in the colour table. Definition rows describe reusable pattern/clip geometry, not additional screen elements.

| Source elements | Primitive / location / dimensions | Paint and opacity |
| --- | --- | --- |
| E7 | rect: (0, 2.35), 446.14 × 1065.25, rx=0, ry=0 | fill #2e4949 |
| E13, E122 | rect: (33.44, 101.64), 390 × 844, rx=28, ry=28 | E13: fill #0d0e11<br>E122: fill none |
| E14 | rect: (33.44, 101.64), 390 × 844, rx=0, ry=0 | fill url(#linear-gradient) |
| E17 | circle: centre (228.44, 122.02), r=9 | fill #3a3f47; opacity .65 |
| E22 | rect: (378.03, 117.95), 19 × 12, rx=3, ry=3 | fill none; stroke #f2f3f5; stroke-width 1.8px |
| E23 | rect: (398.03, 121.95), 3 × 4, rx=1, ry=1 | fill #f2f3f5; stroke #f2f3f5; stroke-width 1.8px |
| E24, E25 | rect: (51.44, 153.64), 40 × 40, rx=12, ry=12 | E24: fill #16181d<br>E25: fill none; stroke #fff; opacity .07 |
| E31, E32 | rect: (51.44, 215.64), 354 × 170, rx=18, ry=18 | E31: fill #16181d<br>E32: fill none; stroke #fff; opacity .07 |
| E33 | rect: (69.44, 237.64), 72 × 72, rx=17, ry=17 | fill #3a331c |
| E88, E89 | rect: (51.44, 443.64), 354 × 64, rx=16, ry=16 | E88: fill #16181d<br>E89: fill none; stroke #fff; opacity .07 |
| E99, E100 | rect: (51.44, 519.64), 354 × 64, rx=16, ry=16 | E99: fill #16181d<br>E100: fill none; stroke #fff; opacity .07 |
| E117 | rect: (51.44, 857.64), 354 × 52, rx=15, ry=15 | fill #c6f24e |
| E123 | rect: (33.94, 102.14), 389 × 843, rx=28, ry=28 | fill none; stroke #fff; opacity .12 |

**Gradient/pattern definitions and uses:**

- `linear-gradient` (linearGradient, E3): x1=1972.46; y1=2650.59; x2=1972.46; y2=2649.59; gradientTransform=translate(-769031.5221 2237196.6803) scale(390 -844); gradientUnits=userSpaceOnUse. Direct fill uses: E14 rect (33.44, 101.64), 390 × 844, rx=0, ry=0.

### Interactive-looking elements

- Back; unlabelled pencil-shaped control on the profile card; “Single session” and “4-session block” cards; “Book a session”.

### Ambiguities and literal-source observations

- Two separate literal “9:30” text objects exist at baselines130.77 and163.92; both are retained.

**Other explicit styling:** letter-spacing values `-.11em`, `-.03em`, `-.02em`, `-.01em`, `0em`, `.04em`, `.07em`, `.1em`, `.12em`; stroke-width values `1.8px`, `2.2px`. Where a painted stroke has no explicit width, SVG’s initial 1-unit stroke width applies.


# CONSOLIDATED

## Complete colour palette

The 35 rows below are the complete set of literal hex colour values across the SVG sources. File membership is based on the complete source, including CSS, definitions and annotations. A value used only in one artboard is explicitly flagged. Alpha variants remain one colour; #fff and #000 are shown in their original shorthand plus their full equivalent.

| Hex in source | Full equivalent | Artboards | Where applied across the set | Exact files | Single-artboard flag |
| --- | --- | ---: | --- | --- | --- |
| `#000` | `#000000` | 3 | Black stop of the lower content fades (Community 3/4 and COURTS 3). Also the SVG initial fill where explicitly noted; defaults are not extra declared colours. | `Community 3.svg`; `Community 4.svg`; `COURTS 3.svg` | — |
| `#08090b` | `#08090b` | 22 | Dark endpoint of the phone/base gradients; also inherited by the selected-session counter gradient and modal scrim where those exist. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 4.svg`; `Calender 5.svg`; `Chat 1.svg`; `Chat 2.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Login and signup.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#0d0e11` | `#0d0e11` | 24 | Phone base fill, dark text on lime/gold surfaces, and dark control/check strokes, as individually present. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 4.svg`; `Calender 5.svg`; `Chat 1.svg`; `Chat 2.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Login and signup.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#101216` | `#101216` | 13 | Bottom navigation backgrounds; floating gallery-control background in Community 3; transparent start stop of lower fades. | `Chat 1.svg`; `Community 1.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover 2.svg`; `Discover.svg`; `NAV Bar variations.svg`; `Profile 1.svg` | — |
| `#15171c` | `#15171c` | 22 | Lighter endpoint of the phone/base gradients; also inherited by the selected-session counter gradient and modal scrim where those exist. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 4.svg`; `Calender 5.svg`; `Chat 1.svg`; `Chat 2.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Login and signup.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#16181d` | `#16181d` | 24 | Dark cards, input fields, message bubbles, back controls and inactive chips; some button-chevron strokes. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 4.svg`; `Calender 5.svg`; `Chat 1.svg`; `Chat 2.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Login and signup.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#1c1f26` | `#1c1f26` | 9 | Secondary cards, chips and progress backgrounds; inactive date tiles in Calender 1; NO button in Calender 3; NAV variations artboard background. | `Calender 1.svg`; `Calender 3.svg`; `Calender 5.svg`; `Chat 1.svg`; `Community 1.svg`; `Discover.svg`; `NAV Bar variations.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#1f3a36` | `#1f3a36` | 2 | Running / RN avatar backgrounds in Community 1 and Community 6. | `Community 1.svg`; `Community 6.svg` | — |
| `#211f18` | `#211f18` | 1 | Two boosted-coach card backgrounds in Discover.svg. | `Discover.svg` | **ONE ARTBOARD ONLY** |
| `#222223` | `#222223` | 1 | Partners segment background in Discover.svg. | `Discover.svg` | **ONE ARTBOARD ONLY** |
| `#22262e` | `#22262e` | 9 | 18 × 18 base tile of diagonal stripe patterns used in event, album, post and court image areas. | `Community 1.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg` | — |
| `#22324a` | `#22324a` | 1 | Strength / ST avatar background in Community 1. | `Community 1.svg` | **ONE ARTBOARD ONLY** |
| `#262b33` | `#262b33` | 2 | Conversation avatars in Chat 1; Diego Santos / DS avatar in Discover.svg. | `Chat 1.svg`; `Discover.svg` | — |
| `#273440` | `#273440` | 1 | Alex Morgan / AM avatar background in Profile 1. | `Profile 1.svg` | **ONE ARTBOARD ONLY** |
| `#2a2b2b` | `#2a2b2b` | 2 | Stray horizontal line outside the phone in Community 5 and Community 6. | `Community 5.svg`; `Community 6.svg` | — |
| `#2a3a2e` | `#2a3a2e` | 4 | LGP venue avatar circles in COURTS 1–3; SL advertisement avatar in Discover.svg. | `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `Discover.svg` | — |
| `#2d333d` | `#2d333d` | 9 | 7 × 18 stripe laid over the 18 × 18 #22262e pattern tile. | `Community 1.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg` | — |
| `#2e4949` | `#2e4949` | 24 | Outer artboard/backdrop rectangle, outside the phone composition. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 4.svg`; `Calender 5.svg`; `Chat 1.svg`; `Chat 2.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Login and signup.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#3a2330` | `#3a2330` | 1 | Boxing / BX avatar background in Community 1. | `Community 1.svg` | **ONE ARTBOARD ONLY** |
| `#3a322a` | `#3a322a` | 1 | FuelUp Nutrition / FN advertisement avatar background in Community 1. | `Community 1.svg` | **ONE ARTBOARD ONLY** |
| `#3a331c` | `#3a331c` | 6 | Marcus / MR avatar backgrounds; MR federation avatars on Community 3–5; NM post avatar in Community 5. | `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Discover 2.svg`; `Discover.svg`; `Profile 2.svg` | — |
| `#3a3f47` | `#3a3f47` | 24 | Small phone camera circles at .65 opacity; profile-tab dividers, three-dot controls and post icons in files where present. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 4.svg`; `Calender 5.svg`; `Chat 1.svg`; `Chat 2.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Login and signup.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#414042` | `#414042` | 2 | Outline of unselected session rows and their count pills in Calender 2 and 3. | `Calender 2.svg`; `Calender 3.svg` | — |
| `#58595b` | `#58595b` | 6 | Unlabelled grey header pictograms on COURTS 1–4; selector chevrons in Discover.svg / COURTS 4. Also declared as fill on Location crosshair lines in Login and signup 3, which paint lime strokes. | `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover.svg`; `Login and signup 3.svg` | — |
| `#6b7280` | `#6b7280` | 22 | Muted text, section captions, placeholders, inactive navigation labels/icons, chevrons and search icons. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 5.svg`; `Chat 1.svg`; `Chat 2.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup.svg`; `NAV Bar variations.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#6d6e71` | `#6d6e71` | 1 | Document-upload pictogram and “Upload official Documents” caption in Community 2. | `Community 2.svg` | **ONE ARTBOARD ONLY** |
| `#9ba1ac` | `#9ba1ac` | 22 | Secondary descriptions, timestamps/details, role/location lead-in text and selected day-view metadata. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 4.svg`; `Calender 5.svg`; `Chat 1.svg`; `Community 1.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Login and signup.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#be1e2d` | `#be1e2d` | 1 | Arrow line and arrowhead for the map’s “blinking marker” annotation in Discover 2. | `Discover 2.svg` | **ONE ARTBOARD ONLY** |
| `#c5cad2` | `#c5cad2` | 19 | Supporting text, bios, inactive pill/tab labels, location field label, and Load More chevrons. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 5.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#c6f24e` | `#c6f24e` | 25 | Lime accent: highlighted tabs, buttons/chips, prices, badges, icon details, map location marker, progress, outlines and confirmation glow. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 4.svg`; `Calender 5.svg`; `Chat 1.svg`; `Chat 2.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Login and signup.svg`; `NAV Bar variations.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#dff489` | `#dff489` | 1 | Right half and right end tick of the radius graphic in Login and signup 3, under group opacity .53. | `Login and signup 3.svg` | **ONE ARTBOARD ONLY** |
| `#ed1c24` | `#ed1c24` | 6 | Red annotation text and callout arrows; not a supplied app error-state palette. | `Community 1.svg`; `Community 3.svg`; `COURTS 3.svg`; `Discover 2.svg`; `Login and signup.svg`; `Profile 1.svg` | — |
| `#f2c84b` | `#f2c84b` | 3 | Gold BOOSTED/rating badges and rating strings; gold MR/AB map markers. | `Discover 2.svg`; `Discover.svg`; `Profile 2.svg` | — |
| `#f2f3f5` | `#f2f3f5` | 24 | Primary headings/text, avatar initials, status-bar elements, back/control strokes. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 4.svg`; `Calender 5.svg`; `Chat 1.svg`; `Chat 2.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Login and signup.svg`; `Profile 1.svg`; `Profile 2.svg` | — |
| `#fff` | `#ffffff` | 24 | White borders and separators, often translucent; status/social glyphs on Login and signup; certain inactive venue tabs and post dots. | `Calender 1.svg`; `Calender 2.svg`; `Calender 3.svg`; `Calender 4.svg`; `Calender 5.svg`; `Chat 1.svg`; `Chat 2.svg`; `Community 1.svg`; `Community 2.svg`; `Community 3.svg`; `Community 4.svg`; `Community 5.svg`; `Community 6.svg`; `COURTS 1.svg`; `COURTS 2.svg`; `COURTS 3.svg`; `COURTS 4.svg`; `Discover 2.svg`; `Discover.svg`; `Login and signup 2.svg`; `Login and signup 3.svg`; `Login and signup.svg`; `Profile 1.svg`; `Profile 2.svg` | — |

**Single-artboard colours (9):** `#211f18` — `Discover.svg`; `#222223` — `Discover.svg`; `#22324a` — `Community 1.svg`; `#273440` — `Profile 1.svg`; `#3a2330` — `Community 1.svg`; `#3a322a` — `Community 1.svg`; `#6d6e71` — `Community 2.svg`; `#be1e2d` — `Discover 2.svg`; `#dff489` — `Login and signup 3.svg`.

### Opacity, gradients and patterns

- The common gradient has stops `#15171c` at offset `0` and `#08090b` at offset `1`. It is defined in 22 artboards; `Community 5.svg`, `COURTS 4.svg`, and `NAV Bar variations.svg` have no linear-gradient definition. The definition being present does not guarantee visibility: `Discover.svg` and `COURTS 1.svg`–`COURTS 3.svg` paint an opaque phone base above their base gradient.
- `Community 3.svg`, `Community 4.svg`, and `COURTS 3.svg` add a lower fade from `#101216` at stop-opacity `0` to `#000` at the lower end. `Calender 2.svg` and `Calender 3.svg` reuse the base gradient in the first session-count pill; Calender 3 also uses an inherited gradient for the `.81` scrim.
- Diagonal stripe patterns use an `18 × 18` base tile in `#22262e` and a `7 × 18` strip in `#2d333d`, with the transforms listed per artboard. The map grid in `Discover 2.svg` is separate: `32 × 32`, transparent fill, white grid stroke at `.05` opacity.
- Opacity values explicitly found on elements/groups: `.05`, `.07`, `.12`, `.13`, `.14`, `.18`, `.2`, `.24`, `.25`, `.28`, `.34`, `.47`, `.53`, `.65`, `.81`, `.96`. Gradient-stop opacity `0` and glow flood-opacity `.27` are separate properties. Repeated translucent white/lime outlines are recorded as overlays, not converted into guessed new hex values.

## Navigation structure actually drawn

### NAV Bar variations.svg

There are **3 variations, 5 items in each, 7 unique labels overall**. Ordering below is spatial left-to-right, independent of SVG XML order and small label-baseline differences.

| Variation by vertical position | Bar rectangle | Left-to-right items | Highlight | Representation |
| --- | --- | --- | --- | --- |
| Top | x=77.35, y=50.78, 390 × 80 | Discover → Maps → Courts → Community → Chat | Discover icon/label #c6f24e; others #6b7280 | Live text labels; outline icons |
| Middle | x=77.35, y=154, 390 × 80 | Discover → Community → Shop → Chat → Profile | Discover icon/label #c6f24e; others #6b7280 | Live text labels; outline icons |
| Bottom | x=77.35, y=271, 390 × 80 | Discover → Maps → Shop → Community → Chat | Discover icon/label #c6f24e; others #6b7280 | Discover/Maps/Community/Chat labels and most icons are outlined paths; Shop remains live text with outline bag icon |

The seven literal labels are `Discover`, `Maps`, `Courts`, `Community`, `Shop`, `Chat`, `Profile`. No preferred/final variation, route targets, transition rules, or tab visibility conditions are encoded.

### Navigation bars on the phone artboards

All supplied phone bottom bars use the same spatial order: **Discover → Maps → Courts → Community → Chat**. Their highlighted item differs as follows:

| Artboard | Lime tab | Other visible navigation details |
| --- | --- | --- |
| Discover.svg | Discover | Separate notification and profile-shaped header controls |
| Discover 2.svg | Maps | External artboard heading still says Discover |
| Chat 1.svg | Chat | Five-item bottom bar |
| Community 1.svg | Community | Separate plus and My Communities callout/icon |
| Community 3.svg | Community | Profile tab Gallery highlighted; back control |
| Community 4.svg | Community | Profile tab Events highlighted; back control |
| Community 5.svg | Community | Profile tab News highlighted; back control |
| COURTS 1.svg | Courts | Venue tab Courts highlighted; back and header controls |
| COURTS 2.svg | Courts | Venue tab Events highlighted; back and header controls |
| COURTS 3.svg | Courts | Venue tab Gallery highlighted; back and header controls |
| COURTS 4.svg | Courts | Back and header controls |
| Profile 1.svg | Chat | Header profile icon is lime; bottom bar still highlights Chat |

No bottom tab bar is drawn in `Calender 1.svg`–`Calender 5.svg`, `Chat 2.svg`, `Community 2.svg`, `Community 6.svg`, the three Login and signup files, or `Profile 2.svg`. `Shop` and a bottom-bar `Profile` label occur only in the navigation-variation artboard; no Shop content artboard is supplied.

### Other tab/segment groups explicitly shown

| Files | Labels in spatial order | Highlight shown |
| --- | --- | --- |
| Discover.svg | coaches ; Partners | coaches background lime; Partners text lime on #222223 |
| Community 3.svg | News; Events; Gallery | Gallery |
| Community 4.svg | News; Events; Gallery | Events |
| Community 5.svg | News; Events; Gallery | News |
| COURTS 1.svg | Courts; Events; Gallery | Courts |
| COURTS 2.svg | Courts; Events; Gallery | Events |
| COURTS 3.svg | Courts; Events; Gallery | Gallery |
| Profile 1.svg | User; Coach; Admin | User |
| Login and signup 2.svg | Coach/Teacher; Trainee/ Student | Trainee/ Student |
| Community 2.svg | YES; NO | YES |

These visual groups do not establish links between the separate artboards. A drawn back chevron does not identify a destination.

## Typography

Font names and sizes below come from CSS and inherited tspan styles. There are **9 exact font-family declarations**, representing Archivo faces, Archivo ExtraCondensed, Hanken Grotesk and Myriad Pro. No font files are embedded, and the SVGs do not establish the renderer’s installed fonts or fallback metrics. The per-artboard text tables map every extracted line to a font key, size and fill, including mixed runs.

| Key | Exact font-family declaration | Explicit font-weight value(s) on text runs | Explicit font-variation-settings | Declared sizes used on text runs (px) |
| --- | --- | --- | --- | --- |
| F1 | `ArchivoExtraCondensed-Bold, 'Archivo ExtraCondensed'` | `700` | `(not specified)` | `12.33px`, `17px` |
| F2 | `ArchivoRoman-Black, Archivo` | `800` | `'wght' 900, 'wdth' 100` | `16px` |
| F3 | `ArchivoRoman-Bold, Archivo` | `700` | `'wght' 700, 'wdth' 100` | `9px`, `9.06px`, `9.92px`, `10px`, `11px`, `11.72px`, `12px`, `12.5px`, `13px`, `14px`, `14.89px`, `15px`, `16px`, `17px`, `17.58px`, `18px`, `19px`, `20px`, `22px`, `26px`, `27px` |
| F4 | `ArchivoRoman-ExtraBold, Archivo` | `700` | `'wght' 800, 'wdth' 100` | `16px`, `31px`, `40.57px`, `64.69px` |
| F5 | `ArchivoRoman-Regular, Archivo` | `(not specified)` | `'wght' 400, 'wdth' 100` | `12.5px`, `31px` |
| F6 | `ArchivoRoman-Thin, Archivo` | `200` | `'wght' 100, 'wdth' 100` | `12.5px` |
| F7 | `HankenGrotesk-Bold, 'Hanken Grotesk'` | `700` | `'wght' 700` | `10px` |
| F8 | `HankenGrotesk-Regular, 'Hanken Grotesk'` | `(not specified)` | `'wght' 400` | `11px`, `12px`, `12.5px`, `13px`, `14px` |
| F9 | `MyriadPro-Regular, 'Myriad Pro'` | `(not specified)` | `(not specified)` | `12px` |

**All distinct CSS font sizes (25):** `9px`, `9.06px`, `9.92px`, `10px`, `11px`, `11.72px`, `12px`, `12.33px`, `12.5px`, `13px`, `14px`, `14.89px`, `15px`, `16px`, `17px`, `17.58px`, `18px`, `19px`, `20px`, `22px`, `26px`, `27px`, `31px`, `40.57px`, `64.69px`.

### Font sizes by artboard

Every family/size combination found on actual text spans is listed here; the text tables above identify the individual strings.

| Artboard | Font keys and sizes |
| --- | --- |
| `Calender 1.svg` | F3: `11px`, `12px`, `12.5px`, `13px`, `14px`, `15px`, `16px`, `17px`, `18px`, `19px`<br>F4: `40.57px` |
| `Calender 2.svg` | F3: `9.92px`, `11.72px`, `12px`, `13px`, `16px`, `19px`<br>F4: `40.57px`<br>F7: `10px`<br>F8: `12.5px` |
| `Calender 3.svg` | F2: `16px`<br>F3: `9.92px`, `11.72px`, `12px`, `13px`, `15px`, `16px`, `17px`, `19px`<br>F4: `40.57px`<br>F7: `10px`<br>F8: `12.5px` |
| `Calender 4.svg` | F3: `13px`, `16px`, `19px`, `26px`<br>F4: `40.57px`<br>F8: `13px`, `14px` |
| `Calender 5.svg` | F3: `12px`, `13px`, `15px`, `19px`<br>F4: `40.57px`<br>F8: `12.5px` |
| `Chat 1.svg` | F3: `10px`, `11px`, `12px`, `12.5px`, `13px`, `15px`, `16px`, `17px`, `27px`<br>F8: `11px`, `13px` |
| `Chat 2.svg` | F3: `13px`, `19px`<br>F4: `31px`<br>F8: `13px`, `14px` |
| `Community 1.svg` | F1: `12.33px`<br>F3: `9px`, `10px`, `12px`, `12.5px`, `13px`, `15px`, `16px`, `27px`<br>F4: `31px`, `64.69px`<br>F5: `12.5px`<br>F6: `12.5px`<br>F8: `12px` |
| `Community 2.svg` | F3: `12px`, `13px`, `14px`, `15px`, `19px`<br>F4: `64.69px` |
| `Community 3.svg` | F1: `12.33px`<br>F3: `10px`, `12px`, `13px`, `19px`<br>F4: `64.69px`<br>F8: `13px` |
| `Community 4.svg` | F3: `10px`, `12px`, `12.5px`, `13px`, `15px`, `19px`<br>F4: `64.69px`<br>F8: `12px`, `13px` |
| `Community 5.svg` | F3: `9.06px`, `10px`, `13px`, `19px`<br>F4: `64.69px`<br>F8: `13px` |
| `Community 6.svg` | F3: `10px`, `12px`, `12.5px`, `13px`, `15px`, `16px`, `19px`, `22px`<br>F4: `64.69px`<br>F8: `12px`, `13px` |
| `COURTS 1.svg` | F3: `10px`, `12px`, `13px`, `16px`, `19px`<br>F4: `64.69px`<br>F5: `31px` |
| `COURTS 2.svg` | F3: `10px`, `12px`, `13px`, `16px`, `19px`<br>F4: `64.69px`<br>F5: `31px` |
| `COURTS 3.svg` | F1: `12.33px`<br>F3: `10px`, `12px`, `13px`, `19px`<br>F4: `64.69px`<br>F5: `31px`<br>F8: `13px` |
| `COURTS 4.svg` | F3: `10px`, `12px`, `13px`, `19px`<br>F4: `64.69px`<br>F5: `31px`<br>F8: `14px` |
| `Discover 2.svg` | F3: `10px`, `11px`, `13px`, `16px`<br>F4: `16px`, `31px`<br>F8: `13px`, `14px` |
| `Discover.svg` | F3: `9px`, `10px`, `11px`, `12px`, `13px`, `15px`, `16px`, `17px`, `27px`<br>F4: `31px`<br>F8: `11px`, `13px`, `14px` |
| `Login and signup 2.svg` | F3: `13px`, `14.89px`, `27px`<br>F4: `31px` |
| `Login and signup 3.svg` | F3: `12px`, `13px`, `27px`<br>F4: `31px` |
| `Login and signup.svg` | F3: `13px`, `17.58px`, `27px`<br>F4: `31px`<br>F8: `14px`<br>F9: `12px` |
| `NAV Bar variations.svg` | F3: `10px` |
| `Profile 1.svg` | F1: `17px`<br>F3: `10px`, `12px`, `13px`, `15px`, `19px`, `20px`, `27px`<br>F4: `31px` |
| `Profile 2.svg` | F3: `12px`, `12.5px`, `13px`, `15px`, `16px`, `17px`, `19px`, `22px`<br>F4: `31px`<br>F8: `12.5px`, `13px` |

### Explicit typography details and exceptions

- Most UI headings, labels and controls use `ArchivoRoman-Bold, Archivo`, font-weight `700`, variations `'wght' 700, 'wdth' 100`. Large external board headings often use `ArchivoRoman-ExtraBold, Archivo`, weight `700` but variation `'wght' 800, 'wdth' 100`; the differing CSS weight and variation are preserved.
- `ArchivoRoman-Thin, Archivo` in Community 1 declares font-weight `200` while its variation is `'wght' 100, 'wdth' 100`. The name/weight/axis disagreement is source content, not normalized.
- Calendar external “Calender” text uses `40.57px` and `scale(.86 1)` (horizontal compression only). Community external headings and the main Courts board headings use `64.69px`. Several other external titles use `31px`; actual headings are identified in each text table.
- The “nd” and “th” text objects in COURTS 2 declare `13px` and `scale(.58)`, giving a geometric scale-equivalent of `7.54px`; their declared size remains 13px. Login “Let’s” is horizontally scaled `1.03`; Location in Login and signup 3 is horizontally scaled `.95`.
- `Calender 3.svg` uses `ArchivoRoman-Black, Archivo` for YES/NO at 16px, with its exact weight and variation in the table. The confirmation question mixes 15px white text with 17px lime time text on one baseline.
- Explicit multiline baseline offsets include 15 units for Community 1 card descriptions and the wrapped Marcus preview in Chat 1; 18 for the multi-line Chat 2 bubbles and venue hours/location; 20 for several bios/reminder lines; the red scrolling annotation has a 14.79-unit baseline step. These are measured tspan positions, not inferred CSS line-height.
- All declared letter-spacing values: `-.11em`, `-.1em`, `-.09em`, `-.08em`, `-.07em`, `-.06em`, `-.05em`, `-.04em`, `-.03em`, `-.02em`, `-.01em`, `0em`, `.02em`, `.03em`, `.04em`, `.06em`, `.07em`, `.09em`, `.1em`, `.11em`, `.12em`. Individual artboards list their own sets. No CSS line-height property is supplied.
- Outlined navigation words and the social glyphs have no recoverable font-family or font-size values. They are excluded from font-family/size counts rather than assigned a font by appearance.

## Screen inventory grouped by module

### Discover — 1 artboard

- `Discover.svg` — Coach discovery list with coach/partner selector.

### Maps — 1 artboard

- `Discover 2.svg` — Map/grid view with coach markers (artboard heading: Discover).

### Community — 6 artboards

- `Community 1.svg` — Community overview with events, advertisement and community list.
- `Community 2.svg` — Community registration form.
- `Community 3.svg` — Lebanese Running FED. profile — Gallery tab.
- `Community 4.svg` — Lebanese Running FED. profile — Events tab.
- `Community 5.svg` — Lebanese Running FED. profile — News tab.
- `Community 6.svg` — Running community — location groups and event.

### Chat — 2 artboards

- `Chat 1.svg` — Conversation list and session reminder.
- `Chat 2.svg` — Marcus Reyes conversation.

### Profile — 2 artboards

- `Profile 1.svg` — Alex Morgan profile and settings.
- `Profile 2.svg` — Marcus Reyes coach profile with packages.

### Login/Signup — 3 artboards

- `Login and signup 2.svg` — Role selection.
- `Login and signup 3.svg` — Location and search radius.
- `Login and signup.svg` — Get Started — email and second input with social glyph controls.

### Booking/Calendar — 5 artboards

- `Calender 1.svg` — Book Marcus — month calendar, time slot, package and payment summary.
- `Calender 2.svg` — Book Marcus — day view.
- `Calender 3.svg` — Day view with session-end confirmation overlay.
- `Calender 4.svg` — Booking confirmed.
- `Calender 5.svg` — Bookings — active package, upcoming and past sessions.

### Courts — 4 artboards

- `COURTS 1.svg` — Let’s Go Paddle venue profile — Courts tab.
- `COURTS 2.svg` — Let’s Go Paddle venue profile — Events tab.
- `COURTS 3.svg` — Let’s Go Paddle venue profile — Gallery tab.
- `COURTS 4.svg` — ALL Courts view — venue list.

### Nav bar — 1 artboard

- `NAV Bar variations.svg` — Three alternative five-item navigation bars.

## Extraction checks

- Parsed all 25 SVGs in the specified directory: 611 live text elements, expanded into 623 positioned text-line entries. Four additional navigation words are path outlines, separately transcribed. Social f/G+ shapes are documented as glyph icons.
- Rejoining each text element’s extracted lines in source span order reproduces its original XML text content, including spaces. All palette entries were cross-checked against every hex token in the SVG sources.
- The report describes source styling and geometry. Where clipping, overpainting, default styling, outline conversion or annotations limit a literal visible-screen interpretation, those limits are identified instead of supplying missing content.

