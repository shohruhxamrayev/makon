// Makon Studio — 3D view built from the plan (three.js, loaded on first use)
import { $, $$, el, toast, download, fmtLen, fmtArea } from "./util.js";
import { STYLES, FLOORS, LIGHT_NAMES } from "./data.js";
import { loops, polyArea, polyCentroid, bounds, wlen, lerp, vkey } from "./geom.js";

let ctx, T = null, OrbitControls = null, loading = null, kit = null, RoomEnv = null;
let renderer, scene, persp, ortho, cam, controls, root, sun, hemi, raycaster, floorPlane;
let host, built = false, dirty = true, camMode = "persp", cutaway = true, shadows = true, running = false;
let wallsMeta = [], itemGroups = new Map(), center = [2.4, 1.8], span = 6, bb = null;
let drag = null, downAt = null, tapPick = null;
let ground = null, glassMat = null, lampSpots = [], lampMats = [], moodLights = null, turning = false;
const mats = new Map();

export function init(c) {
  ctx = c;
  host = $("#three-host");
  $$("#three-tb [data-cam]").forEach(b => b.addEventListener("click", () => setCam(b.dataset.cam)));
  $("#t-reset").addEventListener("click", () => setCam(camMode, true));
  $$("#nav-pad [data-nav]").forEach(b => {
    let rep = null;
    const stop = () => { clearInterval(rep); rep = null; };
    b.addEventListener("pointerdown", e => { e.preventDefault(); nav(b.dataset.nav); stop(); rep = setInterval(() => nav(b.dataset.nav), 280); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(t => b.addEventListener(t, stop));
    b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nav(b.dataset.nav); } });
  });
  $$("#drag-mode [data-drag]").forEach(b => b.addEventListener("click", () => { dragMode = b.dataset.drag; try { localStorage.setItem("makon_drag3d", dragMode); } catch (e) {} applyDrag(); }));
  $("#three-goplan").addEventListener("click", () => ctx.setMode("plan"));
  $("#t-cut").addEventListener("change", e => { cutaway = e.target.checked; frame(); });
  $("#t-shadow").addEventListener("change", e => { shadows = e.target.checked; if (renderer) { renderer.shadowMap.enabled = shadows; sun.castShadow = shadows; rebuild(); } });
  $("#t-sun").addEventListener("input", e => { ctx.p.design.light = +e.target.value; $("#sun-out").textContent = sunName(+e.target.value); placeSun(); frame(); ctx.save(); });
  $("#t-snap").addEventListener("click", snapshot);
  $("#t-use").addEventListener("click", useInDesign);
  $$("#three-act [data-mood]").forEach(b => b.addEventListener("click", () => { ctx.p.finish.mood = b.dataset.mood; ctx.save(); applyMood(); }));
  $("#t-turn").addEventListener("click", () => setTurn(!turning));
  $("#sb-rot").addEventListener("click", () => ctx.planOps.rotateSelected(90));
  $("#sb-del").addEventListener("click", () => ctx.planOps.removeSelected());
  $("#sb-done").addEventListener("click", () => ctx.select(null));
  ctx.capture3D = capture;
  const ff = $("#f-floor");
  Object.entries(FLOORS).forEach(([k, f]) => ff.append(el("option", { value: k, text: f.name })));
  ff.addEventListener("change", () => { ctx.p.finish.floor = ff.value; ctx.save(); rebuild(); });
  $("#f-wall").addEventListener("input", e => { ctx.p.finish.wall = e.target.value; ctx.save(); recolourWalls(); });
  $("#f-reset").addEventListener("click", () => { ctx.p.finish = { wall: null, floor: null }; ctx.save(); renderInspector(); rebuild(); });
  document.addEventListener("keydown", onKey);

  new ResizeObserver(() => resize()).observe(host);
  ctx.bus.on("project", () => { dirty = true; camReset = true; renderInspector(); if (visible()) show(); });
  ctx.bus.on("plan", () => { dirty = true; if (visible()) show(); renderInspector(); });
  ctx.bus.on("style", () => { dirty = true; renderInspector(); });
  ctx.bus.on("light", () => { renderInspector(); placeSun(); });
  ctx.bus.on("select", () => { highlight(); renderInspector(); selBar(); });
  ctx.bus.on("mode", () => { if (visible()) show(); else { running = false; setTurn(false); } renderInspector(); selBar(); });
}
let camReset = true;
const visible = () => !$("#st-three").hidden;
const sunName = d => "from the " + (LIGHT_NAMES[d] || d + "°");
const style = () => STYLES[ctx.p.design.style] || STYLES.warm;
const wallColour = () => ctx.p.finish.wall || style().wall;
const floorKey = () => ctx.p.finish.floor || style().floor;

