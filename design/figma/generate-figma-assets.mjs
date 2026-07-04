import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.dirname(fileURLToPath(import.meta.url));

const W = 390;
const H = 844;
const LABEL_H = 28;
const GAP_X = 42;
const GAP_Y = 72;
const M = 56;
const TITLE_H = 132;
const COLS = 4;

const themes = {
  dark: {
    name: "Dark",
    bg: "#0D0E11",
    nav: "#101216",
    surface: "#16181D",
    surface2: "#1C1F26",
    them: "#1C1F26",
    line: "#FFFFFF",
    lineOpacity: 0.07,
    line2Opacity: 0.05,
    txt: "#F2F3F5",
    strong: "#E7E9EC",
    soft: "#C5CAD2",
    txt2: "#9BA1AC",
    txt3: "#6B7280",
    mono: "#3A3F47",
    mapBg: "#0A0B0D",
    grid: "#FFFFFF",
    gridOpacity: 0.04,
    accent: "#C6F24E",
    volt: "#C6F24E",
    amber: "#F2C84B",
    amberText: "#F2C84B",
    danger: "#E8543F",
    avatarBg: "#262B33",
    ink: "#0D0E11",
    pageTop: "#15171C",
    pageBottom: "#08090B",
  },
  light: {
    name: "Light",
    bg: "#F4F5F7",
    nav: "#FFFFFF",
    surface: "#FFFFFF",
    surface2: "#EBEDF1",
    them: "#E9EBEF",
    line: "#000000",
    lineOpacity: 0.09,
    line2Opacity: 0.06,
    txt: "#15171C",
    strong: "#22252B",
    soft: "#3F454D",
    txt2: "#5A616B",
    txt3: "#8A909A",
    mono: "#AEB4BE",
    mapBg: "#E6E8ED",
    grid: "#000000",
    gridOpacity: 0.05,
    accent: "#5E8A00",
    volt: "#C6F24E",
    amber: "#F2C84B",
    amberText: "#9A7400",
    danger: "#E8543F",
    avatarBg: "#565E6B",
    ink: "#0D0E11",
    pageTop: "#E3E5EB",
    pageBottom: "#C7CAD2",
  },
};

const coaches = [
  { name: "Marcus Reyes", initials: "MR", sport: "Strength", rating: "4.9", reviews: "213", dist: "1.2 km", price: "$45", meta: "Elite coach", boosted: true },
  { name: "Aicha Bennani", initials: "AB", sport: "Boxing", rating: "4.9", reviews: "178", dist: "2.4 km", price: "$50", meta: "Pro boxing", boosted: true },
  { name: "Diego Santos", initials: "DS", sport: "Calisthenics", rating: "4.8", reviews: "142", dist: "0.8 km", price: "$38", meta: "Movement" },
  { name: "Lena Hoffmann", initials: "LH", sport: "Yoga", rating: "4.8", reviews: "96", dist: "3.1 km", price: "$35", meta: "Vinyasa" },
];

const partners = [
  { name: "Jordan K.", initials: "JK", sport: "Running", rating: "4.9", dist: "0.4 km", level: "Intermediate" },
  { name: "Mei Lin", initials: "ML", sport: "Climbing", rating: "4.8", dist: "1.1 km", level: "Advanced" },
  { name: "Sam Okoro", initials: "SO", sport: "Calisthenics", rating: "4.7", dist: "0.9 km", level: "Beginner" },
];

const events = [
  { type: "Meetup", title: "Saturday Long Run", when: "Sat 05 - 7:00 AM", loc: "Corniche", count: "18 going" },
  { type: "Event", title: "Open Sparring Night", when: "Fri 04 - 6:00 PM", loc: "Mar Mikhael", count: "22 going" },
  { type: "Meetup", title: "Sunrise Vinyasa", when: "Sat 05 - 6:30 AM", loc: "Raouche", count: "27 going" },
];

const communities = [
  { name: "Running", code: "RN", members: "3.2k", about: "Pacing crews and race-day meetups.", tint: "#1F3A36", official: true },
  { name: "Strength", code: "ST", members: "2.8k", about: "Barbell, hypertrophy and form checks.", tint: "#22324A", official: true },
  { name: "Boxing", code: "BX", members: "1.6k", about: "Footwork, pad work and controlled sparring.", tint: "#3A2330", official: true },
];

const shops = [
  { name: "PaceLine Runners", initials: "PL", category: "Running gear", dist: "600 m", rating: "4.8", reviews: "95", deal: "10% off in-app", tint: "#2A3A2E" },
  { name: "IronWorks Supply", initials: "IW", category: "Strength and gym", dist: "1.1 km", rating: "4.7", reviews: "61", deal: "Free delivery", tint: "#3A2E2A" },
  { name: "Corner Ring", initials: "CR", category: "Boxing and MMA", dist: "1.8 km", rating: "4.9", reviews: "142", deal: "15% first order", tint: "#3A2A33" },
];

const chats = [
  { name: "Marcus Reyes", initials: "MR", last: "Great session today. Same time Thursday?", time: "2m", unread: "2", online: true },
  { name: "Mei Lin", initials: "ML", last: "Meet at the south wall around 8?", time: "1h", unread: "", online: true },
  { name: "Jordan K.", initials: "JK", last: "You crushed that pace.", time: "3h", unread: "", online: false },
  { name: "Aicha Bennani", initials: "AB", last: "Do not forget your wraps next time", time: "Yest", unread: "", online: false },
];

const esc = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const attr = (name, value) => (value === undefined || value === null || value === "" ? "" : ` ${name}="${esc(value)}"`);

function text(x, y, value, opts = {}) {
  const {
    size = 14,
    weight = 400,
    fill,
    family = "Hanken Grotesk, Arial, sans-serif",
    anchor,
    opacity,
    spacing,
  } = opts;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}"${attr("text-anchor", anchor)}${attr("opacity", opacity)}${attr("letter-spacing", spacing)}>${esc(value)}</text>`;
}

function lines(x, y, values, opts = {}, lh = 18) {
  return values.map((line, index) => text(x, y + index * lh, line, opts)).join("");
}

function rect(x, y, w, h, opts = {}) {
  const {
    fill = "none",
    rx = 0,
    stroke,
    strokeOpacity,
    strokeWidth = 1,
    opacity,
    fillOpacity,
    filter,
  } = opts;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${attr("fill-opacity", fillOpacity)}${attr("stroke", stroke)}${attr("stroke-opacity", strokeOpacity)}${attr("stroke-width", stroke ? strokeWidth : undefined)}${attr("opacity", opacity)}${attr("filter", filter)} />`;
}

function pathEl(d, opts = {}) {
  const { stroke = "currentColor", fill = "none", width = 2, opacity, cap = "round", join = "round" } = opts;
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="${cap}" stroke-linejoin="${join}"${attr("opacity", opacity)} />`;
}

