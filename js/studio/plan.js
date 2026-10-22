// Makon Studio — 2D plan editor (SVG). World units are metres; y grows "down" the page (south).
import { $, $$, el, esc, toast, modal, confirmBox, uid, clamp, round, fmtLen, fmtArea, download } from "./util.js";
import { vkey, dist, wlen, lerp, project, corners, polyContains, polyArea, polyCentroid, satOverlap, polyDist, polySegDist, loops, bounds } from "./geom.js";
import { CATALOG, catalogItem, LARGE } from "./data.js";

const NS = "http://www.w3.org/2000/svg";
const GRID = 0.05;
const WALL_SNAP_SHAPES = new Set(["sofa", "sectional", "bed", "cabinet", "shelf", "wardrobe", "counter", "sink", "stove", "fridge", "bath", "toilet", "desk", "art", "tv", "mirror", "box", "crib"]);
const TUCK = new Set(["chair", "stool"]), TUCK_UNDER = new Set(["table", "rtable", "desk", "counter"]);
const GAP_EXEMPT = new Set(["coffee", "coffeer", "side", "nightstand", "pouf", "bench"]);

const PLAN_CSS = `
.grid-min{stroke:#e7e0d3}.grid-maj{stroke:#d9cfbe}
.floor{fill:#efe7d9}.area{font:600 13px Inter,system-ui,sans-serif;fill:#8a7f6e;text-anchor:middle}
.wall{stroke:#2a2724;stroke-linecap:square}.wall.sel{stroke:#c4643a}.whit{stroke:transparent;stroke-linecap:round;cursor:move}
.dim{font:600 11px Inter,system-ui,sans-serif;fill:#6b6355;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#f5f0e7;stroke-width:3px}
.dim.cal{fill:#2f6b4f}
.op-gap{fill:#f5f0e7}.op-win{stroke:#5b8fb3;fill:none}.op-door{stroke:#2a2724;fill:none}.op-arc{stroke:#9a8f7f;fill:none;stroke-dasharray:3 3}
.op.sel .op-gap{fill:#f6dccb}
.it rect.body,.it path.body,.it ellipse.body{stroke:#3d3a35}
.it .det{fill:none;stroke:#3d3a35;opacity:.55}
.it .lab{font:500 11px Inter,system-ui,sans-serif;fill:#2a2724;text-anchor:middle;dominant-baseline:middle;pointer-events:none}
.it.sel rect.body,.it.sel path.body,.it.sel ellipse.body{stroke:#c4643a}
.it.err rect.body,.it.err path.body,.it.err ellipse.body{stroke:#c0392b;stroke-dasharray:4 3}
.it.warn rect.body,.it.warn path.body,.it.warn ellipse.body{stroke:#d08a1e;stroke-dasharray:4 3}
.it{cursor:move}.rot{fill:#fff;stroke:#c4643a;cursor:grab}.rotl{stroke:#c4643a}
.vtx{fill:#fff;stroke:#2a2724;cursor:move}.vtx.first{fill:#c4643a;stroke:#c4643a}
.draft{stroke:#c4643a;stroke-linecap:round;fill:none}.draft-lab{font:600 12px Inter,system-ui,sans-serif;fill:#fff;text-anchor:middle;dominant-baseline:middle}
.draft-bg{fill:#c4643a}.ghost{fill:#c4643a;opacity:.35}
.meas{stroke:#2563a8;stroke-dasharray:6 4}.meas-lab{font:600 12px Inter,system-ui,sans-serif;fill:#fff;text-anchor:middle;dominant-baseline:middle}.meas-bg{fill:#2563a8}
.sz{font:600 10.5px Inter,system-ui,sans-serif;fill:#c4643a;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#f5f0e7;stroke-width:3px}
`;

// scope every rule to .mk-plan so the plan's styles never leak into the page
const SCOPED_CSS = PLAN_CSS.replace(/(^|\})\s*([^{}]+)\{/g, (m, end, sel) => end + sel.split(",").map(x => ".mk-plan " + x.trim()).join(",") + "{");
let ctx, svg, host;
let view = { tx: 0, ty: 0, s: 60, fitted: false };
let tool = "select", draft = null, hover = null, ghost = null, measure = null;
let drag = null, pinch = null, space = false;
const pointers = new Map();
let undoStack = [], redoStack = [];
let raf = 0;

const P = () => ctx.p.plan;
const U = () => ctx.p.units;
const findWall = id => P().walls.find(w => w.id === id);
const findItem = id => P().items.find(i => i.id === id);
const findOpen = id => P().openings.find(o => o.id === id);

// ======================================================================
export function init(c) {
  ctx = c;
  svg = $("#plan-svg"); host = $("#st-plan");
  ctx.select = select;
  ctx.planOps = { addItem, removeSelected, rotateSelected, duplicateSelected, pushUndo, commit, checkFit, itemEditor, fit, undo, redo };

  $$("#plan-tb [data-tool]").forEach(b => b.addEventListener("click", () => setTool(b.dataset.tool)));
  $("#p-finish").addEventListener("click", finishDraft);
  $("#p-fit").addEventListener("click", () => fit());
  $("#p-undo").addEventListener("click", undo);
  $("#p-redo").addEventListener("click", redo);
  $("#z-in").addEventListener("click", () => zoomAt(1.25));
  $("#z-out").addEventListener("click", () => zoomAt(0.8));

  // begin overlay
  $("#begin-form").addEventListener("submit", e => {
    e.preventDefault();
    const w = parseFloat($("#b-w").value), d = parseFloat($("#b-d").value);
    if (!(w >= 1 && w <= 30 && d >= 1 && d <= 30)) { toast("Enter a width and depth between 1 and 30 m.", "error"); return; }
    template("rect", w, d);
  });
  $("#b-lshape").addEventListener("click", () => template("L"));
  $("#b-draw").addEventListener("click", () => { pushUndo(); P().started = true; commit(); setTool("wall"); toast("Click (or tap) to place corners. Click the first corner to close the room."); });

  // settings
  $("#ceil-h").addEventListener("change", e => {
    const v = parseFloat(e.target.value);
    if (!(v >= 2 && v <= 6)) { e.target.value = P().height; toast("Ceiling height must be 2–6 m.", "error"); return; }
    P().height = v; commit();
  });
  $("#units").addEventListener("change", e => { ctx.p.units = e.target.value; commit(); });
  $("#p-template").addEventListener("click", async () => {
    const v = await modal({ title: "New rectangular room", body: "This replaces the walls and openings. Furniture stays where it is.", ok: "Create", fields: [
      { label: "Width (m)", type: "number", value: "4.80", min: 1, max: 30, step: "0.01", inputmode: "decimal", required: true },
      { label: "Depth (m)", type: "number", value: "3.60", min: 1, max: 30, step: "0.01", inputmode: "decimal", required: true }] });
    if (v) template("rect", parseFloat(v[0]), parseFloat(v[1]));
  });
  $("#p-clear").addEventListener("click", async () => {
    if (!P().walls.length && !P().items.length) return;
    if (!(await confirmBox("Clear the plan?", "Walls, openings and furniture are removed. You can undo this.", "Clear"))) return;
    pushUndo(); P().walls = []; P().openings = []; P().items = []; P().calibrated = false; P().started = false; select(null); commit(); view.fitted = false;
  });
  $("#p-png").addEventListener("click", exportPNG);

  // pointer input
  svg.addEventListener("pointerdown", onDown);
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerup", onUp);
  svg.addEventListener("pointercancel", onUp);
  svg.addEventListener("pointerleave", () => { if (!drag) { hover = null; ghost = null; queue(); } });
  svg.addEventListener("wheel", onWheel, { passive: false });
  svg.addEventListener("dblclick", e => { if (tool === "wall" && draft) { e.preventDefault(); finishDraft(); } });
  svg.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("keydown", onKey);
  document.addEventListener("keyup", e => { if (e.code === "Space") space = false; });

  new ResizeObserver(() => { if (visible()) { if (!view.fitted) fit(); else queue(); } }).observe(svg);

  ctx.bus.on("project", () => { undoStack = []; redoStack = []; draft = null; measure = null; ctx.sel = null; view.fitted = false; setTool("select", true); refresh(); });
  ctx.bus.on("mode", m => { if (m === "furnish" && tool !== "select") setTool("select", true); if (visible()) { if (!view.fitted) fit(); refresh(); } });
  ctx.bus.on("plan-external", () => { if (visible()) queue(); renderInspector(); });
  ctx.bus.on("select", () => { queue(); renderInspector(); });
}

const visible = () => !host.hidden && svg.clientWidth > 0;
function refresh() { updateBegin(); queue(); renderInspector(); updateUndoBtns(); }
function queue() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); }