async function load() {
  if (T) return true;
  if (!loading) loading = Promise.all([import("../../vendor/three.module.min.js"), import("../../vendor/OrbitControls.js"), import("../../vendor/RoundedBoxGeometry.js"), import("../../vendor/RoomEnvironment.js"), import("./models.js")])
    .then(([a, b, rb, re, mo]) => { T = a; OrbitControls = b.OrbitControls; RoomEnv = re.RoomEnvironment; kit = mo.createKit(a, rb.RoundedBoxGeometry); });
  try { await loading; return true; } catch (e) { console.error(e); loading = null; return false; }
}

async function show() {
  const p = ctx.p;
  $("#three-empty").hidden = !!p.plan.walls.length || !!p.plan.items.length;
  $("#three-hint").hidden = !$("#three-empty").hidden ? true : false;
  if (!(await load())) { host.innerHTML = '<p class="three-err">Couldn\'t load the 3D engine. Check your connection and reload.</p>'; return; }
  if (!renderer && !setup()) return;
  if (dirty) rebuild();
  if (camReset) { setCam(camMode, true); camReset = false; }
  resize();
  if (!running) { running = true; loop(); }
}

function setup() {
  try {
    renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  } catch (e) {
    host.innerHTML = '<p class="three-err">3D needs WebGL, which this browser or device has turned off.</p>';
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.append(renderer.domElement);
  scene = new T.Scene();
  scene.background = new T.Color("#e9e3d8");
  scene.fog = new T.Fog("#e9e3d8", 30, 80);
  // soft studio reflections so wood, fabric and metal read as real materials
  try { const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnv(), 0.04).texture; scene.environmentIntensity = 0.5; pm.dispose(); } catch (e) { console.warn(e); }
  persp = new T.PerspectiveCamera(45, 1, 0.05, 200);
  ortho = new T.OrthographicCamera(-5, 5, 5, -5, 0.05, 200);
  hemi = new T.HemisphereLight("#fff8ee", "#b8ab98", 0.7); scene.add(hemi);
  sun = new T.DirectionalLight("#fff1dc", 2.2);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  // a big ground so the room doesn't float
  ground = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshStandardMaterial({ color: "#ddd5c8", roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.011; ground.receiveShadow = true; scene.add(ground);
  const grid = new T.GridHelper(200, 200, "#cfc6b6", "#d8d0c2"); grid.position.y = -0.01; grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);
  raycaster = new T.Raycaster();
  floorPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const cv = renderer.domElement;
  cv.addEventListener("pointerdown", onDown);
  cv.addEventListener("pointerdown", hideCoach, { once: true });
  showCoach();
  cv.addEventListener("pointermove", onMove);
  cv.addEventListener("pointerup", onUp);
  cv.addEventListener("pointercancel", onUp);
  cv.addEventListener("webglcontextlost", e => { e.preventDefault(); toast("3D view paused — the graphics chip reset. It will resume.", "error"); });
  return true;
}

// a one-time picture of the gestures on phones
function showCoach() {
  if (!coarsePtr) return;
  try { if (localStorage.getItem("makon_coach3d")) return; } catch (e) {}
  const c = el("div", { class: "coach", "aria-hidden": "true", html: '<div><span class="g1"></span><b>Drag</b> to turn</div><div><span class="g2"></span><b>Pinch</b> to zoom</div><div><span class="g3"></span><b>Tap</b> a piece, then drag it</div>' });
  host.parentElement.append(c); requestAnimationFrame(() => c.classList.add("show"));
  setTimeout(hideCoach, 10000);
}
function hideCoach() {
  const c = document.querySelector(".coach"); if (!c) return;
  c.classList.remove("show"); setTimeout(() => c.remove(), 400);
  try { localStorage.setItem("makon_coach3d", "1"); } catch (e) {}
}
function loop() {
  if (!running || !visible()) { running = false; return; }
  requestAnimationFrame(loop);
  // draw only when the view actually moves — the phone stays cool and smooth
  if (controls && controls.update()) frame();
}
function frame() {
  if (!renderer || !cam) return;
  const camPos = cam.position;
  wallsMeta.forEach(m => {
    let vis = true;
    if (cutaway && m.outer && camMode !== "eye") {
      const vx = camPos.x - m.c[0], vz = camPos.z - m.c[1];
      vis = vx * m.n[0] + vz * m.n[1] < 0.2;
    }
    m.g.visible = vis;
  });
  renderer.render(scene, cam);
}
function resize() {
  if (!renderer) return;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px";
  persp.aspect = w / h; persp.updateProjectionMatrix();
  fitOrtho();
  frame();
}
function fitOrtho() {
  const w = host.clientWidth || 1, h = host.clientHeight || 1, a = w / h;
  const half = span * 0.62;
  ortho.left = -half * Math.max(1, a); ortho.right = half * Math.max(1, a);
  ortho.top = half * Math.max(1, 1 / a); ortho.bottom = -half * Math.max(1, 1 / a);
  ortho.updateProjectionMatrix();
}

// ---------------- cameras ----------------
function setCam(mode, reset) {
  if (!renderer) { camMode = mode; markCam(); return; }
  if (mode === camMode && !reset && controls) return;
  camMode = mode; markCam();
  const [cx, cz] = center, H = ctx.p.plan.height;
  if (controls) controls.dispose();
  if (mode === "persp" || mode === "eye") {
    cam = persp; persp.fov = mode === "eye" ? 68 : 45; persp.updateProjectionMatrix();
    const az = (ctx.p.finish && ctx.p.finish.az) || "se", sx = az.includes("e") ? 1 : -1, sz = az.includes("s") ? 1 : -1;
    if (mode === "persp") cam.position.set(cx + sx * span * 0.6, span * 0.8, cz + sz * span * 0.84);
    else { const e = eyePoint(); cam.position.set(e[0], 1.6, e[1]); }
  } else {
    cam = ortho; fitOrtho();
    if (mode === "top") { cam.position.set(cx, 60, cz); cam.up.set(0, 0, -1); }
    else if (mode === "front") { cam.position.set(cx, H / 2, cz + 60); cam.up.set(0, 1, 0); }
    else { cam.position.set(cx + 60, H / 2, cz); cam.up.set(0, 1, 0); }
    cam.zoom = 1; cam.updateProjectionMatrix();
  }
  cam.up.set(0, 1, 0);
  if (mode === "top") cam.position.set(cx, 60, cz + 0.02);   // straight down, north at the top — and free to tilt from there
  controls = new OrbitControls(cam, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.target.set(cx, mode === "eye" ? 1.2 : mode === "top" ? 0 : (mode === "persp" ? 0.4 : H / 2), cz);
  // every view can be turned by hand: drag / one finger turns, wheel / pinch zooms, right-drag / two fingers slide
  controls.enableRotate = true; controls.enableZoom = true; controls.enablePan = true;
  controls.rotateSpeed = 0.8; controls.zoomSpeed = 0.9;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.minDistance = mode === "eye" ? 0.3 : 1; controls.maxDistance = 80;
  controls.minZoom = 0.35; controls.maxZoom = 6;
  controls.zoomToCursor = true;
  applyDrag();
  // keep the room in reach while sliding around (like a map that can't be dragged off the world)
  controls.addEventListener("change", () => {
    if (!bb) return;
    const t = controls.target, m = 1.5;
    const cxk = Math.min(bb.x1 + m, Math.max(bb.x0 - m, t.x)), czk = Math.min(bb.y1 + m, Math.max(bb.y0 - m, t.z));
    if (cxk !== t.x || czk !== t.z) { const dx = cxk - t.x, dz = czk - t.z; t.x += dx; t.z += dz; cam.position.x += dx; cam.position.z += dz; }
  });
  controls.addEventListener("start", () => { if (turning) setTurn(false); });
  controls.update();
  frame();
}
// stand just inside the first door, looking into the room (fallback: south of centre)
function eyePoint() {
  const p = ctx.p.plan;
  for (const o of p.openings.filter(x => x.type !== "window")) {
    const w = p.walls.find(x => x.id === o.wall); if (!w) continue;
    const L = wlen(w), c = lerp(w.a, w.b, o.t);
    let n = [-(w.b[1] - w.a[1]) / L, (w.b[0] - w.a[0]) / L];
    if ((center[0] - c[0]) * n[0] + (center[1] - c[1]) * n[1] < 0) n = [-n[0], -n[1]];
    return [c[0] + n[0] * 0.75, c[1] + n[1] * 0.75];
  }
  const d = bb ? bb.h : 3;
  return [center[0] + 0.01, center[1] + Math.min(1.2, d * 0.3)];
}
// drag behaviour, like a map: "move" slides the view, "turn" orbits; the other one is always on right-drag (mouse) or two fingers
// phones: one finger turns around the room (the natural 3D gesture), two fingers pinch-zoom and slide.
// computers: drag slides like a map, right-drag turns. Either can be switched with Move / Turn.
const coarsePtr = window.matchMedia && matchMedia("(pointer: coarse)").matches;
let dragMode = (() => { try { return localStorage.getItem("makon_drag3d") || (coarsePtr ? "turn" : "move"); } catch (e) { return coarsePtr ? "turn" : "move"; } })();
function applyDrag() {
  if (!controls || !T) return;
  const move = dragMode === "move";
  controls.screenSpacePanning = false;   // slide along the floor, not the screen
  controls.mouseButtons = move ? { LEFT: T.MOUSE.PAN, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.ROTATE } : { LEFT: T.MOUSE.ROTATE, MIDDLE: T.MOUSE.DOLLY, RIGHT: T.MOUSE.PAN };
  controls.touches = move ? { ONE: T.TOUCH.PAN, TWO: T.TOUCH.DOLLY_ROTATE } : { ONE: T.TOUCH.ROTATE, TWO: T.TOUCH.DOLLY_PAN };
  controls.panSpeed = 1.0;
  $$("#drag-mode [data-drag]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.drag === dragMode)));
  const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  $("#three-hint").textContent = coarse
    ? (move ? "One finger moves · two fingers zoom and turn · tap a piece, then drag it" : "One finger turns · two fingers zoom and slide · tap a piece, then drag it")
    : (move ? "Drag to move · right-drag or Ctrl+drag to turn · scroll to zoom · click a piece, then drag it" : "Drag to turn · right-drag to move · scroll to zoom · click a piece, then drag it");
}
// on-screen pad: turn, tilt and zoom with buttons as well as by hand
let navAnim = null;
function nav(kind) {
  if (!controls || !cam) return;
  if (turning) setTurn(false);
  const tg = controls.target, off = cam.position.clone().sub(tg);
  const sph = new T.Spherical().setFromVector3(off);
  const to = { theta: sph.theta, phi: sph.phi, r: sph.radius, zoom: cam.zoom };
  const step = Math.PI / 8;
  if (kind === "left") to.theta -= step;
  if (kind === "right") to.theta += step;
  if (kind === "up") to.phi = Math.max(0.02, sph.phi - step * 0.6);
  if (kind === "down") to.phi = Math.min(controls.maxPolarAngle, sph.phi + step * 0.6);
  if (kind === "in") { if (cam.isOrthographicCamera) to.zoom = Math.min(controls.maxZoom, cam.zoom * 1.25); else to.r = Math.max(controls.minDistance, sph.radius / 1.25); }
  if (kind === "out") { if (cam.isOrthographicCamera) to.zoom = Math.max(controls.minZoom, cam.zoom / 1.25); else to.r = Math.min(controls.maxDistance, sph.radius * 1.25); }
  const from = { theta: sph.theta, phi: sph.phi, r: sph.radius, zoom: cam.zoom }, t0 = performance.now();
  cancelAnimationFrame(navAnim);
  const tick = now => {
    const k = Math.min(1, (now - t0) / 260), e = 1 - Math.pow(1 - k, 3);
    const s2 = new T.Spherical(from.r + (to.r - from.r) * e, from.phi + (to.phi - from.phi) * e, from.theta + (to.theta - from.theta) * e);
    cam.position.copy(new T.Vector3().setFromSpherical(s2).add(tg));
    if (cam.isOrthographicCamera) { cam.zoom = from.zoom + (to.zoom - from.zoom) * e; cam.updateProjectionMatrix(); }
    cam.lookAt(tg); controls.update(); frame();
    if (k < 1) navAnim = requestAnimationFrame(tick);
  };
  navAnim = requestAnimationFrame(tick);
}
function markCam() { $$("#three-tb [data-cam]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.cam === camMode))); }

function placeSun() {
  if (!sun) return;
  const th = (ctx.p.design.light || 0) * Math.PI / 180, R = Math.max(8, span * 1.6);
  sun.position.set(center[0] + Math.sin(th) * R, R * 1.5, center[1] - Math.cos(th) * R);
  sun.target.position.set(center[0], 0, center[1]);
  const s = sun.shadow.camera, ext = span * 0.9 + 2;
  s.left = -ext; s.right = ext; s.top = ext; s.bottom = -ext; s.near = 0.5; s.far = R * 3; s.updateProjectionMatrix();
}

// ---------------- materials ----------------
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!mats.has(key)) mats.set(key, new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0 }, o)));
  return mats.get(key);
}
const shade = (hex, k) => { const c = new T.Color(hex); c.multiplyScalar(k); return "#" + c.getHexString(); };

