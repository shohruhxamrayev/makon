// Makon Studio — ready-made rooms. Each template is a real plan (metres) + style + furniture.
// Walls follow the outline clockwise from the top-left corner; a rectangle's walls are
// 0 top · 1 right · 2 bottom · 3 left, and `t` runs 0→1 along each wall in that direction.
// Furniture either sits against a wall ({ wall, t }) — flush, facing into the room — or is
// placed freely ({ x, y, rot }). `w`, `d`, `color` override the catalogue size or colour.
import { uid } from "./util.js";
import { catalogItem } from "./data.js";
import { loops, polyCentroid, polyContains, wlen } from "./geom.js";

export const TEMPLATE_CATS = [["all", "All"], ["living", "Living"], ["bedroom", "Bedroom"], ["kitchen", "Kitchen & dining"], ["work", "Work"], ["kids", "Kids"], ["bath", "Bath"]];

export const TEMPLATES = [
  {
    id: "noir-bedroom", name: "Noir bedroom", cat: "bedroom", room: "bedroom", style: "noir", w: 5.2, d: 5.4, height: 2.85, premium: true,
    desc: "A low upholstered bed against a grooved head wall framed by dark walnut slats, floating nightstands under black disc pendants and a full-height wardrobe wall.",
    openings: [{ wall: 1, type: "window", t: 0.65, w: 2.6, h: 2.6, sill: 0.05 }, { wall: 2, type: "door", t: 0.12 }],
    items: [
      { id: "king", wall: 0, t: 0.5, w: 2.04, d: 2.3, color: "#8f8478" }, { id: "nightstand", wall: 0, t: 0.227, w: 0.6, d: 0.42, color: "#3a2a1f" }, { id: "nightstand", wall: 0, t: 0.773, w: 0.6, d: 0.42, color: "#3a2a1f" },
      { id: "wardrobe", wall: 3, t: 0.42, w: 2.6, d: 0.6, h: 2.8, color: "#4a3527" }, { id: "console", wall: 3, t: 0.8052, w: 1.56, d: 0.6, color: "#3a2a1f" },
      { id: "rug", x: 2.6, y: 2.0, w: 3.3, d: 3.3, color: "#d8d0c2" }, { id: "pouf", x: 1.0, y: 4.75, color: "#e9e4da" }, { id: "plant", x: 4.85, y: 0.95 }
    ]
  },
  {
    id: "obsidian-lounge", name: "Obsidian lounge", cat: "living", room: "living", style: "noir", w: 7.4, d: 6.0, height: 2.95, premium: true,
    desc: "Dark slatted walls, a warm marble slab behind a floating cream TV unit, a long low modular sofa and glass from floor to ceiling.",
    openings: [{ wall: 1, type: "window", t: 0.5, w: 5.0, h: 2.85, sill: 0.05 }, { wall: 2, type: "door", t: 0.12 }],
    items: [
      { id: "tvunit", wall: 0, t: 0.42, w: 3.2, d: 0.42, color: "#ece6dc" }, { id: "tv", wall: 0, t: 0.42, w: 1.45, color: "#111111", elev: 1.1 },
      { id: "corner", x: 3.6, y: 4.4, rot: 180, w: 4.6, d: 2.4, color: "#d9cfbf" }, { id: "coffeer", x: 3.33, y: 2.75, w: 1.5, d: 0.75, color: "#121212" },
      { id: "pouf", x: 5.18, y: 2.3, w: 1.0, d: 1.0, color: "#d9cfbf" }, { id: "rug", x: 3.5, y: 3.2, w: 4.6, d: 3.4, color: "#b9b2a6" },
      { id: "floorlamp", x: 0.7, y: 3.2, color: "#1a1a1a" }, { id: "plant", x: 0.6, y: 0.6 }
    ]
  },
  {
    id: "umber-kitchen", name: "Umber kitchen-living", cat: "kitchen", room: "kitchen", style: "noir", w: 8.0, d: 6.2, height: 3.0, premium: true,
    desc: "One open space: a dark island with a thick stone top under a linear light, tall walnut cabinets around a lit marble niche, and a sofa by the window.",
    openings: [{ wall: 1, type: "window", t: 0.5, w: 5.0, h: 2.9, sill: 0.05 }, { wall: 3, type: "door", t: 0.8 }],
    items: [
      { id: "fridge", wall: 0, t: 0.075, color: "#2e231c" }, { id: "basecab", wall: 0, t: 0.15625, color: "#2e231c" }, { id: "sinkunit", wall: 0, t: 0.24375, color: "#2e231c" },
      { id: "cooker", wall: 0, t: 0.33125, color: "#1a1a1a" }, { id: "basecab", wall: 0, t: 0.40625, color: "#2e231c" }, { id: "basecab", wall: 0, t: 0.48125, color: "#2e231c" },
      { id: "island", x: 3.04, y: 2.35, w: 3.0, d: 1.0, color: "#2a1f19" },
      { id: "stool", x: 2.24, y: 3.1 }, { id: "stool", x: 2.84, y: 3.1 }, { id: "stool", x: 3.44, y: 3.1 },
      { id: "sofa2", x: 6.26, y: 5.1, rot: 180, w: 2.6, d: 1.0, color: "#d6ccbb" }, { id: "coffeer", x: 6.24, y: 4.05, w: 1.1, d: 0.6, color: "#121212" },
      { id: "rug", x: 6.24, y: 4.4, w: 2.6, d: 2.6, color: "#b5ada0" }, { id: "plant", x: 7.5, y: 0.8 }
    ]
  },
  {
    id: "warm-living", name: "Warm living room", cat: "living", room: "living", style: "warm", w: 5.2, d: 4.0,
    desc: "A sofa facing the TV wall, a low oak table on a wool rug and a reading chair turned toward the window.",
    openings: [{ wall: 0, type: "window", t: 0.5, w: 1.6 }, { wall: 2, type: "door", t: 0.25 }],
    items: [
      { id: "sofa3", wall: 3, t: 0.5 }, { id: "art", wall: 3, t: 0.5 },
      { id: "tvunit", wall: 1, t: 0.5 }, { id: "tv", wall: 1, t: 0.5 },
      { id: "rug", x: 1.95, y: 2.0, rot: 90 }, { id: "coffee", x: 1.75, y: 2.0, rot: 90 },
      { id: "armchair", x: 3.05, y: 0.95, rot: 50 }, { id: "floorlamp", x: 0.45, y: 0.5 },
      { id: "plant", x: 4.7, y: 0.5 }, { id: "side", x: 0.5, y: 3.45 }
    ]
  },
  {
    id: "nordic-bedroom", name: "Nordic bedroom", cat: "bedroom", room: "bedroom", style: "nordic", w: 4.2, d: 3.8,
    desc: "A double bed on the quiet wall with matching bedside tables, a full-height wardrobe and a dresser by the door.",
    openings: [{ wall: 1, type: "window", t: 0.5, w: 1.4 }, { wall: 2, type: "door", t: 0.8 }],
    items: [
      { id: "double", wall: 0, t: 0.5 }, { id: "art", wall: 0, t: 0.5, elev: 1.3 },
      { id: "nightstand", wall: 0, t: 0.238 }, { id: "nightstand", wall: 0, t: 0.762 },
      { id: "wardrobe", wall: 3, t: 0.658 }, { id: "dresser", wall: 2, t: 0.286 },
      { id: "rug", x: 2.1, y: 1.75 }, { id: "floorlamp", x: 3.9, y: 3.3 }, { id: "plant", x: 3.8, y: 0.45 }
    ]
  },
  {
    id: "japandi-studio", name: "Japandi studio flat", cat: "living", room: "studio", style: "japandi", w: 6.4, d: 4.4,
    desc: "One room that does everything: a galley kitchen, a round table for two, a sofa corner and a bed by the window.",
    openings: [{ wall: 0, type: "window", t: 0.3, w: 1.6 }, { wall: 0, type: "window", t: 0.75, w: 1.2 }, { wall: 2, type: "door", t: 0.15 }],
    items: [
      { id: "fridge", wall: 3, t: (4.4 - 3.95) / 4.4 }, { id: "basecab", wall: 3, t: (4.4 - 3.295) / 4.4 },
      { id: "sinkunit", wall: 3, t: (4.4 - 2.59) / 4.4 }, { id: "basecab", wall: 3, t: (4.4 - 1.885) / 4.4 },
      { id: "cooker", wall: 3, t: (4.4 - 1.28) / 4.4 }, { id: "basecab", wall: 3, t: (4.4 - 0.675) / 4.4 },
      { id: "rdining", x: 2.2, y: 2.2 },
      { id: "dchair", x: 2.2, y: 1.5, rot: 0 }, { id: "dchair", x: 2.2, y: 2.9, rot: 180 },
      { id: "dchair", x: 1.45, y: 2.2, rot: 270 }, { id: "dchair", x: 2.95, y: 2.2, rot: 90 },
      { id: "double", wall: 1, t: 0.35 }, { id: "nightstand", wall: 1, t: 0.09 },
      { id: "sofa2", wall: 2, t: 0.45 }, { id: "rug", x: 3.6, y: 3.0 }, { id: "coffeer", x: 3.6, y: 2.95, w: 0.8, d: 0.8 },
      { id: "plant", x: 3.4, y: 0.45 }, { id: "floorlamp", x: 2.4, y: 3.95 }
    ]
  },
  {
    id: "midcentury-dining", name: "Mid-century dining room", cat: "kitchen", room: "dining", style: "midcentury", w: 4.6, d: 3.8,
    desc: "A teak table for six under the window light, a long sideboard with art above and a lamp in the corner.",
    openings: [{ wall: 0, type: "window", t: 0.5, w: 1.8 }, { wall: 3, type: "door", t: 0.2 }],
    items: [
      { id: "rug", x: 2.4, y: 1.85 }, { id: "dining6", x: 2.4, y: 1.85 },
      { id: "dchair", x: 1.75, y: 1.25, rot: 0 }, { id: "dchair", x: 2.4, y: 1.25, rot: 0 }, { id: "dchair", x: 3.05, y: 1.25, rot: 0 },
      { id: "dchair", x: 1.75, y: 2.45, rot: 180 }, { id: "dchair", x: 2.4, y: 2.45, rot: 180 }, { id: "dchair", x: 3.05, y: 2.45, rot: 180 },
      { id: "dchair", x: 1.2, y: 1.85, rot: 270 }, { id: "dchair", x: 3.6, y: 1.85, rot: 90 },
      { id: "sideboard", wall: 2, t: 0.45 }, { id: "art", wall: 2, t: 0.45, elev: 1.35 },
      { id: "plant", x: 4.15, y: 0.5 }, { id: "floorlamp", x: 4.2, y: 3.3 }
    ]
  },
  {
    id: "industrial-office", cam: "sw", name: "Industrial home office", cat: "work", room: "office", style: "industrial", w: 3.6, d: 3.2,
    desc: "A desk under the window, two bookcases for the archive and an armchair for calls away from the screen.",
    openings: [{ wall: 0, type: "window", t: 0.5, w: 1.4 }, { wall: 2, type: "door", t: 0.8 }],
    items: [
      { id: "desk", wall: 0, t: 0.5 }, { id: "ochair", x: 1.8, y: 1.15, rot: 180 },
      { id: "bookcase", wall: 1, t: 1.145 / 3.2 }, { id: "bookcase", wall: 1, t: 2.055 / 3.2 },
      { id: "armchair", x: 0.75, y: 1.7, rot: 90 }, { id: "floorlamp", x: 0.4, y: 0.95 },
      { id: "rugr", x: 1.8, y: 1.55 }, { id: "plant", x: 3.2, y: 2.85 }
    ]
  },
  {
    id: "sage-kids", cam: "sw", name: "Sage kids' room", cat: "kids", room: "kids", style: "sage", w: 3.6, d: 3.4,
    desc: "A bed tucked into the corner, a desk and bookcase on the opposite wall and a round rug left free for play.",
    openings: [{ wall: 0, type: "window", t: 0.5, w: 1.2 }, { wall: 2, type: "door", t: 0.55 }],
    items: [
      { id: "single", x: 0.57, y: 1.095 }, { id: "wallshelf", wall: 3, t: 0.68, elev: 1.35, w: 0.8 },
      { id: "desk", wall: 1, t: 0.28, w: 1.2 }, { id: "dchair", x: 2.45, y: 0.95, rot: 270 },
      { id: "bookcase", wall: 1, t: 0.8 }, { id: "rugr", x: 2.0, y: 1.95 }, { id: "pouf", x: 2.0, y: 1.95 }
    ]
  },
  {
    id: "minimal-kitchen", name: "Gallery kitchen-diner", cat: "kitchen", room: "kitchen", style: "minimal", w: 5.0, d: 3.8,
    desc: "A straight run of units with the sink under the window, an island with two stools and a round table for four.",
    openings: [{ wall: 0, type: "window", t: 0.72, w: 1.2 }, { wall: 3, type: "door", t: 0.2 }],
    items: [
      { id: "fridge", wall: 0, t: 0.425 / 5 }, { id: "basecab", wall: 0, t: 1.08 / 5 }, { id: "basecab", wall: 0, t: 1.685 / 5 },
      { id: "cooker", wall: 0, t: 2.29 / 5 }, { id: "basecab", wall: 0, t: 2.895 / 5 }, { id: "sinkunit", wall: 0, t: 3.6 / 5 },
      { id: "basecab", wall: 0, t: 4.305 / 5 },
      { id: "island", x: 2.4, y: 1.85 }, { id: "stool", x: 1.9, y: 2.55, rot: 180 }, { id: "stool", x: 2.6, y: 2.55, rot: 180 },
      { id: "rdining", x: 3.9, y: 2.85 }, { id: "dchair", x: 3.15, y: 2.85, rot: 270 }, { id: "dchair", x: 4.62, y: 2.85, rot: 90 },
      { id: "plant", x: 4.7, y: 3.45, w: 0.45, d: 0.45 }
    ]
  },
  {
    id: "mediterranean-bath", cam: "sw", name: "Mediterranean bathroom", cat: "bath", room: "bathroom", style: "mediterranean", w: 2.8, d: 2.4, height: 2.5,
    desc: "A full-length bath under a high window, the toilet and a vanity on the side wall, and a clear path from the door.",
    openings: [{ wall: 0, type: "window", t: 0.72, w: 0.8, sill: 1.35, h: 0.8 }, { wall: 2, type: "door", t: 0.75, w: 0.8 }],
    items: [
      { id: "bathtub", wall: 0, t: 0.92 / 2.8 }, { id: "toilet", wall: 1, t: 0.25 }, { id: "vanity", wall: 1, t: 0.7 },
      { id: "wallmirror", wall: 1, t: 0.7 }
    ]
  },
  {
    id: "midnight-lounge", name: "Midnight lounge", cat: "living", room: "living", style: "midnight",
    pts: [[0, 0], [6, 0], [6, 3], [3.6, 3], [3.6, 4.8], [0, 4.8]],
    desc: "An L-shaped room: a deep corner sofa and TV wall on one side, a round table and library wall in the other.",
    openings: [{ wall: 0, type: "window", t: 0.72, w: 1.8 }, { wall: 3, type: "door", t: 0.6 }],
    items: [
      { id: "corner", x: 1.43, y: 0.93 }, { id: "rug", x: 1.45, y: 2.75 }, { id: "coffee", x: 1.45, y: 2.75 },
      { id: "tvunit", wall: 4, t: 0.611 }, { id: "tv", wall: 4, t: 0.611 },
      { id: "armchair", x: 3.0, y: 2.35, rot: 90 }, { id: "floorlamp", x: 3.2, y: 0.5 },
      { id: "art", wall: 5, t: 0.5 }, { id: "bookcase", wall: 1, t: 0.5 },
      { id: "rdining", x: 4.6, y: 1.5 }, { id: "dchair", x: 3.95, y: 1.5, rot: 270 }, { id: "dchair", x: 5.15, y: 1.5, rot: 90 },
      { id: "plant", x: 5.5, y: 2.55 }
    ]
  }
];
export const templateById = id => TEMPLATES.find(t => t.id === id) || null;
export const templateImage = (id, v = "") => "img/templates/" + id + (v ? "-" + v : "") + ".jpg";

