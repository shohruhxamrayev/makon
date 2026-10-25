// Makon — top-down pictures of furniture for the floor plan, rendered in the browser from the same 3D models.
// The plan draws its simple outline at once; when a picture is ready it calls onReady() and the plan redraws with it.
let T = null, kit = null, r = null, scene = null, cam = null, loading = null, onReady = null, styleOf = () => ({});
const cache = new Map(), queue = new Map();
const PPM = 170, MAX = 640; // pixels per metre, largest side

export function setup({ ready, style }) { onReady = ready; if (style) styleOf = style; }
const keyOf = it => [it.type, it.shape, it.color, it.w, it.d, it.h, (styleOf().name || "")].join("|");

export function spriteFor(it) {
  if (!it || it.wall || !it.type) return null;
  const k = keyOf(it);
  if (cache.has(k)) return cache.get(k);
  if (!queue.has(k)) { queue.set(k, Object.assign({}, it)); schedule(); }
  return null;
}
let timer = 0;
function schedule() { if (!timer) timer = setTimeout(run, 30); }

async function ensure() {
  if (r) return true;
  if (!loading) loading = Promise.all([import("../../vendor/three.module.min.js"), import("../../vendor/RoundedBoxGeometry.js"), import("../../vendor/RoomEnvironment.js"), import("./models.js")]).then(([a, rb, re, mo]) => {
    T = a; kit = mo.createKit(a, rb.RoundedBoxGeometry, { anisotropy: 4 });
    r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.setClearColor(0x000000, 0);
    scene = new T.Scene();
    const pm = new T.PMREMGenerator(r); scene.environment = pm.fromScene(new re.RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.6; pm.dispose();
    scene.add(new T.HemisphereLight("#fffaf2", "#cfc5b6", 0.9));
    const sun = new T.DirectionalLight("#fff3e2", 1.7); sun.position.set(-2, 8, 3); scene.add(sun);
    cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.01, 50);
  });
  try { await loading; return true; } catch (e) { console.warn("plan pictures off:", e); return false; }
}

async function run() {
  timer = 0;
  if (!queue.size || !(await ensure())) return;
  const jobs = [...queue]; queue.clear();
  for (const [k, it] of jobs) {
    try { cache.set(k, shoot(it)); } catch (e) { cache.set(k, null); }
  }
  onReady && onReady();
}

function shoot(it) {
  const g = kit.buildItem(Object.assign({}, it, { x: 0, y: 0, rot: 0 }), styleOf());
  scene.add(g);
  const w = Math.max(it.w, 0.05), d = Math.max(it.d, 0.05);
  const sc = Math.min(PPM, MAX / Math.max(w, d));
  const W = Math.max(8, Math.round(w * sc)), H = Math.max(8, Math.round(d * sc));
  r.setSize(W, H, false);
  // straight down; the piece's front (+z in 3D) points down the page, like the plan
  cam.left = -w / 2; cam.right = w / 2; cam.top = d / 2; cam.bottom = -d / 2;
  cam.position.set(0, 20, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  r.render(scene, cam);
  const url = r.domElement.toDataURL("image/png");
  scene.remove(g);
  g.traverse(o => { if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); });
  return url;
}