function setTool(t, quiet) {
  if (draft && t !== "wall") finishDraft();
  tool = t; ghost = null; if (t !== "measure") measure = null;
  $$("#plan-tb [data-tool]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tool === t)));
  svg.dataset.tool = t;
  hint();
  if (!quiet) queue();
}
function hint() {
  const h = {
    select: "Drag furniture, walls, corners or openings · drag empty space to pan · scroll or pinch to zoom",
    wall: draft ? "Click to add the next corner · click the first corner to close · Enter or Finish to stop" : "Click or tap to place the first corner",
    door: "Click on a wall to add a door", window: "Click on a wall to add a window",
    measure: "Drag to measure any distance"
  }[tool];
  $("#plan-hint").textContent = h;
  $("#p-finish").hidden = !(tool === "wall" && draft);
}

function select(kind, id) {
  ctx.sel = kind ? { kind, id } : null;
  ctx.bus.emit("select");
}

// ---------------- undo ----------------
function snap() { const p = P(); return JSON.stringify({ walls: p.walls, openings: p.openings, items: p.items, calibrated: p.calibrated, started: p.started }); }
function pushUndo() { undoStack.push(snap()); if (undoStack.length > 80) undoStack.shift(); redoStack = []; updateUndoBtns(); }
function restore(s) { const o = JSON.parse(s); Object.assign(P(), o); }
function undo() {
  if (!undoStack.length) { toast("Nothing to undo."); return; }
  redoStack.push(snap()); restore(undoStack.pop()); draft = null; validateSel(); commit();
}
function redo() {
  if (!redoStack.length) { toast("Nothing to redo."); return; }
  undoStack.push(snap()); restore(redoStack.pop()); validateSel(); commit();
}
function updateUndoBtns() { $("#p-undo").disabled = !undoStack.length; $("#p-redo").disabled = !redoStack.length; }
function validateSel() {
  const s = ctx.sel; if (!s) return;
  const ok = s.kind === "wall" ? findWall(s.id) : s.kind === "item" ? findItem(s.id) : findOpen(s.id);
  if (!ok) ctx.sel = null;
}

function commit() {
  cleanup();
  ctx.save();
  ctx.bus.emit("plan");
  updateBegin(); queue(); renderInspector(); updateUndoBtns(); hint();
}
function cleanup() {
  const p = P();
  p.walls = p.walls.filter(w => wlen(w) > 0.01);
  const ids = new Set(p.walls.map(w => w.id));
  p.openings = p.openings.filter(o => ids.has(o.wall));
  p.openings.forEach(o => { const w = findWall(o.wall), L = wlen(w); if (o.w > L - 0.05) o.w = Math.max(0.3, L - 0.05); const m = (o.w / 2) / L; o.t = clamp(o.t, m, 1 - m); });
}

// ---------------- templates ----------------
function template(kind, w = 4.8, d = 3.6) {
  pushUndo();
  const p = P();
  const pts = kind === "L" ? [[0, 0], [5.2, 0], [5.2, 2.6], [2.9, 2.6], [2.9, 4.4], [0, 4.4]] : [[0, 0], [w, 0], [w, d], [0, d]];
  p.walls = pts.map((a, i) => ({ id: uid("w_"), a: a.slice(), b: pts[(i + 1) % pts.length].slice(), t: 0.12 }));
  p.openings = [];
  p.openings.push({ id: uid("o_"), wall: p.walls[0].id, type: "window", t: 0.5, w: Math.min(1.4, wlen(p.walls[0]) - 0.4), h: 1.4, sill: 0.85 });
  const dw = p.walls[2];
  if (wlen(dw) > 1.3) p.openings.push({ id: uid("o_"), wall: dw.id, type: "door", t: 0.8, w: 0.9, h: 2.05, sill: 0, flip: false, hinge: "l" });
  p.calibrated = false; p.started = true;
  draft = null; select(null);
  commit(); view.fitted = false; fit(); setTool("select");
  toast(kind === "L" ? "L-shaped room created. Drag corners to match yours." : "Room created. Calibrate one wall you've measured for true scale.");
}
function updateBegin() {
  const p = P();
  const show = !p.walls.length && !p.started && !p.items.length;
  $("#begin").hidden = !show;
}

// ---------------- coordinates ----------------
function toWorld(e) { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left - view.tx) / view.s, (e.clientY - r.top - view.ty) / view.s]; }
function fit(pad = 56) {
  const W = svg.clientWidth, H = svg.clientHeight;
  if (!W || !H) return;
  let b = bounds(P());
  if (!b) b = { x0: -0.5, y0: -0.5, x1: 6, y1: 4.5, w: 6.5, h: 5 };
  const bw = Math.max(b.w, 2), bh = Math.max(b.h, 2);
  const narrow = window.innerWidth <= 900;
  const top = narrow ? (ctx.mode === "furnish" ? 150 : 112) : (ctx.mode === "furnish" ? 108 : 64), bottom = narrow ? 56 : 44;
  view.s = clamp(Math.min((W - pad * 2) / bw, (H - top - bottom - pad) / bh), 8, 400);
  view.tx = W / 2 - (b.x0 + b.w / 2) * view.s;
  view.ty = top + (H - top - bottom) / 2 - (b.y0 + b.h / 2) * view.s;
  view.fitted = true;
  queue();
}
function zoomAt(k, sx, sy) {
  const W = svg.clientWidth, H = svg.clientHeight;
  if (sx == null) { sx = W / 2; sy = H / 2; }
  const ns = clamp(view.s * k, 8, 400); k = ns / view.s;
  view.tx = sx - (sx - view.tx) * k; view.ty = sy - (sy - view.ty) * k; view.s = ns;
  queue();
}
function onWheel(e) {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  const k = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0018));
  if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) zoomAt(k, e.clientX - r.left, e.clientY - r.top);
  else { view.tx -= e.deltaX; queue(); }
}

// ---------------- snapping ----------------
function allVertices(excludeKey) {
  const m = new Map();
  P().walls.forEach(w => [w.a, w.b].forEach(p => { const k = vkey(p); if (k !== excludeKey) m.set(k, p); }));
  return [...m.values()];
}
function snapVertex(p, excludeKey, px = 14) {
  let best = null, bd = px / view.s;
  allVertices(excludeKey).forEach(v => { const d = dist(p, v); if (d < bd) { bd = d; best = v; } });
  if (draft && draft.pts.length > 1) { const f = draft.pts[0]; if (dist(p, f) < px / view.s) best = f; }
  return best ? best.slice() : null;
}
const gridSnap = (p, alt) => alt ? p.slice() : [round(p[0], GRID), round(p[1], GRID)];
function snapWallPoint(w, from, e) {
  const v = snapVertex(w);
  if (v) return { p: v, snapped: "vertex" };
  if (e && e.altKey) return { p: w.slice() };
  if (from) {
    let ang = Math.atan2(w[1] - from[1], w[0] - from[0]), L = dist(from, w);
    const step = e && e.shiftKey ? Math.PI / 12 : Math.PI / 2;
    const near = Math.round(ang / step) * step;
    if (e && e.shiftKey || Math.abs(ang - near) < 0.1) ang = near;
    L = round(L, GRID);
    // also align to any existing vertex's x or y (helps closing rectangles)
    let p = [from[0] + Math.cos(ang) * L, from[1] + Math.sin(ang) * L];
    const tol = 8 / view.s;
    allVertices().concat(draft ? [draft.pts[0]] : []).forEach(q => {
      if (Math.abs(Math.cos(ang)) < 1e-6 && Math.abs(p[1] - q[1]) < tol) p = [p[0], q[1]];
      if (Math.abs(Math.sin(ang)) < 1e-6 && Math.abs(p[0] - q[0]) < tol) p = [q[0], p[1]];
    });
    return { p };
  }
  return { p: gridSnap(w) };
}
function nearestWall(w, px = 22) {
  let best = null, bd = px / view.s;
  P().walls.forEach(wl => { const pr = project(w, wl.a, wl.b); if (pr.d < bd) { bd = pr.d; best = { wall: wl, t: pr.t, pt: pr.pt }; } });
  return best;
}