const r3 = v => Math.round(v * 1000) / 1000;

// turn a template into a Studio plan
export function buildPlan(tpl) {
  const pts = tpl.pts || [[0, 0], [tpl.w, 0], [tpl.w, tpl.d], [0, tpl.d]];
  const walls = pts.map((a, i) => ({ id: uid("w_"), a: a.slice(), b: pts[(i + 1) % pts.length].slice(), t: 0.12 }));
  const poly = loops(walls)[0] || pts;
  const inward = wl => { // unit normal pointing into the room
    const L = wlen(wl), ux = (wl.b[0] - wl.a[0]) / L, uy = (wl.b[1] - wl.a[1]) / L;
    let nx = -uy, ny = ux;
    const mid = [(wl.a[0] + wl.b[0]) / 2, (wl.a[1] + wl.b[1]) / 2];
    if (!polyContains([mid[0] + nx * 0.2, mid[1] + ny * 0.2], poly)) { nx = -nx; ny = -ny; }
    return { ux, uy, nx, ny, L };
  };
  void polyCentroid;
  const openings = (tpl.openings || []).map(o => {
    const base = o.type === "door" ? { w: 0.9, h: 2.05, sill: 0, flip: false, hinge: "l" } : o.type === "window" ? { w: 1.2, h: 1.3, sill: 0.9 } : { w: 1.0, h: 2.1, sill: 0 };
    const op = Object.assign({ id: uid("o_"), wall: walls[o.wall].id, type: o.type, t: o.t }, base, o);
    delete op.wall_; op.wall = walls[o.wall].id;
    if (o.type === "door") { // swing into the room
      const wl = walls[o.wall], n = inward(wl);
      op.flip = (n.nx * -n.uy + n.ny * n.ux) < 0; // plan draws the swing on the +normal side unless flipped
    }
    return op;
  });
  const items = (tpl.items || []).map(s => {
    const c = catalogItem(s.id);
    const it = { id: uid("i_"), type: c.id, name: c.name, shape: c.shape, x: 0, y: 0, w: s.w || c.w, d: s.d || c.d, h: s.h || c.h, rot: 0, color: s.color || c.color, elev: s.elev ?? (c.elev || 0), wall: !!c.wall, flat: !!c.flat };
    if (s.wall != null) {
      const wl = walls[s.wall], n = inward(wl);
      const along = s.t * n.L, off = wl.t / 2 + it.d / 2 + (it.wall ? 0 : 0.01);
      it.x = r3(wl.a[0] + n.ux * along + n.nx * off);
      it.y = r3(wl.a[1] + n.uy * along + n.ny * off);
      it.rot = Math.round(((Math.atan2(n.ny, n.nx) * 180 / Math.PI - 90) % 360 + 360) % 360 * 10) / 10;
    } else { it.x = s.x; it.y = s.y; it.rot = s.rot || 0; }
    return it;
  });
  return { walls, openings, items, height: tpl.height || 2.6, calibrated: true, started: true };
}
