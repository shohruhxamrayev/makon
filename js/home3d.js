// Makon — the live 3D room on the home page.
// One real template room tells the whole story as you scroll:
// 0 hero (turn it by dragging) → 1 plan (top view, furniture flattens to footprints) → 2 walls rise in 3D
// → 3 furniture grows into place → 4 the lamps come on.
import * as T from "../vendor/three.module.min.js";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";
import { RoundedBoxGeometry } from "../vendor/RoundedBoxGeometry.js";
import { TEMPLATES, buildPlan } from "./studio/templates.js";
import { STYLES, FLOORS } from "./studio/data.js";

const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function start({ canvas, story, labels, onStep, roomId = "warm-living" }) {
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" }); }
  catch (e) { return null; }
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = T.SRGBColorSpace;

  const scene = new T.Scene();
  const DAYBG = new T.Color("#e9e2d6"), EVEBG = new T.Color("#141820");
  scene.background = DAYBG.clone();
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const cam = new T.PerspectiveCamera(38, 1, 0.05, 200);
  const hemi = new T.HemisphereLight("#fff6ea", "#a99b86", 1.1); scene.add(hemi);
  const sun = new T.DirectionalLight("#ffe7c7", 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5;
  scene.add(sun, sun.target);
  const ground = new T.Mesh(new T.CircleGeometry(40, 64), new T.MeshStandardMaterial({ color: "#ddd4c6", roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.012; ground.receiveShadow = true; scene.add(ground);

  // ---------- materials ----------
  const cache = new Map();
  const std = (c, o = {}) => { const k = c + JSON.stringify(o); if (!cache.has(k)) cache.set(k, new T.MeshStandardMaterial({ color: c, roughness: 0.6, ...o })); return cache.get(k); };
  const fabric = c => { const k = "f" + c; if (!cache.has(k)) cache.set(k, new T.MeshPhysicalMaterial({ color: c, roughness: 0.92, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new T.Color(c).offsetHSL(0, -0.05, 0.12) })); return cache.get(k); };
  const wood = c => std(c, { roughness: 0.48 });
  const metal = (c = "#b9bcbf", r = 0.3) => std(c, { metalness: 1, roughness: r });

  function floorTex(key) {
    const f = FLOORS[key] || FLOORS.oak, S = 1024, cv = document.createElement("canvas"); cv.width = cv.height = S;
    const g = cv.getContext("2d"), base = new T.Color(f.base);
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const col = v => "#" + base.clone().multiplyScalar(1 + (rnd() - 0.5) * v / 55).getHexString();
    g.fillStyle = f.base; g.fillRect(0, 0, S, S);
    const M = S / 2;
    if (f.plank) {
      const [pw, pl] = f.plank, rows = Math.round(2 / pw);
      for (let r = 0; r < rows; r++) {
        let x = -rnd() * pl * M; const y = r * pw * M;
        while (x < S) {
          g.fillStyle = col(f.var); g.fillRect(x, y, pl * M - 2, pw * M - 2);
          for (let k = 0; k < 10; k++) { g.fillStyle = "rgba(60,35,15," + (rnd() * 0.06) + ")"; g.fillRect(x, y + rnd() * pw * M, pl * M, 1 + rnd() * 1.5); }
          x += pl * M;
        }
      }
    } else if (f.tile) {
      const n = Math.round(2 / f.tile);
      g.fillStyle = "#d9d1c3"; g.fillRect(0, 0, S, S);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = col(f.var); g.fillRect(i * f.tile * M + 2, j * f.tile * M + 2, f.tile * M - 4, f.tile * M - 4); }
    } else for (let k = 0; k < 5000; k++) { g.fillStyle = "rgba(0,0,0," + (rnd() * 0.035) + ")"; g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 7, 2 + rnd() * 7); }
    const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(0.5, 0.5); t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t;
  }
  function artTex(pal, seed) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 180; const g = cv.getContext("2d");
    let s = seed * 97 + 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    g.fillStyle = pal[4] || "#f4efe6"; g.fillRect(0, 0, 256, 180);
    for (let i = 0; i < 4; i++) { g.fillStyle = pal[i % pal.length]; g.beginPath(); g.ellipse(40 + rnd() * 180, 30 + rnd() * 120, 30 + rnd() * 60, 18 + rnd() * 40, rnd() * 3, 0, Math.PI * 2); g.fill(); }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t;
  }

  // ---------- geometry helpers (y = bottom) ----------
  const shadow = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const rbox = (w, h, d, x, y, z, m, r = 0.02) => { const g = new RoundedBoxGeometry(Math.max(w, 0.01), Math.max(h, 0.01), Math.max(d, 0.01), 3, Math.min(r, w / 2.2, h / 2.2, d / 2.2)); const me = shadow(new T.Mesh(g, m)); me.position.set(x, y + h / 2, z); return me; };
  const box = (w, h, d, x, y, z, m) => { const me = shadow(new T.Mesh(new T.BoxGeometry(w, h, d), m)); me.position.set(x, y + h / 2, z); return me; };
  const cyl = (rt, rb, h, x, y, z, m, seg = 32, open = false) => { const me = shadow(new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg, 1, open), m)); me.position.set(x, y + h / 2, z); return me; };

  let lampSpots = [], shadeMats = [];
  function buildItem(it, st) {
    const g = new T.Group(), w = it.w, d = it.d, h = it.h, c = it.color || "#cccccc", pal = st.palette || [];
    const leg = wood("#3a2f26");
    const legs4 = (hh, inset = 0.07) => { for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(cyl(0.02, 0.014, hh, a * (w / 2 - inset), 0, b * (d / 2 - inset), leg, 10)); };
    switch (it.shape) {
      case "sofa": case "armchair": {
        const F = fabric(c), arm = it.shape === "sofa" ? 0.17 : 0.15; legs4(0.1);
        g.add(rbox(w - 0.04, 0.24, d - 0.04, 0, 0.1, 0, F, 0.03), rbox(w, h - 0.1, 0.2, 0, 0.1, -d / 2 + 0.1, F, 0.06));
        for (const a of [-1, 1]) g.add(rbox(arm, 0.52, d, a * (w / 2 - arm / 2), 0.1, 0, F, 0.06));
        const n = it.shape === "armchair" ? 1 : (w > 1.9 ? 3 : 2), cw = (w - 2 * arm) / n;
        for (let i = 0; i < n; i++) {
          const x = -w / 2 + arm + cw * (i + 0.5);
          g.add(rbox(cw - 0.01, 0.15, d - 0.25, x, 0.33, 0.1, F, 0.06));
          const bc = rbox(cw - 0.03, 0.42, 0.17, x, 0.42, -d / 2 + 0.27, F, 0.07); bc.rotation.x = -0.14; g.add(bc);
        }
        if (it.shape === "sofa" && pal[3]) { const p = rbox(0.4, 0.38, 0.12, -w / 2 + arm + 0.25, 0.47, -d / 2 + 0.36, fabric(pal[3]), 0.06); p.rotation.set(-0.25, 0.25, 0); g.add(p); }
        break;
      }
      case "sectional": {
        const F = fabric(c), sd = 0.95; legs4(0.1);
        g.add(rbox(w - 0.04, 0.24, sd, 0, 0.1, -d / 2 + sd / 2, F, 0.03), rbox(sd, 0.24, d - sd, -w / 2 + sd / 2, 0.1, sd / 2, F, 0.03));
        g.add(rbox(w, h - 0.1, 0.2, 0, 0.1, -d / 2 + 0.1, F, 0.06), rbox(0.2, h - 0.1, d, -w / 2 + 0.1, 0.1, 0, F, 0.06), rbox(0.17, 0.52, sd, w / 2 - 0.085, 0.1, -d / 2 + sd / 2, F, 0.06));
        for (let i = 0; i < 3; i++) g.add(rbox((w - 0.37) / 3 - 0.01, 0.15, sd - 0.24, -w / 2 + 0.2 + (w - 0.37) / 3 * (i + 0.5), 0.33, -d / 2 + sd / 2 + 0.1, F, 0.06));
        g.add(rbox(sd - 0.24, 0.15, d - sd, -w / 2 + 0.2 + (sd - 0.24) / 2, 0.33, sd / 2, F, 0.06));
        break;
      }
      case "chair": {
        const M = it.type === "ochair" ? std("#2e2d2b") : wood(c);
        for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(box(0.03, b < 0 ? h : 0.44, 0.03, a * (w / 2 - 0.035), 0, b * (d / 2 - 0.035), M));
        g.add(rbox(w, 0.035, d, 0, 0.42, 0, M, 0.008), rbox(w - 0.05, 0.04, d - 0.08, 0, 0.455, 0.01, fabric(pal[1] || "#d9cbb5"), 0.015), rbox(w - 0.02, 0.2, 0.025, 0, h - 0.24, -d / 2 + 0.035, M, 0.008));
        break;
      }
      case "stool": g.add(cyl(w / 2, w / 2, 0.05, 0, h - 0.05, 0, wood("#8a6a4a")), cyl(0.02, 0.02, h - 0.05, 0, 0, 0, metal("#2b2b2b")), cyl(w * 0.35, w * 0.35, 0.02, 0, 0, 0, metal("#2b2b2b"))); break;
      case "pouf": { const m = cyl(w / 2, w / 2 * 0.92, h, 0, 0, 0, fabric(c), 40); m.scale.z = d / w; g.add(m); break; }
      case "table": case "desk": {
        const M = wood(c); g.add(rbox(w, 0.035, d, 0, h - 0.035, 0, M, 0.01));
        for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(cyl(0.022, 0.016, h - 0.035, a * (w / 2 - 0.07), 0, b * (d / 2 - 0.07), M, 12));
        if (it.shape === "desk") g.add(rbox(0.42, 0.16, d - 0.08, w / 2 - 0.25, h - 0.2, 0, M, 0.01));
        if (it.type === "coffee") g.add(cyl(0.055, 0.045, 0.16, w * 0.2, h, 0, std("#3f4a44", { roughness: 0.15 }), 20), rbox(0.24, 0.05, 0.17, -w * 0.18, h, 0.02, std(pal[2] || "#c4643a"), 0.005));
        break;
      }
      case "rtable": { const M = wood(c); const tp = cyl(w / 2, w / 2, 0.035, 0, h - 0.035, 0, M, 48); tp.scale.z = d / w; g.add(tp, cyl(0.045, 0.06, h - 0.035, 0, 0, 0, M, 16), cyl(w * 0.22, w * 0.25, 0.025, 0, 0, 0, M, 32)); if (it.type === "rdining") g.add(cyl(0.16, 0.1, 0.07, 0, h, 0, std("#ece6da", { roughness: 0.15 }), 32)); break; }
      case "cabinet": case "dresser": {
        const M = wood(c), base = 0.09; legs4(base, 0.05);
        g.add(rbox(w, h - base, d, 0, base, 0, M, 0.012));
        const rows = it.type === "dresser" ? 3 : it.type === "nightstand" ? 2 : 1, cols = rows > 1 ? 1 : Math.max(2, Math.round(w / 0.45));
        const fh = (h - base - 0.04) / rows, fw = (w - 0.04) / cols;
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
          g.add(box(fw - 0.01, fh - 0.01, 0.01, -w / 2 + 0.02 + fw * (j + 0.5), base + 0.02 + fh * i + 0.005, d / 2, wood(new T.Color(c).multiplyScalar(1.05).getStyle())));
          g.add(box(cols > 2 ? 0.06 : 0.12, 0.012, 0.02, -w / 2 + 0.02 + fw * (j + 0.5), base + 0.02 + fh * (i + 0.72), d / 2 + 0.012, metal("#b59a6a")));
        }
        if (it.type === "nightstand") { g.add(cyl(0.06, 0.07, 0.24, 0, h, 0.03, std(pal[3] || "#c4643a", { roughness: 0.2 }), 20)); const sh = cyl(0.11, 0.08, 0.16, 0, h + 0.25, 0.03, null, 32, true); sh.material = shadeMat(); g.add(sh); lampSpots.push([g, 0, h + 0.33, 0.03, 0.6]); }
        break;
      }
      case "shelf": {
        const M = wood(c); g.add(box(0.025, h, d, -w / 2 + 0.0125, 0, 0, M), box(0.025, h, d, w / 2 - 0.0125, 0, 0, M), box(w, h, 0.01, 0, 0, -d / 2 + 0.005, wood(new T.Color(c).multiplyScalar(0.85).getStyle())));
        let s = 9; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        const BC = ["#2f3e46", "#c4643a", "#e8e0d0", "#8a5a3a", "#3f5f2a", "#d79f2b", "#6e2f2f", "#1f2a44"];
        for (let i = 0; i <= 5; i++) {
          const y = 0.06 + (h - 0.1) * i / 5; g.add(box(w - 0.05, 0.025, d - 0.01, 0, y, 0.005, M));
          if (i < 5) { let x = -w / 2 + 0.05; while (x < w / 2 - 0.08) { const bw = 0.022 + rnd() * 0.02, bh = 0.18 + rnd() * 0.1; g.add(box(bw, bh, d * 0.75, x + bw / 2, y + 0.025, 0.02, std(BC[(rnd() * BC.length) | 0], { roughness: 0.7 }))); x += bw + 0.003 + (rnd() < 0.08 ? 0.1 : 0); } }
        }
        break;
      }
      case "wardrobe": g.add(rbox(w, h, d, 0, 0, 0, std(c, { roughness: 0.45 }), 0.012), box(0.006, h - 0.1, 0.012, 0, 0.05, d / 2, std("#00000022")), box(0.016, 0.32, 0.03, -0.05, h * 0.45, d / 2 + 0.015, metal("#2b2b2b")), box(0.016, 0.32, 0.03, 0.05, h * 0.45, d / 2 + 0.015, metal("#2b2b2b"))); break;
      case "bed": {
        legs4(0.06, 0.06);
        g.add(rbox(w, 0.3, d, 0, 0.06, 0, fabric(new T.Color(pal[1] || "#d9cbb5").lerp(new T.Color("#ffffff"), 0.35).getStyle()), 0.03));
        g.add(rbox(w + 0.04, 1.0, 0.09, 0, 0.06, -d / 2 - 0.03, fabric(new T.Color(pal[1] || "#d9cbb5").lerp(new T.Color("#ffffff"), 0.2).getStyle()), 0.04));
        g.add(rbox(w - 0.04, 0.2, d - 0.06, 0, 0.34, 0, fabric("#f4f1ea"), 0.06));
        g.add(rbox(w + 0.04, 0.08, d * 0.72, 0, 0.5, d * 0.14, fabric(new T.Color(pal[0] || "#efe4d2").lerp(new T.Color("#ffffff"), 0.4).getStyle()), 0.04));
        g.add(rbox(w + 0.06, 0.05, 0.5, 0, 0.57, d / 2 - 0.33, fabric(pal[3] || "#c4643a"), 0.02));
        const np = w > 1.2 ? 2 : 1;
        for (let i = 0; i < np; i++) { const p = rbox(Math.min(0.62, w / np - 0.1), 0.4, 0.17, np === 1 ? 0 : (i - 0.5) * w / 2, 0.52, -d / 2 + 0.2, fabric("#f6f3ee"), 0.08); p.rotation.x = 0.3; g.add(p); }
        break;
      }
      case "lamp": {
        const M = metal(st === STYLES.midnight || st === STYLES.warm ? "#b39360" : "#1f1f1f", 0.35);
        g.add(cyl(0.15, 0.15, 0.025, 0, 0, 0, M, 40), cyl(0.011, 0.011, h - 0.26, 0, 0.02, 0, M, 10));
        const sh = cyl(0.21, 0.16, 0.3, 0, h - 0.32, 0, null, 40, true); sh.material = shadeMat(); g.add(sh);
        lampSpots.push([g, 0, h - 0.18, 0, 1]);
        break;
      }
      case "plant": {
        const pot = w >= 0.45 ? 0.17 : 0.12;
        g.add(cyl(pot, pot * 0.8, pot * 2, 0, 0, 0, std("#e9e4da", { roughness: 0.25 }), 32));
        let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        const L = [std("#3f5f2a", { roughness: 0.5 }), std("#4d6f30", { roughness: 0.5 }), std("#2f4d22", { roughness: 0.5 })];
        for (let k = 0; k < 34; k++) {
          const y = pot * 2 + (h - pot * 2) * (0.3 + 0.7 * rnd()), a = rnd() * Math.PI * 2, r = (w * 0.38) * Math.sin(clamp((y - pot * 2) / (h - pot * 2) + 0.2) * Math.PI) * (0.5 + rnd() * 0.5);
          const lf = new T.Mesh(new T.SphereGeometry(1, 10, 6), L[k % 3]); lf.scale.set(0.11, 0.008, 0.055); lf.position.set(Math.cos(a) * r, y, Math.sin(a) * r); lf.rotation.set(rnd() - 0.5, a, (rnd() - 0.5) * 1.2); lf.castShadow = true; g.add(lf);
        }
        g.add(cyl(0.008, 0.006, h * 0.8, 0, pot * 1.9, 0, std("#5a4632"), 6));
        break;
      }
      case "rug": g.add(rbox(w, 0.012, d, 0, 0, 0, fabric(c), 0.004)); g.children[0].castShadow = false; break;
      case "rrug": { const m = cyl(w / 2, w / 2, 0.012, 0, 0, 0, fabric(c), 64); m.scale.z = d / w; m.castShadow = false; g.add(m); break; }
      case "art": { g.add(box(w, h, d, 0, 0, 0, wood("#b38b5d")), box(w - 0.05, h - 0.05, 0.006, 0, 0.025, d / 2, std("#f4f1ea", { roughness: 0.9 }))); const a = new T.Mesh(new T.PlaneGeometry(w - 0.2, h - 0.2), new T.MeshStandardMaterial({ map: artTex(pal, (it.x * 7 + it.y * 3) | 0), roughness: 0.85 })); a.position.set(0, h / 2, d / 2 + 0.005); g.add(a); break; }
      case "mirror": { const r = it.type === "wallmirror"; if (r) { const f = cyl(w / 2, w / 2, 0.025, 0, h / 2, 0, metal("#b59a6a"), 48); f.rotation.x = Math.PI / 2; f.position.set(0, h / 2, 0); f.scale.z = h / w; g.add(f); const m = cyl(w / 2 - 0.025, w / 2 - 0.025, 0.005, 0, 0, 0, metal("#f2f4f5", 0.03), 48); m.rotation.x = Math.PI / 2; m.position.set(0, h / 2, 0.016); m.scale.z = h / w; g.add(m); } else g.add(box(w, h, d, 0, 0, 0, wood("#b38b5d")), box(w - 0.05, h - 0.05, 0.004, 0, 0.025, d / 2, metal("#f2f4f5", 0.03))); break; }
      case "tv": g.add(rbox(w, h, d, 0, 0, 0, std("#111111", { roughness: 0.3 }), 0.01), box(w - 0.03, h - 0.03, 0.003, 0, 0.015, d / 2, std("#0b0f14", { roughness: 0.08, metalness: 0.3 }))); break;
      case "counter": case "sink": case "stove": {
        g.add(box(w - 0.01, 0.1, d - 0.06, 0, 0, -0.03, std("#2b2b2b")), rbox(w - 0.004, h - 0.14, d - 0.03, 0, 0.1, 0, std(c, { roughness: 0.4 }), 0.006));
        g.add(rbox(w + 0.01, 0.04, d + 0.02, 0, h - 0.04, 0, std(it.shape === "stove" ? "#141414" : "#e6e2db", { roughness: 0.2 }), 0.006));
        if (it.shape === "sink") g.add(box(Math.min(0.48, w * 0.6), 0.012, Math.min(0.36, d * 0.6), 0, h - 0.004, 0.01, metal("#cfd3d6", 0.25)), cyl(0.014, 0.014, 0.26, 0, h, -d / 2 + 0.12, metal("#c9cbcc", 0.15), 12));
        if (it.shape === "stove") for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cyl(0.085, 0.085, 0.003, a * w * 0.22, h, b * d * 0.2, std("#3a3a3a"), 32));
        break;
      }
      case "fridge": g.add(rbox(w, h, d, 0, 0, 0, std(c, { roughness: 0.3, metalness: 0.2 }), 0.015), box(0.022, 0.4, 0.035, -w / 2 + 0.07, h * 0.62, d / 2 + 0.02, metal("#b9bcbf"))); break;
      case "bath": g.add(rbox(w, h, d, 0, 0, 0, std("#f6f6f4", { roughness: 0.15 }), 0.04), rbox(w - 0.14, 0.02, d - 0.14, 0, h - 0.06, 0, std("#dfe6ea", { roughness: 0.1 }), 0.03)); break;
      case "shower": g.add(box(w, 0.05, d, 0, 0, 0, std("#f6f6f4", { roughness: 0.15 }))); { const gl = new T.Mesh(new T.BoxGeometry(w, h - 0.05, 0.008), new T.MeshPhysicalMaterial({ color: "#dfeaf0", transmission: 0.9, roughness: 0.05, thickness: 0.01 })); gl.position.set(0, h / 2, d / 2); g.add(gl); } break;
      case "toilet": { const b = cyl(0.17, 0.13, 0.4, 0, 0, 0.06, std("#f6f6f4", { roughness: 0.15 }), 32); b.scale.z = 1.3; g.add(b, rbox(w, 0.38, 0.17, 0, 0.4, -d / 2 + 0.085, std("#f6f6f4", { roughness: 0.15 }), 0.03)); break; }
      case "box": g.add(rbox(w, Math.max(h, 0.03), d, 0, 0, 0, wood(c), 0.005)); break;
      case "crib": g.add(rbox(w, 0.04, d, 0, 0.35, 0, std(c), 0.01), rbox(w - 0.05, 0.1, d - 0.05, 0, 0.39, 0, fabric("#f6f3ee"), 0.03)); for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(box(0.04, h, 0.04, a * (w / 2 - 0.02), 0, b * (d / 2 - 0.02), std(c))); break;
      default: g.add(rbox(w, h, d, 0, 0, 0, std(c), 0.02));
    }
    return g;
  }
  function shadeMat() { const m = new T.MeshStandardMaterial({ color: "#f1e6d2", roughness: 0.85, side: T.DoubleSide, emissive: new T.Color("#ffcf8a"), emissiveIntensity: 0, transparent: true, opacity: 0.96 }); shadeMats.push(m); return m; }

  // ---------- room ----------
  let root = null, walls = [], items = [], bb = null, center = new T.Vector3(), span = 6, lamps = [], H = 2.6;
  function build(id) {
    const tpl = TEMPLATES.find(t => t.id === id) || TEMPLATES[0], st = STYLES[tpl.style] || STYLES.warm, plan = buildPlan(tpl);
    if (root) { scene.remove(root); root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    lamps.forEach(l => scene.remove(l)); lamps = []; lampSpots = []; shadeMats = []; walls = []; items = [];
    root = new T.Group(); scene.add(root); H = plan.height || 2.6;
    const poly = tpl.pts || [[0, 0], [tpl.w, 0], [tpl.w, tpl.d], [0, tpl.d]];
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    bb = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    center.set((bb.x0 + bb.x1) / 2, 0, (bb.y0 + bb.y1) / 2); span = Math.max(4, Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0));
    // floor
    const shape = new T.Shape(poly.map(p => new T.Vector2(p[0], -p[1])));
    const fl = new T.Mesh(new T.ShapeGeometry(shape), new T.MeshStandardMaterial({ map: floorTex(st.floor), roughness: st.floor === "concrete" ? 0.5 : 0.62 }));
    fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; root.add(fl);
    // walls with openings
    const wm = new T.MeshStandardMaterial({ color: st.wall, roughness: 0.95 }), trim = std(tpl.style === "midnight" ? "#26324f" : "#f4f1ea", { roughness: 0.5 });
    const glass = new T.MeshPhysicalMaterial({ color: "#d6e8f2", transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false });
    plan.walls.forEach(w => {
      const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); if (L < 0.01) return;
      const g = new T.Group(); g.position.set(w.a[0], 0, w.a[1]); g.rotation.y = -Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]);
      const ops = plan.openings.filter(o => o.wall === w.id).map(o => ({ o, s: o.t * L - o.w / 2, e: o.t * L + o.w / 2 })).sort((a, b) => a.s - b.s);
      let cur = -w.t / 2;
      const solid = (s, e, y0, y1) => { if (e - s > 0.005 && y1 - y0 > 0.005) g.add(box(e - s, y1 - y0, w.t, (s + e) / 2, y0, 0, wm)); };
      ops.forEach(({ o, s, e }) => {
        const top = Math.min(H, (o.sill || 0) + o.h); solid(cur, s, 0, H); solid(s, e, top, H);
        if (o.type === "window") {
          solid(s, e, 0, o.sill);
          const gl = new T.Mesh(new T.PlaneGeometry(o.w, o.h), glass); gl.position.set((s + e) / 2, o.sill + o.h / 2, 0); g.add(gl);
          for (const [bw, bh, bx, by] of [[o.w, 0.05, (s + e) / 2, o.sill], [o.w, 0.05, (s + e) / 2, top - 0.05], [0.05, o.h, s + 0.025, o.sill], [0.05, o.h, e - 0.025, o.sill], [0.035, o.h, (s + e) / 2, o.sill]]) g.add(box(bw, bh, w.t + 0.02, bx, by, 0, trim));
        } else g.add(box(0.05, top, w.t + 0.03, s + 0.025, 0, 0, trim), box(0.05, top, w.t + 0.03, e - 0.025, 0, 0, trim), box(o.w, 0.05, w.t + 0.03, (s + e) / 2, top - 0.05, 0, trim));
        cur = e;
      });
      solid(cur, L + w.t / 2, 0, H);
      g.add(box(L + w.t, 0.08, w.t + 0.024, L / 2, 0, 0, trim));
      root.add(g);
      const mx = (w.a[0] + w.b[0]) / 2, mz = (w.a[1] + w.b[1]) / 2;
      let n = [-(w.b[1] - w.a[1]) / L, (w.b[0] - w.a[0]) / L];
      if ((center.x - mx) * n[0] + (center.z - mz) * n[1] > 0) n = [-n[0], -n[1]];
      walls.push({ g, c: [mx, mz], n });
    });
    // furniture — order: big floor pieces first, then smaller, then wall things (for the "grow into place" moment)
    const order = plan.items.slice().sort((a, b) => (a.flat ? -1 : 0) - (b.flat ? -1 : 0) || (b.w * b.d) - (a.w * a.d));
    order.forEach((it, i) => {
      const g = buildItem(it, st);
      const holder = new T.Group(); holder.position.set(it.x, it.elev || 0, it.y); holder.rotation.y = -(it.rot || 0) * Math.PI / 180;
      holder.add(g); root.add(holder);
      // flat footprint for the plan view
      const fp = new T.Mesh(new T.PlaneGeometry(it.w, it.d), new T.MeshBasicMaterial({ color: new T.Color(it.color || "#cccccc").lerp(new T.Color("#ffffff"), 0.25), transparent: true, opacity: 0 }));
      fp.rotation.x = -Math.PI / 2; fp.position.y = 0.015 + (it.flat ? 0 : 0.002); holder.add(fp);
      items.push({ holder, g, fp, i, n: order.length, wall: !!it.wall });
    });
    // lamps: real lights for the evening
    lampSpots.slice(0, 5).forEach(([g]) => { const l = new T.PointLight("#ffb766", 0, 6, 1.6); l.userData.g = g; scene.add(l); lamps.push(l); });
    sun.shadow.camera.left = -span; sun.shadow.camera.right = span; sun.shadow.camera.top = span; sun.shadow.camera.bottom = -span; sun.shadow.camera.far = span * 6; sun.shadow.camera.updateProjectionMatrix();
    sun.position.set(center.x - span * 0.9, span * 1.6, center.z - span * 0.5); sun.target.position.copy(center);
    labels && placeLabels(tpl);
    dirty = true;
  }
  let labelEls = [];
  function placeLabels(tpl) {
    labels.innerHTML = ""; labelEls = [];
    const poly = tpl.pts || [[0, 0], [tpl.w, 0], [tpl.w, tpl.d], [0, tpl.d]];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1.2) continue;
      const el = document.createElement("span"); el.className = "h3d-dim"; el.textContent = L.toFixed(2) + " m"; labels.append(el);
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, dx = mx - center.x, dz = mz - center.z, k = 0.35 / (Math.hypot(dx, dz) || 1);
      labelEls.push({ el, p: new T.Vector3(mx + dx * k, 0.05, mz + dz * k) });
    }
  }

  // ---------- camera choreography ----------
  let yaw = 0, yawT = 0, auto = 0, dragging = false, lastX = 0, dirty = true, progress = 0, evening = 0, eveningT = 0, forceEve = false;
  const tmp = new T.Vector3();
  function camAt(p, t) {
    const c = center, s = span * (cam.aspect < 0.8 ? 1.3 : 1), yw = yaw;
    const orbit = (r, hgt, a) => tmp.set(c.x + Math.sin(a) * r, hgt, c.z + Math.cos(a) * r).clone();
    const K = [
      { pos: orbit(s * 1.12, s * 0.9, 0.9 + auto + yw), tgt: new T.Vector3(c.x, 0.35, c.z) },               // hero
      { pos: new T.Vector3(c.x + 0.001, s * 1.62, c.z + 0.02), tgt: new T.Vector3(c.x, 0, c.z) },             // plan
      { pos: orbit(s * 1.0, s * 0.82, 0.55 + yw), tgt: new T.Vector3(c.x, 0.3, c.z) },                        // 3d
      { pos: orbit(s * 0.86, s * 0.58, 0.95 + yw), tgt: new T.Vector3(c.x, 0.45, c.z) },                     // furnish
      { pos: orbit(s * 0.74, s * 0.46, 1.35 + yw), tgt: new T.Vector3(c.x, 0.7, c.z) }                       // light
    ];
    const stops = [0, 0.24, 0.46, 0.66, 0.9];
    let k = 0; while (k < stops.length - 2 && p > stops[k + 1]) k++;
    const f = smooth(stops[k], stops[k + 1], p);
    const pos = K[k].pos.clone().lerp(K[k + 1].pos, f), tgt = K[k].tgt.clone().lerp(K[k + 1].tgt, f);
    return { pos, tgt };
  }

  let lastT = 0;
  function update(time) {
    const p = progress, dt = Math.min(0.1, Math.max(0.001, (time - (lastT || time)) / 1000 || 0.016)); lastT = time;
    if (!calm && p < 0.04 && !dragging) auto += dt * 0.05;
    yaw += (yawT - yaw) * Math.min(1, dt * 6);
    const { pos, tgt } = camAt(p, time);
    cam.position.copy(pos); cam.lookAt(tgt);
    // walls: lower for the plan, rise again for 3D
    const wallH = 1 - smooth(0.1, 0.22, p) * 0.94 + smooth(0.3, 0.42, p) * 0.94;
    const plan = smooth(0.1, 0.2, p) * (1 - smooth(0.3, 0.4, p));
    walls.forEach(w => {
      w.g.scale.y = Math.max(0.04, wallH);
      const vx = cam.position.x - w.c[0], vz = cam.position.z - w.c[1];
      w.g.visible = plan > 0.5 || vx * w.n[0] + vz * w.n[1] < 0.3;
    });
    // furniture: flattens into footprints for the plan, grows back into place when furnishing
    const flatten = smooth(0.08, 0.2, p), grow0 = 0.5, grow1 = 0.72;
    items.forEach(it => {
      const stag = grow0 + (grow1 - grow0 - 0.06) * (it.i / Math.max(1, it.n - 1));
      const gk = smooth(stag, stag + 0.06, p);
      const g = 1 - flatten + gk * flatten, s = Math.max(0.001, g);
      it.g.scale.set(1, s, 1);
      it.g.position.y = p > 0.45 ? (1 - gk) * 0.45 * flatten : 0;   // drops in from a little above
      it.g.visible = s > 0.02;
      it.fp.material.opacity = Math.max(plan * 0.95, (1 - s) * 0.75);
    });
    // light: day → evening near the end (or when the visitor flips the switch)
    eveningT = forceEve ? 1 : smooth(0.8, 0.92, p);
    evening += (eveningT - evening) * Math.min(1, dt * 2.5);
    const e = evening;
    scene.background.copy(DAYBG).lerp(EVEBG, e);
    ground.material.color.set("#ddd4c6").lerp(new T.Color("#1b1f26"), e);
    hemi.intensity = lerp(1.1, 0.16, e); sun.intensity = lerp(2.6, 0.05, e);
    scene.environmentIntensity = lerp(0.55, 0.08, e);
    renderer.toneMappingExposure = lerp(1.05, 1.25, e);
    shadeMats.forEach(m => { m.emissiveIntensity = e * 2.2; });
    lamps.forEach(l => { l.userData.g.updateWorldMatrix(true, false); const sp = lampSpots.find(x => x[0] === l.userData.g); tmp.set(sp[1], sp[2], sp[3]).applyMatrix4(l.userData.g.matrixWorld); l.position.copy(tmp); l.intensity = e * 4.5 * sp[4] * (l.userData.g.scale.y > 0.5 ? 1 : 0); });
    // plan labels
    labelEls.forEach(({ el, p: lp }) => {
      const v = lp.clone().project(cam), r = canvas.getBoundingClientRect();
      el.style.transform = `translate(${(v.x * 0.5 + 0.5) * r.width}px, ${(-v.y * 0.5 + 0.5) * r.height}px) translate(-50%, -50%)`;
      el.style.opacity = String(plan);
    });
    renderer.render(scene, cam);
  }

  // ---------- size, input, loop ----------
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    cam.fov = w / h < 0.8 ? 55 : 38; cam.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();
  canvas.addEventListener("pointerdown", e => { if (e.pointerType === "touch") return; dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.classList.add("grab"); });
  canvas.addEventListener("pointermove", e => { if (!dragging) return; yawT -= (e.clientX - lastX) * 0.006; lastX = e.clientX; });
  const stop = () => { dragging = false; canvas.classList.remove("grab"); };
  canvas.addEventListener("pointerup", stop); canvas.addEventListener("pointercancel", stop);
  // phones: a horizontal swipe turns the room, a vertical one scrolls the page
  let tx = null, ty = null, turning = false;
  canvas.addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; turning = false; }, { passive: true });
  canvas.addEventListener("touchmove", e => {
    if (tx == null) return;
    const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
    if (!turning && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3) turning = true;
    if (turning) { yawT -= dx * 0.008; tx = e.touches[0].clientX; ty = e.touches[0].clientY; e.preventDefault(); }
  }, { passive: false });
  canvas.addEventListener("touchend", () => { tx = null; });

  let visible = true, raf = 0;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) loop(); }, { threshold: 0 }).observe(canvas);
  function loop(t) { raf = 0; if (!visible || document.hidden) return; update(t || 0); raf = requestAnimationFrame(loop); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && visible && !raf) loop(); });

  function onScroll() {
    const r = story.getBoundingClientRect(), total = story.offsetHeight - innerHeight;
    progress = clamp(-r.top / Math.max(1, total));
    onStep && onStep(progress);
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  build(roomId); loop();
  return {
    setRoom(id) { build(id); },
    setEvening(on) { forceEve = !!on; },
    progress: () => progress
  };
}
