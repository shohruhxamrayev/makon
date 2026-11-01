// Makon — real rooms you can take apart: tap a piece in the photo, see ours, put it in your own room.
// Photos: Unsplash License. Spots are percentages of the photo (x, y) → a catalogue piece.
export const ROOMS = [
  { id: "bedroom", name: "Bedroom", photo: "1616594039964-ae9021a400a0", w: 1400, h: 1400, tpl: "noir-bedroom", style: "noir",
    title: "Dark walls, soft white bed, brass light",
    spots: [[40, 62, "upbed"], [52, 26, "chandelier"], [8, 50, "tablelamp"], [8, 66, "nightstand"], [72, 73, "pouf"], [26, 36, "art"], [82, 44, "curtain"], [36, 88, "rug"]] },
  { id: "kitchen", name: "Kitchen", photo: "1771372125074-5c7c4332095f", w: 1400, h: 933, tpl: "minimal-kitchen", style: "minimal",
    title: "Oak island, glass cabinets, two dome pendants",
    spots: [[38, 42, "pendant"], [60, 42, "pendant"], [50, 76, "island"], [27, 83, "stool"], [25, 48, "vitrine"], [97, 58, "plant"], [52, 40, "hood"]] },
  { id: "dining", name: "Dining room", photo: "1616486886892-ff366aa67ba4", w: 1400, h: 1400, tpl: "midcentury-dining", style: "contemporary",
    title: "Long oak table, cage pendants, leather chairs",
    spots: [[37, 32, "piercedlantern"], [56, 30, "piercedlantern"], [45, 58, "dining6"], [33, 71, "dchair"], [87, 66, "tubchair"], [61, 37, "art"], [62, 86, "rug"]] },
  { id: "living", name: "Living room", photo: "1759722665629-29df6ee4f9a5", w: 1400, h: 1568, tpl: "warm-living", style: "warm",
    title: "Soft grey sofa in a bright white room",
    spots: [[50, 56, "sofa3"], [73, 34, "tablelamp"], [3, 47, "plant"], [14, 34, "vases"], [96, 56, "bluevase"]] },
];
export const photoSrc = (pid, w = 1400) => "https://images.unsplash.com/photo-" + pid + "?w=" + w + "&q=80&auto=format&fit=crop";

// favourites ("my board"), kept in this browser
const KEY = "makon_board";
export const board = {
  all() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } },
  has(id) { return this.all().includes(id); },
  toggle(id) { const a = this.all(), i = a.indexOf(id); if (i < 0) a.unshift(id); else a.splice(i, 1); try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, 60))); } catch (e) {} window.dispatchEvent(new CustomEvent("makon:board")); return i < 0; },
};