// ---------------- pointer handling ----------------
function onDown(e) {
  if (ctx.mode !== "plan" && ctx.mode !== "furnish") return;
  svg.focus({ preventScroll: true });
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { svg.setPointerCapture(e.pointerId); } catch (er) {}
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), s0: view.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx0: view.tx, ty0: view.ty };
    if (drag && drag.undoPushed) { /* keep edits made so far */ }
    drag = null; return;
  }
  if (pointers.size > 2) return;
  if (e.button === 2) return;
  const w = toWorld(e);
  if (e.button === 1 || space) { drag = { type: "pan", sx: e.clientX, sy: e.clientY, tx0: view.tx, ty0: view.ty }; return; }
  const hit = e.target.closest("[data-k]");
  const k = hit && hit.dataset.k, id = hit && hit.dataset.id;
  const base = { sx: e.clientX, sy: e.clientY, w, moved: false };

  if (tool === "select") {
    if (k === "rot") { drag = Object.assign(base, { type: "rot", id }); return; }
    if (k === "vtx") {
      const key = hit.dataset.key, refs = [];
      P().walls.forEach(wl => { if (vkey(wl.a) === key) refs.push([wl, "a"]); if (vkey(wl.b) === key) refs.push([wl, "b"]); });
      drag = Object.assign(base, { type: "vtx", key, refs }); return;
    }
    if (k === "item") { const it = findItem(id); select("item", id); drag = Object.assign(base, { type: "item", id, off: [w[0] - it.x, w[1] - it.y], x0: it.x, y0: it.y }); return; }
    if (k === "open") { select("open", id); drag = Object.assign(base, { type: "open", id }); return; }
    if (k === "wall") {
      const wl = findWall(id); select("wall", id);
      const ka = vkey(wl.a), kb = vkey(wl.b), refs = [];
      P().walls.forEach(o => { if (o === wl) return; ["a", "b"].forEach(end => { const kk = vkey(o[end]); if (kk === ka) refs.push([o, end, "a"]); if (kk === kb) refs.push([o, end, "b"]); }); });
      drag = Object.assign(base, { type: "wall", id, a0: wl.a.slice(), b0: wl.b.slice(), refs }); return;
    }
    if (ctx.sel) select(null);
    drag = Object.assign(base, { type: "pan", tx0: view.tx, ty0: view.ty }); return;
  }
  if (tool === "measure") { const a = snapVertex(w) || gridSnap(w, e.altKey); measure = { a, b: a.slice() }; drag = Object.assign(base, { type: "measure" }); queue(); return; }
  drag = Object.assign(base, { type: "tap", tx0: view.tx, ty0: view.ty, alt: e.altKey, shift: e.shiftKey });
}

function onMove(e) {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const r = svg.getBoundingClientRect();
    const ns = clamp(pinch.s0 * d / (pinch.d0 || 1), 8, 400), k = ns / pinch.s0;
    const cx = pinch.mx - r.left, cy = pinch.my - r.top;
    view.s = ns;
    view.tx = cx - (cx - pinch.tx0) * k + (mx - pinch.mx);
    view.ty = cy - (cy - pinch.ty0) * k + (my - pinch.my);
    queue(); return;
  }
  const w = toWorld(e);
  if (!drag) {
    hover = w;
    if (tool === "door" || tool === "window") { const n = nearestWall(w); ghost = n ? { wall: n.wall, t: n.t } : null; }
    if (tool === "wall") hover = snapWallPoint(w, draft ? draft.pts[draft.pts.length - 1] : null, e).p;
    if (tool !== "select") queue();
    return;
  }
  const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
  if (!drag.moved && moved < (e.pointerType === "touch" ? 8 : 3)) return;
  if (!drag.moved) {
    drag.moved = true;
    if (["item", "vtx", "wall", "open", "rot"].includes(drag.type)) pushUndo();
  }
  const alt = e.altKey;
  switch (drag.type) {
    case "pan": case "tap":
      drag.type = "pan";
      view.tx = drag.tx0 + (e.clientX - drag.sx); view.ty = drag.ty0 + (e.clientY - drag.sy); break;
    case "item": {
      const it = findItem(drag.id); if (!it) break;
      const np = gridSnap([w[0] - drag.off[0], w[1] - drag.off[1]], alt);
      it.x = np[0]; it.y = np[1]; drag.alt = alt; break;
    }
    case "rot": {
      const it = findItem(drag.id); if (!it) break;
      let deg = Math.atan2(w[1] - it.y, w[0] - it.x) * 180 / Math.PI + 90;
      if (!alt) deg = Math.round(deg / 15) * 15;
      it.rot = ((deg % 360) + 360) % 360; break;
    }
    case "vtx": {
      const t = snapVertex(w, drag.key) || gridSnap(w, alt);
      drag.refs.forEach(([wl, end]) => { wl[end] = t.slice(); });
      break;
    }
    case "wall": {
      const dlt = gridSnap([w[0] - drag.w[0], w[1] - drag.w[1]], alt);
      const wl = findWall(drag.id); if (!wl) break;
      wl.a = [drag.a0[0] + dlt[0], drag.a0[1] + dlt[1]]; wl.b = [drag.b0[0] + dlt[0], drag.b0[1] + dlt[1]];
      drag.refs.forEach(([o, end, which]) => { o[end] = (which === "a" ? wl.a : wl.b).slice(); });
      break;
    }
    case "open": {
      const o = findOpen(drag.id), wl = o && findWall(o.wall); if (!wl) break;
      const L = wlen(wl), m = (o.w / 2) / L;
      let t = project(w, wl.a, wl.b).t;
      if (!alt) t = round(t * L, GRID) / L;
      o.t = clamp(t, m, 1 - m); break;
    }
    case "measure": measure.b = snapVertex(w) || gridSnap(w, alt); break;
  }
  queue();
  if (drag.type !== "pan" && drag.type !== "measure") renderSelLive();
}

function onUp(e) {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
  const d = drag; drag = null;
  if (!d) return;
  if (d.type === "tap" && !d.moved) {
    if (tool === "wall") addDraftPoint(snapWallPoint(d.w, draft ? draft.pts[draft.pts.length - 1] : null, { altKey: d.alt, shiftKey: d.shift }).p);
    else if (tool === "door" || tool === "window") addOpening(d.w, tool);
    return;
  }
  if (d.moved && ["item", "vtx", "wall", "open", "rot"].includes(d.type)) {
    if (d.type === "item" && !d.alt) wallSnap(findItem(d.id));
    commit();
  } else if (d.type === "measure") {
    const L = dist(measure.a, measure.b);
    if (L < 0.02) measure = null; else toast("Measured " + fmtLen(L, U()) + (P().calibrated ? "" : " (estimate until calibrated)"));
    queue();
  }
}

// snap the back of wall-hugging furniture flush to a nearby wall
function wallSnap(it) {
  if (!it || !WALL_SNAP_SHAPES.has(it.shape)) return;
  let best = null;
  P().walls.forEach(wl => {
    const pr = project([it.x, it.y], wl.a, wl.b);
    const reach = it.d / 2 + wl.t / 2 + 0.3;
    if (pr.d < reach && pr.t > 0.02 && pr.t < 0.98 && (!best || pr.d < best.d)) best = { wl, pr, d: pr.d };
  });
  if (!best) return;
  const { wl, pr } = best;
  const ux = (wl.b[0] - wl.a[0]) / wlen(wl), uy = (wl.b[1] - wl.a[1]) / wlen(wl);
  let nx = -uy, ny = ux;                                   // normal
  if ((it.x - pr.pt[0]) * nx + (it.y - pr.pt[1]) * ny < 0) { nx = -nx; ny = -ny; } // toward the item
  // item's local -y (its back) should face the wall → local +y = n
  const rot = Math.atan2(ny, nx) * 180 / Math.PI - 90;
  const curr = ((it.rot % 360) + 360) % 360, want = ((rot % 360) + 360) % 360;
  const diff = Math.min(Math.abs(curr - want), 360 - Math.abs(curr - want));
  if (diff > 50 && it.shape !== "art" && it.shape !== "tv") return; // user clearly turned it another way
  it.rot = Math.round(want * 10) / 10;
  const off = wl.t / 2 + it.d / 2 + (it.wall ? 0 : 0.01);
  it.x = +(pr.pt[0] + nx * off).toFixed(3); it.y = +(pr.pt[1] + ny * off).toFixed(3);
}

// ---------------- walls ----------------
function addDraftPoint(p) {
  if (!draft) { draft = { pts: [p] }; P().started = true; hint(); queue(); return; }
  const last = draft.pts[draft.pts.length - 1];
  if (dist(p, last) < 0.05) return;
  pushUndo();
  P().walls.push({ id: uid("w_"), a: last.slice(), b: p.slice(), t: 0.12 });
  const closed = draft.pts.length > 1 && vkey(p) === vkey(draft.pts[0]);
  draft.pts.push(p);
  if (closed) {
    draft = null;
    const lp = loops(P().walls);
    toast("Room closed" + (lp.length ? " — floor area " + fmtArea(lp.reduce((s, l) => s + polyArea(l), 0), U()) : "") + ".");
    setTool("select");
  }
  commit();
}
function finishDraft() { draft = null; hover = null; hint(); queue(); }

function addOpening(w, type) {
  const n = nearestWall(w);
  if (!n) { toast("Click on a wall to place the " + type + "."); return; }
  const wl = n.wall, L = wlen(wl), ow = type === "door" ? 0.9 : 1.2;
  if (L < ow + 0.1) { toast("That wall is too short for a " + type + ".", "error"); return; }
  const m = (ow / 2) / L;
  const t = clamp(round(n.t * L, GRID) / L, m, 1 - m);
  const clash = P().openings.some(o => o.wall === wl.id && Math.abs(o.t - t) * L < (o.w + ow) / 2 - 0.01);
  if (clash) { toast("There's already an opening there.", "error"); return; }
  pushUndo();
  const o = type === "door" ? { id: uid("o_"), wall: wl.id, type, t, w: ow, h: 2.05, sill: 0, flip: false, hinge: "l" } : { id: uid("o_"), wall: wl.id, type, t, w: ow, h: 1.3, sill: 0.9 };
  P().openings.push(o);
  select("open", o.id);
  commit();
}

