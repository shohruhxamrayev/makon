// Makon — Signature interiors: original photographs by the Makon founder
export const SIGNATURE = [
  {
    id: "concrete-oak-house", name: "Concrete & Oak House", style: "stone", room: "Open-plan living",
    desc: "Raw board-formed concrete wrapped in warm oak volumes. A deep cream bouclé sofa, a black-veined stone kitchen, a floating white bench and a slatted window seat at the end of the hall.",
    shots: ["Living room and kitchen", "Hall with the window seat", "The oak corridor at night"],
    palette: ["#e9e6e0", "#b9b2a6", "#c39a6b", "#3b3633", "#151413"],
    mats: [["Walls", "Board-formed concrete, white panels"], ["Volumes", "Quarter-sawn oak, floor to ceiling"], ["Floor", "Large dark stone tiles with white veins"], ["Sofa", "Cream bouclé, low and deep"], ["Kitchen", "Black-veined stone island, white handleless fronts"], ["Light", "Surface cylinders on a ceiling wire, black tube pendants"]],
    shop: [["corner", 1], ["bench", 1], ["island", 1], ["stool", 3], ["art", 2], ["rug", 1]]
  },
  {
    id: "ivory-residence", name: "Ivory Residence", style: "ivory", room: "Living & dining",
    desc: "One continuous ivory space divided by a floating TV wall with an open oak shelf. Black stone plinths, rounded bouclé armchairs, a giant halo light and a long oak dining table.",
    shots: ["The TV wall from the sofa", "Living to dining", "Bouclé armchairs under the halo"],
    palette: ["#f2efe9", "#e2dbcf", "#c9b79c", "#8a6a4a", "#1d1a18"],
    mats: [["Walls", "Ivory lacquer panels with shadow gaps"], ["Floor", "Light terrazzo-look porcelain"], ["Sofa", "Ivory modular sofa, rounded edges"], ["Tables", "Round oak coffee table, oak dining table"], ["Stone", "Black marble plinths"], ["Light", "Linear slot lights, oversized halo ceiling lamp"]],
    shop: [["corner", 1], ["armchair", 2], ["coffeer", 1], ["dining6", 1], ["dchair", 6], ["pouf", 1], ["rug", 1], ["tvunit", 1]]
  },
  {
    id: "oak-library-lounge", name: "Oak Library Lounge", style: "ivory", room: "Library & reading room",
    desc: "A wall of oak shelving lit by black track spots, two soft armchairs facing a pebble coffee table, and a quiet reading corner with a sculptural bouclé chair and plaster relief art.",
    shots: ["The library wall", "The reading corner"],
    palette: ["#f1eee8", "#ddd6ca", "#a77d55", "#6e5039", "#151515"],
    mats: [["Walls", "Warm white plaster, relief panels"], ["Shelving", "Oak veneer, open and closed bays"], ["Seating", "Cream bouclé armchairs, sculptural lounge chair"], ["Tables", "Pebble-shaped ivory table, oak drum side table"], ["Rug", "Abstract wool rug in sand and grey"], ["Light", "Black track spots, halo ceiling light, tripod floor lamp"]],
    shop: [["armchair", 2], ["lounge", 1], ["coffeer", 1], ["side", 1], ["bookcase", 3], ["floorlamp", 1], ["rug", 1], ["art", 2]]
  }
];
export const sigImg = (id, n) => "img/signature/" + id + "-" + n + ".jpg";
export const sigThumb = (id, n) => "img/signature/sm/" + id + "-" + n + ".jpg";
export const sigReel = (id, sm) => "img/signature/reels/makon-reel-" + id + (sm ? "-sm" : "") + ".mp4";
export const sigPoster = id => "img/signature/reels/makon-reel-" + id + ".jpg";
