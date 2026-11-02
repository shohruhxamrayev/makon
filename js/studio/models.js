// Makon — one furniture library for every 3D view (Studio, home page, catalogue pictures).
// Real-size pieces with rounded upholstery, wood, metal and fabric materials. y = 0 is the floor.
// Lamps report where their light sits (g.userData.lamps) and their shades (g.userData.shades) so a view can switch them on.
import { createReal } from "./real.js";
import { CATALOG } from "./data.js";
const DEF_COLOR = Object.fromEntries(CATALOG.map(c => [c.id, c.color]));
// real: swap in photo-scanned models where we have them; onChange(g) fires when one arrives (re-render then)
// lite: phones and slow computers — plain materials (fewer shaders to compile), no streamed scans
export function createKit(T, RoundedBoxGeometry, { anisotropy = 8, real = true, onChange = null, prepare = null, lite = false } = {}) {
  const realKit = real ? createReal(T, onChange, prepare) : null;
  const cache = new Map();
  const std = (c, o = {}) => { const k = "s" + c + JSON.stringify(o); if (!cache.has(k)) cache.set(k, new T.MeshStandardMaterial({ color: c, roughness: 0.6, ...o })); return cache.get(k); };
  const fabric = c => { const k = "f" + c; if (!cache.has(k)) cache.set(k, lite ? new T.MeshStandardMaterial({ color: c, roughness: 0.9 }) : new T.MeshPhysicalMaterial({ color: c, roughness: 0.92, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new T.Color(c).offsetHSL(0, -0.05, 0.12) })); return cache.get(k); };
  const wood = c => std(c, { roughness: 0.46 });
  const metal = (c = "#b9bcbf", r = 0.3) => std(c, { metalness: 1, roughness: r });
  const glassy = () => std("#dfe7eb", { metalness: 0.35, roughness: 0.06, envMapIntensity: 1.6 });
  const tone = (c, k) => "#" + new T.Color(c).multiplyScalar(k).getHexString();
  const mix = (a, b, k) => "#" + new T.Color(a).lerp(new T.Color(b), k).getHexString();
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // ---------- textures ----------
  const floorCache = new Map();
  function floorTex(FLOORS, key, S = 1024) {
    const ck = key + "|" + S; if (floorCache.has(ck)) return floorCache.get(ck);
    const f = FLOORS[key] || FLOORS.oak, cv = document.createElement("canvas"); cv.width = cv.height = S;
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
          for (let k = 0; k < 12; k++) { g.fillStyle = "rgba(60,35,15," + (rnd() * 0.06) + ")"; g.fillRect(x, y + rnd() * pw * M, pl * M, 1 + rnd() * 1.5); }
          x += pl * M;
        }
      }
    } else if (f.tile) {
      const n = Math.round(2 / f.tile);
      g.fillStyle = "#d9d1c3"; g.fillRect(0, 0, S, S);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = col(f.var); g.fillRect(i * f.tile * M + 2, j * f.tile * M + 2, f.tile * M - 4, f.tile * M - 4); }
    } else for (let k = 0; k < 5000; k++) { g.fillStyle = "rgba(0,0,0," + (rnd() * 0.035) + ")"; g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 7, 2 + rnd() * 7); }
    const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(0.5, 0.5); t.colorSpace = T.SRGBColorSpace; t.anisotropy = anisotropy; t.userData.keep = true;
    floorCache.set(ck, t); return t;
  }
  const artCache = new Map();
  function artTex(pal, seed) {
    const k = pal.join() + seed; if (artCache.has(k)) return artCache.get(k);
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 180; const g = cv.getContext("2d");
    let s = seed * 97 + 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    g.fillStyle = pal[4] || "#f4efe6"; g.fillRect(0, 0, 256, 180);
    for (let i = 0; i < 4; i++) { g.fillStyle = pal[i % pal.length] || "#c4643a"; g.beginPath(); g.ellipse(40 + rnd() * 180, 30 + rnd() * 120, 30 + rnd() * 60, 18 + rnd() * 40, rnd() * 3, 0, Math.PI * 2); g.fill(); }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.userData.keep = true; artCache.set(k, t); return t;
  }

  // hand-drawn craft patterns: suzani medallions, adras ikat, Rishtan glaze, carved relief
  const patCache = new Map();
  function patternTex(kind, col = "#a23b2a") {
    const key = kind + col; if (patCache.has(key)) return patCache.get(key);
    const S = 512, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d");
    let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    if (kind === "suzani") {
      g.fillStyle = "#efe4cf"; g.fillRect(0, 0, S, S);
      const med = (x, y, r, c1, c2) => {
        g.fillStyle = c1; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = c2; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * r * .72, y + Math.sin(a) * r * .72, r * .2, r * .09, a, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#efe4cf"; g.beginPath(); g.arc(x, y, r * .42, 0, Math.PI * 2); g.fill();
        g.fillStyle = c1; g.beginPath(); g.arc(x, y, r * .26, 0, Math.PI * 2); g.fill();
      };
      [[128, 128], [384, 128], [128, 384], [384, 384]].forEach(([x, y]) => med(x, y, 92, col, "#2f5a3a"));
      med(256, 256, 70, "#d8892f", col);
      g.strokeStyle = "#2f5a3a"; g.lineWidth = 6; for (let i = 0; i < 40; i++) { const x = rnd() * S, y = rnd() * S; g.beginPath(); g.arc(x, y, 6 + rnd() * 6, 0, Math.PI); g.stroke(); }
      g.strokeStyle = col; g.lineWidth = 14; g.strokeRect(10, 10, S - 20, S - 20);
    } else if (kind === "ikat") {
      const cols = [col, "#f2d36b", "#1f4f7a", "#efe4cf", "#7a2a4a"];
      for (let x = 0; x < S; x += 64) for (let y = 0; y < S; y += 4) {
        const k = Math.floor(x / 64) % cols.length, wob = Math.sin(y / 30 + x) * 10 + (rnd() - .5) * 6;
        g.fillStyle = cols[k]; g.fillRect(x + wob, y, 64, 4);
        const dia = Math.abs(((y + x) % 128) - 64) / 64; g.fillStyle = cols[(k + 2) % cols.length]; g.fillRect(x + 16 + wob + dia * 16, y, 32 - dia * 32, 4);
      }
    } else if (kind === "gilam") {
      // a medallion carpet: deep red field, navy border, ivory guard stripes
      g.fillStyle = col; g.fillRect(0, 0, S, S);
      g.fillStyle = "#1f2a4a"; g.fillRect(0, 0, S, 46); g.fillRect(0, S - 46, S, 46); g.fillRect(0, 0, 46, S); g.fillRect(S - 46, 0, 46, S);
      g.strokeStyle = "#efe2c4"; g.lineWidth = 5; g.strokeRect(52, 52, S - 104, S - 104); g.strokeRect(23, 23, S - 46, S - 46);
      g.fillStyle = "#e0b45a"; for (let i = 0; i < 24; i++) { g.save(); g.translate(23 + i * (S - 46) / 23, 23); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore(); g.save(); g.translate(23 + i * (S - 46) / 23, S - 23); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore(); }
      const c = S / 2; g.fillStyle = "#1f2a4a"; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, r = k % 2 ? 90 : 140; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } g.closePath(); g.fill();
      g.fillStyle = "#efe2c4"; g.beginPath(); g.arc(c, c, 48, 0, Math.PI * 2); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(c, c, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e0b45a"; for (let i = 0; i < 70; i++) { const x = 70 + rnd() * (S - 140), y = 70 + rnd() * (S - 140); if (Math.hypot(x - c, y - c) > 150) { g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); } }
    } else if (kind === "rishtan") {
      g.fillStyle = "#f3efe6"; g.fillRect(0, 0, S, S);
      const c = S / 2; const ring = (r, w, cc) => { g.strokeStyle = cc; g.lineWidth = w; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); };
      ring(240, 20, "#1f4f7a"); ring(200, 10, "#2aa3b8");
      g.fillStyle = "#1f6f8b"; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; g.beginPath(); g.ellipse(c + Math.cos(a) * 140, c + Math.sin(a) * 140, 46, 16, a, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#2aa3b8"; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + .2; g.beginPath(); g.ellipse(c + Math.cos(a) * 70, c + Math.sin(a) * 70, 34, 12, a, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#1f4f7a"; g.beginPath(); g.arc(c, c, 36, 0, Math.PI * 2); g.fill();
    }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = anisotropy; t.userData.keep = true; patCache.set(key, t); return t;
  }
  const patMat = (kind, col, o = {}) => { const k = "p" + kind + col; if (!cache.has(k)) cache.set(k, new T.MeshStandardMaterial({ map: patternTex(kind, col), roughness: 0.85, ...o })); return cache.get(k); };

  // ---------- geometry helpers (y = bottom) ----------
  const geo = new Map();
  const shadow = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const rbox = (w, h, d, x, y, z, m, r = 0.02) => {
    w = Math.max(w, 0.01); h = Math.max(h, 0.01); d = Math.max(d, 0.01); r = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
    const k = "r" + [w, h, d, r].map(v => v.toFixed(3)).join(); if (!geo.has(k)) { const gg = new RoundedBoxGeometry(w, h, d, 3, r); gg.userData.keep = true; geo.set(k, gg); }
    const me = shadow(new T.Mesh(geo.get(k), m)); me.position.set(x, y + h / 2, z); return me;
  };
  const box = (w, h, d, x, y, z, m) => { const me = shadow(new T.Mesh(new T.BoxGeometry(Math.max(w, 0.001), Math.max(h, 0.001), Math.max(d, 0.001)), m)); me.position.set(x, y + h / 2, z); return me; };
  const cyl = (rt, rb, h, x, y, z, m, seg = 32, open = false) => { const me = shadow(new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg, 1, open), m)); me.position.set(x, y + h / 2, z); return me; };
  const shadeMat = (c = "#f1e6d2") => new T.MeshStandardMaterial({ color: c, roughness: 0.85, side: T.DoubleSide, emissive: new T.Color("#ffcf8a"), emissiveIntensity: 0, transparent: true, opacity: 0.96 });


  // rounded-rectangle outline (x, y offset in shape space) and an open-topped vessel: tubs, basins, sink bowls
  const rrShape = (w, d, r, ox = 0, oy = 0) => { const s = new T.Shape(), x = ox - w / 2, y = oy - d / 2; r = Math.min(r, w / 2 - 1e-3, d / 2 - 1e-3);
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
  const vessel = (w, d, h, wall, r, m) => {
    const gg = new T.Group(), s = rrShape(w, d, r); s.holes.push(rrShape(w - 2 * wall, d - 2 * wall, Math.max(0.005, r - wall)));
    const geo = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: Math.min(0.01, wall * 0.4), bevelSize: Math.min(0.008, wall * 0.35), bevelSegments: 3, curveSegments: 18 }); geo.rotateX(-Math.PI / 2);
    gg.add(shadow(new T.Mesh(geo, m)), rbox(w - 2 * wall + 0.01, 0.02, d - 2 * wall + 0.01, 0, 0, 0, m, Math.max(0.004, r * 0.5))); return gg; };
  let scrT = null;
  const screenTex = () => { if (scrT) return scrT; const cv = document.createElement("canvas"); cv.width = 512; cv.height = 288; const x = cv.getContext("2d");
    const gr = x.createLinearGradient(0, 0, 512, 288); gr.addColorStop(0, "#0b1622"); gr.addColorStop(0.55, "#16314a"); gr.addColorStop(1, "#0a0f15"); x.fillStyle = gr; x.fillRect(0, 0, 512, 288);
    const rg = x.createRadialGradient(360, 120, 10, 360, 120, 220); rg.addColorStop(0, "rgba(255,190,120,.55)"); rg.addColorStop(1, "rgba(255,190,120,0)"); x.fillStyle = rg; x.fillRect(0, 0, 512, 288);
    x.fillStyle = "rgba(10,14,18,.85)"; x.beginPath(); x.moveTo(0, 230); for (let i = 0; i <= 512; i += 16) x.lineTo(i, 205 + Math.sin(i / 37) * 14 + Math.sin(i / 11) * 4); x.lineTo(512, 288); x.lineTo(0, 288); x.fill();
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.userData.keep = true; return (scrT = t); };
  // ---------- pieces ----------
  function buildItem(it, st = {}) {
    const g = new T.Group(), w = it.w, d = it.d, h = it.h, c = it.color || "#cccccc", pal = st.palette || [], type = it.type || it.id || "";
    const lamps = [], shades = [];
    g.userData.lamps = lamps; g.userData.shades = shades;
    const dark = wood("#3a2f26");
    const legs4 = (hh, inset = 0.07, m = dark, r = 0.02) => { for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(cyl(r, r * 0.7, hh, a * (w / 2 - inset), 0, b * (d / 2 - inset), m, 12)); };
    const lampShade = (rt, rb, hh, x, y, z, col) => { const m = shadeMat(col); shades.push(m); const s = cyl(rt, rb, hh, x, y, z, m, 40, true); g.add(s); return s; };
    switch (it.shape) {
      case "sofa": case "armchair": {
        const F = fabric(c), low = type === "lounge" || type === "accent", arm = it.shape === "sofa" ? 0.17 : low ? 0.09 : type === "recliner" ? 0.2 : 0.15, legH = low ? 0.16 : type === "recliner" ? 0.04 : 0.1;
        legs4(legH, 0.08, low ? wood("#6b4a33") : dark, low ? 0.022 : 0.02);
        g.add(rbox(w - 0.03, 0.2, d - 0.03, 0, legH, 0, F, 0.04));                                   // base
        g.add(rbox(w, h - legH, 0.2, 0, legH, -d / 2 + 0.1, F, 0.07));                                 // back frame
        for (const a of [-1, 1]) g.add(rbox(arm, (low ? 0.36 : 0.44), d - 0.02, a * (w / 2 - arm / 2), legH, 0.01, F, arm * 0.45));
        const n = it.shape === "armchair" ? 1 : (w > 1.9 ? 3 : 2), cw = (w - 2 * arm) / n, seatY = legH + 0.2;
        for (let i = 0; i < n; i++) {
          const x = -w / 2 + arm + cw * (i + 0.5);
          g.add(rbox(cw - 0.012, 0.15, d - 0.26, x, seatY, 0.1, F, 0.06));                              // seat cushion
          const bc = rbox(cw - 0.03, Math.max(0.3, h - seatY - 0.06), 0.17, x, seatY + 0.05, -d / 2 + 0.27, F, 0.075); bc.rotation.x = -0.13; g.add(bc);
        }
        if (it.shape === "sofa") {                                                                     // two throw pillows
          const pc = [pal[3] || "#c4643a", pal[1] || "#e7dcc8"];
          [[-1, 0], [1, 1]].forEach(([s, k]) => { const p = rbox(0.42, 0.4, 0.12, s * (w / 2 - arm - 0.26), seatY + 0.12, -d / 2 + 0.38, fabric(pc[k]), 0.06); p.rotation.set(-0.22, s * -0.28, s * 0.05); g.add(p); });
        }
        break;
      }
      case "sectional": {
        const F = fabric(c), sd = 0.95; legs4(0.1);
        g.add(rbox(w - 0.04, 0.22, sd, 0, 0.1, -d / 2 + sd / 2, F, 0.04), rbox(sd, 0.22, d - sd, -w / 2 + sd / 2, 0.1, sd / 2, F, 0.04));
        g.add(rbox(w, h - 0.1, 0.2, 0, 0.1, -d / 2 + 0.1, F, 0.07), rbox(0.2, h - 0.1, d, -w / 2 + 0.1, 0.1, 0, F, 0.07), rbox(0.17, 0.44, sd, w / 2 - 0.085, 0.1, -d / 2 + sd / 2, F, 0.07));
        for (let i = 0; i < 3; i++) g.add(rbox((w - 0.37) / 3 - 0.012, 0.15, sd - 0.24, -w / 2 + 0.2 + (w - 0.37) / 3 * (i + 0.5), 0.32, -d / 2 + sd / 2 + 0.1, F, 0.06));
        g.add(rbox(sd - 0.24, 0.15, d - sd, -w / 2 + 0.2 + (sd - 0.24) / 2, 0.32, sd / 2, F, 0.06));
        for (let i = 0; i < 3; i++) { const bc = rbox((w - 0.37) / 3 - 0.03, 0.4, 0.16, -w / 2 + 0.2 + (w - 0.37) / 3 * (i + 0.5), 0.37, -d / 2 + 0.27, F, 0.075); bc.rotation.x = -0.13; g.add(bc); }
        const p = rbox(0.42, 0.4, 0.12, -w / 2 + 0.45, 0.45, -d / 2 + 0.38, fabric(pal[3] || "#c4643a"), 0.06); p.rotation.set(-0.22, 0.4, 0); g.add(p);
        break;
      }
      case "chair": {
        if (type === "ochair") {                                                                       // office chair: star base, gas lift, seat, back
          const B = std("#2a2a2a", { roughness: 0.4 }), F = fabric(c);
          for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, arm = box(0.3, 0.03, 0.04, Math.cos(a) * 0.14, 0.05, Math.sin(a) * 0.14, B); arm.rotation.y = -a; g.add(arm, cyl(0.025, 0.025, 0.05, Math.cos(a) * 0.29, 0, Math.sin(a) * 0.29, B, 12)); }
          g.add(cyl(0.025, 0.025, 0.36, 0, 0.08, 0, metal("#8d9196", 0.25), 16));
          g.add(rbox(w * 0.78, 0.08, d * 0.72, 0, 0.44, 0.02, F, 0.035));
          const bk = rbox(w * 0.72, 0.52, 0.06, 0, 0.56, -d * 0.3, F, 0.03); bk.rotation.x = 0.1; g.add(bk);
          for (const a of [-1, 1]) g.add(box(0.03, 0.2, 0.26, a * w * 0.38, 0.5, 0, B), rbox(0.06, 0.03, 0.26, a * w * 0.38, 0.7, 0, B, 0.012));
          break;
        }
        const M = wood(c);
        for (const a of [-1, 1]) for (const b of [-1, 1]) { const lg = rbox(0.032, b < 0 ? h : 0.44, 0.032, a * (w / 2 - 0.035), 0, b * (d / 2 - 0.035), M, 0.01); if (b < 0) lg.rotation.x = 0.05; g.add(lg); }
        g.add(rbox(w, 0.035, d, 0, 0.42, 0, M, 0.01), rbox(w - 0.05, 0.045, d - 0.08, 0, 0.455, 0.01, fabric(pal[1] || "#d9cbb5"), 0.018));
        const bk = rbox(w - 0.02, 0.2, 0.025, 0, h - 0.25, -d / 2 + 0.04, M, 0.01); bk.rotation.x = 0.08; g.add(bk);
        g.add(box(w - 0.07, 0.025, 0.02, 0, 0.18, d / 2 - 0.035, M), box(w - 0.07, 0.025, 0.02, 0, 0.18, -d / 2 + 0.035, M));
        break;
      }
      case "stool": {
        const S = wood(c === "#3a3a38" ? "#8a6a4a" : c), B = metal("#2b2b2b", 0.35);
        g.add(cyl(w / 2, w / 2 - 0.01, 0.045, 0, h - 0.045, 0, S, 40), cyl(0.022, 0.022, h - 0.045, 0, 0, 0, B, 14), cyl(w * 0.36, w * 0.38, 0.018, 0, 0, 0, B, 36));
        const ring = new T.Mesh(new T.TorusGeometry(w * 0.3, 0.008, 8, 40), B); ring.rotation.x = Math.PI / 2; ring.position.y = h * 0.32; g.add(shadow(ring));
        break;
      }
      case "pouf": {
        const F = fabric(c), m = cyl(w / 2, w / 2 * 0.94, h - 0.03, 0, 0.015, 0, F, 48); m.scale.z = d / w; g.add(m);
        const top = new T.Mesh(new T.SphereGeometry(w / 2, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2), F); top.scale.set(1, 0.08 / (w / 2), d / w); top.position.y = h - 0.02; g.add(shadow(top));
        break;
      }
      case "table": case "desk": {
        const M = wood(c), top = 0.035;
        if (type === "bench") {
          for (let i = 0; i < 5; i++) g.add(rbox(w, 0.03, d / 5 - 0.012, 0, h - 0.03, -d / 2 + d / 5 * (i + 0.5), M, 0.008));
          for (const a of [-1, 1]) g.add(rbox(0.05, h - 0.03, d - 0.04, a * (w / 2 - 0.1), 0, 0, M, 0.01));
          break;
        }
        g.add(rbox(w, top, d, 0, h - top, 0, M, 0.012));
        const inset = Math.min(0.08, w * 0.08);
        for (const a of [-1, 1]) for (const b of [-1, 1]) { const lg = cyl(0.024, 0.016, h - top, a * (w / 2 - inset), 0, b * (d / 2 - inset), M, 14); lg.rotation.set(b * 0.035, 0, -a * 0.035); g.add(lg); }
        if (h > 0.6) g.add(box(w - inset * 2 - 0.02, 0.07, 0.02, 0, h - top - 0.07, d / 2 - inset, M), box(w - inset * 2 - 0.02, 0.07, 0.02, 0, h - top - 0.07, -d / 2 + inset, M));
        if (it.shape === "desk") { g.add(rbox(0.42, 0.16, d - 0.08, w / 2 - 0.25, h - 0.2, 0, M, 0.01)); g.add(rbox(0.56, 0.34, 0.025, -0.1, h + 0.12, -d / 2 + 0.16, std("#1a1a1a", { roughness: 0.3 }), 0.01), cyl(0.012, 0.02, 0.12, -0.1, h, -d / 2 + 0.17, metal("#888c90"), 12)); }
        if (type === "coffee") g.add(cyl(0.055, 0.045, 0.16, w * 0.2, h, 0, std("#3f4a44", { roughness: 0.15 }), 24), rbox(0.24, 0.05, 0.17, -w * 0.18, h, 0.02, std(pal[2] || "#c4643a"), 0.005), rbox(0.22, 0.03, 0.16, -w * 0.18, h + 0.05, 0.01, std(pal[4] || "#efe7da"), 0.004));
        if (type === "dining4" || type === "dining6") g.add(cyl(0.11, 0.07, 0.09, 0, h, 0, std("#ece6da", { roughness: 0.2 }), 32));
        if (type === "console") g.add(cyl(0.06, 0.08, 0.3, w * 0.28, h, 0, std(pal[3] || "#c4643a", { roughness: 0.25 }), 24));
        break;
      }
      case "rtable": {
        const M = wood(c); const tp = cyl(w / 2, w / 2, 0.035, 0, h - 0.035, 0, M, 64); tp.scale.z = d / w;
        g.add(tp, cyl(0.045, 0.065, h - 0.035, 0, 0, 0, M, 20), cyl(Math.min(w, d) * 0.24, Math.min(w, d) * 0.27, 0.03, 0, 0, 0, M, 40));
        if (type === "rdining") g.add(cyl(0.16, 0.1, 0.07, 0, h, 0, std("#ece6da", { roughness: 0.15 }), 32));
        if (type === "coffeer") g.add(rbox(0.2, 0.04, 0.15, 0.1, h, 0.05, std(pal[2] || "#c4643a"), 0.004));
        break;
      }
      case "cabinet": case "dresser": {
        const M = wood(c), base = 0.09; legs4(base, 0.05, dark, 0.016);
        g.add(rbox(w, h - base, d, 0, base, 0, M, 0.012));
        const rows = type === "dresser" ? 3 : type === "nightstand" ? 2 : 1, cols = rows > 1 ? 1 : Math.max(2, Math.round(w / 0.45));
        const fh = (h - base - 0.04) / rows, fw = (w - 0.04) / cols, front = wood(tone(c, 1.06));
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
          g.add(rbox(fw - 0.01, fh - 0.01, 0.012, -w / 2 + 0.02 + fw * (j + 0.5), base + 0.02 + fh * i + 0.005, d / 2, front, 0.004));
          g.add(rbox(cols > 2 ? 0.06 : 0.14, 0.012, 0.018, -w / 2 + 0.02 + fw * (j + 0.5), base + 0.02 + fh * (i + 0.74), d / 2 + 0.012, metal("#b59a6a"), 0.005));
        }
        if (type === "nightstand") { g.add(cyl(0.06, 0.075, 0.22, 0, h, 0.03, std(pal[3] || "#c4643a", { roughness: 0.2 }), 24)); lampShade(0.11, 0.08, 0.16, 0, h + 0.23, 0.03); lamps.push([0, h + 0.31, 0.03, 0.6]); }
        if (type === "tvunit" || type === "sideboard") { g.add(rbox(0.16, 0.22, 0.12, -w * 0.32, h, 0, std(pal[4] || "#efe7da", { roughness: 0.3 }), 0.03)); }
        break;
      }
      case "shelf": {
        const M = wood(c); g.add(box(0.025, h, d, -w / 2 + 0.0125, 0, 0, M), box(0.025, h, d, w / 2 - 0.0125, 0, 0, M), box(w, h, 0.01, 0, 0, -d / 2 + 0.005, wood(tone(c, 0.85))));
        let s = 9; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        const BC = ["#2f3e46", "#c4643a", "#e8e0d0", "#8a5a3a", "#3f5f2a", "#d79f2b", "#6e2f2f", "#1f2a44"];
        const nS = Math.max(3, Math.round(h / 0.36));
        for (let i = 0; i <= nS; i++) {
          const y = 0.04 + (h - 0.07) * i / nS; g.add(box(w - 0.05, 0.025, d - 0.01, 0, y, 0.005, M));
          if (i < nS) { let x = -w / 2 + 0.05; while (x < w / 2 - 0.08) { const bw = 0.022 + rnd() * 0.02, bh = 0.17 + rnd() * 0.1; if (rnd() < 0.1) { g.add(cyl(0.05, 0.04, 0.14, x + 0.06, y + 0.025, 0.02, std("#e9e4da", { roughness: 0.25 }), 20)); x += 0.16; continue; } g.add(box(bw, bh, d * 0.75, x + bw / 2, y + 0.025, 0.02, std(BC[(rnd() * BC.length) | 0], { roughness: 0.7 }))); x += bw + 0.003 + (rnd() < 0.08 ? 0.1 : 0); } }
        }
        break;
      }
      case "wardrobe": {
        const M = std(c, { roughness: 0.45 }), n = Math.max(2, Math.round(w / 0.5)), dw = w / n;
        g.add(box(w - 0.02, 0.08, d - 0.04, 0, 0, -0.02, std("#2b2621")), rbox(w, h - 0.08, d, 0, 0.08, 0, M, 0.01));
        for (let i = 0; i < n; i++) {
          g.add(rbox(dw - 0.008, h - 0.1, 0.018, -w / 2 + dw * (i + 0.5), 0.09, d / 2, std(tone(c, 1.03), { roughness: 0.42 }), 0.004));
          const hx = -w / 2 + dw * (i + 0.5) + (i % 2 ? -1 : 1) * (dw / 2 - 0.05);
          g.add(rbox(0.016, 0.34, 0.025, hx, h * 0.42, d / 2 + 0.02, metal("#2b2b2b", 0.4), 0.006));
        }
        break;
      }
      case "bed": {
        const head = fabric(mix(pal[1] || "#d9cbb5", "#ffffff", 0.2)), frame = fabric(mix(pal[1] || "#d9cbb5", "#ffffff", 0.35));
        legs4(0.06, 0.06);
        g.add(rbox(w, 0.28, d, 0, 0.06, 0, frame, 0.035));
        g.add(rbox(w + 0.06, 1.0, 0.1, 0, 0.06, -d / 2 - 0.03, head, 0.045));
        const ch = Math.max(2, Math.round(w / 0.4)); for (let i = 0; i < ch; i++) g.add(rbox((w + 0.02) / ch - 0.012, 0.56, 0.04, -w / 2 + (w + 0.02) / ch * (i + 0.5), 0.46, -d / 2 + 0.03, head, 0.018));
        g.add(rbox(w - 0.04, 0.2, d - 0.06, 0, 0.33, 0, fabric("#f4f1ea"), 0.06));                                       // mattress
        g.add(rbox(w + 0.04, 0.08, d * 0.7, 0, 0.5, d * 0.15, fabric(mix(pal[0] || "#efe4d2", "#ffffff", 0.45)), 0.04)); // duvet
        g.add(rbox(w + 0.07, 0.05, 0.48, 0, 0.56, d / 2 - 0.34, fabric(pal[3] || "#c4643a"), 0.02));                      // throw
        const np = w > 1.2 ? 2 : 1;
        for (let i = 0; i < np; i++) { const p = rbox(Math.min(0.64, w / np - 0.1), 0.4, 0.17, np === 1 ? 0 : (i - 0.5) * w / 2, 0.5, -d / 2 + 0.2, fabric("#f6f3ee"), 0.08); p.rotation.x = 0.3; g.add(p); }
        if (w > 1.2) { const p = rbox(0.4, 0.3, 0.12, 0, 0.53, -d / 2 + 0.36, fabric(pal[2] || "#b98656"), 0.06); p.rotation.x = 0.25; g.add(p); }
        break;
      }
      case "crib": {
        const M = std(c, { roughness: 0.5 });
        g.add(rbox(w, 0.04, d, 0, 0.32, 0, M, 0.01), rbox(w - 0.05, 0.1, d - 0.05, 0, 0.36, 0, fabric("#f6f3ee"), 0.03));
        for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(rbox(0.045, h, 0.045, a * (w / 2 - 0.022), 0, b * (d / 2 - 0.022), M, 0.012));
        for (const a of [-1, 1]) { g.add(rbox(0.035, 0.035, d, a * (w / 2 - 0.022), h - 0.035, 0, M, 0.01)); for (let i = 1; i < 12; i++) g.add(cyl(0.008, 0.008, h - 0.4, a * (w / 2 - 0.022), 0.36, -d / 2 + d * i / 12, M, 8)); }
        for (const b of [-1, 1]) g.add(rbox(w, 0.035, 0.035, 0, h - 0.035, b * (d / 2 - 0.022), M, 0.01));
        break;
      }
      case "lamp": {
        const brass = st.name && /Warm|Midnight|Velvet|Ivory/.test(st.name);
        const M = metal(brass ? "#b39360" : "#1f1f1f", 0.35);
        if (type === "arclamp") {
          g.add(rbox(0.32, 0.05, 0.32, 0, 0, 0, std("#e8e4dc", { roughness: 0.3 }), 0.02));
          const curve = new T.QuadraticBezierCurve3(new T.Vector3(0, 0.05, 0), new T.Vector3(0, h + 0.15, 0), new T.Vector3(0, h - 0.1, w * 1.6));
          g.add(shadow(new T.Mesh(new T.TubeGeometry(curve, 40, 0.012, 8), M)));
          const dome = new T.Mesh(new T.SphereGeometry(0.2, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2), M); dome.position.set(0, h - 0.24, w * 1.6); g.add(shadow(dome));
          const glow = shadeMat("#fff4e0"); shades.push(glow); const bulb = new T.Mesh(new T.SphereGeometry(0.05, 16, 10), glow); bulb.position.set(0, h - 0.26, w * 1.6); g.add(bulb);
          lamps.push([0, h - 0.3, w * 1.6, 1]);
        } else {
          g.add(cyl(0.15, 0.15, 0.025, 0, 0, 0, M, 40), cyl(0.011, 0.011, h - 0.26, 0, 0.02, 0, M, 10));
          lampShade(0.2, 0.16, 0.3, 0, h - 0.32, 0, c === "#2b2b2b" ? "#f1e6d2" : c);
          lamps.push([0, h - 0.18, 0, 1]);
        }
        break;
      }
      case "plant": {
        const pot = clamp(w * 0.36, 0.1, 0.19);
        if (type === "olivetree") {
          g.add(cyl(pot, pot * 0.8, pot * 1.8, 0, 0, 0, std("#c8b9a2", { roughness: 0.9 }), 32));
          const tr = cyl(0.025, 0.035, h * 0.55, 0, pot * 1.7, 0, wood("#6d5a45"), 8); tr.rotation.z = 0.06; g.add(tr);
          let s2 = 31; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
          const lm = std("#7d8a5c", { roughness: 0.7 }), lgeo = new T.SphereGeometry(1, 8, 6);
          for (let k = 0; k < 140; k++) { const a = r2() * Math.PI * 2, rr = Math.sqrt(r2()) * w * 0.45, y = h * 0.55 + r2() * h * 0.42; const lf = new T.Mesh(lgeo, lm); lf.scale.set(0.045, 0.006, 0.014); lf.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); lf.rotation.set(r2(), a, r2()); lf.castShadow = true; g.add(lf); }
          break;
        }
        if (type === "monstera") {
          g.add(cyl(pot, pot * 0.8, pot * 1.7, 0, 0, 0, std("#2f3331", { roughness: 0.4 }), 32));
          let s2 = 17; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
          const lm = std("#2f5a2a", { roughness: 0.5, side: T.DoubleSide });
          for (let k = 0; k < 11; k++) {
            const a = k / 11 * Math.PI * 2 + r2() * 0.4, len = h * (0.45 + r2() * 0.35), lean = 0.35 + r2() * 0.5;
            const stem = cyl(0.008, 0.01, len, 0, pot * 1.6, 0, std("#4c6b33"), 6); stem.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean); g.add(stem);
            const leaf = new T.Mesh(new T.CircleGeometry(0.17 + r2() * 0.06, 20), lm); const tip = new T.Vector3(0, len, 0).applyEuler(stem.rotation);
            leaf.position.set(tip.x, pot * 1.6 + tip.y, tip.z); leaf.rotation.set(-Math.PI / 2 + 0.6, a, 0); leaf.castShadow = true; g.add(leaf);
          }
          break;
        }
        g.add(cyl(pot, pot * 0.78, pot * 2, 0, 0, 0, std(pal[4] ? mix(pal[4], "#ffffff", 0.3) : "#e9e4da", { roughness: 0.3 }), 40), cyl(pot * 0.94, pot * 0.94, 0.01, 0, pot * 2 - 0.03, 0, std("#3b2c20", { roughness: 1 }), 32));
        let s = 5 + Math.round(h * 10); const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        const L = [std("#3f5f2a", { roughness: 0.55 }), std("#4d6f30", { roughness: 0.55 }), std("#2f4d22", { roughness: 0.55 })];
        const leafGeo = new T.SphereGeometry(1, 10, 6);
        for (let k = 0; k < 48; k++) {
          const y = pot * 2 + (h - pot * 2) * (0.25 + 0.75 * rnd()), a = rnd() * Math.PI * 2, r = (w * 0.4) * Math.sin(clamp((y - pot * 2) / (h - pot * 2) + 0.2) * Math.PI) * (0.5 + rnd() * 0.5);
          const lf = new T.Mesh(leafGeo, L[k % 3]); lf.scale.set(0.12, 0.008, 0.055); lf.position.set(Math.cos(a) * r, y, Math.sin(a) * r); lf.rotation.set(rnd() - 0.5, a, (rnd() - 0.5) * 1.2); lf.castShadow = true; g.add(lf);
        }
        for (let k = 0; k < 3; k++) { const st2 = cyl(0.007, 0.006, h * (0.6 + k * 0.12), (k - 1) * 0.03, pot * 1.9, 0, std("#5a4632"), 6); st2.rotation.z = (k - 1) * 0.12; g.add(st2); }
        break;
      }
      case "rug": { if (type === "gilam") { const m = rbox(w, 0.014, d, 0, 0, 0, new T.MeshPhysicalMaterial({ map: patternTex("gilam", c), roughness: 0.95, sheen: 0.7 }), 0.005); m.castShadow = false; g.add(m); break; } const F = fabric(c); const r = rbox(w, 0.012, d, 0, 0, 0, F, 0.005); r.castShadow = false; g.add(r); const b = rbox(w - 0.16, 0.013, d - 0.16, 0, 0, 0, fabric(tone(c, 0.93)), 0.004); b.castShadow = false; g.add(b); break; }
      case "rrug": { const m = cyl(w / 2, w / 2, 0.012, 0, 0, 0, fabric(c), 72); m.scale.z = d / w; m.castShadow = false; g.add(m); const m2 = cyl(w / 2 - 0.1, w / 2 - 0.1, 0.013, 0, 0, 0, fabric(tone(c, 0.92)), 72); m2.scale.z = d / w; m2.castShadow = false; g.add(m2); break; }
      case "art": { g.add(box(w, h, d, 0, 0, 0, wood("#b38b5d")), box(w - 0.05, h - 0.05, 0.006, 0, 0.025, d / 2, std("#f4f1ea", { roughness: 0.9 }))); const a = new T.Mesh(new T.PlaneGeometry(w - 0.2, h - 0.2), new T.MeshStandardMaterial({ map: artTex(pal.length ? pal : ["#c4643a", "#d9cbb5", "#6b7a4e", "#2f3e46", "#f4efe6"], ((it.x || 0) * 7 + (it.y || 0) * 3) | 0), roughness: 0.85 })); a.position.set(0, h / 2, d / 2 + 0.005); g.add(a); break; }
      case "mirror": {
        if (type === "wallmirror") { const f = new T.Mesh(new T.CylinderGeometry(w / 2, w / 2, 0.025, 64), metal("#b59a6a")); f.rotation.x = Math.PI / 2; f.position.set(0, h / 2, 0); f.scale.z = h / w; g.add(shadow(f)); const m = new T.Mesh(new T.CylinderGeometry(w / 2 - 0.025, w / 2 - 0.025, 0.005, 64), glassy()); m.rotation.x = Math.PI / 2; m.position.set(0, h / 2, 0.016); m.scale.z = h / w; g.add(m); }
        else { g.add(rbox(w, h, d, 0, 0, 0, wood("#b38b5d"), 0.02), box(w - 0.05, h - 0.05, 0.004, 0, 0.025, d / 2, glassy())); const st2 = box(0.03, h * 0.6, 0.3, 0, 0, -0.15, wood("#b38b5d")); st2.rotation.x = 0.12; g.add(st2); }
        break;
      }
      case "tv": {
        // thin panel: black bezel, screen with a soft picture, slim chin; a low stand when it isn't on the wall
        const body = std("#16181a", { roughness: 0.35, metalness: 0.4 }), bez = 0.008, th = Math.min(d, 0.035);
        g.add(rbox(w, h, th, 0, 0, 0, body, 0.004));
        const scr = new T.Mesh(new T.PlaneGeometry(w - bez * 2, h - bez * 2 - 0.012), new T.MeshPhysicalMaterial({ map: screenTex(), roughness: 0.08, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, emissiveMap: screenTex(), emissive: new T.Color("#ffffff"), emissiveIntensity: 0.22 }));
        scr.position.set(0, h / 2 + 0.006, th / 2 + 0.0015); g.add(scr);
        g.add(box(w * 0.98, 0.012, 0.004, 0, 0, th / 2 + 0.001, std("#0c0d0e", { roughness: 0.5 })));
        g.add(box(0.035, 0.006, 0.004, 0, 0.003, th / 2 + 0.004, metal("#8a8d90", 0.3)));
        g.add(rbox(w * 0.9, h * 0.62, 0.02, 0, h * 0.2, -th / 2 - 0.01, body, 0.01));                           // back housing
        if (!it.wall && !(it.elev > 0.5)) for (const a of [-1, 1]) { const f = rbox(0.05, 0.012, 0.22, a * w * 0.38, -0.06, 0.02, metal("#2a2c2e", 0.35), 0.005); f.rotation.z = a * 0.2; g.add(f, box(0.02, 0.07, 0.02, a * w * 0.38, -0.06, -0.01, metal("#2a2c2e", 0.35))); }
        break;
      }
      case "counter": case "sink": case "stove": {
        const bath = type === "vanity" || type === "doublevanity";
        const M = std(c, { roughness: 0.42 }), plinth = bath ? 0.0 : 0.1, topT = bath ? 0.03 : 0.038;
        const n = it.shape === "stove" ? 1 : Math.max(1, Math.round(w / 0.6)), fw = w / n;
        if (plinth) g.add(box(w - 0.02, plinth, d - 0.07, 0, 0, -0.035, std("#2b2b2b", { roughness: 0.6 })));
        else for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(cyl(0.018, 0.014, 0.12, a * (w / 2 - 0.05), 0, b * (d / 2 - 0.06), metal("#2b2b2b", 0.4), 12));
        const by = bath ? 0.12 : plinth, bh = h - topT - by;
        if (it.shape === "sink") {                                                                              // open-topped carcass so the bowls show
          const cb = bh - (bath ? 0.16 : 0.21);
          g.add(rbox(w - 0.004, cb, d - 0.03, 0, by, -0.015, M, 0.004));
          for (const a of [-1, 1]) g.add(box(0.018, bh, d - 0.03, a * (w / 2 - 0.011), by, -0.015, M));
          g.add(box(w - 0.004, bh, 0.018, 0, by, -d / 2 + 0.01, M));
        } else g.add(rbox(w - 0.004, bh, d - 0.03, 0, by, -0.015, M, 0.004));                                  // carcass
        if (it.shape !== "stove") {
          const drawers = type === "island" || (type === "basecab" && false);
          for (let i = 0; i < n; i++) {
            const x = -w / 2 + fw * (i + 0.5);
            if (bath || drawers) {                                                                              // two drawers per bay
              for (const [y0, hh] of [[by + 0.004, bh * 0.58], [by + bh * 0.6, bh * 0.38]]) {
                g.add(rbox(fw - 0.006, hh - 0.006, 0.018, x, y0, d / 2 - 0.018, std(tone(c, 1.03), { roughness: 0.4 }), 0.003));
                g.add(box(Math.min(0.32, fw - 0.16), 0.01, 0.012, x, y0 + hh - 0.035, d / 2 + 0.001, metal("#a9acaf", 0.28)));
              }
            } else {
              g.add(rbox(fw - 0.006, bh - 0.008, 0.018, x, by + 0.004, d / 2 - 0.018, std(tone(c, 1.03), { roughness: 0.4 }), 0.003));
              g.add(rbox(Math.min(0.28, fw - 0.18), 0.012, 0.022, x, by + bh - 0.06, d / 2 + 0.006, metal("#a9acaf", 0.28), 0.006));
              g.add(box(0.012, 0.012, 0.012, x - Math.min(0.14, fw / 2 - 0.09), by + bh - 0.06, d / 2 - 0.004, metal("#a9acaf", 0.28)), box(0.012, 0.012, 0.012, x + Math.min(0.14, fw / 2 - 0.09), by + bh - 0.06, d / 2 - 0.004, metal("#a9acaf", 0.28)));
            }
          }
        }
        const stone = std(it.shape === "stove" ? "#d9d9d6" : bath ? "#efece6" : "#e6e2db", { roughness: 0.16 });
        if (it.shape === "sink") {
          // worktop with real cut-outs and bowls sunk into them
          const bowls = type === "doublevanity" ? [-w / 4, w / 4] : [0];
          const bw = bath ? Math.min(0.48, w / bowls.length - 0.16) : Math.min(0.5, w * 0.62), bd = Math.min(bath ? 0.34 : 0.4, d - 0.16), rr = bath ? 0.09 : 0.04;
          const top = rrShape(w + 0.01, d + 0.02, 0.006); bowls.forEach(x => top.holes.push(rrShape(bw, bd, rr, x, -0.02)));
          const tg = new T.ExtrudeGeometry(top, { depth: topT, bevelEnabled: false, curveSegments: 16 }); tg.rotateX(-Math.PI / 2);
          const tm = shadow(new T.Mesh(tg, stone)); tm.position.y = h - topT; g.add(tm);
          const bowlM = bath ? std("#f7f7f5", { roughness: 0.1 }) : metal("#d4d7d9", 0.22);
          bowls.forEach(x => { const v = vessel(bw, bd, bath ? 0.14 : 0.19, 0.012, rr, bowlM); v.position.set(x, h - (bath ? 0.14 : 0.19), 0.02); g.add(v); g.add(cyl(0.022, 0.022, 0.004, x, h - (bath ? 0.135 : 0.185), 0.02, metal("#9a9da0", 0.2), 20)); });
          // mixer taps: round base, tall swan neck, lever
          const chrome = metal(pal[3] && bath ? "#b59a6a" : "#d0d3d5", 0.12);
          bowls.forEach(x => {
            const tz = -d / 2 + (bath ? 0.07 : 0.06), th2 = bath ? 0.2 : 0.32;
            g.add(cyl(0.024, 0.026, 0.03, x, h, tz, chrome, 24), cyl(0.013, 0.015, th2, x, h + 0.03, tz, chrome, 16));
            const neck = new T.Mesh(new T.TorusGeometry(bath ? 0.05 : 0.08, 0.012, 10, 24, Math.PI), chrome); neck.rotation.y = Math.PI / 2; neck.position.set(x, h + 0.03 + th2, tz + (bath ? 0.05 : 0.08)); g.add(shadow(neck));
            g.add(cyl(0.012, 0.012, 0.05, x, h + th2 - (bath ? 0.02 : 0.02), tz + (bath ? 0.1 : 0.16), chrome, 14));
            const lev = box(0.01, 0.01, 0.09, x + 0.03, h + 0.08, tz + 0.03, chrome); lev.rotation.x = -0.4; g.add(lev);
          });
          if (bath) { // mirror cabinet above
            const mm = rbox(w * 0.9, 0.7, 0.04, 0, h + 0.35, -d / 2 + 0.02, wood(tone(c, 1)), 0.01); g.add(mm); g.add(box(w * 0.9 - 0.04, 0.66, 0.004, 0, h + 0.37, -d / 2 + 0.042, glassy()));
          }
        } else g.add(rbox(w + 0.01, topT, d + 0.02, 0, h - topT, 0, stone, 0.006));
        if (it.shape === "stove") {
          // freestanding cooker: glass-ceramic hob, control strip with knobs, oven door with window, storage drawer
          const steel = std(c, { roughness: 0.3, metalness: 0.55 }), glassB = std("#0d0e10", { roughness: 0.06, metalness: 0.3 });
          g.add(rbox(w - 0.01, 0.006, d - 0.04, 0, h, 0.0, glassB, 0.006));
          const zones = [[-0.13, -0.11, 0.09], [0.13, -0.11, 0.075], [-0.13, 0.12, 0.07], [0.13, 0.12, 0.095]];
          zones.forEach(([x, z, r]) => { const ring = new T.Mesh(new T.TorusGeometry(r, 0.002, 6, 48), std("#5a5d60", { roughness: 0.4 })); ring.rotation.x = Math.PI / 2; ring.position.set(x * w / 0.6, h + 0.007, z * d / 0.6); g.add(ring); const inner = new T.Mesh(new T.TorusGeometry(r * 0.55, 0.0015, 6, 40), ring.material); inner.rotation.x = Math.PI / 2; inner.position.copy(ring.position); g.add(inner); });
          g.add(rbox(w - 0.004, 0.11, 0.03, 0, h - topT - 0.11, d / 2 - 0.03, steel, 0.004));                       // control strip
          for (let k = 0; k < 4; k++) { const kn = cyl(0.019, 0.021, 0.022, -w * 0.36 + k * w * 0.12 + (k > 1 ? w * 0.28 : 0), 0, 0, std("#1a1b1c", { roughness: 0.35 }), 24); kn.rotation.x = Math.PI / 2; kn.position.set(kn.position.x, h - topT - 0.055, d / 2 + 0.006); g.add(kn); g.add(box(0.003, 0.012, 0.003, kn.position.x, h - topT - 0.05, d / 2 + 0.018, std("#e9e9e9"))); }
          const disp = shadeMat("#7fd6ff"); shades.push(disp); g.add(rbox(0.08, 0.026, 0.004, 0, h - topT - 0.068, d / 2 + 0.001, std("#060708", { roughness: 0.1 }), 0.003), box(0.05, 0.012, 0.002, 0, h - topT - 0.062, d / 2 + 0.004, disp));
          const oy = 0.17, oh = h - topT - 0.13 - oy;
          g.add(rbox(w - 0.012, oh, 0.022, 0, oy, d / 2 - 0.02, steel, 0.006), rbox(w - 0.12, oh - 0.16, 0.006, 0, oy + 0.06, d / 2 - 0.006, glassB, 0.01));
          g.add(rbox(w * 0.7, 0.018, 0.022, 0, oy + oh - 0.05, d / 2 + 0.03, metal("#c3c6c9", 0.2), 0.009));
          for (const a of [-1, 1]) g.add(box(0.014, 0.014, 0.035, a * w * 0.33, oy + oh - 0.048, d / 2 + 0.012, metal("#c3c6c9", 0.2)));
          g.add(rbox(w - 0.012, oy - 0.11, 0.02, 0, 0.105, d / 2 - 0.02, steel, 0.005), box(w * 0.5, 0.012, 0.012, 0, oy - 0.03, d / 2 + 0.002, metal("#c3c6c9", 0.2)));
        }
        if (type === "island") { for (const s of [-0.3, 0.3]) g.add(cyl(0.05, 0.04, 0.16, s * w, h, 0.05, std(pal[4] || "#efe7da", { roughness: 0.2 }), 20)); }
        break;
      }
      case "fridge": {
        // fridge-freezer: fridge door above, freezer below, bar handles on stand-offs, hinge caps, kick grille
        const M = std(c, { roughness: 0.3, metalness: /#e[0-9a-f]|#f/i.test(c) ? 0.15 : 0.55 }), split = h * 0.38, gap = 0.006;
        g.add(rbox(w, h - 0.06, d - 0.05, 0, 0.06, -0.025, M, 0.012));
        g.add(box(w - 0.04, 0.06, d - 0.08, 0, 0, -0.03, std("#1d1e1f", { roughness: 0.7 })));
        for (let k = 0; k < 6; k++) g.add(box(w - 0.1, 0.005, 0.006, 0, 0.012 + k * 0.008, d / 2 - 0.05, std("#0e0f10")));
        g.add(rbox(w - gap, split - 0.06 - gap, 0.045, 0, 0.065, d / 2 - 0.045, M, 0.012), rbox(w - gap, h - split - gap, 0.045, 0, split + gap / 2, d / 2 - 0.045, M, 0.012));
        const bar = metal("#c8cbce", 0.22), hx = w / 2 - 0.07;
        for (const [y0, len] of [[split + 0.06, Math.min(0.55, (h - split) * 0.5)], [split - 0.06 - Math.min(0.32, split * 0.5), Math.min(0.32, split * 0.5)]]) {
          g.add(cyl(0.011, 0.011, len, hx, y0, d / 2 + 0.035, bar, 14));
          for (const e of [0.02, len - 0.02]) { const so = cyl(0.008, 0.008, 0.035, hx, y0 + e, d / 2 + 0.0175, bar, 10); so.rotation.x = Math.PI / 2; so.position.set(hx, y0 + e, d / 2 + 0.017); g.add(so); }
        }
        g.add(rbox(0.05, 0.012, 0.05, -w / 2 + 0.04, h - 0.004, d / 2 - 0.03, std("#9a9da0", { roughness: 0.4 }), 0.004));
        const disp = shadeMat("#bfe9ff"); shades.push(disp); g.add(rbox(0.09, 0.05, 0.004, -w / 2 + 0.14, h * 0.78, d / 2 + 0.001, std("#0d0f12", { roughness: 0.1 }), 0.004), box(0.05, 0.016, 0.002, -w / 2 + 0.14, h * 0.78 + 0.018, d / 2 + 0.004, disp));
        break;
      }
      case "bath": {
        // a hollow tub: rolled rim, sloped back, inner floor, chrome drain and a wall-side mixer with hand shower
        const W = std("#f6f6f4", { roughness: 0.12 });
        const body = vessel(w, d, h - 0.012, 0.075, 0.05, W); g.add(body);                              // shell with a broad rim
        const basin = vessel(w - 0.15, d - 0.15, h - 0.1, 0.01, 0.17, std("#fbfbfa", { roughness: 0.08 })); basin.position.y = 0.07; g.add(basin);
        g.add(cyl(0.025, 0.025, 0.004, w / 2 - 0.25, 0.09, 0, metal("#c9cbcc", 0.15), 20));
        const ch = metal("#cfd2d4", 0.12), tx = w / 2 - 0.12;
        g.add(cyl(0.02, 0.022, 0.05, tx, h, -d / 2 + 0.05, ch, 18), cyl(0.013, 0.013, 0.12, tx, h + 0.05, -d / 2 + 0.05, ch, 14));
        const sp = new T.Mesh(new T.TorusGeometry(0.06, 0.012, 10, 24, Math.PI), ch); sp.rotation.y = Math.PI / 2; sp.position.set(tx, h + 0.17, -d / 2 + 0.11); g.add(shadow(sp));
        g.add(cyl(0.02, 0.016, 0.12, tx - 0.1, h, -d / 2 + 0.05, ch, 14), cyl(0.028, 0.02, 0.03, tx - 0.1, h + 0.12, -d / 2 + 0.05, ch, 18));
        break;
      }
      case "shower": {
        // stone tray with drain, frameless glass on two sides, rain head on an arm, hand shower on a rail, mixer
        const tray = std("#f2f1ee", { roughness: 0.25 });
        g.add(rbox(w, 0.04, d, 0, 0, 0, tray, 0.01), box(0.1, 0.003, 0.1, 0, 0.04, 0, metal("#9ea1a4", 0.2)));
        const gl = new T.MeshPhysicalMaterial({ color: "#e6f0f4", transparent: true, opacity: 0.18, roughness: 0.03, metalness: 0, transmission: 0, depthWrite: false, side: T.DoubleSide });
        const p1 = new T.Mesh(new T.BoxGeometry(w - 0.35, h - 0.06, 0.008), gl); p1.position.set(-0.175, 0.04 + (h - 0.06) / 2, d / 2 - 0.01);
        const door = new T.Mesh(new T.BoxGeometry(0.33, h - 0.06, 0.008), gl); door.position.set(w / 2 - 0.17, 0.04 + (h - 0.06) / 2, d / 2 - 0.03);
        const p2 = new T.Mesh(new T.BoxGeometry(0.008, h - 0.06, d), gl); p2.position.set(w / 2 - 0.004, 0.04 + (h - 0.06) / 2, 0); g.add(p1, door, p2);
        const ch = metal("#cfd2d4", 0.12);
        g.add(box(w, 0.016, 0.016, 0, h - 0.02, d / 2 - 0.01, ch), box(0.016, 0.016, d, w / 2 - 0.004, h - 0.02, 0, ch), box(0.012, 0.3, 0.02, w / 2 - 0.35, 0.9, d / 2, ch));
        for (const y of [0.06, h - 0.1]) g.add(box(0.02, 0.03, 0.03, w / 2 - 0.004, y, d / 2 - 0.02, ch));
        const arm = box(0.02, 0.02, 0.36, 0, h - 0.12, -d / 2 + 0.18, ch); g.add(arm, cyl(0.15, 0.15, 0.012, 0, h - 0.14, -d / 2 + 0.36, ch, 48));
        g.add(cyl(0.012, 0.012, 1.0, -w * 0.3, 0.9, -d / 2 + 0.03, ch, 12), cyl(0.03, 0.02, 0.18, -w * 0.3, 1.5, -d / 2 + 0.06, ch, 16));
        g.add(rbox(0.16, 0.08, 0.04, 0, 1.0, -d / 2 + 0.02, ch, 0.02));
        break;
      }
      case "toilet": {
        // wall-standing close-coupled WC: lathe-turned bowl, seat and closed lid, cistern with dual flush
        const W = std("#f6f6f4", { roughness: 0.1 });
        const bp = [[0.11, 0], [0.1, 0.05], [0.1, 0.18], [0.14, 0.3], [0.175, 0.36], [0.185, 0.39], [0.18, 0.4]].map(([r, y]) => new T.Vector2(r, y));
        const bowl = new T.Mesh(new T.LatheGeometry(bp, 48), W); bowl.scale.set(w / 0.38, 1, 1.3 * w / 0.38); bowl.position.z = 0.07; g.add(shadow(bowl));
        const ring = new T.Shape(); ring.absellipse(0, 0, 0.18, 0.23, 0, Math.PI * 2); const hole = new T.Path(); hole.absellipse(0, 0, 0.11, 0.15, 0, Math.PI * 2, true); ring.holes.push(hole);
        const sg = new T.ExtrudeGeometry(ring, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 40 }); sg.rotateX(-Math.PI / 2);
        const seat = shadow(new T.Mesh(sg, W)); seat.position.set(0, 0.405, 0.08); seat.scale.set(w / 0.38, 1, w / 0.38); g.add(seat);
        const lidS = new T.Shape(); lidS.absellipse(0, 0, 0.18, 0.235, 0, Math.PI * 2);
        const lg = new T.ExtrudeGeometry(lidS, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 4, curveSegments: 40 }); lg.rotateX(-Math.PI / 2);
        const lid = shadow(new T.Mesh(lg, W)); lid.position.set(0, 0.44, 0.08); lid.scale.copy(seat.scale); g.add(lid);
        g.add(rbox(w * 0.95, 0.36, 0.17, 0, 0.42, -d / 2 + 0.085, W, 0.035), rbox(w * 0.97, 0.03, 0.18, 0, 0.78, -d / 2 + 0.085, W, 0.012));
        g.add(cyl(0.028, 0.028, 0.008, -0.02, 0.81, -d / 2 + 0.085, metal("#cfd2d4", 0.15), 24), cyl(0.018, 0.018, 0.01, 0.035, 0.81, -d / 2 + 0.085, metal("#cfd2d4", 0.15), 20));
        g.add(cyl(0.05, 0.04, 0.24, 0, 0.18, -d / 2 + 0.2, W, 24));
        break;
      }
      // ---------- lighting & decor ----------
      case "pendant": {
        const M = metal(c === "#e9dcc4" ? "#1f1f1f" : c, 0.4);
        g.add(cyl(0.004, 0.004, 0.35, 0, h, 0, std("#222"), 6));
        const dome = new T.Mesh(new T.SphereGeometry(w / 2, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), std("#e9dcc4", { roughness: 0.55, side: T.DoubleSide })); dome.position.y = h * 0.25; dome.scale.y = h / (w / 2) * 0.75; g.add(shadow(dome));
        const glow = shadeMat("#fff4e0"); shades.push(glow); const bulb = new T.Mesh(new T.SphereGeometry(0.05, 16, 10), glow); bulb.position.y = h * 0.22; g.add(bulb);
        g.add(cyl(0.03, 0.03, 0.06, 0, h * 0.25 + h * 0.75 - 0.03, 0, M, 16));
        lamps.push([0, h * 0.15, 0, 1]);
        break;
      }
      case "tablelamp": {
        const base = new T.Mesh(new T.SphereGeometry(w * 0.33, 40, 24), std(pal[3] || "#c4643a", { roughness: 0.25 })); base.scale.y = 1.25; base.position.y = w * 0.33 * 1.25; g.add(shadow(base));
        g.add(cyl(0.008, 0.008, h * 0.25, 0, w * 0.66 * 1.25 - 0.02, 0, metal("#b59a6a"), 8));
        lampShade(w * 0.36, w * 0.5, h * 0.36, 0, h - h * 0.36, 0, c);
        lamps.push([0, h - h * 0.2, 0, 0.7]);
        break;
      }
      case "sconce": {
        const M = metal(c, 0.3);
        g.add(rbox(0.08, 0.14, 0.02, 0, h * 0.2, -d / 2 + 0.01, M, 0.008));
        const arm = cyl(0.01, 0.01, d * 0.7, 0, 0, 0, M, 10); arm.rotation.x = Math.PI / 2; arm.position.set(0, h * 0.3, -d * 0.12); g.add(arm);
        lampShade(w * 0.28, w * 0.42, h * 0.42, 0, h * 0.38, d * 0.18, "#f1e6d2");
        lamps.push([0, h * 0.58, d * 0.18, 0.6]);
        break;
      }
      case "lantern": {
        const B = metal(c, 0.32), r = w / 2;
        g.add(cyl(r * 0.7, r * 0.8, 0.04, 0, 0, 0, B, 8));
        const body = new T.Mesh(new T.CylinderGeometry(r * 0.85, r * 0.7, h * 0.55, 8, 1, true), new T.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: 0.35, side: T.DoubleSide, transparent: true, opacity: 0.92 }));
        body.position.y = 0.04 + h * 0.275; g.add(shadow(body));
        const dome = new T.Mesh(new T.SphereGeometry(r * 0.85, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), B); dome.position.y = 0.04 + h * 0.55; dome.scale.y = 1.2; g.add(shadow(dome));
        g.add(cyl(0.012, 0.03, h * 0.12, 0, 0.04 + h * 0.55 + r * 1.0, 0, B, 8));
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const st = box(0.012, h * 0.55, 0.012, Math.cos(a) * r * 0.78, 0.04, Math.sin(a) * r * 0.78, B); g.add(st); }
        const glow = shadeMat("#ffd79a"); shades.push(glow); const core = new T.Mesh(new T.SphereGeometry(r * 0.4, 16, 12), glow); core.position.y = 0.04 + h * 0.28; g.add(core);
        lamps.push([0, 0.04 + h * 0.3, 0, 0.6]);
        break;
      }
      case "vases": {
        const cols = [c, pal[2] || "#b98656", pal[3] || "#c4643a"];
        [[-w * 0.3, 0.9, 0.07], [0, 1, 0.09], [w * 0.3, 0.55, 0.06]].forEach(([x, k, r], i) => {
          const pts = []; for (let j = 0; j <= 12; j++) { const t = j / 12; pts.push(new T.Vector2(r * (0.55 + Math.sin(t * Math.PI) * 0.6) * (t > 0.85 ? 0.7 : 1), t * h * k)); }
          const v = new T.Mesh(new T.LatheGeometry(pts, 32), std(cols[i], { roughness: 0.35 })); v.position.set(x, 0, 0); g.add(shadow(v));
        });
        const br = cyl(0.004, 0.004, h * 0.7, 0, h, 0, std("#5a4632"), 5); br.rotation.z = 0.2; g.add(br);
        break;
      }
      case "curtain": {
        // two gathered panels: a wavy cloth surface, slightly translucent
        g.add(cyl(0.012, 0.012, w + 0.2, 0, h - 0.02, 0, metal("#2b2b2b", 0.4), 10)); g.children[0].rotation.z = Math.PI / 2; g.children[0].position.set(0, h - 0.02, 0);
        const pw = w * 0.42;
        for (const side of [-1, 1]) {
          const geo2 = new T.PlaneGeometry(pw, h - 0.05, 48, 8), pos = geo2.attributes.position;
          for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, Math.sin((x / pw + 0.5) * Math.PI * 14) * 0.035); }
          geo2.computeVertexNormals();
          const m = new T.Mesh(geo2, type === "ikatcurtain" ? new T.MeshPhysicalMaterial({ map: patternTex("ikat", c), roughness: 0.9, sheen: 0.5, side: T.DoubleSide }) : new T.MeshPhysicalMaterial({ color: c, roughness: 0.95, sheen: 0.6, side: T.DoubleSide, transparent: true, opacity: 0.93 }));
          m.position.set(side * (w / 2 - pw / 2), (h - 0.05) / 2, 0.02); g.add(shadow(m));
        }
        break;
      }
      // ---------- handmade in Uzbekistan ----------
      case "suzani": {
        const m = new T.Mesh(new T.BoxGeometry(w, h, 0.01), patMat("suzani", c)); m.position.y = h / 2; g.add(shadow(m));
        g.add(cyl(0.01, 0.01, w + 0.1, 0, h + 0.01, 0.01, wood("#6b4a33"), 8)); g.children[1].rotation.z = Math.PI / 2; g.children[1].position.set(0, h + 0.01, 0.01);
        for (let i = 0; i < 14; i++) g.add(box(0.012, 0.06, 0.004, -w / 2 + 0.05 + i * (w - 0.1) / 13, -0.06, 0, std(c)));
        break;
      }
      case "plates": {
        [[-w * 0.33, 0, 0.17], [0, h * 0.05, 0.2], [w * 0.33, -0.02, 0.15]].forEach(([x, y, r]) => {
          const pl = new T.Mesh(new T.CylinderGeometry(r, r * 0.8, 0.025, 48), [std("#f3efe6", { roughness: 0.2 }), patMat("rishtan", c, { roughness: 0.18 }), std("#f3efe6", { roughness: 0.2 })]);
          pl.rotation.x = Math.PI / 2; pl.position.set(x, h / 2 + y, 0.015); g.add(shadow(pl));
        });
        break;
      }
      case "xontaxta": {
        const M = wood(c);
        g.add(rbox(w, 0.05, d, 0, h - 0.05, 0, M, 0.01));
        // carved apron with a repeating relief and turned legs
        for (const s2 of [-1, 1]) { g.add(box(w - 0.1, 0.08, 0.025, 0, h - 0.13, s2 * (d / 2 - 0.04), M)); g.add(box(0.025, 0.08, d - 0.1, s2 * (w / 2 - 0.04), h - 0.13, 0, M)); }
        for (let i = 0; i < 9; i++) for (const s2 of [-1, 1]) g.add(rbox(0.05, 0.05, 0.012, -w / 2 + 0.12 + i * (w - 0.24) / 8, h - 0.115, s2 * (d / 2 - 0.025), wood(tone(c, 1.15)), 0.02));
        for (const a of [-1, 1]) for (const b of [-1, 1]) { const lg = new T.Mesh(new T.LatheGeometry([0, .2, .35, .5, .7, .85, 1].map((t, j) => new T.Vector2(0.03 + (j % 2) * 0.012, t * (h - 0.05))), 20), M); lg.position.set(a * (w / 2 - 0.06), 0, b * (d / 2 - 0.06)); g.add(shadow(lg)); }
        g.add(cyl(0.16, 0.12, 0.03, -w * 0.15, h, 0, std("#f3efe6", { roughness: 0.2 }), 32), cyl(0.05, 0.04, 0.09, w * 0.2, h, 0.05, std("#1f6f8b", { roughness: 0.2 }), 20));
        break;
      }
      case "sandiq": {
        const M = wood(c), brass = metal("#b5893f", 0.3);
        g.add(rbox(w, h - 0.05, d, 0, 0.05, 0, M, 0.01), rbox(w + 0.02, 0.06, d + 0.02, 0, h - 0.06, 0, wood(tone(c, 0.9)), 0.01));
        for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(box(0.06, 0.05, 0.06, a * (w / 2 - 0.03), 0, b * (d / 2 - 0.03), M));
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.add(rbox(w / 4 - 0.05, (h - 0.2) / 2 - 0.04, 0.012, -w / 2 + w / 8 + i * w / 4, 0.1 + j * (h - 0.2) / 2, d / 2, wood(tone(c, 1.12)), 0.015));
        for (const a of [-1, 1]) for (const yy of [0.05, h - 0.12]) g.add(box(0.07, 0.07, 0.008, a * (w / 2 - 0.035), yy, d / 2 + 0.006, brass));
        g.add(rbox(0.08, 0.1, 0.015, 0, h - 0.2, d / 2 + 0.008, brass, 0.01));
        break;
      }
      case "kurpacha": {
        const n = Math.max(1, Math.round(w / 0.6)), cw = w / n;
        for (let i = 0; i < n; i++) {
          g.add(rbox(cw - 0.02, h, d, -w / 2 + cw * (i + 0.5), 0, 0, new T.MeshPhysicalMaterial({ map: patternTex("ikat", i % 2 ? (pal[3] || "#c4643a") : c), roughness: 0.9, sheen: 0.5 }), 0.04));
          const pil = rbox(cw * 0.7, 0.32, 0.14, -w / 2 + cw * (i + 0.5), h, -d / 2 + 0.1, new T.MeshPhysicalMaterial({ map: patternTex("ikat", i % 2 ? c : "#1f4f7a"), roughness: 0.9, sheen: 0.5 }), 0.06); pil.rotation.x = -0.25; g.add(pil);
        }
        break;
      }
      case "cushion": {
        const m = rbox(w, h, d, 0, 0, 0, new T.MeshPhysicalMaterial({ map: patternTex("ikat", c), roughness: 0.9, sheen: 0.5 }), Math.min(h, w) * 0.45); g.add(m);
        break;
      }
      // ---------- more of what people look for ----------
      case "bunk": {
        const M = wood(c), F = fabric("#f4f1ea");
        for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(rbox(0.06, h, 0.06, a * (w / 2 - 0.03), 0, b * (d / 2 - 0.03), M, 0.012));
        for (const y of [0.25, 1.15]) { g.add(rbox(w - 0.04, 0.05, d - 0.04, 0, y, 0, M, 0.01), rbox(w - 0.1, 0.16, d - 0.12, 0, y + 0.05, 0, F, 0.05)); const pil = rbox(0.5, 0.1, 0.32, 0, y + 0.21, -d / 2 + 0.25, fabric("#ffffff"), 0.05); g.add(pil); g.add(rbox(w - 0.1, 0.05, d * 0.55, 0, y + 0.21, d * 0.18, fabric(pal[3] || "#c4643a"), 0.02)); }
        for (const b of [-1, 1]) g.add(rbox(0.04, 0.22, d - 0.08, w / 2 - 0.03, 1.4, 0, M, 0.01)); g.add(rbox(w - 0.1, 0.22, 0.04, 0, 1.4, -d / 2 + 0.03, M, 0.01));
        for (let i = 0; i < 5; i++) g.add(rbox(0.04, 0.03, 0.4, -w / 2 - 0.02, 0.3 + i * 0.28, d / 2 - 0.35, M, 0.01));
        g.add(rbox(0.04, 1.6, 0.04, -w / 2 - 0.02, 0, d / 2 - 0.15, M, 0.01), rbox(0.04, 1.6, 0.04, -w / 2 - 0.02, 0, d / 2 - 0.55, M, 0.01));
        break;
      }
      case "vitrine": {
        const M = wood(c), glass = new T.MeshPhysicalMaterial({ color: "#e8eef0", transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false });
        g.add(rbox(w, 0.08, d, 0, 0, 0, M, 0.01), rbox(w, 0.06, d, 0, h - 0.06, 0, M, 0.01), box(0.03, h, d, -w / 2 + 0.015, 0, 0, M), box(0.03, h, d, w / 2 - 0.015, 0, 0, M), box(w, h, 0.02, 0, 0, -d / 2 + 0.01, wood(tone(c, 0.82))));
        const n = 4, colsP = ["#f4f1ea", "#1f6f8b", "#c4643a", "#e8e0d0", "#b59a6a"];
        for (let i = 1; i < n; i++) { const y = 0.08 + i * (h - 0.14) / n; g.add(box(w - 0.06, 0.015, d - 0.04, 0, y, 0, glass));
          for (let k = 0; k < 5; k++) { const x = -w / 2 + 0.12 + k * (w - 0.24) / 4; if (k % 2) g.add(cyl(0.06, 0.05, 0.012, x, y + 0.015, 0, std(colsP[(i + k) % 5], { roughness: 0.2 }), 24)); else g.add(cyl(0.03, 0.04, 0.12 + (k % 3) * 0.04, x, y + 0.015, 0, std(colsP[(i + k) % 5], { roughness: 0.15 }), 18)); } }
        for (const a of [-1, 1]) { const dr = new T.Mesh(new T.BoxGeometry(w / 2 - 0.03, h - 0.14, 0.01), glass); dr.position.set(a * w / 4, h / 2, d / 2 - 0.005); g.add(dr); g.add(box(0.012, 0.12, 0.02, a * 0.03, h * 0.5, d / 2 + 0.005, metal("#b59a6a"))); }
        break;
      }
      case "tvwall": {
        const M = wood(c), W2 = std(pal[0] || "#ece4d8", { roughness: 0.5 });
        g.add(box(w, h, 0.03, 0, 0, -d / 2 + 0.015, W2));
        const sl = Math.round(w / 0.06); for (let i = 0; i < sl; i++) if (i < sl * 0.25 || i > sl * 0.75) g.add(box(0.035, h, 0.025, -w / 2 + 0.03 + i * (w - 0.06) / (sl - 1), 0, -d / 2 + 0.04, M));
        g.add(rbox(w * 0.6, 0.4, d - 0.06, 0, 0.12, 0.02, M, 0.01), box(w * 0.6 - 0.02, 0.12, 0.01, 0, 0, 0.02, std("#2b2621")));
        for (let i = 0; i < 3; i++) g.add(box(w * 0.6 / 3 - 0.01, 0.36, 0.012, -w * 0.2 + i * w * 0.2, 0.14, d / 2 - 0.02, wood(tone(c, 1.08))));
        g.add(rbox(1.23, 0.71, 0.05, 0, 1.0, -d / 2 + 0.06, std("#111", { roughness: 0.3 }), 0.01), box(1.21, 0.69, 0.003, 0, 1.01, -d / 2 + 0.086, std("#0b0f14", { roughness: 0.06, metalness: 0.35 })));
        const led = shadeMat("#fff0d4"); shades.push(led); g.add(box(w * 0.48, 0.01, 0.01, 0, h - 0.06, -d / 2 + 0.05, led));
        break;
      }
      case "coatrack": {
        const M = wood(c); g.add(cyl(0.16, 0.18, 0.03, 0, 0, 0, M, 32), cyl(0.02, 0.022, h, 0, 0.02, 0, M, 12));
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, hk = cyl(0.008, 0.008, 0.14, Math.cos(a) * 0.05, h - 0.18 - (k % 2) * 0.12, Math.sin(a) * 0.05, metal("#2b2b2b"), 6); hk.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(hk); }
        g.add(rbox(0.32, 0.5, 0.06, 0.12, h - 0.75, 0.08, fabric(pal[2] || "#8a6a4a"), 0.03));
        break;
      }
      case "chandelier": {
        const M = metal(c, 0.25), cry = new T.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.02, transmission: 0.6, thickness: 0.02, ior: 1.5, metalness: 0, transparent: true, opacity: 0.85 });
        g.add(cyl(0.005, 0.005, 0.4, 0, h, 0, M, 6), cyl(0.06, 0.04, 0.05, 0, h - 0.05, 0, M, 20), cyl(0.015, 0.015, h * 0.6, 0, h * 0.35, 0, M, 10));
        const glow = shadeMat("#fff2d6"); shades.push(glow);
        for (const [ry, rr, n] of [[h * 0.35, w * 0.45, 8], [h * 0.6, w * 0.3, 6]]) {
          const ring = new T.Mesh(new T.TorusGeometry(rr, 0.008, 8, 48), M); ring.rotation.x = Math.PI / 2; ring.position.y = ry; g.add(ring);
          for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, x = Math.cos(a) * rr, z = Math.sin(a) * rr; g.add(cyl(0.018, 0.022, 0.04, x, ry, z, M, 12)); const b2 = new T.Mesh(new T.SphereGeometry(0.025, 10, 8), glow); b2.position.set(x, ry + 0.07, z); b2.scale.y = 1.6; g.add(b2); }
          for (let k = 0; k < n * 3; k++) { const a = (k + 0.5) / (n * 3) * Math.PI * 2; const dr = new T.Mesh(new T.OctahedronGeometry(0.018, 0), cry); dr.scale.y = 1.8; dr.position.set(Math.cos(a) * rr, ry - 0.05 - (k % 3) * 0.03, Math.sin(a) * rr); g.add(dr); }
        }
        for (let k = 0; k < 12; k++) { const dr = new T.Mesh(new T.OctahedronGeometry(0.024, 0), cry); dr.scale.y = 2; dr.position.set(0, h * 0.12 - k * 0.012, 0); if (k === 0) g.add(dr); }
        lamps.push([0, h * 0.45, 0, 1.2]);
        break;
      }
      case "ringlight": {
        const M = metal(c, 0.3), glow = shadeMat("#fff4e0"); shades.push(glow);
        [[w / 2, 0.15], [w * 0.36, 0.0], [w * 0.22, -0.12]].forEach(([r, y], i) => { const t2 = new T.Mesh(new T.TorusGeometry(r, 0.012, 10, 72), M); t2.rotation.x = Math.PI / 2 + (i - 1) * 0.12; t2.position.y = h * 0.5 + y; g.add(t2); const lt = new T.Mesh(new T.TorusGeometry(r, 0.006, 6, 72), glow); lt.rotation.copy(t2.rotation); lt.position.set(0, t2.position.y - 0.012, 0); g.add(lt); });
        g.add(cyl(0.003, 0.003, h * 0.4 + 0.3, 0, h * 0.65, 0, std("#222"), 5));
        lamps.push([0, h * 0.4, 0, 1]);
        break;
      }
      case "clock": {
        const f = new T.Mesh(new T.CylinderGeometry(w / 2, w / 2, 0.035, 64), [wood("#3a2f26"), std("#f4efe6", { roughness: 0.5 }), wood("#3a2f26")]); f.rotation.x = Math.PI / 2; f.position.set(0, h / 2, 0); g.add(shadow(f));
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.add(box(0.008, k % 3 ? 0.02 : 0.04, 0.004, Math.sin(a) * w * 0.4, h / 2 + Math.cos(a) * w * 0.4 - 0.01, 0.019, std("#1f1f1f"))); }
        const hh = box(0.01, w * 0.22, 0.004, 0, h / 2, 0.022, std("#1f1f1f")); hh.rotation.z = -0.9; g.add(hh); const mh = box(0.006, w * 0.34, 0.004, 0, h / 2, 0.024, std("#1f1f1f")); mh.rotation.z = 2.4; g.add(mh);
        break;
      }
      case "hood": {
        // chimney hood: stainless canopy, mesh grease filters underneath, two LED spots, telescopic chimney
        const M = std(c, { roughness: 0.28, metalness: 0.7 }), ch = 0.12;
        g.add(rbox(w, 0.05, d, 0, 0, 0, M, 0.006));
        const can = new T.Mesh(new T.CylinderGeometry(Math.SQRT2 * 0.17, Math.SQRT2 * w * 0.5, ch, 4, 1), M); can.rotation.y = Math.PI / 4; can.position.y = 0.05 + ch / 2; can.scale.z = d / w; g.add(shadow(can));
        for (const a of [-1, 1]) { g.add(box(w * 0.38, 0.003, d * 0.7, a * w * 0.21, -0.002, 0, std("#8e9194", { roughness: 0.5, metalness: 0.8 }))); for (let k = 0; k < 9; k++) g.add(box(w * 0.38, 0.002, 0.004, a * w * 0.21, -0.004, -d * 0.33 + k * d * 0.08, std("#6e7174", { metalness: 0.8, roughness: 0.4 }))); }
        const led = shadeMat("#fff6e2"); shades.push(led); for (const a of [-1, 1]) g.add(cyl(0.025, 0.025, 0.004, a * w * 0.42, -0.005, d * 0.3, led, 20));
        g.add(box(0.3, h - 0.17, 0.26, 0, 0.17, -d / 2 + 0.15, M), box(0.29, (h - 0.17) * 0.5, 0.25, 0, 0.17 + (h - 0.17) * 0.5, -d / 2 + 0.15, std(c, { roughness: 0.22, metalness: 0.75 })));
        for (let k = 0; k < 4; k++) g.add(box(0.02, 0.008, 0.004, -0.06 + k * 0.04, 0.025, d / 2 + 0.001, std("#1a1b1c")));
        break;
      }
      case "washer": {
        // front-loader: worktop, control panel with detergent drawer, programme dial, display and buttons,
        // a porthole door (chrome ring, tinted glass bowl) over a perforated drum, feet and a service flap
        const W2 = std(c, { roughness: 0.32 }), ph = 0.13, cx = 0, cy = (h - ph) * 0.5 + 0.02, R = Math.min(w, h) * 0.3;
        g.add(rbox(w, h - 0.02, d - 0.01, 0, 0.02, -0.005, W2, 0.012), rbox(w + 0.004, 0.02, d, 0, h - 0.02, 0, std(tone(c, 0.97), { roughness: 0.4 }), 0.006));
        for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(cyl(0.02, 0.022, 0.025, a * (w / 2 - 0.05), 0, b * (d / 2 - 0.06), std("#2a2b2c"), 14));
        const panelY = h - 0.02 - ph;
        g.add(box(w - 0.004, 0.003, 0.004, 0, panelY, d / 2 - 0.004, std("#cfcfcb")));
        g.add(rbox(w * 0.3, ph - 0.03, 0.012, -w / 2 + w * 0.17, panelY + 0.015, d / 2 - 0.002, std(tone(c, 0.98), { roughness: 0.3 }), 0.006), box(w * 0.14, 0.014, 0.004, -w / 2 + w * 0.17, panelY + 0.03, d / 2 + 0.005, std("#c9c9c5")));
        const dial = cyl(0.032, 0.034, 0.025, w * 0.12, 0, 0, metal("#c8cbce", 0.25), 32); dial.rotation.x = Math.PI / 2; dial.position.set(w * 0.06, panelY + ph / 2, d / 2 + 0.008); g.add(dial);
        g.add(box(0.004, 0.02, 0.004, w * 0.06, panelY + ph / 2 + 0.01, d / 2 + 0.022, std("#333")));
        const disp = shadeMat("#7fe0ff"); shades.push(disp); g.add(rbox(0.09, 0.04, 0.004, w * 0.3, panelY + ph / 2 - 0.01, d / 2 + 0.001, std("#0a0b0c", { roughness: 0.1 }), 0.004), box(0.05, 0.014, 0.002, w * 0.3, panelY + ph / 2 - 0.005, d / 2 + 0.004, disp));
        for (let k = 0; k < 4; k++) { const bt = cyl(0.007, 0.007, 0.006, 0, 0, 0, std("#9fa2a5", { roughness: 0.3 }), 12); bt.rotation.x = Math.PI / 2; bt.position.set(w * 0.22 + k * 0.03, panelY + 0.025, d / 2 + 0.003); g.add(bt); }
        // door
        const drum = new T.Mesh(new T.CylinderGeometry(R * 0.86, R * 0.86, 0.3, 40, 1, true), std("#9da1a5", { metalness: 0.9, roughness: 0.35, side: T.BackSide })); drum.rotation.x = Math.PI / 2; drum.position.set(cx, cy, d / 2 - 0.16); g.add(drum);
        const back = new T.Mesh(new T.CircleGeometry(R * 0.86, 40), std("#7d8185", { metalness: 0.9, roughness: 0.4 })); back.position.set(cx, cy, d / 2 - 0.3); g.add(back);
        for (let k = 0; k < 3; k++) { const pad = box(0.03, 0.02, 0.24, 0, 0, 0, std("#b9bcbf", { metalness: 0.8, roughness: 0.3 })); const a = k / 3 * Math.PI * 2; pad.position.set(cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8 - 0.01, d / 2 - 0.16); pad.rotation.z = a; g.add(pad); }
        const outer = new T.Mesh(new T.TorusGeometry(R, 0.028, 16, 64), metal("#d0d3d6", 0.18)); outer.position.set(cx, cy, d / 2 + 0.02); outer.scale.z = 0.6; g.add(shadow(outer));
        const inner = new T.Mesh(new T.TorusGeometry(R * 0.82, 0.02, 12, 56), std("#2c2f33", { roughness: 0.3 })); inner.position.set(cx, cy, d / 2 + 0.03); g.add(inner);
        const bowl = new T.Mesh(new T.SphereGeometry(R * 0.8, 40, 16, 0, Math.PI * 2, 0, 0.7), new T.MeshPhysicalMaterial({ color: "#3a4650", transparent: true, opacity: 0.45, roughness: 0.03, metalness: 0.2, clearcoat: 1, depthWrite: false }));
        bowl.rotation.x = Math.PI / 2; bowl.position.set(cx, cy, d / 2 - 0.06); g.add(bowl);
        g.add(rbox(0.03, 0.08, 0.03, cx + R + 0.005, cy - 0.04, d / 2 + 0.01, std("#d9d9d5", { roughness: 0.3 }), 0.01));
        g.add(rbox(0.12, 0.08, 0.006, -w / 2 + 0.1, 0.06, d / 2 - 0.002, std(tone(c, 0.97), { roughness: 0.4 }), 0.005));
        break;
      }
      case "aircon": {
        // split unit: front panel with a seam, top intake grille, bottom outlet with an angled louvre, status lights
        const W2 = std(c, { roughness: 0.35 });
        g.add(rbox(w, h, d, 0, 0, 0, W2, 0.06), rbox(w - 0.01, h * 0.62, 0.01, 0, h * 0.34, d / 2 - 0.004, std(tone(c, 1.02), { roughness: 0.28 }), 0.004));
        for (let k = 0; k < 14; k++) g.add(box(w - 0.12, 0.004, 0.012, 0, h - 0.002, -d / 2 + 0.03 + k * (d - 0.06) / 13, std(tone(c, 0.85))));
        g.add(box(w - 0.08, 0.05, d * 0.5, 0, 0.012, d * 0.12, std("#2c2e30", { roughness: 0.8 })));
        for (let k = 0; k < 10; k++) g.add(box(0.004, 0.04, d * 0.4, -w * 0.4 + k * w * 0.089, 0.016, d * 0.12, std("#cfd2d4")));
        const lv = box(w - 0.1, 0.006, 0.07, 0, 0.04, d / 2 - 0.02, std(tone(c, 0.96), { roughness: 0.3 })); lv.rotation.x = 0.45; g.add(lv);
        const led = shadeMat("#9fe3ff"); shades.push(led); g.add(box(0.014, 0.006, 0.004, w * 0.38, h * 0.3, d / 2 + 0.002, led), box(0.014, 0.006, 0.004, w * 0.41, h * 0.3, d / 2 + 0.002, led));
        g.add(box(0.06, 0.016, 0.003, w * 0.395, h * 0.38, d / 2 + 0.002, std("#2c2e30", { roughness: 0.1 })));
        break;
      }
      case "freebath": {
        const W2 = std("#f7f7f5", { roughness: 0.1 });
        const pts = []; for (let j = 0; j <= 14; j++) { const t = j / 14; pts.push(new T.Vector2(0.48 + Math.sin(t * Math.PI * 0.5) * 0.06 - (t < 0.1 ? (0.1 - t) * 2 : 0), t * h)); }
        const tub = new T.Mesh(new T.LatheGeometry(pts, 64), W2); tub.scale.set(w / 1.08, 1, d / 1.08); g.add(shadow(tub));
        const inner = new T.Mesh(new T.CircleGeometry(0.5, 64), std("#e7ecee", { roughness: 0.08 })); inner.rotation.x = -Math.PI / 2; inner.position.y = h - 0.03; inner.scale.set(w / 1.12, d / 1.12, 1); g.add(inner);
        const tp = cyl(0.015, 0.02, 0.95, -w / 2 - 0.12, 0, 0, metal(pal[3] ? "#b59a6a" : "#c9cbcc", 0.2), 14); g.add(tp); g.add(box(0.025, 0.025, 0.2, -w / 2 - 0.12, 0.93, 0.08, metal("#c9cbcc", 0.2)));
        break;
      }
      case "teepee": {
        const F = new T.MeshPhysicalMaterial({ color: c, roughness: 0.95, sheen: 0.5, side: T.DoubleSide });
        const tent = new T.Mesh(new T.ConeGeometry(w / 2, h * 0.85, 5, 1, true, 0.35, Math.PI * 2 - 0.7), F); tent.position.y = h * 0.425; g.add(shadow(tent));
        for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + 0.6, pole = cyl(0.012, 0.012, h * 1.02, 0, 0, 0, wood("#c4a074"), 6); pole.position.set(Math.cos(a) * w * 0.24, h * 0.5, Math.sin(a) * w * 0.24); pole.rotation.set(Math.sin(a) * 0.48, 0, -Math.cos(a) * 0.48); g.add(pole); }
        g.add(cyl(w * 0.4, w * 0.4, 0.06, 0, 0, 0, fabric(pal[3] || "#e8c9a0"), 32));
        break;
      }
      case "tapchan": {
        const M = wood(c), legH = 0.42;
        for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(rbox(0.08, legH, 0.08, a * (w / 2 - 0.05), 0, b * (d / 2 - 0.05), M, 0.01));
        g.add(rbox(w, 0.06, d, 0, legH, 0, M, 0.01));
        // carved low rails on three sides
        g.add(rbox(w, 0.06, 0.05, 0, legH + 0.32, -d / 2 + 0.025, M, 0.01)); for (const a of [-1, 1]) g.add(rbox(0.05, 0.06, d, a * (w / 2 - 0.025), legH + 0.32, 0, M, 0.01));
        for (let i = 0; i < Math.round(w / 0.12); i++) g.add(cyl(0.012, 0.012, 0.28, -w / 2 + 0.08 + i * 0.12, legH + 0.05, -d / 2 + 0.025, M, 8));
        for (const a of [-1, 1]) for (let i = 0; i < Math.round(d / 0.12); i++) g.add(cyl(0.012, 0.012, 0.28, a * (w / 2 - 0.025), legH + 0.05, -d / 2 + 0.08 + i * 0.12, M, 8));
        // kurpacha mats, bolsters and a xontaxta with tea
        g.add(rbox(w - 0.14, 0.07, d - 0.14, 0, legH + 0.06, 0, new T.MeshPhysicalMaterial({ map: patternTex("ikat", pal[3] || "#8e2c2c"), roughness: 0.9, sheen: 0.5 }), 0.03));
        for (let i = 0; i < 3; i++) { const pl = rbox(0.5, 0.3, 0.14, -w / 3 + i * w / 3, legH + 0.13, -d / 2 + 0.14, new T.MeshPhysicalMaterial({ map: patternTex("ikat", i % 2 ? "#1f4f7a" : "#a23b2a"), roughness: 0.9, sheen: 0.5 }), 0.06); pl.rotation.x = -0.25; g.add(pl); }
        g.add(rbox(0.8, 0.04, 0.55, 0, legH + 0.37, 0.12, M, 0.01)); for (const a of [-1, 1]) for (const b of [-1, 1]) g.add(cyl(0.02, 0.02, 0.24, a * 0.34, legH + 0.13, 0.12 + b * 0.22, M, 8));
        g.add(cyl(0.07, 0.05, 0.1, -0.15, legH + 0.41, 0.12, std("#1f6f8b", { roughness: 0.2 }), 20), cyl(0.16, 0.12, 0.025, 0.15, legH + 0.41, 0.12, std("#f3efe6", { roughness: 0.2 }), 32));
        break;
      }
      case "beshik": {
        const M = wood(c);
        for (const a of [-1, 1]) {
          const end = new T.Mesh(new T.CylinderGeometry(d / 2, d / 2, 0.04, 32, 1, false, 0, Math.PI), M); end.rotation.set(0, 0, Math.PI / 2); end.rotation.y = Math.PI / 2; end.position.set(a * (w / 2 - 0.02), 0.32, 0); g.add(shadow(end));
          const rocker = new T.Mesh(new T.TorusGeometry(d * 0.7, 0.025, 8, 24, Math.PI * 0.45), M); rocker.rotation.set(0, Math.PI / 2, Math.PI * 1.275); rocker.position.set(a * (w / 2 - 0.02), d * 0.7 - 0.02, 0); g.add(shadow(rocker));
          g.add(rbox(0.05, h - 0.32, 0.05, a * (w / 2 - 0.02), 0.32, 0, M, 0.01));
        }
        g.add(rbox(w, 0.04, 0.05, 0, h - 0.04, 0, M, 0.01));
        g.add(rbox(w - 0.08, 0.2, d * 0.75, 0, 0.3, 0, new T.MeshPhysicalMaterial({ map: patternTex("ikat", pal[3] || "#c4643a"), roughness: 0.9, sheen: 0.5 }), 0.06));
        for (let i = 0; i < 6; i++) g.add(cyl(0.008, 0.008, 0.18, -w / 2 + 0.1 + i * (w - 0.2) / 5, 0.46, d * 0.36, M, 6));
        break;
      }
      case "carvedpanel": {
        const M = wood(c), hi = wood(tone(c, 1.18));
        g.add(rbox(w, h, d, 0, 0, 0, M, 0.01));
        const nx = Math.max(2, Math.round(w / 0.3)), ny = Math.max(3, Math.round(h / 0.3));
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
          const x = -w / 2 + (i + 0.5) * w / nx, y = (j + 0.5) * h / ny;
          const star = new T.Mesh(new T.CylinderGeometry(Math.min(w / nx, h / ny) * 0.36, Math.min(w / nx, h / ny) * 0.36, 0.014, 8), hi); star.rotation.x = Math.PI / 2; star.position.set(x, y, d / 2 + 0.006); g.add(shadow(star));
          const inner = new T.Mesh(new T.CylinderGeometry(Math.min(w / nx, h / ny) * 0.18, Math.min(w / nx, h / ny) * 0.18, 0.018, 4), M); inner.rotation.set(Math.PI / 2, 0, Math.PI / 4); inner.position.set(x, y, d / 2 + 0.01); g.add(inner);
        }
        break;
      }
      case "beanbag": {
        const F = fabric(c), m = new T.Mesh(new T.SphereGeometry(w / 2, 40, 24), F); m.scale.set(1, h / w * 1.1, d / w); m.position.y = h * 0.5; g.add(shadow(m));
        const top = new T.Mesh(new T.SphereGeometry(w * 0.32, 32, 16), F); top.scale.set(1, 0.45, 0.9); top.position.set(0, h * 0.82, -d * 0.12); g.add(shadow(top));
        break;
      }
      case "box": g.add(rbox(w, Math.max(h, 0.03), d, 0, 0, 0, wood(c), 0.005)); if (type === "wallshelf") { g.add(cyl(0.05, 0.04, 0.14, -w * 0.25, h, 0, std("#e9e4da", { roughness: 0.25 }), 20)); for (let i = 0; i < 5; i++) g.add(box(0.03, 0.2, 0.15, w * 0.1 + i * 0.035, h, 0, std(["#2f3e46", "#c4643a", "#e8e0d0", "#8a5a3a", "#3f5f2a"][i]))); } break;
      default: g.add(rbox(w, h, d, 0, 0, 0, std(c), 0.02));
    }
    g.userData.ready = (realKit && realKit.attach(g, Object.assign({}, it, { type }), DEF_COLOR[type])) || Promise.resolve(g);
    return g;
  }
  return { buildItem, hasReal: t => !!(realKit && realKit.has(t)), preload: types => realKit ? realKit.preload(types) : Promise.resolve(), floorTex, artTex, std, fabric, wood, metal, rbox, box, cyl, shadeMat };
}