function moveVertex(oldP, newP) {
  const k = vkey(oldP);
  P().walls.forEach(w => { if (vkey(w.a) === k) w.a = newP.slice(); if (vkey(w.b) === k) w.b = newP.slice(); });
}
function setWallLength(wl, L) {
  const cur = wlen(wl); if (!(L > 0.05)) return;
  const nb = lerp(wl.a, wl.b, L / cur), ob = wl.b.slice();
  const dx = nb[0] - ob[0], dy = nb[1] - ob[1], kb = vkey(ob);
  const ux = (wl.b[0] - wl.a[0]) / cur, uy = (wl.b[1] - wl.a[1]) / cur;
  // keep square corners: a perpendicular neighbour at the moving end slides along with it
  P().walls.filter(o => o !== wl && (vkey(o.a) === kb || vkey(o.b) === kb)).forEach(o => {
    const ol = wlen(o); if (ol < 0.01) return;
    const dot = Math.abs(((o.b[0] - o.a[0]) * ux + (o.b[1] - o.a[1]) * uy) / ol);
    if (dot > 0.15) return;
    const far = vkey(o.a) === kb ? o.b : o.a;
    moveVertex(far, [far[0] + dx, far[1] + dy]);
  });
  moveVertex(ob, nb);
}
function calibrate(wl, real) {
  const k = real / wlen(wl);
  if (!(k > 0) || !isFinite(k)) return;
  pushUndo();
  const b = bounds(P()) || { x0: 0, y0: 0 };
  const o = [b.x0, b.y0], sc = p => [+(o[0] + (p[0] - o[0]) * k).toFixed(4), +(o[1] + (p[1] - o[1]) * k).toFixed(4)];
  P().walls.forEach(w => { w.a = sc(w.a); w.b = sc(w.b); });
  P().items.forEach(it => { const q = sc([it.x, it.y]); it.x = q[0]; it.y = q[1]; });
  P().calibrated = true;
  commit(); fit();
  toast("Calibrated — every length is now to scale (×" + k.toFixed(3) + ").");
}

// ---------------- items ----------------
function addItem(catId, at) {
  const c = catalogItem(catId); if (!c) return null;
  const p = P();
  const it = { id: uid("i_"), type: c.id, name: c.name, shape: c.shape, x: 0, y: 0, w: c.w, d: c.d, h: c.h, rot: 0, color: c.color, elev: c.elev || 0, wall: !!c.wall, flat: !!c.flat };
  if (at) { it.x = round(at[0], GRID); it.y = round(at[1], GRID); } else findSpot(it);
  pushUndo();
  p.items.push(it);
  select("item", it.id);
  commit();
  return it;
}
// find a free place for a new item: against a wall for wall-hugging pieces, else nearest free spot to the centre
function findSpot(it) {
  const p = P(), lp = loops(p.walls), b = bounds(p);
  const inside = A => !lp.length || A.every(q => lp.some(l => polyContains(q, l)));
  const swings = p.openings.filter(o => o.type === "door").map(o => { const w = findWall(o.wall); return w ? doorSwing(w, o) : null; }).filter(Boolean);
  const free = cand => {
    const A = corners(cand);
    if (!inside(A)) return false;
    if (!cand.wall && p.walls.some(w => polySegDist(A, w.a, w.b) < w.t / 2 - 0.005)) return false;
    if (cand.flat) return true;
    if (p.items.some(o => !o.flat && !(o.wall && !cand.wall) && !(cand.wall && !o.wall) && satOverlap(A, corners(o)))) return false;
    if (!cand.wall && swings.some(sw => satOverlap(A, sw, 0.01))) return false;
    return true;
  };
  const ctr = lp.length ? polyCentroid(lp[0]) : b ? [b.x0 + b.w / 2, b.y0 + b.h / 2] : [2.4, 1.8];
  if (lp.length && WALL_SNAP_SHAPES.has(it.shape)) {
    const walls = p.walls.slice().sort((a, c) => wlen(c) - wlen(a));
    for (const wl of walls) {
      const L = wlen(wl); if (L < it.w + 0.1) continue;
      const ux = (wl.b[0] - wl.a[0]) / L, uy = (wl.b[1] - wl.a[1]) / L;
      let nx = -uy, ny = ux;
      const mid = lerp(wl.a, wl.b, 0.5);
      if (!lp.some(l => polyContains([mid[0] + nx * 0.2, mid[1] + ny * 0.2], l))) { nx = -nx; ny = -ny; }
      const off = wl.t / 2 + it.d / 2 + (it.wall ? 0 : 0.01);
      const rot = ((Math.atan2(ny, nx) * 180 / Math.PI - 90) % 360 + 360) % 360;
      const ts = [0.5, 0.35, 0.65, 0.2, 0.8, 0.27, 0.73];
      for (const t of ts) {
        const along = clamp(t * L, it.w / 2 + 0.05, L - it.w / 2 - 0.05);
        const cand = Object.assign({}, it, { x: +(wl.a[0] + ux * along + nx * off).toFixed(3), y: +(wl.a[1] + uy * along + ny * off).toFixed(3), rot: Math.round(rot * 10) / 10 });
        if (free(cand)) { Object.assign(it, { x: cand.x, y: cand.y, rot: cand.rot }); return; }
      }
    }
  }
  const pts = [];
  const x0 = b ? b.x0 : ctr[0] - 3, x1 = b ? b.x1 : ctr[0] + 3, y0 = b ? b.y0 : ctr[1] - 3, y1 = b ? b.y1 : ctr[1] + 3;
  for (let x = x0; x <= x1 + 1e-6; x += 0.1) for (let y = y0; y <= y1 + 1e-6; y += 0.1) pts.push([x, y]);
  pts.sort((a, c) => dist(a, ctr) - dist(c, ctr));
  for (const rot of [0, 90]) for (const q of pts) {
    const cand = Object.assign({}, it, { x: round(q[0], GRID), y: round(q[1], GRID), rot });
    if (free(cand)) { Object.assign(it, { x: cand.x, y: cand.y, rot }); return; }
  }
  it.x = round(ctr[0], GRID); it.y = round(ctr[1], GRID);
}

function removeSelected() {
  const s = ctx.sel; if (!s) return;
  pushUndo();
  const p = P();
  if (s.kind === "item") p.items = p.items.filter(i => i.id !== s.id);
  if (s.kind === "open") p.openings = p.openings.filter(o => o.id !== s.id);
  if (s.kind === "wall") p.walls = p.walls.filter(w => w.id !== s.id);
  if (s.kind === "item") delete ctx.p.brief.prices[s.id];
  ctx.sel = null; ctx.bus.emit("select");
  commit();
}
function rotateSelected(deg = 90) {
  const s = ctx.sel; if (!s || s.kind !== "item") return;
  const it = findItem(s.id); pushUndo();
  it.rot = (((it.rot || 0) + deg) % 360 + 360) % 360; commit();
}
function duplicateSelected() {
  const s = ctx.sel; if (!s || s.kind !== "item") return;
  const it = findItem(s.id); pushUndo();
  const n = Object.assign({}, it, { id: uid("i_"), x: it.x + 0.3, y: it.y + 0.3 });
  P().items.push(n); select("item", n.id); commit();
}

