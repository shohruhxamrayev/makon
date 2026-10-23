// Makon Studio — styles, room types and the furniture catalogue (real-world sizes in metres)

export const ROOM_TYPES = [
  ["living", "Living room"], ["bedroom", "Bedroom"], ["kitchen", "Kitchen"], ["dining", "Dining room"],
  ["office", "Home office"], ["kids", "Kids' room"], ["bathroom", "Bathroom"], ["studio", "Studio flat"], ["hallway", "Hallway"]
];
export const roomName = k => (ROOM_TYPES.find(r => r[0] === k) || ROOM_TYPES[0])[1];

export const KEEP = [
  ["window", "Window plane"], ["openings", "Doors & archways"], ["floor", "Floor"], ["ceiling", "Ceiling & lights"],
  ["walls", "Wall colour"], ["builtins", "Built-in units"], ["radiator", "Radiators"], ["layout", "Furniture layout"]
];
export const keepName = k => (KEEP.find(x => x[0] === k) || [k, k])[1];

export const LIGHT = [[0, "N"], [45, "NE"], [90, "E"], [135, "SE"], [180, "S"], [225, "SW"], [270, "W"], [315, "NW"]];
export const LIGHT_NAMES = { 0: "north", 45: "north-east", 90: "east", 135: "south-east", 180: "south", 225: "south-west", 270: "west", 315: "north-west" };