function circle(cx, cy, r, opts = {}) {
  const { fill = "none", fillOpacity, stroke, strokeOpacity, opacity, strokeWidth = 1 } = opts;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${attr("fill-opacity", fillOpacity)}${attr("stroke", stroke)}${attr("stroke-opacity", strokeOpacity)}${attr("stroke-width", stroke ? strokeWidth : undefined)}${attr("opacity", opacity)} />`;
}

function card(t, x, y, w, h, opts = {}) {
  return rect(x, y, w, h, {
    fill: opts.fill || t.surface,
    rx: opts.rx ?? 18,
    stroke: opts.stroke || t.line,
    strokeOpacity: opts.strokeOpacity ?? t.lineOpacity,
    fillOpacity: opts.fillOpacity,
    filter: opts.filter,
  });
}

function avatar(t, x, y, label, size = 54, tint) {
  const fill = tint || t.avatarBg;
  return [
    rect(x, y, size, size, { fill, rx: Math.min(17, Math.round(size * 0.27)) }),
    text(x + size / 2, y + size / 2 + 6, label, {
      size: size > 58 ? 19 : 16,
      weight: 800,
      fill: t.txt,
      family: "Archivo, Arial, sans-serif",
      anchor: "middle",
    }),
  ].join("");
}

function pill(t, x, y, w, h, label, opts = {}) {
  const fill = opts.fill || t.surface2;
  const fg = opts.fg || t.soft;
  const border = opts.border || t.line;
  const borderOpacity = opts.borderOpacity ?? t.lineOpacity;
  return [
    rect(x, y, w, h, { fill, fillOpacity: opts.fillOpacity, rx: h / 2, stroke: border, strokeOpacity: borderOpacity }),
    text(x + w / 2, y + h / 2 + 4, label, {
      size: opts.size || 12,
      weight: opts.weight || 700,
      fill: fg,
      anchor: "middle",
    }),
  ].join("");
}

function section(t, y, label) {
  return text(0, y, label.toUpperCase(), {
    size: 12,
    weight: 800,
    fill: t.txt3,
    family: "Archivo, Arial, sans-serif",
    spacing: "1.4",
  });
}

function topHeader(t, title, opts = {}) {
  const subtitle = opts.subtitle || "Beirut, Lebanon";
  const out = [];
  if (opts.eyebrow) {
    out.push(text(0, 12, opts.eyebrow, { size: 13, weight: 700, fill: t.txt2 }));
  }
  const titleLines = Array.isArray(title) ? title : [title];
  out.push(lines(0, opts.eyebrow ? 42 : 28, titleLines, {
    size: 27,
    weight: 800,
    fill: t.txt,
    family: "Archivo, Arial, sans-serif",
  }, 29));
  if (subtitle) {
    out.push(text(0, opts.eyebrow ? 84 : 64, subtitle, { size: 13, weight: 600, fill: t.txt2 }));
  }
  if (opts.bell) {
    out.push(rect(310, 4, 44, 44, { fill: t.surface, rx: 14, stroke: t.line, strokeOpacity: t.lineOpacity }));
    out.push(pathEl("M329 18c0-4 3-7 7-7s7 3 7 7v6l3 4h-20l3-4zM333 32h6", { stroke: t.txt, width: 2 }));
    out.push(circle(344, 13, 4, { fill: t.volt }));
  }
  if (opts.plus) {
    out.push(rect(310, 4, 44, 44, { fill: t.volt, rx: 14 }));
    out.push(pathEl("M332 26h14M339 19v14", { stroke: t.ink, width: 2.4 }));
  }
  return out.join("");
}

function searchBox(t, x, y, w, label) {
  return [
    rect(x, y, w, 46, { fill: t.surface, rx: 14, stroke: t.line, strokeOpacity: t.lineOpacity }),
    circle(x + 20, y + 22, 7, { stroke: t.txt3, strokeWidth: 2 }),
    pathEl(`M${x + 25} ${y + 27}l6 6`, { stroke: t.txt3, width: 2 }),
    text(x + 44, y + 28, label, { size: 14, fill: t.txt3 }),
  ].join("");
}

function segmented(t, x, y, w, labels, activeIndex = 0) {
  const itemW = (w - 8) / labels.length;
  const out = [rect(x, y, w, 42, { fill: t.surface, rx: 14, stroke: t.line, strokeOpacity: t.lineOpacity })];
  labels.forEach((label, index) => {
    const ix = x + 4 + index * itemW;
    const active = index === activeIndex;
    out.push(rect(ix, y + 4, itemW - 2, 34, { fill: active ? t.volt : "transparent", rx: 11 }));
    out.push(text(ix + itemW / 2 - 1, y + 26, label, {
      size: 13,
      weight: 800,
      fill: active ? t.ink : t.txt2,
      anchor: "middle",
    }));
  });
  return out.join("");
}

function personCard(t, x, y, p, opts = {}) {
  const h = opts.h || 88;
  const boosted = opts.boosted || p.boosted;
  const fill = boosted ? "#211F18" : t.surface;
  const border = boosted ? t.amber : t.line;
  const borderOpacity = boosted ? 0.34 : t.lineOpacity;
  const out = [card(t, x, y, 354, h, { fill, stroke: border, strokeOpacity: borderOpacity })];
  out.push(avatar(t, x + 14, y + 16, p.initials, 54, boosted ? "#3A331C" : undefined));
  out.push(text(x + 82, y + 28, p.name, { size: 16, weight: 800, fill: t.txt }));
  if (boosted) out.push(pill(t, x + 226, y + 12, 72, 22, "BOOSTED", { fill: t.amber, fillOpacity: 0.18, fg: t.amberText, border: t.amber, borderOpacity: 0.25, size: 9, weight: 800 }));
  out.push(text(x + 82, y + 50, `${p.sport} - ${p.dist}`, { size: 13, fill: t.txt2 }));
  out.push(text(x + 82, y + 72, `* ${p.rating} (${p.reviews})`, { size: 12, weight: 700, fill: t.amberText }));
  out.push(text(x + 312, y + 44, p.price || p.level, { size: 17, weight: 800, fill: t.accent, family: "Archivo, Arial, sans-serif", anchor: "end" }));
  out.push(text(x + 312, y + 64, p.price ? "per session" : "level", { size: 11, fill: t.txt3, anchor: "end" }));
  return out.join("");
}

function eventCard(t, x, y, event, w = 216) {
  const out = [card(t, x, y, w, 162)];
  out.push(rect(x + 12, y + 12, w - 24, 70, { fill: "url(#stripe)", rx: 14, stroke: t.line, strokeOpacity: t.line2Opacity }));
  out.push(pill(t, x + 22, y + 24, 62, 22, event.type, { fill: t.volt, fillOpacity: 0.13, fg: t.accent, border: t.volt, borderOpacity: 0.2, size: 10 }));
  out.push(text(x + 14, y + 105, event.title, { size: 15, weight: 800, fill: t.txt }));
  out.push(text(x + 14, y + 126, event.when, { size: 12.5, fill: t.txt2 }));
  out.push(text(x + 14, y + 146, `${event.loc} - ${event.count}`, { size: 12, fill: t.txt3 }));
  return out.join("");
}

function shopCard(t, x, y, shop) {
  const out = [card(t, x, y, 354, 92)];
  out.push(avatar(t, x + 14, y + 18, shop.initials, 54, shop.tint));
  out.push(text(x + 82, y + 30, shop.name, { size: 16, weight: 800, fill: t.txt }));
  out.push(pill(t, x + 218, y + 14, 68, 22, "PARTNER", { fill: t.volt, fillOpacity: 0.12, fg: t.accent, border: t.volt, borderOpacity: 0.22, size: 9, weight: 800 }));
  out.push(text(x + 82, y + 52, shop.category, { size: 13, fill: t.txt2 }));
  out.push(text(x + 82, y + 74, `* ${shop.rating} (${shop.reviews}) - ${shop.deal}`, { size: 12, fill: t.txt3 }));
  out.push(text(x + 328, y + 54, shop.dist, { size: 15, weight: 800, fill: t.accent, family: "Archivo, Arial, sans-serif", anchor: "end" }));
  return out.join("");
}

function chatCard(t, x, y, chat) {
  const out = [card(t, x, y, 354, 78, { rx: 16 })];
  out.push(avatar(t, x + 13, y + 13, chat.initials, 52));
  if (chat.online) out.push(circle(x + 54, y + 56, 5, { fill: t.volt, stroke: t.bg, strokeWidth: 2 }));
  out.push(text(x + 78, y + 28, chat.name, { size: 15, weight: 800, fill: t.txt }));
  out.push(text(x + 78, y + 50, chat.last, { size: 12.5, fill: t.txt2 }));
  out.push(text(x + 330, y + 28, chat.time, { size: 11, fill: t.txt3, anchor: "end" }));
  if (chat.unread) out.push(pill(t, x + 308, y + 42, 24, 24, chat.unread, { fill: t.volt, fg: t.ink, border: t.volt, borderOpacity: 1, size: 11 }));
  return out.join("");
}

function navIcon(kind, cx, cy, color) {
  if (kind === "discover") {
    return [circle(cx - 2, cy - 1, 8, { stroke: color, strokeWidth: 2 }), pathEl(`M${cx + 4} ${cy + 5}l7 7`, { stroke: color, width: 2 })].join("");
  }
  if (kind === "community") {
    return [circle(cx, cy - 5, 5, { stroke: color, strokeWidth: 2 }), circle(cx - 9, cy + 5, 4, { stroke: color, strokeWidth: 2 }), circle(cx + 9, cy + 5, 4, { stroke: color, strokeWidth: 2 })].join("");
  }
  if (kind === "shop") {
    return [rect(cx - 10, cy - 6, 20, 18, { fill: "none", rx: 4, stroke: color, strokeWidth: 2 }), pathEl(`M${cx - 5} ${cy - 6}c0-5 10-5 10 0`, { stroke: color, width: 2 })].join("");
  }
  if (kind === "chat") {
    return pathEl(`M${cx - 12} ${cy - 7}h24v16h-15l-7 6v-6h-2z`, { stroke: color, width: 2 });
  }
  return [circle(cx, cy - 5, 7, { stroke: color, strokeWidth: 2 }), pathEl(`M${cx - 12} ${cy + 14}c3-8 21-8 24 0`, { stroke: color, width: 2 })].join("");
}

function bottomNav(t, active = "discover") {
  const tabs = [
    ["discover", "Discover"],
    ["community", "Community"],
    ["shop", "Shop"],
    ["chat", "Chat"],
    ["profile", "Profile"],
  ];
  const out = [rect(0, 764, W, 80, { fill: t.nav, rx: 0 }), `<line x1="0" y1="764" x2="${W}" y2="764" stroke="${t.line}" stroke-opacity="${t.lineOpacity}" />`];
  tabs.forEach(([key, label], index) => {
    const x = 39 + index * 78;
    const color = key === active ? t.volt : t.txt3;
    out.push(`<g id="nav-${key}" transform="translate(${x},786)">`);
    out.push(navIcon(key, 0, 0, color));
    out.push(text(0, 38, label, { size: 10, weight: 700, fill: color, anchor: "middle" }));
    out.push("</g>");
  });
  return out.join("");
}

function statusBar(t) {
  return [
    text(24, 25, "9:30", { size: 13, weight: 700, fill: t.txt }),
    circle(195, 18, 9, { fill: t.mono, opacity: t.name === "Dark" ? 0.65 : 0.28 }),
    `<g transform="translate(318,13)" stroke="${t.txt}" stroke-width="1.8" fill="none" stroke-linecap="round">`,
    pathEl("M0 10c5-5 13-5 18 0", { stroke: t.txt, width: 1.8 }),
    pathEl("M4 14c3-3 7-3 10 0", { stroke: t.txt, width: 1.8 }),
    rect(27, 2, 19, 12, { fill: "none", rx: 3, stroke: t.txt, strokeWidth: 1.8 }),
    rect(47, 6, 3, 4, { fill: t.txt, rx: 1 }),
    "</g>",
  ].join("");
}

function renderDiscover(t) {
  const out = [];
  out.push(topHeader(t, ["Find your coach", "or partner"], { eyebrow: "Hey Alex -", bell: true }));
  out.push(searchBox(t, 0, 108, 354, "Search sports, hobbies, coaches"));
  out.push(segmented(t, 0, 166, 354, ["Coaches", "Training partners"], 0));
  out.push(pill(t, 0, 222, 184, 38, "All sports and hobbies", { fill: t.surface, fg: t.soft }));
  out.push(segmented(t, 206, 222, 148, ["Cards", "Map"], 0));
  out.push(section(t, 296, "Featured coaches"));
  out.push(personCard(t, 0, 310, coaches[0], { boosted: true }));
  out.push(personCard(t, 0, 410, coaches[1], { boosted: true }));
  out.push(card(t, 0, 510, 354, 92, { fill: t.surface2, rx: 18 }));
  out.push(avatar(t, 14, 528, "SL", 52, "#2A3A2E"));
  out.push(pill(t, 78, 526, 34, 20, "AD", { fill: t.volt, fillOpacity: 0.12, fg: t.accent, border: t.volt, borderOpacity: 0.2, size: 9 }));
  out.push(text(78, 560, "StrideLab running shoes", { size: 15, weight: 800, fill: t.txt }));
  out.push(text(78, 582, "Free gait analysis with first pair.", { size: 12.5, fill: t.txt2 }));
  out.push(text(334, 536, "x", { size: 16, weight: 800, fill: t.txt3, anchor: "middle" }));
  out.push(section(t, 638, "All coaches"));
  out.push(personCard(t, 0, 652, coaches[2]));
  return out.join("");
}

function renderMap(t) {
  const out = [];
  out.push(rect(-18, -50, W, 764, { fill: t.mapBg, rx: 0 }));
  out.push(rect(-18, -50, W, 764, { fill: "url(#map-grid)", rx: 0, opacity: t.name === "Dark" ? 1 : 0.55 }));
  out.push(searchBox(t, 0, 8, 354, "Search this area"));
  out.push(segmented(t, 92, 66, 170, ["Cards", "Map"], 1));
  const pins = [
    [84, 178, coaches[0], true],
    [238, 234, coaches[2], false],
    [158, 392, partners[0], false],
    [292, 474, coaches[1], true],
  ];
  pins.forEach(([x, y, p, boosted]) => {
    out.push(circle(x, y, 26, { fill: boosted ? t.amber : t.surface, stroke: t.volt, strokeWidth: boosted ? 3 : 2, opacity: 0.96 }));
    out.push(text(x, y + 6, p.initials, { size: 13, weight: 800, fill: boosted ? t.ink : t.txt, family: "Archivo, Arial, sans-serif", anchor: "middle" }));
    out.push(pill(t, x + 18, y - 29, 42, 21, p.rating, { fill: t.surface, fg: t.amberText, size: 10 }));
  });
  out.push(circle(187, 318, 8, { fill: t.volt }));
  out.push(circle(187, 318, 18, { fill: t.volt, opacity: 0.14 }));
  out.push(card(t, 0, 604, 354, 96, { fill: t.surface, filter: "url(#shadow)" }));
  out.push(avatar(t, 14, 624, coaches[0].initials, 56, "#3A331C"));
  out.push(text(84, 634, "Nearest boosted coach", { size: 11, weight: 800, fill: t.txt3, family: "Archivo, Arial, sans-serif", spacing: "1.1" }));
  out.push(text(84, 660, coaches[0].name, { size: 16, weight: 800, fill: t.txt }));
  out.push(text(84, 682, "Strength - 1.2 km - $45", { size: 13, fill: t.txt2 }));
  return out.join("");
}

function renderCommunity(t) {
  const out = [];
  out.push(topHeader(t, "Community", { subtitle: "Train with crews around you", plus: true }));
  out.push(section(t, 112, "Happening soon"));
  out.push(`<g transform="translate(0,128)">${eventCard(t, 0, 0, events[0])}${eventCard(t, 230, 0, events[1])}</g>`);
  out.push(card(t, 0, 320, 354, 92, { fill: t.surface2 }));
  out.push(avatar(t, 14, 338, "FN", 52, "#3A322A"));
  out.push(pill(t, 78, 336, 34, 20, "AD", { fill: t.volt, fillOpacity: 0.12, fg: t.accent, border: t.volt, borderOpacity: 0.2, size: 9 }));
  out.push(text(78, 370, "FuelUp Nutrition", { size: 15, weight: 800, fill: t.txt }));
  out.push(text(78, 392, "20% off recovery packs for crews.", { size: 12.5, fill: t.txt2 }));
  out.push(section(t, 456, "Communities"));
  communities.forEach((c, i) => {
    const y = 472 + i * 92;
    out.push(card(t, 0, y, 354, 80, { rx: 16 }));
    out.push(avatar(t, 13, y + 13, c.code, 52, c.tint));
    out.push(text(78, y + 27, c.name, { size: 16, weight: 800, fill: t.txt }));
    out.push(text(78, y + 49, `${c.members} members - ${c.about}`, { size: 12.5, fill: t.txt2 }));
    out.push(pill(t, 282, y + 24, 56, 28, i === 1 ? "Joined" : "Join", { fill: i === 1 ? t.surface2 : t.volt, fg: i === 1 ? t.soft : t.ink, border: i === 1 ? t.line : t.volt }));
  });
  return out.join("");
}

function renderShop(t) {
  const out = [];
  out.push(topHeader(t, "Shop", { subtitle: "Partner sports and hobby stores" }));
  out.push(segmented(t, 0, 104, 354, ["List", "Map"], 0));
  out.push(section(t, 174, "Closest first"));
  shops.forEach((shop, index) => out.push(shopCard(t, 0, 190 + index * 104, shop)));
  out.push(card(t, 0, 534, 354, 142, { fill: t.volt, fillOpacity: 0.10, stroke: t.volt, strokeOpacity: 0.22 }));
  out.push(text(18, 566, "Own a sports or hobby shop?", { size: 18, weight: 800, fill: t.txt, family: "Archivo, Arial, sans-serif" }));
  out.push(text(18, 594, "Sell to nearby athletes in-app and", { size: 13, fill: t.txt2 }));
  out.push(text(18, 614, "feed your request to admin approvals.", { size: 13, fill: t.txt2 }));
  out.push(rect(18, 632, 318, 42, { fill: t.volt, rx: 13 }));
  out.push(text(177, 658, "Be a Shop", { size: 14, weight: 800, fill: t.ink, family: "Archivo, Arial, sans-serif", anchor: "middle" }));
  return out.join("");
}

function renderChat(t) {
  const out = [];
  out.push(topHeader(t, "Chat", { subtitle: "Conversations and session updates" }));
  chats.forEach((chat, index) => out.push(chatCard(t, 0, 112 + index * 90, chat)));
  out.push(card(t, 0, 508, 354, 118, { fill: t.surface2 }));
  out.push(text(18, 540, "Session reminders", { size: 17, weight: 800, fill: t.txt, family: "Archivo, Arial, sans-serif" }));
  out.push(text(18, 568, "Marcus approved your Thursday", { size: 13, fill: t.txt2 }));
  out.push(text(18, 588, "6:30 PM strength session.", { size: 13, fill: t.txt2 }));
  out.push(pill(t, 18, 604, 118, 28, "Open booking", { fill: t.volt, fg: t.ink, border: t.volt }));
  return out.join("");
}

function renderProfile(t) {
  const out = [];
  out.push(topHeader(t, "Profile", { subtitle: "Alex Morgan - Beirut" }));
  out.push(card(t, 0, 104, 354, 112));
  out.push(avatar(t, 16, 126, "AM", 68, "#273440"));
  out.push(text(100, 138, "Alex Morgan", { size: 20, weight: 800, fill: t.txt, family: "Archivo, Arial, sans-serif" }));
  out.push(text(100, 164, "Strength - Running - Boxing", { size: 13, fill: t.txt2 }));
  out.push(pill(t, 100, 178, 70, 28, "User", { fill: t.volt, fg: t.ink, border: t.volt }));
  out.push(pill(t, 178, 178, 78, 28, "Coach", { fill: t.surface2, fg: t.soft }));
  out.push(pill(t, 264, 178, 72, 28, "Admin", { fill: t.surface2, fg: t.soft }));
  out.push(section(t, 260, "Training"));
  out.push(settingRow(t, 0, 278, "My bookings", "2 upcoming sessions", "2"));
  out.push(settingRow(t, 0, 348, "Notifications", "Daily plan briefing on", ""));
  out.push(settingRow(t, 0, 418, "Calendar sync", "Google - sessions auto pushed", "On"));
  out.push(section(t, 522, "Settings"));
  out.push(settingRow(t, 0, 540, "Appearance", "Dark / light theme", ""));
  out.push(settingRow(t, 0, 610, "Admin console", "Approvals, reports, accounting", "1"));
  return out.join("");
}

function settingRow(t, x, y, title, sub, badge) {
  const out = [card(t, x, y, 354, 58, { rx: 16 })];
  out.push(text(x + 16, y + 23, title, { size: 15, weight: 800, fill: t.txt }));
  out.push(text(x + 16, y + 43, sub, { size: 12, fill: t.txt2 }));
  if (badge) out.push(pill(t, x + 300, y + 15, 38, 28, badge, { fill: badge === "On" ? t.volt : t.surface2, fg: badge === "On" ? t.ink : t.accent, border: badge === "On" ? t.volt : t.line }));
  out.push(pathEl(`M${x + 336} ${y + 28}l6 6-6 6`, { stroke: t.txt3, width: 2 }));
  return out.join("");
}

function overlayHeader(t, title, action) {
  const out = [];
  out.push(rect(0, 0, 40, 40, { fill: t.surface, rx: 12, stroke: t.line, strokeOpacity: t.lineOpacity }));
  out.push(pathEl("M25 12l-8 8 8 8", { stroke: t.txt, width: 2.2 }));
  out.push(text(54, 26, title, { size: 19, weight: 800, fill: t.txt, family: "Archivo, Arial, sans-serif" }));
  if (action) out.push(text(354, 26, action, { size: 13, weight: 800, fill: t.accent, anchor: "end" }));
  return out.join("");
}

function renderCoachProfile(t) {
  const out = [overlayHeader(t, "Coach profile")];
  out.push(card(t, 0, 62, 354, 170));
  out.push(avatar(t, 18, 84, "MR", 72, "#3A331C"));
  out.push(text(108, 98, "Marcus Reyes", { size: 22, weight: 800, fill: t.txt, family: "Archivo, Arial, sans-serif" }));
  out.push(text(108, 124, "Strength and Conditioning", { size: 13, fill: t.txt2 }));
  out.push(pill(t, 108, 142, 82, 28, "* 4.9", { fill: t.amber, fillOpacity: 0.14, fg: t.amberText, border: t.amber, borderOpacity: 0.28 }));
  out.push(pill(t, 198, 142, 98, 28, "640+ sessions", { fill: t.surface2, fg: t.soft }));
  out.push(text(18, 198, "Ex-national powerlifter. Durable strength,", { size: 13, fill: t.soft }));
  out.push(text(18, 218, "flawless technique and progressive overload.", { size: 13, fill: t.soft }));
  out.push(section(t, 274, "Packages"));
  out.push(packageRow(t, 0, 290, "Single session", "$45", "60 minutes - gym or outdoor"));
  out.push(packageRow(t, 0, 366, "4-session block", "$160", "Best for a focused strength cycle"));
  out.push(section(t, 482, "Reviews"));
  out.push(reviewCard(t, 0, 498, "Chris P.", "Pushed me harder than I push myself. Form cues were spot-on."));
  out.push(reviewCard(t, 0, 590, "Nadia R.", "Booking was effortless and the session flew by."));
  out.push(rect(0, 704, 354, 52, { fill: t.volt, rx: 15 }));
  out.push(text(177, 737, "Book a session", { size: 16, weight: 800, fill: t.ink, family: "Archivo, Arial, sans-serif", anchor: "middle" }));
  return out.join("");
}

function packageRow(t, x, y, title, price, sub) {
  const out = [card(t, x, y, 354, 64, { rx: 16 })];
  out.push(text(x + 16, y + 24, title, { size: 15, weight: 800, fill: t.txt }));
  out.push(text(x + 16, y + 45, sub, { size: 12.5, fill: t.txt2 }));
  out.push(text(x + 330, y + 38, price, { size: 17, weight: 800, fill: t.accent, family: "Archivo, Arial, sans-serif", anchor: "end" }));
  return out.join("");
}

function reviewCard(t, x, y, name, body) {
  const out = [card(t, x, y, 354, 76, { rx: 16 })];
  out.push(text(x + 16, y + 24, `${name} - *****`, { size: 13, weight: 800, fill: t.amberText }));
  out.push(text(x + 16, y + 48, body, { size: 12.5, fill: t.txt2 }));
  return out.join("");
}

function renderBooking(t) {
  const out = [overlayHeader(t, "Book Marcus")];
  out.push(section(t, 74, "July 2026"));
  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
  weekdays.forEach((d, i) => out.push(text(i * 50 + 25, 104, d, { size: 11, weight: 800, fill: t.txt3, anchor: "middle" })));
  let day = 1;
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 7; c += 1) {
      const x = c * 50 + 2;
      const y = 120 + r * 47;
      const disabled = [3, 10, 17, 24].includes(day);
      const active = day === 2;
      out.push(rect(x, y, 42, 40, { fill: active ? t.volt : disabled ? t.surface2 : t.surface, rx: 13, stroke: t.line, strokeOpacity: t.lineOpacity, opacity: disabled ? 0.55 : 1 }));
      out.push(text(x + 21, y + 25, day <= 31 ? day : "", { size: 13, weight: 800, fill: active ? t.ink : disabled ? t.txt3 : t.txt, anchor: "middle" }));
      day += 1;
      if (day > 31) break;
    }
  }
  out.push(section(t, 386, "Time slot"));
  ["6:30 AM", "8:00 AM", "12:00 PM", "5:30 PM", "6:30 PM", "7:30 PM"].forEach((slot, i) => {
    const x = (i % 3) * 118;
    const y = 402 + Math.floor(i / 3) * 46;
    out.push(pill(t, x, y, 106, 34, slot, { fill: i === 4 ? t.volt : t.surface, fg: i === 4 ? t.ink : t.soft, border: i === 4 ? t.volt : t.line }));
  });
  out.push(section(t, 530, "Package"));
  out.push(packageRow(t, 0, 546, "Single session", "$45", "60 minutes - confirm and pay"));
  out.push(card(t, 0, 636, 354, 54, { fill: t.surface2, rx: 16 }));
  out.push(text(16, 670, "Total", { size: 14, weight: 800, fill: t.txt }));
  out.push(text(330, 670, "$45", { size: 18, weight: 800, fill: t.accent, family: "Archivo, Arial, sans-serif", anchor: "end" }));
  out.push(rect(0, 704, 354, 52, { fill: t.volt, rx: 15 }));
  out.push(text(177, 737, "Confirm and pay", { size: 16, weight: 800, fill: t.ink, family: "Archivo, Arial, sans-serif", anchor: "middle" }));
  return out.join("");
}

function renderBookingConfirmed(t) {
  const out = [overlayHeader(t, "Booking confirmed")];
  out.push(circle(177, 196, 54, { fill: t.volt }));
  out.push(pathEl("M153 196l17 17 34-38", { stroke: t.ink, width: 6 }));
  out.push(text(177, 284, "You are booked!", { size: 26, weight: 800, fill: t.txt, family: "Archivo, Arial, sans-serif", anchor: "middle" }));
  out.push(lines(177, 320, ["Marcus approved Thursday", "6:30 PM at Iron Yard Gym."], { size: 14, fill: t.txt2, anchor: "middle" }, 22));
  out.push(card(t, 24, 388, 306, 92, { fill: t.volt, fillOpacity: 0.12, stroke: t.volt, strokeOpacity: 0.24 }));
  out.push(text(177, 422, "Added to Google Calendar", { size: 16, weight: 800, fill: t.txt, anchor: "middle" }));
  out.push(text(177, 448, "Changes sync automatically.", { size: 13, fill: t.txt2, anchor: "middle" }));
  out.push(rect(36, 560, 282, 52, { fill: t.volt, rx: 15 }));
  out.push(text(177, 593, "View in bookings", { size: 16, weight: 800, fill: t.ink, family: "Archivo, Arial, sans-serif", anchor: "middle" }));
  return out.join("");
}

function renderBookings(t) {
  const out = [overlayHeader(t, "Bookings")];
  out.push(section(t, 76, "Active package"));
  out.push(card(t, 0, 92, 354, 112));
  out.push(text(16, 122, "Marcus Reyes - 4-session block", { size: 15, weight: 800, fill: t.txt }));
  out.push(text(16, 146, "2 of 4 sessions used", { size: 13, fill: t.txt2 }));
  out.push(rect(16, 166, 322, 10, { fill: t.surface2, rx: 999 }));
  out.push(rect(16, 166, 161, 10, { fill: t.volt, rx: 999 }));
  out.push(section(t, 250, "Upcoming"));
  out.push(sessionRow(t, 0, 266, "Strength technique", "Thu 09 - 6:30 PM", "In calendar"));
  out.push(sessionRow(t, 0, 346, "Tempo run", "Sat 11 - 7:00 AM", "Change"));
  out.push(section(t, 472, "Past"));
  out.push(sessionRow(t, 0, 488, "Boxing footwork", "Mon 29 - complete", "Rate"));
  return out.join("");
}

function sessionRow(t, x, y, title, sub, chip) {
  const out = [card(t, x, y, 354, 68, { rx: 16 })];
  out.push(text(x + 16, y + 26, title, { size: 15, weight: 800, fill: t.txt }));
  out.push(text(x + 16, y + 48, sub, { size: 12.5, fill: t.txt2 }));
  out.push(pill(t, x + 250, y + 20, 88, 28, chip, { fill: chip === "In calendar" ? t.volt : t.surface2, fillOpacity: chip === "In calendar" ? 0.12 : undefined, fg: chip === "In calendar" ? t.accent : t.soft, border: chip === "In calendar" ? t.volt : t.line, borderOpacity: 0.2 }));
  return out.join("");
}

function renderStorefront(t) {
  const out = [overlayHeader(t, "Partner store")];
  out.push(card(t, 0, 62, 354, 130));
  out.push(avatar(t, 18, 84, "PL", 64, "#2A3A2E"));
  out.push(text(98, 100, "PaceLine Runners", { size: 20, weight: 800, fill: t.txt, family: "Archivo, Arial, sans-serif" }));
  out.push(text(98, 126, "Running gear - 600 m", { size: 13, fill: t.txt2 }));
  out.push(pill(t, 98, 144, 116, 28, "PARTNER STORE", { fill: t.volt, fillOpacity: 0.12, fg: t.accent, border: t.volt, borderOpacity: 0.22, size: 10 }));
  out.push(card(t, 0, 214, 354, 58, { fill: t.volt, fillOpacity: 0.12, stroke: t.volt, strokeOpacity: 0.22, rx: 16 }));
  out.push(text(16, 248, "10% off applied at in-app checkout", { size: 14, weight: 800, fill: t.accent }));
  out.push(section(t, 318, "Popular items"));
  const products = [
    ["Tempo Racer 2", "$129"], ["Featherlight cap", "$18"], ["Energy gels", "$22"], ["Reflective shell", "$74"],
  ];
  products.forEach(([name, price], i) => {
    const x = (i % 2) * 182;
    const y = 334 + Math.floor(i / 2) * 188;
    out.push(card(t, x, y, 172, 172, { rx: 18 }));
    out.push(rect(x + 12, y + 12, 148, 82, { fill: "url(#stripe)", rx: 14, stroke: t.line, strokeOpacity: t.line2Opacity }));
    out.push(text(x + 12, y + 118, name, { size: 13, weight: 800, fill: t.txt }));
    out.push(text(x + 12, y + 142, price, { size: 16, weight: 800, fill: t.accent, family: "Archivo, Arial, sans-serif" }));
    out.push(pill(t, x + 94, y + 124, 58, 30, i < 2 ? "Added" : "Add", { fill: i < 2 ? t.volt : t.surface2, fg: i < 2 ? t.ink : t.soft, border: i < 2 ? t.volt : t.line }));
  });
  out.push(rect(16, 704, 322, 54, { fill: t.volt, rx: 15, filter: "url(#shadow)" }));
  out.push(text(177, 739, "Checkout - 2 items - $147", { size: 15, weight: 800, fill: t.ink, family: "Archivo, Arial, sans-serif", anchor: "middle" }));
  return out.join("");
}

function field(t, x, y, label, value, w = 354) {
  return [
    text(x, y, label.toUpperCase(), { size: 12, weight: 800, fill: t.txt3, family: "Archivo, Arial, sans-serif", spacing: "1.3" }),
    rect(x, y + 10, w, 44, { fill: t.surface, rx: 14, stroke: t.line, strokeOpacity: t.lineOpacity }),
    text(x + 14, y + 38, value, { size: 14, fill: value.startsWith("e.g.") ? t.txt3 : t.txt }),
  ].join("");
}

function renderShopReg(t) {
  const out = [overlayHeader(t, "Shop registration")];
  out.push(field(t, 0, 72, "Shop name", "e.g. Summit Trail Co."));
  out.push(field(t, 0, 150, "Category", "Running"));
  out.push(pathEl("M328 181l7 7 7-7", { stroke: t.txt3, width: 2 }));
  out.push(field(t, 0, 228, "Phone", "e.g. +961 3 123 456"));
  out.push(field(t, 0, 306, "Email", "hello@yourshop.com"));
  out.push(section(t, 410, "Preferred way to reach you"));
  ["Phone call", "WhatsApp", "Email", "In-app chat"].forEach((item, i) => {
    const widths = [86, 86, 70, 96];
    const x = [0, 96, 192, 0][i];
    const y = i === 3 ? 466 : 426;
    out.push(pill(t, x, y, widths[i], 34, item, { fill: i === 1 ? t.volt : t.surface, fg: i === 1 ? t.ink : t.soft, border: i === 1 ? t.volt : t.line }));
  });
  out.push(field(t, 0, 528, "Best time to contact", "weekdays after 5 PM"));
  out.push(rect(0, 640, 354, 52, { fill: t.volt, rx: 15 }));
  out.push(text(177, 673, "Send request to admins", { size: 15, weight: 800, fill: t.ink, family: "Archivo, Arial, sans-serif", anchor: "middle" }));
  return out.join("");
}

function renderConversation(t) {
  const out = [overlayHeader(t, "Marcus Reyes")];
  out.push(messageBubble(t, 0, 94, "Hey! Ready for the strength block this week?", false));
  out.push(messageBubble(t, 72, 166, "Born ready. Same 6:30 slot works?", true));
  out.push(messageBubble(t, 0, 238, "Locked in. Heavy squats first, then accessories.", false));
  out.push(messageBubble(t, 120, 324, "Perfect. See you at Iron Yard.", true));
  out.push(messageBubble(t, 0, 396, "Bring your A-game.", false));
  out.push(rect(0, 704, 354, 52, { fill: t.surface, rx: 16, stroke: t.line, strokeOpacity: t.lineOpacity }));
  out.push(text(16, 737, "Message Marcus", { size: 14, fill: t.txt3 }));
  out.push(circle(326, 730, 18, { fill: t.volt }));
  out.push(pathEl("M319 730h13M326 723v14", { stroke: t.ink, width: 2.4 }));
  return out.join("");
}

function messageBubble(t, x, y, body, me) {
  const w = me ? 232 : 276;
  const out = [rect(x, y, w, 54, { fill: me ? t.volt : t.surface, rx: 18, stroke: me ? undefined : t.line, strokeOpacity: t.lineOpacity })];
  out.push(text(x + 16, y + 24, body.length > 34 ? body.slice(0, 34) : body, { size: 13, fill: me ? t.ink : t.txt }));
  if (body.length > 34) out.push(text(x + 16, y + 42, body.slice(34), { size: 13, fill: me ? t.ink : t.txt }));
  return out.join("");
}

function renderCommunityDetail(t) {
  const out = [overlayHeader(t, "Running")];
  out.push(card(t, 0, 62, 354, 142));
  out.push(avatar(t, 18, 86, "RN", 64, "#1F3A36"));
  out.push(text(98, 100, "Running", { size: 22, weight: 800, fill: t.txt, family: "Archivo, Arial, sans-serif" }));
  out.push(text(98, 126, "3.2k members - official", { size: 13, fill: t.txt2 }));
  out.push(text(18, 176, "Runners of every pace, from first 5k to", { size: 13, fill: t.soft }));
  out.push(text(18, 196, "marathon crews and race-day meetups.", { size: 13, fill: t.soft }));
  out.push(section(t, 252, "Location groups"));
  ["Corniche Runners", "Horsh Beirut Pacers", "Jounieh Bay Run Club"].forEach((name, i) => {
    out.push(settingRow(t, 0, 268 + i * 68, name, `${i === 0 ? "420" : i === 1 ? "310" : "180"} members nearby`, ""));
  });
  out.push(section(t, 508, "Events"));
  out.push(eventCard(t, 0, 524, events[0], 354));
  out.push(rect(0, 704, 354, 52, { fill: t.volt, rx: 15 }));
  out.push(text(177, 737, "Create event", { size: 16, weight: 800, fill: t.ink, family: "Archivo, Arial, sans-serif", anchor: "middle" }));
  return out.join("");
}

function renderAccounting(t) {
  const out = [overlayHeader(t, "Accounting", "History")];
  out.push(card(t, 0, 62, 354, 142));
  out.push(text(16, 94, "This month", { size: 18, weight: 800, fill: t.txt, family: "Archivo, Arial, sans-serif" }));
  out.push(text(16, 124, "Revenue", { size: 13, fill: t.txt2 }));
  out.push(text(330, 124, "$12,480", { size: 17, weight: 800, fill: t.txt, family: "Archivo, Arial, sans-serif", anchor: "end" }));
  out.push(text(16, 152, "Expenses", { size: 13, fill: t.txt2 }));
  out.push(text(330, 152, "-$3,280", { size: 17, weight: 800, fill: t.danger, family: "Archivo, Arial, sans-serif", anchor: "end" }));
  out.push(text(16, 184, "Net profit", { size: 14, weight: 800, fill: t.txt }));
  out.push(text(330, 184, "$9,200", { size: 19, weight: 800, fill: t.accent, family: "Archivo, Arial, sans-serif", anchor: "end" }));
  out.push(section(t, 250, "Margins per transaction"));
  out.push(metricRow(t, 0, 266, "Coach session commission", "12%"));
  out.push(metricRow(t, 0, 332, "Shop sale commission", "8%"));
  out.push(metricRow(t, 0, 398, "Boost fee margin", "22%"));
  out.push(section(t, 498, "Admin profit shares"));
  out.push(metricRow(t, 0, 514, "Alex Morgan", "40%"));
  out.push(metricRow(t, 0, 580, "Rima Haddad", "30%"));
  out.push(card(t, 0, 662, 354, 84, { fill: t.amber, fillOpacity: 0.13, stroke: t.amber, strokeOpacity: 0.26 }));
  out.push(text(16, 692, "Pending proposal", { size: 15, weight: 800, fill: t.amberText }));
  out.push(text(16, 718, "1 of 3 approvals - margins changed", { size: 13, fill: t.txt2 }));
  out.push(pill(t, 254, 688, 76, 30, "Approve", { fill: t.volt, fg: t.ink, border: t.volt }));
  return out.join("");
}

function metricRow(t, x, y, label, value) {
  const out = [card(t, x, y, 354, 54, { rx: 16 })];
  out.push(text(x + 16, y + 33, label, { size: 13, weight: 700, fill: t.txt }));
  out.push(pill(t, x + 230, y + 12, 34, 30, "-", { fill: t.surface2, fg: t.soft }));
  out.push(rect(x + 272, y + 12, 48, 30, { fill: t.surface2, rx: 10, stroke: t.line, strokeOpacity: t.lineOpacity }));
  out.push(text(x + 296, y + 32, value, { size: 13, weight: 800, fill: t.txt, anchor: "middle" }));
  out.push(pill(t, x + 326, y + 12, 28, 30, "+", { fill: t.surface2, fg: t.soft }));
  return out.join("");
}

const frameDefs = [
  { id: "discover", label: "01 Discover", theme: "dark", nav: "discover", render: renderDiscover },
  { id: "map", label: "02 Discover map", theme: "dark", nav: "discover", render: renderMap },
  { id: "community", label: "03 Community", theme: "dark", nav: "community", render: renderCommunity },
  { id: "shop", label: "04 Shop", theme: "dark", nav: "shop", render: renderShop },
  { id: "chat", label: "05 Chat", theme: "dark", nav: "chat", render: renderChat },
  { id: "profile", label: "06 Profile", theme: "dark", nav: "profile", render: renderProfile },
  { id: "coach-profile", label: "07 Coach profile", theme: "dark", render: renderCoachProfile },
  { id: "booking", label: "08 Booking calendar", theme: "dark", render: renderBooking },
  { id: "booking-confirmed", label: "09 Booking confirmed", theme: "dark", render: renderBookingConfirmed },
  { id: "bookings", label: "10 My bookings", theme: "dark", render: renderBookings },
  { id: "storefront", label: "11 Storefront", theme: "dark", render: renderStorefront },
  { id: "shop-registration", label: "12 Shop registration", theme: "dark", render: renderShopReg },
  { id: "conversation", label: "13 Conversation", theme: "dark", render: renderConversation },
  { id: "community-detail", label: "14 Community detail", theme: "dark", render: renderCommunityDetail },
  { id: "accounting", label: "15 Admin accounting", theme: "dark", render: renderAccounting },
  { id: "discover-light", label: "16 Discover - light", theme: "light", nav: "discover", render: renderDiscover },
];

function frame(def, index) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = M + col * (W + GAP_X);
  const y = TITLE_H + row * (LABEL_H + H + GAP_Y);
  const t = themes[def.theme];
  const content = def.render(t);
  const clipId = `clip-${def.id}`;
  const out = [];
  out.push(`<g id="${def.id}" transform="translate(${x},${y})">`);
  out.push(text(0, 18, def.label, { size: 13, weight: 800, fill: "#9BA1AC" }));
  out.push(`<g transform="translate(0,${LABEL_H})">`);
  out.push(rect(0, 0, W, H, { fill: t.bg, rx: 28, filter: "url(#shadow)" }));
  out.push(`<clipPath id="${clipId}">${rect(0, 0, W, H, { fill: "#FFFFFF", rx: 28 })}</clipPath>`);
  out.push(`<g clip-path="url(#${clipId})">`);
  out.push(rect(0, 0, W, H, { fill: t.bg, rx: 28 }));
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#phone-${def.theme}-wash)" opacity="${def.theme === "dark" ? 1 : 0.7}" />`);
  out.push(statusBar(t));
  out.push(`<g transform="translate(18,52)">${content}</g>`);
  if (def.nav) out.push(bottomNav(t, def.nav));
  out.push("</g>");
  out.push(rect(0.5, 0.5, W - 1, H - 1, { fill: "none", rx: 28, stroke: t.line, strokeOpacity: def.theme === "dark" ? 0.12 : 0.18 }));
  out.push("</g></g>");
  return out.join("");
}