// ---------------- build ----------------
function box(w, h, d, x, y, z, m, cast = true) {
  const mesh = new T.Mesh(new T.BoxGeometry(Math.max(w, 0.001), Math.max(h, 0.001), Math.max(d, 0.001)), m);
  mesh.position.set(x, y + h / 2, z); mesh.castShadow = cast; mesh.receiveShadow = true; return mesh;
}
function cyl(rt, rb, h, x, y, z, m, seg = 24) {
  const mesh = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y + h / 2, z); mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}

function rebuild() {
  if (!renderer) { dirty = true; return; }
  dirty = false;
  if (root) { scene.remove(root); root.traverse(o => { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); if (o.material && o.material.map && !o.material.map.userData.keep) o.material.map.dispose(); }); }
  root = new T.Group(); scene.add(root);
  wallsMeta = []; itemGroups = new Map(); lampSpots = []; lampMats = []; moodLights = null;
  const p = ctx.p.plan, H = p.height;
  const lp = loops(p.walls);
  const edges = new Set();
  lp.forEach(l => l.forEach((q, i) => { const a = vkey(q), b2 = vkey(l[(i + 1) % l.length]); edges.add(a + "|" + b2); edges.add(b2 + "|" + a); }));
  const b = bounds(p) || { x0: 0, y0: 0, x1: 4.8, y1: 3.6, w: 4.8, h: 3.6 };
  center = lp.length ? polyCentroid(lp[0]) : [b.x0 + b.w / 2, b.y0 + b.h / 2];
  span = Math.max(3, Math.hypot(b.w, b.h)); bb = b;

  // floor
  const fmat = new T.MeshStandardMaterial({ map: kit.floorTex(FLOORS, floorKey()), roughness: floorKey() === "concrete" ? 0.5 : 0.62 });
  fmat.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const addFloor = poly => {
    const sh = new T.Shape(poly.map(q => new T.Vector2(q[0], -q[1])));
    const m = new T.Mesh(new T.ShapeGeometry(sh), fmat);
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true; root.add(m);
  };
  if (lp.length) lp.forEach(addFloor);
  else if (p.walls.length || p.items.length) addFloor([[b.x0 - 0.5, b.y0 - 0.5], [b.x1 + 0.5, b.y0 - 0.5], [b.x1 + 0.5, b.y1 + 0.5], [b.x0 - 0.5, b.y1 + 0.5]]);

  // walls
  const wm = mat(wallColour(), { roughness: 0.92 });
  const trim = mat("#f4f1ea", { roughness: 0.6 });
  const glass = glassMat = new T.MeshStandardMaterial({ color: "#cfe3ef", transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, depthWrite: false });
  const doorM = mat(shade(style().palette[2] || "#b98656", 1), { roughness: 0.6 });
  p.walls.forEach(w => {
    const L = wlen(w); if (L < 0.01) return;
    const g = new T.Group();
    const ang = Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]);
    g.position.set(w.a[0], 0, w.a[1]); g.rotation.y = -ang;
    const ops = p.openings.filter(o => o.wall === w.id).map(o => ({ o, s: o.t * L - o.w / 2, e: o.t * L + o.w / 2 })).sort((x, y) => x.s - y.s);
    let cur = -w.t / 2;
    const solid = (s, e, y0, y1) => { if (e - s > 0.005 && y1 - y0 > 0.005) g.add(box(e - s, y1 - y0, w.t, (s + e) / 2, y0, 0, wm)); };
    ops.forEach(({ o, s, e }) => {
      solid(cur, s, 0, H);
      const top = Math.min(H, (o.sill || 0) + o.h);
      solid(s, e, top, H);
      if (o.type === "window") {
        solid(s, e, 0, o.sill);
        const gl = new T.Mesh(new T.PlaneGeometry(o.w, o.h), glass); gl.position.set((s + e) / 2, o.sill + o.h / 2, 0); g.add(gl);
        const fr = 0.05;
        g.add(box(o.w, fr, w.t + 0.02, (s + e) / 2, o.sill, 0, trim), box(o.w, fr, w.t + 0.02, (s + e) / 2, top - fr, 0, trim),
          box(fr, o.h, w.t + 0.02, s + fr / 2, o.sill, 0, trim), box(fr, o.h, w.t + 0.02, e - fr / 2, o.sill, 0, trim), box(0.03, o.h, 0.04, (s + e) / 2, o.sill, 0, trim));
        g.add(box(o.w + 0.1, 0.03, w.t + 0.08, (s + e) / 2, o.sill - 0.03, 0, trim));
      } else if (o.type === "door") {
        const sgn = o.flip ? -1 : 1, hingeX = o.hinge === "r" ? e : s;
        const leaf = new T.Group(); leaf.position.set(hingeX, 0, sgn * w.t / 2);
        const lw = o.w - 0.02;
        const lm = box(lw, Math.min(o.h, top) - 0.01, 0.04, (o.hinge === "r" ? -1 : 1) * lw / 2, 0, 0.02 * sgn, doorM);
        leaf.add(lm);
        leaf.rotation.y = (o.hinge === "r" ? 1 : -1) * sgn * 0.5;
        g.add(leaf);
        g.add(box(0.05, top, w.t + 0.03, s + 0.025, 0, 0, trim), box(0.05, top, w.t + 0.03, e - 0.025, 0, 0, trim), box(o.w, 0.05, w.t + 0.03, (s + e) / 2, top - 0.05, 0, trim));
      }
      cur = e;
    });
    solid(cur, L + w.t / 2, 0, H);
    // skirting
    g.add(box(L + w.t, 0.08, w.t + 0.024, L / 2, 0, 0, trim, false));
    root.add(g);
    // outward normal for cut-away
    const mid = lerp(w.a, w.b, 0.5);
    let n = [-(w.b[1] - w.a[1]) / L, (w.b[0] - w.a[0]) / L];
    if ((mid[0] - center[0]) * n[0] + (mid[1] - center[1]) * n[1] < 0) n = [-n[0], -n[1]];
    wallsMeta.push({ g, c: mid, n, outer: edges.has(vkey(w.a) + "|" + vkey(w.b)) || !lp.length });
  });

  // furniture
  p.items.forEach(it => {
    const g = kit.buildItem(it, style());
    g.position.set(it.x, it.elev || 0, it.y);
    g.rotation.y = -(it.rot || 0) * Math.PI / 180;
    g.traverse(o => { o.userData.itemId = it.id; });
    root.add(g); itemGroups.set(it.id, g);
    g.updateMatrixWorld(true);
    (g.userData.lamps || []).forEach(([x, y, z]) => { const v = g.localToWorld(new T.Vector3(x, y, z)); lampSpots.push([v.x, v.y, v.z]); });
    lampMats.push(...(g.userData.shades || []));
  });
  placeSun();
  applyMood();
  highlight();
  renderInspector();
}