// ---------------- fit checks ----------------
export function checkFit(plan) {
  const out = new Map();
  const add = (id, kind, text) => { const a = out.get(id) || []; a.push({ kind, text }); out.set(id, a); };
  const lp = loops(plan.walls);
  const items = plan.items;
  const polys = new Map(items.map(i => [i.id, corners(i)]));
  items.forEach(it => {
    const A = polys.get(it.id);
    if (lp.length && !A.every(q => lp.some(l => polyContains(q, l)) || plan.walls.some(w => project(q, w.a, w.b).d < w.t / 2 + 0.02)))
      add(it.id, "err", "Outside the walls");
    if (!it.wall) {
      for (const w of plan.walls) { if (polySegDist(A, w.a, w.b) < w.t / 2 - 0.01) { add(it.id, "err", "Goes through a wall"); break; } }
    }
  });
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.flat || b.flat || a.wall || b.wall) continue;
    if ((TUCK.has(a.shape) && TUCK_UNDER.has(b.shape)) || (TUCK.has(b.shape) && TUCK_UNDER.has(a.shape))) continue;
    const A = polys.get(a.id), B = polys.get(b.id);
    if (satOverlap(A, B)) { add(a.id, "err", "Overlaps " + b.name.toLowerCase()); add(b.id, "err", "Overlaps " + a.name.toLowerCase()); continue; }
    if (LARGE.has(a.shape) && LARGE.has(b.shape) && !GAP_EXEMPT.has(a.type) && !GAP_EXEMPT.has(b.type)) {
      const g = polyDist(A, B);
      if (g > 0.03 && g < 0.6) { const t = "Tight walkway (" + Math.round(g * 100) + " cm) to " + b.name.toLowerCase(); add(a.id, "warn", t); add(b.id, "warn", "Tight walkway (" + Math.round(g * 100) + " cm) to " + a.name.toLowerCase()); }
    }
  }
  // door swings
  plan.openings.filter(o => o.type === "door").forEach(o => {
    const w = plan.walls.find(x => x.id === o.wall); if (!w) return;
    const sw = doorSwing(w, o);
    items.forEach(it => { if (it.flat || it.wall) return; if (satOverlap(polys.get(it.id), sw, 0.01)) add(it.id, "warn", "Blocks the door swing"); });
  });
  return out;
}
function doorSwing(w, o) {
  const L = wlen(w), ux = (w.b[0] - w.a[0]) / L, uy = (w.b[1] - w.a[1]) / L;
  const s = o.flip ? -1 : 1, nx = -uy * s, ny = ux * s;
  const c = lerp(w.a, w.b, o.t), h = o.w / 2, off = w.t / 2;
  const p1 = [c[0] - ux * h + nx * off, c[1] - uy * h + ny * off], p2 = [c[0] + ux * h + nx * off, c[1] + uy * h + ny * off];
  return [p1, p2, [p2[0] + nx * o.w, p2[1] + ny * o.w], [p1[0] + nx * o.w, p1[1] + ny * o.w]];
}

// ---------------- drawing ----------------
const f2 = v => +v.toFixed(4);
function itemShape(it) {
  const w = it.w, d = it.d, hw = w / 2, hd = d / 2, fill = it.color || "#d9cbb5";
  const R = (x, y, ww, hh, cls = "det", rx = 0) => `<rect class="${cls}" x="${f2(x)}" y="${f2(y)}" width="${f2(ww)}" height="${f2(hh)}" rx="${rx}"/>`;
  const L = (x1, y1, x2, y2) => `<line class="det" x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}"/>`;
  const E = (cx, cy, rx, ry, cls = "det") => `<ellipse class="${cls}" cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(rx)}" ry="${f2(ry)}"/>`;
  const body = (rx = 0.03) => `<rect class="body" x="${f2(-hw)}" y="${f2(-hd)}" width="${f2(w)}" height="${f2(d)}" rx="${rx}" fill="${fill}" fill-opacity=".55"/>`;
  const ell = () => `<ellipse class="body" cx="0" cy="0" rx="${f2(hw)}" ry="${f2(hd)}" fill="${fill}" fill-opacity=".55"/>`;
  const arm = Math.min(0.2, w * 0.1), back = Math.min(0.22, d * 0.25);
  switch (it.shape) {
    case "sofa": case "armchair":
      return body(0.05) + R(-hw, -hd, w, back) + R(-hw, -hd, arm, d) + R(hw - arm, -hd, arm, d) + (it.shape === "sofa" ? L(0, -hd + back, 0, hd) : "");
    case "sectional": {
      const s = 0.95;
      return `<path class="body" d="M${f2(-hw)} ${f2(-hd)}H${f2(hw)}V${f2(hd)}H${f2(hw - s)}V${f2(-hd + s)}H${f2(-hw)}Z" fill="${fill}" fill-opacity=".55"/>` + R(-hw, -hd, w, back) + R(hw - back, -hd, back, d);
    }
    case "chair": return body(0.04) + R(-hw, -hd, w, Math.min(0.08, d * 0.2));
    case "stool": case "pouf": case "rtable": case "rrug": case "plant": case "lamp":
      return ell() + (it.shape === "plant" ? E(0, 0, hw * 0.55, hd * 0.55) : it.shape === "lamp" ? E(0, 0, hw * 0.3, hd * 0.3) : it.shape === "rrug" ? E(0, 0, hw - 0.08, hd - 0.08) : "");
    case "bed": {
      const pw = Math.min(0.62, (w - 0.15) / 2), ph = 0.32;
      return body(0.03) + R(-hw, -hd, w, 0.08) + R(-pw - 0.03, -hd + 0.12, pw, ph, "det", 0.05) + R(0.03, -hd + 0.12, pw, ph, "det", 0.05) + L(-hw, -hd + d * 0.42, hw, -hd + d * 0.42);
    }
    case "rug": return body(0.02) + R(-hw + 0.07, -hd + 0.07, w - 0.14, d - 0.14);
    case "cabinet": case "counter": return body(0.01) + L(-hw, hd - 0.04, hw, hd - 0.04);
    case "sink": return body(0.01) + E(0, 0.02, Math.min(0.25, hw * 0.6), Math.min(0.18, hd * 0.6));
    case "stove": return body(0.01) + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => E(a * w * 0.22, b * d * 0.2, 0.08, 0.08)).join("");
    case "fridge": return body(0.01) + L(-hw, hd - 0.05, hw, hd - 0.05) + L(0, hd - 0.05, 0, hd);
    case "wardrobe": return body(0.01) + L(0, -hd, 0, hd) + L(-hw, hd - 0.04, hw, hd - 0.04);
    case "shelf": return body(0.01) + L(-hw, -hd + d / 3, hw, -hd + d / 3) + L(-hw, -hd + 2 * d / 3, hw, -hd + 2 * d / 3);
    case "bath": return body(0.08) + R(-hw + 0.08, -hd + 0.08, w - 0.16, d - 0.16, "det", 0.2);
    case "shower": return body(0.02) + L(-hw, -hd, hw, hd) + L(hw, -hd, -hw, hd);
    case "toilet": return `<rect class="body" x="${f2(-hw)}" y="${f2(-hd)}" width="${f2(w)}" height="${f2(d * 0.28)}" fill="${fill}" fill-opacity=".6"/>` + E(0, d * 0.12, hw * 0.92, d * 0.34, "body") ;
    case "crib": return body(0.02) + L(-hw + 0.05, -hd + 0.05, -hw + 0.05, hd - 0.05) + L(hw - 0.05, -hd + 0.05, hw - 0.05, hd - 0.05);
    case "art": case "tv": case "mirror": case "box": return body(0.005);
    default: return body(0.03);
  }
}

function draw() {
  if (!ctx || !ctx.p) return;
  const p = P(), W = svg.clientWidth, H = svg.clientHeight;
  if (!W || !H) return;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = buildSVG(p, view, W, H, { live: true });
  updatePlanTag();
}