// palette: target colours for on-device colour transfer · t: tone params · wall/floor: 3D finishes
export const STYLES = {
  warm: {
    name: "Warm Oak & Linen", note: "Limewash, oak, linen", palette: ["#efe4d2", "#d9bf98", "#b98656", "#c4643a", "#f6efe3"],
    t: { lift: 4, contrast: 1.0, sat: 1.05, warm: 0.5 }, wall: "#ece2d2", floor: "oak",
    mats: [["Walls", "Warm limewash, matte"], ["Floor", "Natural oiled oak"], ["Sofa", "Washed linen, oat"], ["Tables", "Light oak, rounded edges"], ["Textiles", "Linen curtains, wool throw"], ["Accents", "Terracotta ceramics"]],
    prompt: "warm modern interior: warm white limewash walls, light natural oak, oat linen upholstery, curved bouclé sofa, rounded oak coffee table, unlined linen curtains, terracotta ceramics, soft warm daylight"
  },
  nordic: {
    name: "Nordic Light", note: "Pale ash, white, wool", palette: ["#f5f4f0", "#e2dbcf", "#c9b99c", "#9aa7a0", "#2b2f2e"],
    t: { lift: 8, contrast: 0.96, sat: 0.82, warm: -0.15 }, wall: "#f3f2ee", floor: "ash",
    mats: [["Walls", "Soft white, eggshell"], ["Floor", "Pale ash, white-oiled"], ["Sofa", "Light grey wool"], ["Tables", "Pale ash"], ["Textiles", "Chunky wool, sheepskin"], ["Accents", "Black steel lamp"]],
    prompt: "Scandinavian Nordic interior: bright soft-white walls, pale ash floor and furniture, light grey wool sofa, sheepskin, black steel floor lamp, minimal clutter, cool clean daylight"
  },
  japandi: {
    name: "Japandi Calm", note: "Washi, walnut, stone", palette: ["#ebe5da", "#cdbfa8", "#8c7660", "#4a3c30", "#a7a596"],
    t: { lift: 0, contrast: 0.94, sat: 0.78, warm: 0.2 }, wall: "#e7e0d4", floor: "walnut",
    mats: [["Walls", "Clay plaster, warm grey"], ["Floor", "Smoked oak"], ["Sofa", "Low, natural cotton"], ["Tables", "Dark walnut, low"], ["Textiles", "Washi paper lamp, linen"], ["Accents", "Stoneware, ikebana branch"]],
    prompt: "Japandi interior: low furniture, clay plaster walls, smoked oak and dark walnut, natural cotton low sofa, washi paper lantern, stoneware, a single branch arrangement, calm and uncluttered"
  },
  sage: {
    name: "Sage & Stone", note: "Green, travertine, rattan", palette: ["#e1e5d6", "#a9b896", "#7d8f6a", "#cdbb9c", "#f2efe6"],
    t: { lift: 2, contrast: 0.98, sat: 0.9, warm: 0.05 }, wall: "#cfd8c3", floor: "oak",
    mats: [["Walls", "Sage clay paint"], ["Floor", "Natural oak"], ["Sofa", "Cotton bouclé, stone"], ["Tables", "Travertine top"], ["Textiles", "Cotton, jute rug"], ["Accents", "Rattan & plants"]],
    prompt: "sage green interior: muted sage green clay walls, travertine coffee table, stone bouclé sofa, rattan accents, jute rug, many green plants, natural daylight"
  },
  midnight: {
    name: "Midnight Velvet", note: "Ink blue, brass, walnut", palette: ["#1f2a44", "#34456b", "#b08d57", "#5a3e2b", "#d9cbb0"],
    t: { lift: -14, contrast: 1.12, sat: 1.12, warm: 0.1 }, wall: "#2a3756", floor: "walnut",
    mats: [["Walls", "Ink blue, flat matt"], ["Floor", "Dark walnut herringbone"], ["Sofa", "Deep blue velvet"], ["Tables", "Dark walnut, brass trim"], ["Textiles", "Velvet, heavy drapes"], ["Accents", "Brushed brass lighting"]],
    prompt: "moody luxurious interior: ink blue walls, deep blue velvet sofa, dark walnut furniture, brushed brass lamps, heavy drapes, warm evening lamp light"
  },
  industrial: {
    name: "Industrial Loft", note: "Concrete, steel, leather", palette: ["#9a9993", "#5d5c58", "#2e2d2b", "#8a5a3a", "#d6d1c7"],
    t: { lift: -4, contrast: 1.1, sat: 0.8, warm: 0.0 }, wall: "#b8b5ae", floor: "concrete",
    mats: [["Walls", "Microcement, grey"], ["Floor", "Polished concrete"], ["Sofa", "Cognac leather"], ["Tables", "Black steel & reclaimed wood"], ["Textiles", "Wool, canvas"], ["Accents", "Exposed bulbs, metal shelving"]],
    prompt: "industrial loft interior: microcement walls, polished concrete floor, cognac leather sofa, black steel and reclaimed wood furniture, exposed filament bulbs, metal shelving"
  },
  boho: {
    name: "Boho Terracotta", note: "Rust, rattan, pattern", palette: ["#e8d3bb", "#c9805a", "#9c4f30", "#d8b26e", "#6b7a4e"],
    t: { lift: 2, contrast: 1.02, sat: 1.18, warm: 0.55 }, wall: "#e6cdb3", floor: "terracotta",
    mats: [["Walls", "Warm sand plaster"], ["Floor", "Terracotta tile"], ["Sofa", "Rust cotton, low"], ["Tables", "Rattan & mango wood"], ["Textiles", "Kilim rug, macramé"], ["Accents", "Plants, woven baskets"]],
    prompt: "bohemian interior: warm sand walls, rust and terracotta textiles, rattan furniture, patterned kilim rug, macramé, trailing plants, woven baskets, golden light"
  },
  mediterranean: {
    name: "Mediterranean Lime", note: "Whitewash, blue, olive", palette: ["#f4f0e8", "#e3d6bf", "#3f6c8f", "#8c8f5a", "#c99a6b"],
    t: { lift: 10, contrast: 1.02, sat: 1.0, warm: 0.15 }, wall: "#f4efe5", floor: "tile",
    mats: [["Walls", "Lime whitewash"], ["Floor", "Handmade cotto tile"], ["Sofa", "White cotton slipcover"], ["Tables", "Olive wood, stone"], ["Textiles", "Striped linen"], ["Accents", "Blue ceramics, olive tree"]],
    prompt: "Mediterranean interior: whitewashed lime walls, handmade tile floor, white slipcover sofa, olive wood table, blue and white ceramics, striped linen, olive tree in a pot, bright sun"
  },
  midcentury: {
    name: "Mid-Century", note: "Teak, mustard, walnut", palette: ["#efe6d6", "#c9a063", "#8a5a33", "#d79f2b", "#2f5a5a"],
    t: { lift: 0, contrast: 1.04, sat: 1.12, warm: 0.35 }, wall: "#ede4d3", floor: "teak",
    mats: [["Walls", "Warm white"], ["Floor", "Teak parquet"], ["Sofa", "Mustard wool, tapered legs"], ["Tables", "Teak, oval"], ["Textiles", "Geometric rug"], ["Accents", "Teal ceramics, arc lamp"]],
    prompt: "mid-century modern interior: teak furniture with tapered legs, mustard wool sofa, oval teak coffee table, geometric rug, arc floor lamp, teal accents"
  },
  minimal: {
    name: "Gallery Minimal", note: "White, black, oak", palette: ["#f7f7f5", "#e4e2dd", "#bdb8ae", "#1c1c1c", "#c8a77a"],
    t: { lift: 12, contrast: 1.06, sat: 0.7, warm: -0.05 }, wall: "#f6f6f3", floor: "ash",
    mats: [["Walls", "Gallery white"], ["Floor", "Wide white-oak boards"], ["Sofa", "Off-white, block form"], ["Tables", "Black stone"], ["Textiles", "None — bare and calm"], ["Accents", "One large artwork"]],
    prompt: "minimalist gallery interior: pure white walls, wide white oak floor, block off-white sofa, black stone table, a single large artwork, nothing else, crisp daylight"
  }
};