const boardW = M * 2 + COLS * W + (COLS - 1) * GAP_X;
const rows = Math.ceil(frameDefs.length / COLS);
const boardH = TITLE_H + rows * (LABEL_H + H) + (rows - 1) * GAP_Y + M;

const svg = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${boardW}" height="${boardH}" viewBox="0 0 ${boardW} ${boardH}">`,
  `<defs>`,
  `<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#000000" flood-opacity="0.34"/></filter>`,
  `<linearGradient id="phone-dark-wash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15171C"/><stop offset="1" stop-color="#08090B"/></linearGradient>`,
  `<linearGradient id="phone-light-wash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E3E5EB"/><stop offset="1" stop-color="#C7CAD2"/></linearGradient>`,
  `<pattern id="stripe" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="18" height="18" fill="#22262E"/><rect width="7" height="18" fill="#2D333D"/></pattern>`,
  `<pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0v32" fill="none" stroke="#FFFFFF" stroke-opacity="0.045" stroke-width="1"/></pattern>`,
  `</defs>`,
  rect(0, 0, boardW, boardH, { fill: "#08090B" }),
  text(M, 58, "Spotter - Figma import board", { size: 38, weight: 800, fill: "#F2F3F5", family: "Archivo, Arial, sans-serif" }),
  text(M, 88, "16 Android mobile frames generated from the Spotter handoff and Compose design tokens.", { size: 15, fill: "#9BA1AC" }),
  text(boardW - M, 88, "390 x 844 frames", { size: 13, weight: 800, fill: "#C6F24E", anchor: "end" }),
  frameDefs.map(frame).join(""),
  `</svg>`,
].join("\n");