function buildSVG(p, v, W, H, opt = {}) {
  const s = v.s, px = n => f2(n / s);
  const out = [`<style>${SCOPED_CSS}</style>`];
  if (opt.bg) out.push(`<rect width="${W}" height="${H}" fill="${opt.bg}"/>`);
  out.push(`<g transform="matrix(${f2(s)},0,0,${f2(s)},${f2(v.tx)},${f2(v.ty)})">`);

  // grid
  const x0 = -v.tx / s, y0 = -v.ty / s, x1 = (W - v.tx) / s, y1 = (H - v.ty) / s;
  const step = s >= 36 ? 0.5 : s >= 14 ? 1 : 2, maj = step === 0.5 ? 1 : 5;
  let g = "";
  for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) { const isM = Math.abs(x / maj - Math.round(x / maj)) < 1e-6; g += `<line class="${isM ? "grid-maj" : "grid-min"}" x1="${f2(x)}" y1="${f2(y0)}" x2="${f2(x)}" y2="${f2(y1)}" stroke-width="${px(1)}"/>`; }
  for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) { const isM = Math.abs(y / maj - Math.round(y / maj)) < 1e-6; g += `<line class="${isM ? "grid-maj" : "grid-min"}" x1="${f2(x0)}" y1="${f2(y)}" x2="${f2(x1)}" y2="${f2(y)}" stroke-width="${px(1)}"/>`; }
  out.push(`<g>${g}</g>`);

  // floor
  const lp = loops(p.walls);
  lp.forEach(l => {
    out.push(`<polygon class="floor" points="${l.map(q => f2(q[0]) + "," + f2(q[1])).join(" ")}"/>`);
    const c = polyCentroid(l);
    if (polyArea(l) * s * s > 9000) out.push(`<text class="area" x="${f2(c[0])}" y="${f2(c[1])}" font-size="${px(13)}" style="font-size:${px(13)}px">${esc(fmtArea(polyArea(l), ctx.p.units))}</text>`);
  });
  const centroid = lp.length ? polyCentroid(lp[0]) : null;

  // furniture
  const issues = checkFit(p);
  const sel = ctx.sel || {};
  const order = p.items.slice().sort((a, b) => (b.flat ? 1 : 0) - (a.flat ? 1 : 0) || (a.wall ? 1 : 0) - (b.wall ? 1 : 0));
  order.forEach(it => {
    const iss = issues.get(it.id), cls = "it" + (sel.kind === "item" && sel.id === it.id ? " sel" : "") + (iss ? (iss.some(x => x.kind === "err") ? " err" : " warn") : "");
    const showLab = Math.min(it.w, it.d) * s > 26 && it.w * s > 60 && !it.wall && !it.flat;
    const flipText = ((it.rot % 360) + 360) % 360 > 90 && ((it.rot % 360) + 360) % 360 < 270;
    out.push(`<g class="${cls}" data-k="item" data-id="${it.id}" transform="translate(${f2(it.x)} ${f2(it.y)}) rotate(${f2(it.rot || 0)})" stroke-width="${px(1.3)}">`);
    out.push(itemShape(it));
    if (showLab) out.push(`<text class="lab" transform="${flipText ? "rotate(180)" : ""}" y="${f2(it.shape === "bed" ? it.d * 0.18 : 0)}" style="font-size:${px(11)}px">${esc(it.name)}</text>`);
    if (cls.includes(" sel") && opt.live) {
      out.push(`<line class="rotl" x1="0" y1="${f2(-it.d / 2)}" x2="0" y2="${f2(-it.d / 2 - px(26))}" stroke-width="${px(1.3)}"/>`);
      out.push(`<circle class="rot" data-k="rot" data-id="${it.id}" cx="0" cy="${f2(-it.d / 2 - px(26))}" r="${px(touchR(7))}" stroke-width="${px(1.5)}"/>`);
    }
    out.push(`</g>`);
    if (cls.includes(" sel") && opt.live) {
      const lab = Math.round(it.w * 100) + " × " + Math.round(it.d * 100) + " cm";
      const bb = corners(it).reduce((m, q) => Math.max(m, q[1]), -Infinity);
      out.push(`<text class="sz" x="${f2(it.x)}" y="${f2(bb + px(14))}" style="font-size:${px(10.5)}px;stroke-width:${px(3)}px">${lab}</text>`);
    }
  });

  // walls
  p.walls.forEach(w => {
    const isSel = sel.kind === "wall" && sel.id === w.id;
    out.push(`<line class="wall${isSel ? " sel" : ""}" x1="${f2(w.a[0])}" y1="${f2(w.a[1])}" x2="${f2(w.b[0])}" y2="${f2(w.b[1])}" stroke-width="${f2(w.t)}"/>`);
  });
  // openings
  p.openings.forEach(o => {
    const w = p.walls.find(x => x.id === o.wall); if (!w) return;
    const c = lerp(w.a, w.b, o.t), ang = Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]) * 180 / Math.PI;
    const hw = o.w / 2, t = w.t, isSel = sel.kind === "open" && sel.id === o.id;
    let g2 = `<rect class="op-gap" x="${f2(-hw)}" y="${f2(-t / 2 - px(1))}" width="${f2(o.w)}" height="${f2(t + px(2))}"/>`;
    if (o.type === "window") {
      g2 += `<line class="op-win" x1="${f2(-hw)}" y1="${f2(-t / 6)}" x2="${f2(hw)}" y2="${f2(-t / 6)}" stroke-width="${px(1.5)}"/><line class="op-win" x1="${f2(-hw)}" y1="${f2(t / 6)}" x2="${f2(hw)}" y2="${f2(t / 6)}" stroke-width="${px(1.5)}"/>`;
      g2 += `<line class="op-win" x1="${f2(-hw)}" y1="${f2(-t / 2)}" x2="${f2(-hw)}" y2="${f2(t / 2)}" stroke-width="${px(1.5)}"/><line class="op-win" x1="${f2(hw)}" y1="${f2(-t / 2)}" x2="${f2(hw)}" y2="${f2(t / 2)}" stroke-width="${px(1.5)}"/>`;
    } else if (o.type === "door") {
      const sgn = o.flip ? -1 : 1, hx = o.hinge === "r" ? hw : -hw, ox = -hx;
      const y0d = sgn * t / 2, yl = sgn * (t / 2 + o.w);
      g2 += `<line class="op-door" x1="${f2(hx)}" y1="${f2(y0d)}" x2="${f2(hx)}" y2="${f2(yl)}" stroke-width="${px(2)}"/>`;
      g2 += `<path class="op-arc" d="M${f2(hx)} ${f2(yl)} A${f2(o.w)} ${f2(o.w)} 0 0 ${(sgn > 0) === (o.hinge === "r") ? 1 : 0} ${f2(ox)} ${f2(y0d)}" stroke-width="${px(1)}"/>`;
    } else {
      g2 += `<line class="op-arc" x1="${f2(-hw)}" y1="${f2(-t / 2)}" x2="${f2(-hw)}" y2="${f2(t / 2)}" stroke-width="${px(1.5)}"/><line class="op-arc" x1="${f2(hw)}" y1="${f2(-t / 2)}" x2="${f2(hw)}" y2="${f2(t / 2)}" stroke-width="${px(1.5)}"/>`;
    }
    out.push(`<g class="op${isSel ? " sel" : ""}" data-k="open" data-id="${o.id}" transform="translate(${f2(c[0])} ${f2(c[1])}) rotate(${f2(ang)})" style="cursor:ew-resize">${g2}<rect x="${f2(-hw)}" y="${f2(-Math.max(t, px(18)) / 2)}" width="${f2(o.w)}" height="${f2(Math.max(t, px(18)))}" fill="transparent"/></g>`);
  });
  // wall hit areas (on top so walls are easy to grab, below openings' own hits)
  if (opt.live) p.walls.forEach(w => out.splice(out.length - p.openings.length, 0,
    `<line class="whit" data-k="wall" data-id="${w.id}" x1="${f2(w.a[0])}" y1="${f2(w.a[1])}" x2="${f2(w.b[0])}" y2="${f2(w.b[1])}" stroke-width="${f2(Math.max(w.t, px(touchR(14))))}"/>`));

  // dimensions
  p.walls.forEach(w => {
    const L = wlen(w); if (L * s < 44) return;
    const m = lerp(w.a, w.b, 0.5);
    let nx = -(w.b[1] - w.a[1]) / L, ny = (w.b[0] - w.a[0]) / L;
    if (centroid && ((m[0] - centroid[0]) * nx + (m[1] - centroid[1]) * ny) < 0) { nx = -nx; ny = -ny; }
    const off = w.t / 2 + px(12);
    let ang = Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]) * 180 / Math.PI;
    if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
    const x = m[0] + nx * off, y = m[1] + ny * off;
    out.push(`<text class="dim${p.calibrated ? " cal" : ""}" transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(ang)})" style="font-size:${px(11)}px;stroke-width:${px(3)}px">${esc(fmtLen(L, ctx.p.units))}</text>`);
  });

  if (opt.live) {
    // vertices
    if (tool === "select" || tool === "wall") {
      const seen = new Set();
      p.walls.forEach(w => [w.a, w.b].forEach(q => {
        const k = vkey(q); if (seen.has(k)) return; seen.add(k);
        out.push(`<circle class="vtx" ${tool === "select" ? `data-k="vtx" data-key="${k}"` : ""} cx="${f2(q[0])}" cy="${f2(q[1])}" r="${px(touchR(4.5))}" stroke-width="${px(1.4)}"/>`);
      }));
    }
    // wall draft
    if (tool === "wall" && draft) {
      const pts = draft.pts.concat(hover ? [hover] : []);
      out.push(`<polyline class="draft" points="${pts.map(q => f2(q[0]) + "," + f2(q[1])).join(" ")}" stroke-width="${px(3)}"/>`);
      out.push(`<circle class="vtx first" cx="${f2(draft.pts[0][0])}" cy="${f2(draft.pts[0][1])}" r="${px(touchR(6))}"/>`);
      if (hover) {
        const a = draft.pts[draft.pts.length - 1], L = dist(a, hover);
        if (L > 0.02) out.push(label(lerp(a, hover, 0.5), fmtLen(L, ctx.p.units), "draft", px));
      }
    } else if (tool === "wall" && hover) out.push(`<circle class="vtx first" cx="${f2(hover[0])}" cy="${f2(hover[1])}" r="${px(5)}"/>`);
    // opening ghost
    if (ghost) {
      const wl = ghost.wall, ow = tool === "door" ? 0.9 : 1.2, L = wlen(wl), m = (ow / 2) / L;
      const t = clamp(ghost.t, m, 1 - m), c = lerp(wl.a, wl.b, t), ang = Math.atan2(wl.b[1] - wl.a[1], wl.b[0] - wl.a[0]) * 180 / Math.PI;
      out.push(`<rect class="ghost" transform="translate(${f2(c[0])} ${f2(c[1])}) rotate(${f2(ang)})" x="${f2(-ow / 2)}" y="${f2(-wl.t)}" width="${ow}" height="${f2(wl.t * 2)}"/>`);
    }
    // measure
    if (measure) {
      out.push(`<line class="meas" x1="${f2(measure.a[0])}" y1="${f2(measure.a[1])}" x2="${f2(measure.b[0])}" y2="${f2(measure.b[1])}" stroke-width="${px(2)}" style="stroke-dasharray:${px(6)} ${px(4)}"/>`);
      const L = dist(measure.a, measure.b);
      if (L > 0.02) out.push(label(lerp(measure.a, measure.b, 0.5), fmtLen(L, ctx.p.units), "meas", px));
    }
  }
  out.push(`</g>`);
  return out.join("");
}
function label(pt, text, cls, px) {
  const w = px(text.length * 7.2 + 14), h = px(20);
  return `<g transform="translate(${f2(pt[0])} ${f2(pt[1] - px(16))})"><rect class="${cls}-bg" x="${f2(-w / 2)}" y="${f2(-h / 2)}" width="${f2(w)}" height="${f2(h)}" rx="${px(3)}"/><text class="${cls}-lab" style="font-size:${px(12)}px">${esc(text)}</text></g>`;
}
const touchR = r => (window.matchMedia("(pointer: coarse)").matches ? r * 1.7 : r);