// ---------------- day / evening ----------------
const mood = () => (ctx.p.finish && ctx.p.finish.mood) || "day";
function applyMood() {
  $$("#three-act [data-mood]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mood === mood())));
  if (!renderer || !root) return;
  const night = mood() === "evening";
  scene.background.set(night ? "#1b1e22" : "#e9e3d8"); scene.fog.color.set(night ? "#1b1e22" : "#e9e3d8");
  if (ground) ground.material.color.set(night ? "#26282a" : "#ddd5c8");
  hemi.color.set(night ? "#8a90b8" : "#fff8ee"); hemi.groundColor.set(night ? "#2a2420" : "#b8ab98"); hemi.intensity = night ? 0.3 : 0.7;
  sun.color.set(night ? "#7f8fc0" : "#fff1dc"); sun.intensity = night ? 0.18 : 2.6;
  renderer.toneMappingExposure = night ? 1.15 : 0.98;
  if (glassMat) { glassMat.color.set(night ? "#16223a" : "#cfe3ef"); glassMat.opacity = night ? 0.75 : 0.28; }
  lampMats.forEach(m => { m.emissiveIntensity = night ? 2.2 : 0.12; });
  scene.environmentIntensity = night ? 0.06 : 0.38;
  if (moodLights) { root.remove(moodLights); moodLights = null; }
  if (night) {
    moodLights = new T.Group();
    const H = ctx.p.plan.height;
    // a soft ceiling light so the room is never black, plus every floor lamp glowing
    const fill = new T.PointLight("#ffd9a8", 6, span * 1.4, 1.6); fill.position.set(center[0], H - 0.15, center[1]); moodLights.add(fill);
    lampSpots.slice(0, 6).forEach(([x, y, z]) => { const l = new T.PointLight("#ffc77a", 5, 5.5, 1.8); l.position.set(x, y, z); moodLights.add(l); });
    root.add(moodLights);
  }
  frame();
}
function setTurn(on) {
  turning = !!on && !!controls && (camMode === "persp");
  if (on && camMode !== "persp" && renderer) { setCam("persp", true); turning = true; }
  if (controls) { controls.autoRotate = turning; controls.autoRotateSpeed = 1.4; }
  const b = $("#t-turn"); if (b) b.setAttribute("aria-pressed", String(turning));
}

// render the current view at a fixed size (used for "use in Design" and snapshots)
function capture(w = 1536, h = 1024, type = "image/jpeg") {
  if (!renderer || !cam) return null;
  const pr = renderer.getPixelRatio(), oldAsp = persp.aspect;
  const ol = outline && outline.visible; if (outline) outline.visible = false;
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  persp.aspect = w / h; persp.updateProjectionMatrix();
  if (cam === ortho) { const a = w / h, half = span * 0.62; ortho.left = -half * Math.max(1, a); ortho.right = half * Math.max(1, a); ortho.top = half * Math.max(1, 1 / a); ortho.bottom = -half * Math.max(1, 1 / a); ortho.updateProjectionMatrix(); }
  frame();
  const url = renderer.domElement.toDataURL(type, 0.92);
  if (outline) outline.visible = ol;
  renderer.setPixelRatio(pr); persp.aspect = oldAsp; persp.updateProjectionMatrix();
  resize();
  return url;
}
async function useInDesign() {
  if (!renderer) { toast("Open the 3D view first."); return; }
  const p = ctx.p;
  if (p.design.versions.length) {
    const ok = await ctx.confirm("Use this 3D view as the room photo?", "The " + p.design.versions.length + " design version(s) made from the current photo will be removed.", "Use this view");
    if (!ok) return;
  }
  const url = capture(1536, 1024);
  if (!url) return;
  p.photo = url; p.sample = false; p.design.versions = []; p.design.current = null; p.photoSource = "3d";
  p.thumb = url;
  ctx.save(); ctx.setMode("design");
  toast("This view is now the room photo. Press Generate — an AI render turns it into a realistic room.");
}

// floating bar for the selected piece (handy on phones)
function selBar() {
  const bar = $("#sel-bar"); if (!bar || !ctx.p) return;
  const s = ctx.sel, it = s && s.kind === "item" && ctx.p.plan.items.find(i => i.id === s.id);
  const show = !!it && visible();
  bar.hidden = !show;
  if (show) $("#sb-name").textContent = it.name;
}

function recolourWalls() {
  if (!root) return;
  const m = mat(wallColour(), { roughness: 0.92 });
  wallsMeta.forEach(w => w.g.traverse(o => { if (o.isMesh && o.material && o.material.roughness === 0.92) o.material = m; }));
  frame();
}

// ---------------- selection highlight ----------------
let outline = null;
function highlight() {
  if (!T || !root) return;
  if (outline) { outline.parent && outline.parent.remove(outline); outline.geometry.dispose(); outline = null; }
  const s = ctx.sel;
  if (!s || s.kind !== "item") { frame(); return; }
  const it = ctx.p.plan.items.find(i => i.id === s.id), g = itemGroups.get(s.id);
  if (!it || !g) return;
  const geo = new T.EdgesGeometry(new T.BoxGeometry(it.w + 0.04, Math.max(it.h, 0.02) + 0.04, it.d + 0.04));
  outline = new T.LineSegments(geo, new T.LineBasicMaterial({ color: "#c4643a" }));
  outline.position.y = Math.max(it.h, 0.02) / 2;
  g.add(outline);
  frame();
}

// ---------------- picking & dragging ----------------
function ndc(e) {
  const r = renderer.domElement.getBoundingClientRect();
  return new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
}
function pickItem(e) {
  raycaster.setFromCamera(ndc(e), cam);
  const hits = raycaster.intersectObjects([...itemGroups.values()], true);
  const h = hits.find(x => x.object.userData.itemId && x.object.isMesh);
  return h ? h.object.userData.itemId : null;
}
function floorAt(e) {
  raycaster.setFromCamera(ndc(e), cam);
  const v = new T.Vector3();
  return raycaster.ray.intersectPlane(floorPlane, v) ? v : null;
}
function onDown(e) {
  downAt = { x: e.clientX, y: e.clientY };
  if (turning) setTurn(false);
  if (e.button !== 0) return;
  const id = pickItem(e);
  if (!id) return;
  const it = ctx.p.plan.items.find(i => i.id === id), f = floorAt(e);
  if (!it || !f) return;
  if (!(ctx.sel && ctx.sel.kind === "item" && ctx.sel.id === id)) { tapPick = id; return; }
  ctx.select("item", id);
  controls.enabled = false;
  drag = { id, off: [f.x - it.x, f.z - it.y], moved: false, pid: e.pointerId };
  try { renderer.domElement.setPointerCapture(e.pointerId); } catch (er) {}
}
function onMove(e) {
  if (!drag) return;
  const f = floorAt(e); if (!f) return;
  const it = ctx.p.plan.items.find(i => i.id === drag.id), g = itemGroups.get(drag.id);
  if (!it || !g) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 4) return;
    drag.moved = true; ctx.planOps.pushUndo();
  }
  const snap = v => e.altKey ? v : Math.round(v / 0.05) * 0.05;
  it.x = +snap(f.x - drag.off[0]).toFixed(3); it.y = +snap(f.z - drag.off[1]).toFixed(3);
  g.position.set(it.x, it.elev || 0, it.y);
  frame();
}
function onUp(e) {
  if (drag) {
    const d = drag; drag = null; controls.enabled = true;
    if (d.moved) ctx.planOps.commit();
    return;
  }
  const still = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 8;
  if (tapPick) { if (still) ctx.select("item", tapPick); tapPick = null; downAt = null; return; }
  if (still && e.button === 0 && !pickItem(e) && ctx.sel) ctx.select(null);
  downAt = null;
}
function onKey(e) {
  const active = ctx.mode === "3d" || (ctx.mode === "furnish" && ctx.furnishView === "three");
  if (!active || e.target.closest("input, textarea, select") || document.querySelector(".modal-wrap") || e.ctrlKey || e.metaKey) return;
  if (!ctx.sel || ctx.sel.kind !== "item") {
    const k = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", "+": "in", "=": "in", "-": "out" }[e.key];
    if (k) { e.preventDefault(); nav(k); }
    return;
  }
  if (e.key.toLowerCase() === "r") ctx.planOps.rotateSelected(e.shiftKey ? 15 : 90);
  if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); ctx.planOps.removeSelected(); }
  if (e.key === "Escape") ctx.select(null);
}

