// Makon — real, photo-scanned furniture (CC0 models from Poly Haven, optimised to WebP + meshopt).
// A piece first appears as our quick procedural model; the real model streams in and replaces it,
// fitted to the piece's exact width, depth and height so plans and measurements stay true.
const BASE = new URL("../../models/ph/", import.meta.url).href;

// catalogue id → model file(s). rot: quarter turns so the front faces +z.
// parts: several models in one piece, each [file, x, z, scale].
export const REAL = {
  armchair: { f: "modern_arm_chair_01" },
  lounge: { f: "mid_century_lounge_chair" },
  tubchair: { f: "ArmChair_01" },
  classicchair: { f: "GreenChair_01" },
  pouf: { f: "Ottoman_01" },
  dchair: { f: "dining_chair_02" },
  stool: { f: "bar_chair_round_01" },
  chesterfield: { f: "sofa_02" },
  frenchsofa: { f: "Sofa_01" },
  carvedsofa: { f: "sofa_03" },
  coffee: { f: "modern_coffee_table_01", rot: 1 },
  coffeer: { f: "coffee_table_round_01" },
  marblecoffee: { f: "coffee_table_round_01" },
  carvedcoffee: { f: "CoffeeTable_01" },
  side: { f: "side_table_tall_01" },
  nesting: { f: "side_table_01" },
  rdining: { f: "round_wooden_table_01" },
  bistro: { f: "round_wooden_table_02" },
  banquet: { f: "dining_table" },
  console: { f: "ClassicConsole_01" },
  sideboard: { f: "modern_wooden_cabinet" },
  tvunit: { f: "modern_wooden_cabinet" },
  drawers: { f: "drawer_cabinet" },
  bookcase: { f: "wooden_display_shelves_01", rot: 1 },
  steelshelf: { f: "steel_frame_shelves_03" },
  nightstand: { f: "ClassicNightstand_01" },
  desk: { f: "small_wooden_table_01" },
  steeldesk: { f: "metal_office_desk" },
  pendant: { f: "modern_ceiling_lamp_01", glow: /glass|shade|bulb|lamp|light/i },
  industrialpendant: { f: "hanging_industrial_lamp", glow: /glass|bulb|light/i },
  chandelier: { f: "Chandelier_01", glow: /shade|bulb|glass|lamp/i },
  candlechandelier: { f: "Chandelier_03", glow: /bulb|candle|flame|glass/i },
  piercedlantern: { f: "lantern_chandelier_01", glow: /bulb|glass|light/i },
  sconce: { f: "industrial_wall_sconce", glow: /shade|bulb|glass/i },
  desklamp: { f: "desk_lamp_arm_01", glow: /bulb|light/i },
  plant: { f: "potted_plant_01" },
  monstera: { f: "potted_plant_02" },
  succulent: { f: "potted_plant_04" },
  vases: { parts: [["ceramic_vase_01", -0.12, 0, 1], ["antique_ceramic_vase_01", 0.02, 0.02, 1], ["ceramic_vase_02", 0.14, -0.01, 0.85]] },
  brassvase: { f: "brass_vase_01" },
  bluevase: { f: "antique_ceramic_vase_01" },
  clock: { f: "wall_clock" },
  pillows: { f: "throw_pillows_01" },
  basket: { f: "wicker_basket_01" },
};