function updatePlanTag() {
  const p = P();
  const lp = loops(p.walls);
  $("#plan-tag").innerHTML = `<b>${ctx.mode === "furnish" ? "Furnish" : "Plan"} / editable room plan</b><span>${esc(ctx.p.name)} · ${p.calibrated ? "to scale" : "estimate"}${lp.length ? " · " + esc(fmtArea(lp.reduce((s, l) => s + polyArea(l), 0), ctx.p.units)) : ""}</span>`;
}

// ---------------- keyboard ----------------
function onKey(e) {
  const active = ctx.mode === "plan" || (ctx.mode === "furnish" && ctx.furnishView === "plan");
  if (!active || e.target.closest("input, textarea, select, [contenteditable]") || document.querySelector(".modal-wrap")) return;
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  if (k === " " && !mod) { space = true; e.preventDefault(); return; }
  if (mod && k.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
  if (mod && k.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); return; }
  if (mod) return;
  const map = { v: "select", w: "wall", d: "door", n: "window", m: "measure" };
  if (map[k.toLowerCase()] && ctx.mode === "plan") { setTool(map[k.toLowerCase()]); return; }
  if (k === "Escape") { if (draft) finishDraft(); else if (measure) { measure = null; queue(); } else if (ctx.sel) select(null); else setTool("select"); return; }
  if (k === "Enter" && draft) { finishDraft(); return; }
  if ((k === "Delete" || k === "Backspace") && ctx.sel) { e.preventDefault(); removeSelected(); return; }
  if (k.toLowerCase() === "r" && ctx.sel && ctx.sel.kind === "item") { rotateSelected(e.shiftKey ? 15 : 90); return; }
  if (k.toLowerCase() === "f") { fit(); return; }
  if (k.startsWith("Arrow") && ctx.sel) {
    e.preventDefault();
    const st = e.shiftKey ? 0.01 : 0.05, dx = k === "ArrowLeft" ? -st : k === "ArrowRight" ? st : 0, dy = k === "ArrowUp" ? -st : k === "ArrowDown" ? st : 0;
    if (ctx.sel.kind === "item") { const it = findItem(ctx.sel.id); pushUndo(); it.x = +(it.x + dx).toFixed(3); it.y = +(it.y + dy).toFixed(3); commit(); }
    if (ctx.sel.kind === "open") { const o = findOpen(ctx.sel.id), wl = findWall(o.wall), L = wlen(wl), m = (o.w / 2) / L; pushUndo(); o.t = clamp(o.t + (dx + dy) / L, m, 1 - m); commit(); }
  }
}

// ---------------- inspector ----------------
function stat(label, val) { return `<div><span>${label}</span><b>${val}</b></div>`; }
function renderInspector() {
  if (!ctx.p) return;
  const p = P(), u = ctx.p.units;
  const lp = loops(p.walls), area = lp.reduce((s, l) => s + polyArea(l), 0);
  const per = lp.reduce((s, l) => s + l.reduce((a, q, i) => a + dist(q, l[(i + 1) % l.length]), 0), 0);
  $("#plan-stats").innerHTML = stat("Walls", p.walls.length) + stat("Openings", p.openings.length) + stat("Objects", p.items.length) +
    stat("Floor area", lp.length ? fmtArea(area, u) : "—") + stat("Perimeter", lp.length ? fmtLen(per, u) : "—") + stat("Scale", p.calibrated ? "✓ true" : "estimate");
  if (document.activeElement !== $("#ceil-h")) $("#ceil-h").value = p.height;
  $("#units").value = u;
  renderSel($("#sel-box"));
  renderCalib();
}
function renderSelLive() {
  // during drags only refresh numbers, not the whole form
  const box = ctx.mode === "furnish" ? $("#fsel-box") : $("#sel-box");
  const s = ctx.sel; if (!s) return;
  if (s.kind === "item") { const it = findItem(s.id); if (!it) return; const r = box.querySelector("[data-f=rot]"); if (r && document.activeElement !== r) r.value = Math.round(it.rot); }
  if (s.kind === "wall") { const w = findWall(s.id); const l = box.querySelector("[data-f=len]"); if (w && l && document.activeElement !== l) l.value = wlen(w).toFixed(2); }
}

function numField(label, value, f, attrs = {}) {
  return el("label", { class: "field" }, el("span", { text: label }), el("input", Object.assign({ class: "input", type: "number", inputmode: "decimal", value, "data-f": f }, attrs)));
}
function renderSel(box) {
  box.innerHTML = "";
  const s = ctx.sel;
  if (!s) { box.append(el("h3", { text: "Selection" }), el("p", { class: "muted small", text: "Select a wall, opening or piece of furniture to edit its size." })); return; }
  if (s.kind === "item") { const it = findItem(s.id); if (it) itemEditor(box, it); return; }
  if (s.kind === "wall") {
    const w = findWall(s.id); if (!w) return;
    const idx = P().walls.indexOf(w) + 1;
    box.append(el("h3", { text: "Wall " + idx }));
    const len = numField("Length (m)", wlen(w).toFixed(2), "len", { min: 0.1, max: 50, step: 0.01 });
    const th = numField("Thickness (cm)", Math.round(w.t * 100), "th", { min: 5, max: 60, step: 1 });
    box.append(el("div", { class: "grid2" }, len, th));
    len.querySelector("input").addEventListener("change", e => {
      const v = parseFloat(e.target.value); if (!(v > 0.1 && v < 50)) { toast("Enter a length between 0.1 and 50 m.", "error"); return; }
      pushUndo(); setWallLength(w, v); commit();
    });
    th.querySelector("input").addEventListener("change", e => {
      const v = parseFloat(e.target.value); if (!(v >= 5 && v <= 60)) { toast("Thickness must be 5–60 cm.", "error"); return; }
      pushUndo(); w.t = v / 100; commit();
    });
    box.append(el("div", { class: "row wrap" },
      el("button", { class: "btn btn-ghost btn-small", type: "button", text: "Add door", onclick: () => { const c = lerp(w.a, w.b, 0.5); addOpening(c, "door"); } }),
      el("button", { class: "btn btn-ghost btn-small", type: "button", text: "Add window", onclick: () => { const c = lerp(w.a, w.b, 0.5); addOpening(c, "window"); } }),
      el("button", { class: "btn btn-ghost btn-small danger-t", type: "button", text: "Delete wall", onclick: removeSelected })));
    return;
  }
  if (s.kind === "open") {
    const o = findOpen(s.id); if (!o) return;
    const w = findWall(o.wall);
    box.append(el("h3", { text: o.type === "door" ? "Door" : o.type === "window" ? "Window" : "Opening" }));
    const type = el("select", { class: "input", "data-f": "type" }, [["door", "Door"], ["window", "Window"], ["opening", "Open archway"]].map(([v, n]) => el("option", { value: v, text: n, selected: o.type === v ? true : null })));
    box.append(el("label", { class: "field" }, el("span", { text: "Type" }), type));
    const wi = numField("Width (cm)", Math.round(o.w * 100), "w", { min: 30, max: 600, step: 1 });
    const hi = numField("Height (cm)", Math.round(o.h * 100), "h", { min: 50, max: 400, step: 1 });
    const si = numField("Sill (cm)", Math.round((o.sill || 0) * 100), "sill", { min: 0, max: 250, step: 1 });
    box.append(el("div", { class: "grid3" }, wi, hi, si));
    const fromA = o.t * wlen(w) - o.w / 2;
    box.append(el("p", { class: "muted small", text: "Starts " + fmtLen(fromA, U()) + " from the wall's first corner." }));
    type.addEventListener("change", () => { pushUndo(); o.type = type.value; if (o.type === "door") { o.sill = 0; o.h = 2.05; } if (o.type === "window") { o.sill = 0.9; o.h = 1.3; } if (o.type === "opening") { o.sill = 0; o.h = 2.1; } commit(); });
    const upd = (f, min, max, conv = 0.01) => e => {
      const v = parseFloat(e.target.value); if (!(v >= min && v <= max)) { toast("Value out of range.", "error"); renderInspector(); return; }
      pushUndo(); o[f] = v * conv;
      if (f === "w") { const L = wlen(w); if (o.w > L - 0.05) { o.w = L - 0.05; toast("Width limited to the wall length."); } }
      if (o.sill + o.h > P().height) o.h = Math.max(0.3, P().height - o.sill);
      commit();
    };
    wi.querySelector("input").addEventListener("change", upd("w", 30, 600));
    hi.querySelector("input").addEventListener("change", upd("h", 50, 400));
    si.querySelector("input").addEventListener("change", upd("sill", 0, 250));
    const row = el("div", { class: "row wrap" });
    if (o.type === "door") {
      row.append(el("button", { class: "btn btn-ghost btn-small", type: "button", text: "Flip swing", onclick: () => { pushUndo(); o.flip = !o.flip; commit(); } }));
      row.append(el("button", { class: "btn btn-ghost btn-small", type: "button", text: "Swap hinge", onclick: () => { pushUndo(); o.hinge = o.hinge === "r" ? "l" : "r"; commit(); } }));
    }
    row.append(el("button", { class: "btn btn-ghost btn-small danger-t", type: "button", text: "Delete", onclick: removeSelected }));
    box.append(row);
  }
}