function snapshot() {
  if (!renderer) { toast("Open the 3D view first."); return; }
  const url = capture(1920, 1280, "image/png");
  download((ctx.p.name || "room").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + "-3d.png", url);
  toast("Snapshot saved.");
}

// ---------------- inspector ----------------
function renderInspector() {
  if (!ctx.p) return;
  const p = ctx.p.plan, u = ctx.p.units;
  const lp = loops(p.walls);
  const wallLen = p.walls.reduce((s, w) => s + wlen(w), 0);
  const openA = p.openings.reduce((s, o) => s + o.w * o.h, 0);
  $("#three-stats").innerHTML = `<div><span>Walls</span><b>${p.walls.length}</b></div><div><span>Openings</span><b>${p.openings.length}</b></div><div><span>Objects</span><b>${p.items.length}</b></div>` +
    `<div><span>Floor</span><b>${lp.length ? fmtArea(lp.reduce((s, l) => s + polyArea(l), 0), u) : "—"}</b></div><div><span>Wall area</span><b>${fmtArea(Math.max(0, wallLen * p.height - openA), u)}</b></div><div><span>Ceiling</span><b>${fmtLen(p.height, u)}</b></div>`;
  if (document.activeElement !== $("#f-wall")) $("#f-wall").value = wallColour();
  $("#f-floor").value = floorKey();
  $("#t-sun").value = ctx.p.design.light; $("#sun-out").textContent = sunName(ctx.p.design.light);
  const box = $("#three-sel");
  const s = ctx.sel, it = s && s.kind === "item" && p.items.find(i => i.id === s.id);
  if (it && ctx.mode === "3d") ctx.planOps.itemEditor(box, it);
  else box.innerHTML = '<h3>Selection</h3><p class="muted small">Tap a piece of furniture to select it, then drag it across the floor. Add pieces in Furnish.</p>';
}