export const FLOORS = {
  oak: { name: "Natural oak", base: "#c49a6c", var: 18, plank: [0.18, 1.2] },
  ash: { name: "Pale ash", base: "#ddc9a8", var: 12, plank: [0.2, 1.4] },
  walnut: { name: "Walnut", base: "#6b4a33", var: 14, plank: [0.14, 1.0] },
  teak: { name: "Teak parquet", base: "#9a6a3e", var: 16, plank: [0.1, 0.5] },
  concrete: { name: "Polished concrete", base: "#a19e97", var: 6, plank: null },
  tile: { name: "Cotto tile", base: "#d8b994", var: 10, tile: 0.4 },
  terracotta: { name: "Terracotta tile", base: "#b8673f", var: 14, tile: 0.3 },
  stone: { name: "Light stone", base: "#d9d3c7", var: 6, tile: 0.6 }
};

// shape: 3D recipe · cat: catalogue group · wall: mounted on a wall (doesn't block floor) · flat: floor-level, can sit under things
export const CATALOG = [
  { id: "sofa3", name: "Three-seat sofa", cat: "Seating", w: 2.2, d: 0.95, h: 0.85, shape: "sofa", color: "#d9cbb5", q: "three seat sofa" },
  { id: "sofa2", name: "Two-seat sofa", cat: "Seating", w: 1.7, d: 0.9, h: 0.85, shape: "sofa", color: "#d9cbb5", q: "two seat sofa loveseat" },
  { id: "corner", name: "Corner sofa", cat: "Seating", w: 2.7, d: 1.7, h: 0.85, shape: "sectional", color: "#cfc4b2", q: "corner sectional sofa" },
  { id: "armchair", name: "Armchair", cat: "Seating", w: 0.85, d: 0.85, h: 0.8, shape: "armchair", color: "#b98656", q: "armchair" },
  { id: "lounge", name: "Lounge chair", cat: "Seating", w: 0.75, d: 0.82, h: 0.78, shape: "armchair", color: "#8a5a3a", q: "lounge chair" },
  { id: "dchair", name: "Dining chair", cat: "Seating", w: 0.46, d: 0.52, h: 0.85, shape: "chair", color: "#a57a50", q: "dining chair" },
  { id: "stool", name: "Bar stool", cat: "Seating", w: 0.4, d: 0.4, h: 0.75, shape: "stool", color: "#3a3a38", q: "bar stool" },
  { id: "bench", name: "Bench", cat: "Seating", w: 1.2, d: 0.38, h: 0.45, shape: "table", color: "#b38b5d", q: "wooden bench" },
  { id: "pouf", name: "Pouf / ottoman", cat: "Seating", w: 0.55, d: 0.55, h: 0.42, shape: "pouf", color: "#c9805a", q: "pouf ottoman" },

  { id: "coffee", name: "Coffee table", cat: "Tables", w: 1.1, d: 0.6, h: 0.4, shape: "table", color: "#b38b5d", q: "coffee table" },
  { id: "coffeer", name: "Round coffee table", cat: "Tables", w: 0.9, d: 0.9, h: 0.38, shape: "rtable", color: "#c4a074", q: "round coffee table" },
  { id: "side", name: "Side table", cat: "Tables", w: 0.45, d: 0.45, h: 0.55, shape: "rtable", color: "#8a6a4a", q: "side table" },
  { id: "dining4", name: "Dining table (4)", cat: "Tables", w: 1.4, d: 0.85, h: 0.75, shape: "table", color: "#a57a50", q: "dining table 4 seater" },
  { id: "dining6", name: "Dining table (6)", cat: "Tables", w: 1.9, d: 0.95, h: 0.75, shape: "table", color: "#a57a50", q: "dining table 6 seater" },
  { id: "rdining", name: "Round dining table", cat: "Tables", w: 1.1, d: 1.1, h: 0.75, shape: "rtable", color: "#b38b5d", q: "round dining table" },
  { id: "console", name: "Console table", cat: "Tables", w: 1.2, d: 0.35, h: 0.8, shape: "table", color: "#6b4a33", q: "console table" },
  { id: "desk", name: "Desk", cat: "Tables", w: 1.4, d: 0.7, h: 0.75, shape: "desk", color: "#c4a074", q: "desk" },

  { id: "sideboard", name: "Sideboard", cat: "Storage", w: 1.8, d: 0.45, h: 0.75, shape: "cabinet", color: "#6b4a33", q: "sideboard" },
  { id: "tvunit", name: "TV unit", cat: "Storage", w: 1.8, d: 0.4, h: 0.5, shape: "cabinet", color: "#8a6a4a", q: "tv stand media unit" },
  { id: "bookcase", name: "Bookcase", cat: "Storage", w: 0.9, d: 0.35, h: 1.9, shape: "shelf", color: "#c4a074", q: "bookcase" },
  { id: "wardrobe", name: "Wardrobe", cat: "Storage", w: 1.5, d: 0.6, h: 2.1, shape: "wardrobe", color: "#e8e2d6", q: "wardrobe" },
  { id: "dresser", name: "Chest of drawers", cat: "Storage", w: 1.0, d: 0.5, h: 0.85, shape: "cabinet", color: "#c4a074", q: "chest of drawers dresser" },
  { id: "wallshelf", name: "Wall shelf", cat: "Storage", w: 1.0, d: 0.25, h: 0.04, shape: "box", color: "#b38b5d", elev: 1.5, wall: true, q: "floating wall shelf" },

  { id: "double", name: "Double bed", cat: "Beds", w: 1.6, d: 2.1, h: 0.5, shape: "bed", color: "#e8e2d6", q: "double bed frame" },
  { id: "king", name: "King bed", cat: "Beds", w: 1.9, d: 2.15, h: 0.5, shape: "bed", color: "#e8e2d6", q: "king size bed frame" },
  { id: "single", name: "Single bed", cat: "Beds", w: 1.0, d: 2.05, h: 0.45, shape: "bed", color: "#e8e2d6", q: "single bed" },
  { id: "nightstand", name: "Bedside table", cat: "Beds", w: 0.5, d: 0.4, h: 0.55, shape: "cabinet", color: "#b38b5d", q: "bedside table nightstand" },
  { id: "crib", name: "Cot / crib", cat: "Beds", w: 0.75, d: 1.3, h: 0.95, shape: "crib", color: "#f0ece4", q: "baby cot crib" },

  { id: "floorlamp", name: "Floor lamp", cat: "Lighting", w: 0.4, d: 0.4, h: 1.6, shape: "lamp", color: "#efe4d2", q: "floor lamp" },
  { id: "arclamp", name: "Arc lamp", cat: "Lighting", w: 0.4, d: 0.4, h: 2.0, shape: "lamp", color: "#2b2b2b", q: "arc floor lamp" },

  { id: "rug", name: "Rug 240×170", cat: "Decor", w: 2.4, d: 1.7, h: 0.01, shape: "rug", color: "#d8c8ad", flat: true, q: "area rug 240x170" },
  { id: "rugr", name: "Round rug Ø160", cat: "Decor", w: 1.6, d: 1.6, h: 0.01, shape: "rrug", color: "#cdbb9c", flat: true, q: "round rug 160" },
  { id: "plant", name: "Large plant", cat: "Decor", w: 0.5, d: 0.5, h: 1.4, shape: "plant", color: "#6b7a4e", q: "large indoor plant" },
  { id: "art", name: "Framed art", cat: "Decor", w: 1.0, d: 0.04, h: 0.7, shape: "art", color: "#d9cbb0", elev: 1.25, wall: true, q: "framed wall art" },
  { id: "wallmirror", name: "Wall mirror", cat: "Decor", w: 0.6, d: 0.03, h: 0.8, shape: "mirror", color: "#c9d3d8", elev: 1.05, wall: true, q: "round wall mirror" },
  { id: "mirror", name: "Floor mirror", cat: "Decor", w: 0.6, d: 0.05, h: 1.7, shape: "mirror", color: "#c9d3d8", q: "floor standing mirror" },
  { id: "tv", name: "TV 55″", cat: "Decor", w: 1.23, d: 0.06, h: 0.71, shape: "tv", color: "#111111", elev: 0.75, wall: true, q: "55 inch tv" },

  { id: "basecab", name: "Kitchen base unit", cat: "Kitchen", w: 0.6, d: 0.6, h: 0.9, shape: "counter", color: "#e8e2d6", q: "kitchen base cabinet" },
  { id: "island", name: "Kitchen island", cat: "Kitchen", w: 1.8, d: 0.9, h: 0.9, shape: "counter", color: "#e8e2d6", q: "kitchen island" },
  { id: "sinkunit", name: "Sink unit", cat: "Kitchen", w: 0.8, d: 0.6, h: 0.9, shape: "sink", color: "#e8e2d6", q: "kitchen sink unit" },
  { id: "cooker", name: "Cooker", cat: "Kitchen", w: 0.6, d: 0.6, h: 0.9, shape: "stove", color: "#d6d6d2", q: "freestanding cooker" },
  { id: "fridge", name: "Fridge freezer", cat: "Kitchen", w: 0.7, d: 0.7, h: 1.85, shape: "fridge", color: "#e4e4e0", q: "fridge freezer" },

  { id: "bathtub", name: "Bathtub", cat: "Bath", w: 1.7, d: 0.75, h: 0.55, shape: "bath", color: "#f6f6f4", q: "bathtub 170" },
  { id: "shower", name: "Shower 90×90", cat: "Bath", w: 0.9, d: 0.9, h: 2.0, shape: "shower", color: "#f6f6f4", q: "shower enclosure 90x90" },
  { id: "toilet", name: "Toilet", cat: "Bath", w: 0.38, d: 0.68, h: 0.78, shape: "toilet", color: "#f6f6f4", q: "toilet" },
  { id: "vanity", name: "Vanity basin", cat: "Bath", w: 0.8, d: 0.48, h: 0.85, shape: "sink", color: "#e8e2d6", q: "bathroom vanity unit" },

  { id: "ochair", name: "Office chair", cat: "Office", w: 0.65, d: 0.65, h: 1.0, shape: "chair", color: "#2e2d2b", q: "ergonomic office chair" }
];
export const CATS = ["All", ...new Set(CATALOG.map(c => c.cat))];
export const catalogItem = id => CATALOG.find(c => c.id === id);

// which item types are "large" for walkway checks
export const LARGE = new Set(["sofa", "sectional", "bed", "wardrobe", "cabinet", "shelf", "table", "desk", "counter", "fridge", "bath", "sink", "stove"]);

export const SHOPS = [
  ["Google Shopping", q => "https://www.google.com/search?tbm=shop&q=" + encodeURIComponent(q)],
  ["IKEA", q => "https://www.ikea.com/search/?q=" + encodeURIComponent(q)],
  ["Amazon", q => "https://www.amazon.com/s?k=" + encodeURIComponent(q)],
  ["Pinterest ideas", q => "https://www.pinterest.com/search/pins/?q=" + encodeURIComponent(q)]
];

export const CURRENCIES = ["USD", "EUR", "GBP", "UZS", "RUB", "KZT", "TRY", "AED", "INR", "CAD", "AUD", "JPY"];