const tokenJson = {
  name: "Spotter",
  description: "Figma-ready design tokens for the Spotter Android prototype.",
  source: [
    "extracted/design_handoff_spotter_app/README.md",
    "app/src/main/java/com/spotter/app/ui/theme",
  ],
  color: {
    dark: Object.fromEntries(Object.entries(themes.dark)
      .filter(([key, value]) => key !== "name" && typeof value === "string" && value.startsWith("#"))
      .map(([key, value]) => [key, { "$type": "color", "$value": value }])),
    light: Object.fromEntries(Object.entries(themes.light)
      .filter(([key, value]) => key !== "name" && typeof value === "string" && value.startsWith("#"))
      .map(([key, value]) => [key, { "$type": "color", "$value": value }])),
  },
  typography: {
    pageTitle: { "$type": "typography", "$value": { fontFamily: "Archivo", fontWeight: 800, fontSize: 27, lineHeight: 28, letterSpacing: -0.5 } },
    overlayTitle: { "$type": "typography", "$value": { fontFamily: "Archivo", fontWeight: 800, fontSize: 19 } },
    sectionHeading: { "$type": "typography", "$value": { fontFamily: "Archivo", fontWeight: 800, fontSize: 12, letterSpacing: 1.4, textCase: "uppercase" } },
    body: { "$type": "typography", "$value": { fontFamily: "Hanken Grotesk", fontWeight: 400, fontSize: 14 } },
    label: { "$type": "typography", "$value": { fontFamily: "Hanken Grotesk", fontWeight: 700, fontSize: 14 } },
    microBadge: { "$type": "typography", "$value": { fontFamily: "Archivo", fontWeight: 800, fontSize: 9, letterSpacing: 0.7 } },
    navLabel: { "$type": "typography", "$value": { fontFamily: "Hanken Grotesk", fontWeight: 600, fontSize: 10 } },
  },
  radius: {
    card: { "$type": "dimension", "$value": 18 },
    input: { "$type": "dimension", "$value": 14 },
    button: { "$type": "dimension", "$value": 15 },
    buttonSmall: { "$type": "dimension", "$value": 13 },
    avatar: { "$type": "dimension", "$value": 15 },
    pill: { "$type": "dimension", "$value": 999 },
  },
  spacing: {
    screenHorizontal: { "$type": "dimension", "$value": 18 },
    cardPadding: { "$type": "dimension", "$value": 14 },
    listGap: { "$type": "dimension", "$value": 11 },
    tapTargetMin: { "$type": "dimension", "$value": 44 },
  },
  frame: {
    androidMobile: { "$type": "dimension", "$value": { width: 390, height: 844 } },
  },
};