export function createReal(T, onChange, prepare) {
  let loader = null;
  const files = new Map(), done = new Map();          // done: models already downloaded → swapped in at once, no flicker
  const getLoader = () => loader || (loader = Promise.all([import("../../vendor/GLTFLoader.js"), import("../../vendor/meshopt_decoder.module.js")]).then(([g, m]) => {
    const l = new g.GLTFLoader(); l.setMeshoptDecoder(m.MeshoptDecoder); return l;
  }));
  const load = f => {
    if (!files.has(f)) files.set(f, getLoader().then(l => l.loadAsync(BASE + f + ".glb")).then(async gl => {
      const s = gl.scene;
      s.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.geometry) o.geometry.userData.keep = true; if (o.material && o.material.map) o.material.map.userData.keep = true; } });
      // compile its shaders off the main thread before it is ever drawn: no freeze when it appears
      if (prepare) { try { await prepare(s); } catch (e) {} }
      done.set(f, s);
      return s;
    }));
    return files.get(f);
  };

  // one model, turned to face +z and resting on y = 0, centred on x/z
  function settle(src, rot = 0) {
    const m = src.clone(true), holder = new T.Group();
    m.rotation.y = rot * Math.PI / 2; holder.add(m); holder.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(holder), c = bb.getCenter(new T.Vector3());
    m.position.set(-c.x, -bb.min.y, -c.z); holder.updateMatrixWorld(true);
    return holder;
  }

  // swap the procedural children of g for the real model, fitted to it.w × it.h × it.d
  function swap(g, it, defColor, e, list, srcs) {
    const model = new T.Group();
    srcs.forEach((s, i) => { const [, x, z, k] = list[i]; const h = settle(s, e.rot || 0); h.position.set(x, 0, z); h.scale.setScalar(k); model.add(h); });
    model.updateMatrixWorld(true);
    const bb = new T.Box3().setFromObject(model), sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3());
    const fit = new T.Group(); fit.add(model); model.position.set(-c.x, -bb.min.y, -c.z);
    if (it.w > 0 && it.d > 0 && it.h > 0) {
      const k = [it.w / Math.max(sz.x, 1e-3), it.h / Math.max(sz.y, 1e-3), it.d / Math.max(sz.z, 1e-3)];
      // stretched far out of its real proportions, a scanned piece looks wrong: keep our own model, built to that size
      if (Math.max(...k) / Math.min(...k) > 1.45) return false;
      fit.scale.set(k[0], k[1], k[2]);
    }
    // a colour the person picked tints the main material; the catalogue colour leaves the scan as it is
    const tint = it.color && defColor && it.color.toLowerCase() !== defColor.toLowerCase();
    let main = null, best = 0;
    const shades = g.userData.shades || [];
    fit.traverse(o => {
      if (!o.isMesh) return;
      const glow = e.glow && e.glow.test(o.name + " " + (o.material.name || ""));
      const n = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count;
      if (n > best && !glow) { best = n; main = o; }
      if (glow && shades[0]) {
        const m = o.material.clone(); m.emissive = new T.Color("#ffcf8a"); m.emissiveMap = m.map || null; o.material = m;
        const ref = shades[0]; o.onBeforeRender = () => { m.emissiveIntensity = ref.emissiveIntensity * 0.9; };
      }
    });
    if (tint && main) { main.material = main.material.clone(); main.material.color = new T.Color(it.color).lerp(new T.Color("#ffffff"), 0.15); }
    const id = g.children[0] && g.children[0].userData.itemId;
    g.children.filter(o => !o.isLight).forEach(o => { g.remove(o); o.traverse(q => { if (q.geometry && !q.geometry.userData.keep) q.geometry.dispose(); }); });
    if (id != null) fit.traverse(o => { o.userData.itemId = id; });
    g.add(fit); g.userData.real = true;
    return true;
  }
  function attach(g, it, defColor) {
    const e = REAL[it.type];
    if (!e) return null;
    const list = e.parts || [[e.f, 0, 0, 1]];
    if (list.every(p => done.has(p[0]))) { swap(g, it, defColor, e, list, list.map(p => done.get(p[0]))); return Promise.resolve(g); }
    return Promise.all(list.map(p => load(p[0]))).then(srcs => {
      if (swap(g, it, defColor, e, list, srcs)) onChange && onChange(g);
      return g;
    }).catch(err => { console.warn("real model kept procedural:", it.type, err && err.message); return g; });
  }
  // start downloading the models a room needs before it is drawn
  const preload = types => Promise.all([...new Set(types)].map(t => REAL[t]).filter(Boolean).flatMap(e => (e.parts || [[e.f]]).map(p => load(p[0]).catch(() => null))));
  return { attach, preload, has: type => !!REAL[type], ready: type => { const e = REAL[type]; return !!e && (e.parts || [[e.f]]).every(p => done.has(p[0])); } };
}
