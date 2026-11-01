// Makon — one furniture library for every 3D view (Studio, home page, catalogue pictures).
// Real-size pieces with rounded upholstery, wood, metal and fabric materials. y = 0 is the floor.
// Lamps report where their light sits (g.userData.lamps) and their shades (g.userData.shades) so a view can switch them on.
export function createKit(T, RoundedBoxGeometry, { anisotropy = 8 } = {}) {
  const cache = new Map();
  const std = (c, o = {}) => { const k = "s" + c + JSON.stringify(o); if (!cache.has(k)) cache.set(k, new T.MeshStandardMaterial({ color: c, roughness: 0.6, ...o })); return cache.get(k); };
  const fabric = c => { const k = "f" + c; if (!cache.has(k)) cache.set(k, new T.MeshPhysicalMaterial({ color: c, roughness: 0.92, sheen: 0.6, sheenRoughness: 0.7, sheenColor: new T.Color(c).offsetHSL(0, -0.05, 0.12) })); return cache.get(k); };
  const wood = c => std(c, { roughness: 0.46 });
  const metal = (c = "#b9bcbf", r = 0.3) => std(c, { metalness: 1, roughness: r });
  const glassy = () => std("#dfe7eb", { metalness: 0.35, roughness: 0.06, envMapIntensity: 1.6 });
  const tone = (c, k) => "#" + new T.Color(c).multiplyScalar(k).getHexString();
  const mix = (a, b, k) => "#" + new T.Color(a).lerp(new T.Color(b), k).getHexString();
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // ---------- textures ----------
  function floorTex(FLOORS, key, S = 1024) {
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
    const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(0.5, 0.5); t.colorSpace = T.SRGBColorSpace; t.anisotropy = anisotropy; return t;
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
      case "tv": g.add(rbox(w, h, d, 0, 0, 0, std("#111111", { roughness: 0.3 }), 0.01), box(w - 0.025, h - 0.025, 0.003, 0, 0.0125, d / 2, std("#0b0f14", { roughness: 0.06, metalness: 0.35 }))); break;
      case "counter": case "sink": case "stove": {
        const M = std(c, { roughness: 0.4 }), n = Math.max(1, Math.round(w / 0.6));
        g.add(box(w - 0.01, 0.1, d - 0.06, 0, 0, -0.03, std("#2b2b2b")), rbox(w - 0.004, h - 0.14, d - 0.03, 0, 0.1, 0, M, 0.006));
        if (it.shape !== "stove") for (let i = 0; i < n; i++) { g.add(rbox(w / n - 0.008, h - 0.16, 0.012, -w / 2 + w / n * (i + 0.5), 0.11, d / 2 - 0.012, std(tone(c, 1.03), { roughness: 0.4 }), 0.003)); g.add(rbox(Math.min(0.3, w / n - 0.15), 0.012, 0.02, -w / 2 + w / n * (i + 0.5), h - 0.12, d / 2, metal("#9a9da1", 0.3), 0.005)); }
        g.add(rbox(w + 0.01, 0.04, d + 0.02, 0, h - 0.04, 0, std(it.shape === "stove" ? "#141414" : (type === "island" ? "#e6e2db" : "#e6e2db"), { roughness: 0.18 }), 0.006));
        if (it.shape === "sink") g.add(rbox(Math.min(0.5, w * 0.62), 0.012, Math.min(0.38, d * 0.6), 0, h - 0.004, 0.01, metal("#cfd3d6", 0.22), 0.03), cyl(0.014, 0.014, 0.28, 0, h, -d / 2 + 0.12, metal("#c9cbcc", 0.15), 12), box(0.02, 0.02, 0.18, 0, h + 0.26, -d / 2 + 0.2, metal("#c9cbcc", 0.15)));
        if (it.shape === "stove") {
          g.add(rbox(w - 0.04, h * 0.5, 0.012, 0, 0.16, d / 2 - 0.005, std("#1c1c1c", { roughness: 0.1, metalness: 0.4 }), 0.006), rbox(w * 0.6, 0.02, 0.025, 0, h * 0.7, d / 2 + 0.01, metal("#b9bcbf"), 0.008));
          for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cyl(0.085, 0.085, 0.004, a * w * 0.22, h, b * d * 0.2, std("#3a3a3a"), 32));
        }
        if (type === "island") { for (const s of [-0.3, 0.3]) g.add(cyl(0.05, 0.04, 0.16, s * w, h, 0.05, std(pal[4] || "#efe7da", { roughness: 0.2 }), 20)); }
        break;
      }
      case "fridge": {
        const M = std(c, { roughness: 0.28, metalness: 0.25 });
        g.add(rbox(w, h, d - 0.03, 0, 0, -0.015, M, 0.015), rbox(w - 0.006, h * 0.64 - 0.01, 0.03, 0, h * 0.36 + 0.005, d / 2 - 0.015, M, 0.01), rbox(w - 0.006, h * 0.36 - 0.012, 0.03, 0, 0.005, d / 2 - 0.015, M, 0.01));
        g.add(rbox(0.022, 0.42, 0.035, -w / 2 + 0.07, h * 0.6, d / 2 + 0.01, metal("#b9bcbf"), 0.008), rbox(0.022, 0.28, 0.035, -w / 2 + 0.07, h * 0.12, d / 2 + 0.01, metal("#b9bcbf"), 0.008));
        break;
      }
      case "bath": {
        const W = std("#f6f6f4", { roughness: 0.12 });
        g.add(rbox(w, h, d, 0, 0, 0, W, 0.05), rbox(w - 0.12, 0.02, d - 0.12, 0, h - 0.035, 0, std("#e3e9ec", { roughness: 0.08 }), 0.04));
        g.add(cyl(0.018, 0.018, 0.18, -w / 2 + 0.12, h, 0, metal("#c9cbcc", 0.15), 12), box(0.02, 0.02, 0.12, -w / 2 + 0.12, h + 0.16, 0.06, metal("#c9cbcc", 0.15)));
        break;
      }
      case "shower": {
        g.add(rbox(w, 0.05, d, 0, 0, 0, std("#f6f6f4", { roughness: 0.15 }), 0.01));
        const gl = new T.MeshPhysicalMaterial({ color: "#dfeaf0", transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1, depthWrite: false });
        const p1 = new T.Mesh(new T.BoxGeometry(w, h - 0.05, 0.008), gl); p1.position.set(0, h / 2, d / 2); const p2 = new T.Mesh(new T.BoxGeometry(0.008, h - 0.05, d), gl); p2.position.set(w / 2, h / 2, 0); g.add(p1, p2);
        g.add(box(0.02, h - 0.05, 0.02, w / 2, 0.05, d / 2, metal("#c9cbcc", 0.2)), cyl(0.1, 0.1, 0.015, 0, h - 0.12, -d / 2 + 0.22, metal("#c9cbcc", 0.15), 32), box(0.02, 0.02, 0.2, 0, h - 0.1, -d / 2 + 0.1, metal("#c9cbcc", 0.15)));
        break;
      }
      case "toilet": {
        const W = std("#f6f6f4", { roughness: 0.12 });
        const b = cyl(0.18, 0.13, 0.4, 0, 0, 0.06, W, 40); b.scale.z = 1.3; g.add(b);
        const seat = new T.Mesh(new T.TorusGeometry(0.15, 0.025, 12, 40), W); seat.rotation.x = Math.PI / 2; seat.scale.y = 1.3; seat.position.set(0, 0.41, 0.06); g.add(shadow(seat));
        g.add(rbox(w, 0.38, 0.17, 0, 0.4, -d / 2 + 0.085, W, 0.03), rbox(0.05, 0.015, 0.03, 0, 0.78, -d / 2 + 0.085, metal("#c9cbcc"), 0.006));
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
        const M = std(c, { roughness: 0.3, metalness: 0.6 });
        g.add(rbox(w, 0.08, d, 0, 0, 0, M, 0.01)); const sh = new T.Mesh(new T.CylinderGeometry(0.16, w * 0.5, 0.25, 4, 1), M); sh.rotation.y = Math.PI / 4; sh.position.y = 0.205; sh.scale.z = d / w; g.add(shadow(sh));
        g.add(box(0.3, h - 0.33, 0.25, 0, 0.33, -d / 2 + 0.15, M));
        break;
      }
      case "washer": {
        const W2 = std(c, { roughness: 0.3 });
        g.add(rbox(w, h, d, 0, 0, 0, W2, 0.02), rbox(w - 0.04, 0.1, 0.01, 0, h - 0.13, d / 2, std("#dcdcd8", { roughness: 0.3 }), 0.01));
        const door = new T.Mesh(new T.TorusGeometry(0.19, 0.03, 16, 48), metal("#bfc3c6", 0.25)); door.position.set(0, h * 0.42, d / 2 + 0.01); g.add(shadow(door));
        const gl = new T.Mesh(new T.CircleGeometry(0.17, 40), new T.MeshPhysicalMaterial({ color: "#2a3640", roughness: 0.05, metalness: 0.3 })); gl.position.set(0, h * 0.42, d / 2 + 0.012); g.add(gl);
        g.add(cyl(0.025, 0.025, 0.02, w * 0.3, h - 0.1, d / 2 - 0.0, std("#333"), 20)); g.children[g.children.length - 1].rotation.x = Math.PI / 2;
        break;
      }
      case "aircon": {
        const W2 = std(c, { roughness: 0.35 });
        g.add(rbox(w, h, d, 0, 0, 0, W2, 0.06), box(w - 0.08, 0.02, 0.01, 0, 0.03, d / 2 - 0.005, std("#c9ccce")), box(w - 0.1, 0.008, 0.012, 0, 0.07, d / 2, std("#dfe2e3")));
        const led = shadeMat("#9fe3ff"); shades.push(led); g.add(box(0.03, 0.01, 0.005, w * 0.38, h * 0.55, d / 2 + 0.002, led));
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
    return g;
  }
  return { buildItem, floorTex, artTex, std, fabric, wood, metal, rbox, box, cyl, shadeMat };
}