const readme = `# Spotter Figma Design Files

This folder contains Figma-importable design artifacts generated for the Spotter mobile app.

## Files

- \`spotter-figma-board.svg\` - 16 mobile frames covering core tabs, booking, shop, community, chat, profile, accounting, and one light-theme example.
- \`spotter-design-tokens.json\` - colors, typography, radius, spacing, and frame tokens in a design-token-friendly JSON shape.
- \`generate-figma-assets.mjs\` - the generator used to recreate both files.

## Import Into Figma

1. Open Figma and create a new design file.
2. Drag \`spotter-figma-board.svg\` onto the canvas, or use \`File > Place image\`.
3. Install or activate the fonts used by the app: Archivo and Hanken Grotesk. Local font files are in \`app/src/main/res/font/\`.
4. Import \`spotter-design-tokens.json\` with your preferred tokens/variables plugin, or use it as a manual reference when creating Figma variables.

Figma's native \`.fig\` file format is proprietary, so this repo generates SVG and token JSON instead. The SVG imports as editable vector/text layers in Figma, and the token JSON keeps the design system portable.

## Regenerate

\`\`\`powershell
node design\\figma\\generate-figma-assets.mjs
\`\`\`

The original HTML handoff remains the behavioral source of truth in \`extracted/design_handoff_spotter_app/\`.
`;

fs.writeFileSync(path.join(outDir, "spotter-figma-board.svg"), svg, "utf8");
fs.writeFileSync(path.join(outDir, "spotter-design-tokens.json"), `${JSON.stringify(tokenJson, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outDir, "README.md"), readme, "utf8");

console.log("Generated design/figma/spotter-figma-board.svg");
console.log("Generated design/figma/spotter-design-tokens.json");
console.log("Generated design/figma/README.md");