export function itemEditor(box, it) {
  box.innerHTML = "";
  box.append(el("h3", { text: it.name }));
  const nm = el("input", { class: "input", value: it.name, maxlength: 40, "aria-label": "Name" });
  nm.addEventListener("change", () => { pushUndo(); it.name = nm.value.trim() || catalogItem(it.type)?.name || "Item"; commit(); });
  box.append(el("label", { class: "field" }, el("span", { text: "Name" }), nm));
  const fw = numField("Width (cm)", Math.round(it.w * 100), "w", { min: 5, max: 800, step: 1 });
  const fd = numField("Depth (cm)", Math.round(it.d * 100), "d", { min: 1, max: 800, step: 1 });
  const fh = numField("Height (cm)", Math.round(it.h * 100), "h", { min: 1, max: 400, step: 1 });
  box.append(el("div", { class: "grid3" }, fw, fd, fh));
  const fr = numField("Rotation (°)", Math.round(it.rot || 0), "rot", { min: -360, max: 360, step: 1 });
  const fc = el("label", { class: "field" }, el("span", { text: "Colour" }), el("input", { class: "input color", type: "color", value: it.color || "#cccccc", "data-f": "color" }));
  const parts = [fr, fc];
  if (it.wall || it.elev) parts.push(numField("Height off floor (cm)", Math.round((it.elev || 0) * 100), "elev", { min: 0, max: 300, step: 1 }));
  box.append(el("div", { class: parts.length === 3 ? "grid3" : "grid2" }, parts));
  const set = (f, min, max, conv) => e => {
    const v = parseFloat(e.target.value);
    if (!(v >= min && v <= max)) { toast("Value out of range.", "error"); e.target.value = Math.round(it[f] / conv); return; }
    pushUndo(); it[f] = f === "rot" ? ((v % 360) + 360) % 360 : v * conv; commit();
  };
  fw.querySelector("input").addEventListener("change", set("w", 5, 800, 0.01));
  fd.querySelector("input").addEventListener("change", set("d", 1, 800, 0.01));
  fh.querySelector("input").addEventListener("change", set("h", 1, 400, 0.01));
  fr.querySelector("input").addEventListener("change", set("rot", -360, 360, 1));
  if (parts[2]) parts[2].querySelector("input").addEventListener("change", set("elev", 0, 300, 0.01));
  fc.querySelector("input").addEventListener("change", e => { pushUndo(); it.color = e.target.value; commit(); });
  const iss = checkFit(P()).get(it.id);
  if (iss) box.append(el("ul", { class: "issue-list" }, iss.map(x => el("li", { class: x.kind, text: x.text }))));
  box.append(el("div", { class: "row wrap" },
    el("button", { class: "btn btn-ghost btn-small", type: "button", html: '<svg><use href="#i-rotate"/></svg>Rotate 90°', onclick: () => rotateSelected(90) }),
    el("button", { class: "btn btn-ghost btn-small", type: "button", html: '<svg><use href="#i-copy"/></svg>Duplicate', onclick: duplicateSelected }),
    el("button", { class: "btn btn-ghost btn-small danger-t", type: "button", html: '<svg><use href="#i-trash"/></svg>Remove', onclick: removeSelected })));
}

function renderCalib() {
  const box = $("#calib-box"), p = P();
  box.innerHTML = "";
  box.append(el("h3", {}, "Calibrate to scale ", el("span", { class: "badge " + (p.calibrated ? "ok" : ""), text: p.calibrated ? "Calibrated" : "Estimate" })));
  if (!p.walls.length) { box.append(el("p", { class: "muted small", text: "Draw or create walls first." })); return; }
  box.append(el("p", { class: "muted small", text: "Pick one wall you've measured with a tape and enter its real length. Everything rescales to match." }));
  const selW = ctx.sel && ctx.sel.kind === "wall" ? ctx.sel.id : p.walls.reduce((m, w) => wlen(w) > wlen(m) ? w : m, p.walls[0]).id;
  const sw = el("select", { class: "input", "aria-label": "Wall to calibrate" }, p.walls.map((w, i) => el("option", { value: w.id, text: "Wall " + (i + 1) + " · " + fmtLen(wlen(w), ctx.p.units), selected: w.id === selW ? true : null })));
  const real = el("input", { class: "input", type: "number", inputmode: "decimal", min: 0.1, max: 50, step: 0.01, placeholder: "Real length (m)", "aria-label": "Real length in metres" });
  const go = el("button", { class: "btn btn-dark btn-small", type: "submit", text: "Apply" });
  const f = el("form", { class: "calib" }, sw, real, go);
  f.addEventListener("submit", e => {
    e.preventDefault();
    const w = findWall(sw.value), v = parseFloat(real.value);
    if (!w) return;
    if (!(v >= 0.1 && v <= 50)) { toast("Enter the real length in metres (0.1–50).", "error"); real.focus(); return; }
    calibrate(w, v);
  });
  sw.addEventListener("change", () => select("wall", sw.value));
  box.append(f);
}

// ---------------- export ----------------
async function exportPNG() {
  const p = P(), b = bounds(p);
  if (!b) { toast("Nothing to export yet."); return; }
  const s = 90, pad = 1.0;
  const W = Math.round((b.w + pad * 2) * s), H = Math.round((b.h + pad * 2) * s) + 50;
  const v = { s, tx: (pad - b.x0) * s, ty: (pad - b.y0) * s + 40 };
  const keepSel = ctx.sel; ctx.sel = null;
  let inner = buildSVG(p, v, W, H, { bg: "#fbf8f2" });
  ctx.sel = keepSel;
  inner += `<text x="24" y="30" style="font:600 16px Georgia,serif;fill:#1d211f">${esc(ctx.p.name)} — plan${p.calibrated ? "" : " (estimate)"}</text>`;
  const svgStr = `<svg xmlns="${NS}" class="mk-plan" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${inner}</svg>`;
  const url = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const k = Math.min(2, 4000 / Math.max(W, H));
    const c = document.createElement("canvas"); c.width = Math.round(W * k); c.height = Math.round(H * k);
    const g = c.getContext("2d"); g.scale(k, k); g.drawImage(img, 0, 0);
    download((ctx.p.name || "plan").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + "-plan.png", c.toDataURL("image/png"));
    toast("Plan exported.");
  } catch (e) {
    download("plan.svg", new Blob([svgStr], { type: "image/svg+xml" }));
    toast("Exported as SVG.");
  } finally { URL.revokeObjectURL(url); }
}

// standalone SVG of the plan for the brief / print (no grid, no handles)
export function planSnapshot(maxW = 760, maxH = 520) {
  const p = ctx.p.plan, b = bounds(p);
  if (!b) return "";
  const pad = 0.6, s = Math.min(maxW / (b.w + pad * 2), maxH / (b.h + pad * 2), 120);
  const W = Math.round((b.w + pad * 2) * s), H = Math.round((b.h + pad * 2) * s);
  const v = { s, tx: (pad - b.x0) * s, ty: (pad - b.y0) * s };
  const keep = ctx.sel; ctx.sel = null;
  const inner = buildSVG(p, v, W, H, { bg: "#ffffff" }).replace(/<g><line class="grid[\s\S]*?<\/g>/, "");
  ctx.sel = keep;
  return `<svg xmlns="${NS}" class="mk-plan" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Floor plan">${inner}</svg>`;
}
