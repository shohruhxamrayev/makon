// Makon Studio — Design mode: photo, style, render (AI or on-device), versions, refine, palette
import { openShare } from "./share.js";
import { $, $$, el, esc, toast, confirmBox, modal, uid, fileToDataURL, scaleImage, loadImage, thumbOf, download, isTouch } from "./util.js";
import { STYLES, ROOM_TYPES, KEEP, keepName, LIGHT, LIGHT_NAMES, roomName, STYLE_PIC, STYLE_GROUPS, D_MOOD, D_FURN, D_BUDGET, D_LIGHT, D_IDEAS } from "./data.js";
import { renderMood, extractPalette } from "./engine.js";

const SAMPLE_BEFORE = "img/room-before.jpg", SAMPLE_AFTER = "img/room-after.jpg";
const MAX_VERSIONS = 24;
let ctx, busy = false, view = "slider", pos = 50;
const CODE_KEY = "makon_ai_code";

const RULES = [
  [/warm|wood|oak|cos[yi]|golden|honey/, "Warmer", a => { a.w = Math.min(0.8, a.w + 0.15); }],
  [/cool|cold|blue|fresh|crisp white/, "Cooler", a => { a.w = Math.max(-0.8, a.w - 0.15); }],
  [/bright|light(er)?\b|airy|sunn|whiter/, "Brighter", a => { a.b = Math.min(1.5, a.b + 0.08); }],
  [/dark|moody|dim|night|evening|cosier/, "Darker", a => { a.b = Math.max(0.6, a.b - 0.08); }],
  [/contrast|bold|punch|sharp|defin/, "More contrast", a => { a.c = Math.min(1.5, a.c + 0.08); }],
  [/soft|calm|gentle|hazy|dreamy/, "Softer", a => { a.c = Math.max(0.7, a.c - 0.07); }],
  [/colou?rful|vivid|rich|saturat|vibrant/, "Richer colour", a => { a.s = Math.min(1.6, a.s + 0.15); }],
  [/mute|desaturat|neutral|subtle|less colou?r|grey|gray/, "Muted", a => { a.s = Math.max(0.4, a.s - 0.15); }]
];

export function init(c) {
  ctx = c;
  const p = () => ctx.p;

  // ---- static controls ----
  const rt = $("#room-type");
  ROOM_TYPES.forEach(([k, n]) => rt.append(el("option", { value: k, text: n })));
  rt.addEventListener("change", () => { p().roomType = rt.value; ctx.save(); renderIdeas(); renderSum(); });

  // ---- options: colour mood, furniture, budget, light ----
  [["#o-mood", D_MOOD, "mood"], ["#o-furn", D_FURN, "furn"], ["#o-budget", D_BUDGET, "budget"], ["#o-light", D_LIGHT, "lit"]].forEach(([sel, list, key]) => {
    const box = $(sel);
    list.forEach(([k, n]) => box.append(el("button", { type: "button", "data-k": k, "aria-pressed": "false", text: n, onclick: () => { p().design[key] = k; ctx.save(); renderControls(); } })));
  });
  // ---- ideas & surprise ----
  $("#surprise").addEventListener("click", surprise);
  // ---- inspiration photo ----
  $("#ref-pick").addEventListener("click", () => $("#ref-file").click());
  $("#ref-file").addEventListener("change", async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try { const img = await loadImage(URL.createObjectURL(f)); p().design.ref = scaleImage(img, 768, 0.86); ctx.save(); renderControls(); toast("Inspiration added — Makon will copy its look onto your room."); }
    catch (er) { toast("Couldn't read that picture. Try a JPG or PNG.", "error"); }
  });
  $("#ref-style").addEventListener("click", async () => {
    const k = p().design.style; if (!STYLE_PIC[k]) { toast("This style has no example photo yet — upload your own picture."); return; }
    try { const img = await loadImage(STYLE_PIC[k]); p().design.ref = scaleImage(img, 768, 0.86); ctx.save(); renderControls(); toast(STYLES[k].name + " example added as inspiration."); }
    catch (er) { toast("Couldn't load the example photo.", "error"); }
  });
  $("#ref-x").addEventListener("click", () => { p().design.ref = null; ctx.save(); renderControls(); });

  const st = $("#styles");
  const sg = $("#style-groups");
  [["all", "All"], ...STYLE_GROUPS.map(g => [g[0], g[1]])].forEach(([k, n]) => sg.append(el("button", { type: "button", "data-g": k, "aria-pressed": String(k === styleGroup), text: n, onclick: () => { styleGroup = k; renderControls(); } })));
  $("#style-count").textContent = "· " + Object.keys(STYLES).length + " styles";
  Object.entries(STYLES).forEach(([k, s]) => {
    st.append(el("button", { type: "button", class: "style-opt", "data-k": k, "aria-pressed": "false", onclick: () => { p().design.style = k; p().finish = { wall: null, floor: null }; ctx.save(); renderControls(); ctx.bus.emit("style"); } },
      STYLE_PIC[k] ? el("span", { class: "st-pic" }, el("img", { src: STYLE_PIC[k], alt: "", loading: "lazy", decoding: "async" })) : null,
      el("span", { class: "sw", html: s.palette.map(c => '<i style="background:' + c + '"></i>').join("") }),
      el("strong", { text: s.name }), el("small", { text: s.note })));
  });

  const inten = $("#intensity");
  inten.addEventListener("input", () => { $("#int-out").textContent = inten.value + "%"; p().design.intensity = inten.value / 100; ctx.save(); });

  const comp = $("#compass");
  LIGHT.forEach(([deg, n]) => comp.append(el("button", { type: "button", role: "radio", "data-d": deg, "aria-checked": "false", "aria-label": "From the " + LIGHT_NAMES[deg], text: n, style: "--a:" + deg + "deg", onclick: () => { p().design.light = deg; ctx.save(); renderControls(); ctx.bus.emit("light"); } })));
  comp.append(el("span", { class: "compass-c", html: "☀" }));

  const keep = $("#keep");
  KEEP.forEach(([k, n]) => keep.append(el("button", { type: "button", "data-k": k, "aria-pressed": "false", text: n, onclick: () => {
    const d = p().design, i = d.keep.indexOf(k);
    if (i >= 0) d.keep.splice(i, 1); else d.keep.push(k);
    ctx.save(); renderControls();
  } })));

  $("#notes").addEventListener("input", e => { p().design.notes = e.target.value; ctx.save(); renderSum(); markIdeas(); });

  $$("#engine button").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.e === "ai" && !ctx.ai.enabled) { toast("AI renders aren't connected on this site yet — see the note above."); return; }
    p().design.engine = b.dataset.e; ctx.save(); renderControls();
  }));

  $("#generate").addEventListener("click", () => generate());

  // ---- photo input ----
  const drop = $("#drop");
  $("#photo-file").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) setPhoto(f); });
  $("#camera-file").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) setPhoto(f); });
  $("#take-photo").hidden = !isTouch();
  $("#take-photo").addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); $("#camera-file").click(); });
  $("#drop-tpl").addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); ctx.chooseStart && ctx.chooseStart(); });
  $("#use-sample").addEventListener("click", async e => {
    e.preventDefault(); e.stopPropagation();
    if (!(await okToReplace())) return;
    const d = p().design;
    p().photo = SAMPLE_BEFORE; p().sample = true; d.versions = []; d.current = null;
    p().thumb = await thumbOf(SAMPLE_BEFORE);
    if (p().name === "Untitled room" || /^Room \d+$/.test(p().name)) { p().name = "Living room"; $("#room-name").value = p().name; }
    p().roomType = "living";
    ctx.save(); render(); toast("Sample room loaded — press Generate redesign.");
  });
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("drag"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("drag"); }));
  drop.addEventListener("drop", e => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setPhoto(f); });
  // drop a photo anywhere on the design stage, or paste one
  const stage = $("#st-design");
  stage.addEventListener("dragover", e => e.preventDefault());
  stage.addEventListener("drop", e => { e.preventDefault(); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f && !drop.contains(e.target)) setPhoto(f); });
  document.addEventListener("paste", e => {
    if (ctx.mode !== "design" || e.target.closest("input, textarea")) return;
    const it = [...(e.clipboardData || {}).items || []].find(i => i.type.startsWith("image/"));
    if (it) { e.preventDefault(); setPhoto(it.getAsFile()); }
  });
  $("#v-replace").addEventListener("click", () => $("#photo-file").click());

  // ---- viewer ----
  $$("#view-mode button").forEach(b => b.addEventListener("click", () => { view = b.dataset.v; renderViewer(); }));
  wireSlider();
  $("#v-download").addEventListener("click", async () => {
    const v = cur(); const src = v ? v.img : p().photo; if (!src) return;
    const name = (p().name || "room").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase();
    if (!v) { loadImage(src).then(i => download(name + "-original.jpg", scaleImage(i, 4000, 0.92))); return; }
    try { toast("Preparing a sharp HD copy…"); download(name + "-v" + (p().design.versions.indexOf(v) + 1) + "-hd.jpg", await hdImage(src)); }
    catch (e) { download(name + ".jpg", src); }
  });
  const share = () => {
    const v = cur(); if (!v) { toast("Generate a redesign first, then share it."); return; }
    openShare({ before: p().sample ? SAMPLE_BEFORE : p().photo, after: v.img, styleName: (STYLES[v.style] || {}).name, roomName: roomName(p().roomType) });
  };
  $("#v-share").addEventListener("click", share); $("#share-btn").addEventListener("click", share);
  $("#v-full").addEventListener("click", () => toggleFull());
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#cmp").classList.contains("fs")) toggleFull(false); });

  // ---- refine ----
  $$("#refine-chips button").forEach(b => b.addEventListener("click", () => {
    const t = $("#refine"); t.value = (t.value.trim() ? t.value.trim().replace(/[,.]?$/, ", ") : "") + b.textContent; t.focus();
  }));
  $("#refine-form").addEventListener("submit", e => { e.preventDefault(); refine($("#refine").value.trim()); });
  $("#refine").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#refine-form").requestSubmit(); } });
  $("#refine-undo").addEventListener("click", undoRefine);

  // ---- quick edits ----
  $$("#qe button").forEach(b => b.addEventListener("click", () => quickEdit(b.dataset.q, b)));
  $("#busy-x").addEventListener("click", () => { if (abortCtl) { cancelled = true; abortCtl.abort(); } });
  // press and hold the picture to peek at the original
  const cmpEl = $("#cmp");
  const peek = on => { if (on && cur() && cmpEl.dataset.v === "after") cmpEl.dataset.peek = "1"; else delete cmpEl.dataset.peek; };
  cmpEl.addEventListener("pointerdown", e => { if (e.button <= 0) peek(true); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => cmpEl.addEventListener(ev, () => peek(false)));
  document.addEventListener("keydown", e => { if (e.key === "o" && ctx.mode === "design" && !e.target.closest("input, textarea, select")) peek(true); });
  document.addEventListener("keyup", e => { if (e.key === "o") peek(false); });

  ctx.bus.on("project", render);
  ctx.bus.on("mode", m => { if (m === "design") render(); });
  ctx.bus.on("ai", renderControls);
}

const cur = () => { const d = ctx.p.design; return d.versions.find(v => v.id === d.current) || null; };
let styleGroup = "popular";
const optOf = (list, k) => list.find(x => x[0] === k) || list[0];

function renderIdeas() {
  const box = $("#ideas"); if (!box || !ctx.p) return;
  const list = [...(D_IDEAS[ctx.p.roomType] || []), ...D_IDEAS.all.slice(0, 6)];
  box.innerHTML = "";
  list.forEach(t => box.append(el("button", { type: "button", "data-t": t, text: "+ " + t, onclick: () => addIdea(t) })));
  markIdeas();
}
function markIdeas() {
  const n = ((ctx.p && ctx.p.design.notes) || "").toLowerCase();
  $$("#ideas button").forEach(b => { const on = n.includes(b.dataset.t.toLowerCase()); b.classList.toggle("on", on); b.textContent = (on ? "✓ " : "+ ") + b.dataset.t; });
}
function addIdea(t) {
  const n = $("#notes"), cur0 = n.value.trim();
  if (cur0.toLowerCase().includes(t.toLowerCase())) return;
  n.value = cur0 ? cur0.replace(/[.,;\s]*$/, "") + ", " + t : t.charAt(0).toUpperCase() + t.slice(1);
  ctx.p.design.notes = n.value; ctx.save(); renderSum(); markIdeas();
}
function surprise() {
  const d = ctx.p.design, pick = a => a[Math.floor(Math.random() * a.length)];
  const keys = Object.keys(STYLES).filter(k => k !== d.style);
  d.style = pick(keys); ctx.p.finish = { wall: null, floor: null };
  d.mood = Math.random() < 0.5 ? "style" : pick(D_MOOD)[0];
  d.lit = pick(D_LIGHT)[0];
  const ideas = [...(D_IDEAS[ctx.p.roomType] || []), ...D_IDEAS.all], a = pick(ideas); let b = pick(ideas); if (b === a) b = pick(ideas);
  d.notes = (a.charAt(0).toUpperCase() + a.slice(1)) + (b !== a ? ", " + b : "");
  styleGroup = "all";
  ctx.save(); renderControls(); ctx.bus.emit("style");
  const sel = document.querySelector('#styles .style-opt[aria-pressed="true"]'); if (sel) sel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  toast("Surprise: " + STYLES[d.style].name + " · " + optOf(D_LIGHT, d.lit)[1].toLowerCase() + " — press Generate.");
}
function renderSum() {
  const p = ctx.p, d = p && p.design, box = $("#req-sum"); if (!box || !d) return;
  const bits = [STYLES[d.style] && STYLES[d.style].name, d.mood && d.mood !== "style" ? optOf(D_MOOD, d.mood)[1] : "", optOf(D_FURN, d.furn)[1], d.budget && d.budget !== "mid" ? optOf(D_BUDGET, d.budget)[1] : "", optOf(D_LIGHT, d.lit)[1], d.ref ? "inspiration photo" : ""].filter(Boolean);
  const req = (d.notes || "").trim();
  box.innerHTML = '<b>Makon will make:</b> ' + esc(bits.join(" · ")) + (req ? '<br><b>Your request first:</b> “' + esc(req.length > 140 ? req.slice(0, 140) + "…" : req) + '”' : "") + (req && engineChoice() !== "ai" ? '<br><small>Your own words need an AI render — the instant preview only changes colour and light.</small>' : "");
}
const aiLeft = () => !(ctx.ai.limit && ctx.ai.remaining === 0);
const engineChoice = () => { const e = ctx.p.design.engine; return ctx.ai.enabled && e !== "local" && aiLeft() ? "ai" : "local"; };

async function okToReplace() {
  if (!ctx.p.design.versions.length) return true;
  return confirmBox("Replace the photo?", "The " + ctx.p.design.versions.length + " version(s) made from the current photo will be removed.", "Replace");
}

async function setPhoto(file) {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name || "")) { toast("Please choose an image file.", "error"); return; }
  if (file.size > 25 * 1024 * 1024) { toast("That photo is over 25 MB — try a smaller one.", "error"); return; }
  if (!(await okToReplace())) return;
  try {
    const data = await fileToDataURL(file, 1600, 0.88);
    const p = ctx.p;
    p.photo = data; p.sample = false; p.design.versions = []; p.design.current = null; p.photoSource = "upload";
    p.thumb = await thumbOf(data);
    ctx.save(); render();
    toast("Photo ready. Choose a style and press Generate.");
  } catch (e) {
    toast(/heic|heif/i.test(file.type + file.name) ? "This browser can't open HEIC photos. Export it as JPG and try again." : "Couldn't read that image. Try a JPG or PNG.", "error");
  }
}

// ---------- rendering the UI ----------
function render() { renderControls(); renderStage(); }

function renderControls() {
  const p = ctx.p; if (!p) return;
  const d = p.design;
  $("#room-type").value = p.roomType;
  $$("#styles .style-opt").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.k === d.style)); const g = STYLE_GROUPS.find(x => x[0] === styleGroup); b.hidden = !!g && !g[2].includes(b.dataset.k) && b.dataset.k !== d.style; });
  $$("#style-groups button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.g === styleGroup)));
  [["#o-mood", "mood", "style"], ["#o-furn", "furn", "new"], ["#o-budget", "budget", "mid"], ["#o-light", "lit", "day"]].forEach(([sel, key, def]) => $$(sel + " button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === (d[key] || def)))));
  $("#ref-empty").hidden = !!d.ref; $("#ref-on").hidden = !d.ref; if (d.ref) $("#ref-img").src = d.ref;
  $("#ref-style").hidden = !STYLE_PIC[d.style];
  if (!$("#ideas").childElementCount || $("#ideas").dataset.rt !== p.roomType) { renderIdeas(); $("#ideas").dataset.rt = p.roomType; }
  $("#intensity").value = Math.round(d.intensity * 100); $("#int-out").textContent = Math.round(d.intensity * 100) + "%";
  $$("#compass button").forEach(b => b.setAttribute("aria-checked", String(+b.dataset.d === d.light)));
  $$("#keep button").forEach(b => b.setAttribute("aria-pressed", String(d.keep.includes(b.dataset.k))));
  if (document.activeElement !== $("#notes")) $("#notes").value = d.notes || "";
  markIdeas();

  const eng = engineChoice();
  $$("#engine button").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.e === eng)); if (b.dataset.e === "ai") b.classList.toggle("off", !ctx.ai.enabled); });
  $("#engine-hint").textContent = ctx.ai.enabled && !aiLeft() ? "You've used today's AI renders, so Makon makes mood previews until tomorrow." : eng === "ai"
    ? "Redraws furniture and finishes in your photo. Takes 20–60 seconds."
    : "Instant and private: re-grades colour and light toward the style on your device. Furniture stays as photographed.";
  const ai = $("#ai-state");
  if (!ctx.ai.checked) ai.innerHTML = '<span class="dot"></span>Checking AI connection…';
  else if (ctx.ai.enabled) {
    ai.className = "ai-state on";
    ai.innerHTML = '<span class="dot"></span>AI renders connected' + (ctx.ai.model ? " · " + esc(ctx.ai.model) : "") + (ctx.ai.owner ? '<small><b>Owner</b> · no daily limit for you.</small>' : "") + (ctx.ai.limit && ctx.ai.remaining != null ? '<small><b>' + ctx.ai.remaining + ' of ' + ctx.ai.limit + '</b> AI renders left for you today' + (ctx.ai.remaining === 0 ? ' — more tomorrow from 05:00 Tashkent time. Mood previews still work.' : '.') + '</small>' : "");
    // the owner's code box stays out of sight for visitors: open the Studio once with ?owner to see it
    let ownerUI = /[?&]owner\b/.test(location.search); try { ownerUI = ownerUI || !!localStorage.getItem(CODE_KEY); } catch (e) {}
    if (ctx.ai.owner && ctx.ai.lastError) ai.append(el("small", { class: "ai-err", text: "Last AI error: " + ctx.ai.lastError }));
    if (!ctx.ai.owner && ownerUI) ai.append(el("button", { type: "button", class: "link-btn owner-link", text: "Site owner? Enter your code", onclick: async () => {
      const v = await modal({ title: "Owner code", body: "Type the MAKON_OWNER_CODE you set in Vercel. This browser will then have no daily limit.", fields: [{ label: "Owner code", type: "password", required: true, maxlength: 100 }], ok: "Save" });
      if (!v) return;
      try { localStorage.setItem(CODE_KEY, v[0].trim()); } catch (e) {}
      if (ctx.recheckAI) await ctx.recheckAI();
      toast(ctx.ai.owner ? "Owner mode on — no daily limit in this browser." : "That code didn't match MAKON_OWNER_CODE.", ctx.ai.owner ? "" : "error");
    } }));
    if (ctx.ai.needsCode && !ctx.ai.owner) {
      let code = ""; try { code = localStorage.getItem(CODE_KEY) || ""; } catch (e) {}
      const inp = el("input", { class: "input small", type: "password", placeholder: "Access code", value: code, "aria-label": "AI access code", oninput: e => { try { localStorage.setItem(CODE_KEY, e.target.value); } catch (er) {} } });
      ai.append(inp);
    }
  } else if (ctx.ai.configError) {
    ai.className = "ai-state";
    console.warn("Makon AI config:", ctx.ai.configError);
    ai.innerHTML = '<span class="dot"></span>AI renders are resting for a moment. <small>Makon makes an instant mood preview instead — try AI again later.</small>';
  } else {
    ai.className = "ai-state";
    ai.innerHTML = '<span class="dot"></span>Instant preview mode. <small>Makon recolours your photo in the chosen style right on your device.</small>';
  }
  const g = $("#generate");
  g.disabled = busy || !p.photo;
  const aiOn = engineChoice() === "ai";
  g.textContent = busy ? "Working…" : !p.photo ? "Add a photo to start" : aiOn ? (d.versions.length ? "Generate another redesign" : "Generate AI redesign") : "Make a colour preview";
  const warn = $("#ai-warn");
  if (warn) {
    const why = !ctx.ai.checked ? "" : !ctx.ai.enabled ? "AI redesign isn't available right now, so Makon can only make a colour preview: it shifts the colours and light of your photo but can't follow your words, change furniture or use an inspiration photo."
      : !aiLeft() ? "You've used today's free AI redesigns. Until tomorrow Makon can only make colour previews, which can't follow your words."
      : d.engine === "local" ? "You picked Colour preview: it only shifts colours and light. Switch to AI redesign to follow your words." : "";
    warn.hidden = !why; warn.textContent = why;
  }
  renderSum();
  $("#share-btn").hidden = !cur() || busy; $("#v-share").hidden = !cur();
  $("#refine-box").hidden = !cur();
  $("#quick-box").hidden = !p.photo;
  $$("#qe button").forEach(b => { b.disabled = busy; });
  $("#qe-hint").textContent = aiOn ? "Each edit changes only that one thing and keeps your room, camera and furniture." : "Quick edits redraw part of the photo, so they need AI renders. Evening light also works as an instant preview.";
  $("#palette-box").hidden = !cur();
}

function renderStage() {
  const p = ctx.p; if (!p) return;
  const has = !!p.photo;
  $("#drop").hidden = has;
  $("#viewer").hidden = !has;
  if (!has) return;
  renderViewer();
  renderVersions();
  renderPalette();
}

let arCache = {};
async function aspect(src) {
  if (arCache[src]) return arCache[src];
  try { const i = await loadImage(src); arCache = { [src]: i.naturalWidth / i.naturalHeight }; return arCache[src]; } catch (e) { return 1.5; }
}
async function renderViewer() {
  const p = ctx.p, v = cur();
  const before = p.photo, after = v ? v.img : p.photo;
  const cmp = $("#cmp"), cin = $("#cmp-in");
  const effView = v ? view : "before";
  cmp.dataset.v = effView;
  $$("#view-mode button").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.v === effView)); b.disabled = !v && b.dataset.v !== "before"; });
  if ($("#c-before").getAttribute("src") !== before) $("#c-before").src = before;
  if ($("#c-after").getAttribute("src") !== after) $("#c-after").src = after;
  cin.style.setProperty("--ar", await aspect(before));
  setPos(pos);
  $("#vtag").innerHTML = v
    ? '<b>' + esc(STYLES[v.style] ? STYLES[v.style].name : "Version") + '</b> · ' + esc(v.label) + ' · v' + (p.design.versions.indexOf(v) + 1)
    : "<b>Original photo</b> · " + (p.sample ? "sample room" : p.photoSource === "3d" ? "3D view" : p.photoSource === "template" ? "template render" : "your upload");
  $("#v-download").title = v ? "Download this version" : "Download the photo";
}

function setPos(v) {
  pos = Math.max(0, Math.min(100, v));
  const c = $("#cmp-in");
  c.style.setProperty("--pos", pos + "%");
  $("#c-handle").setAttribute("aria-valuenow", Math.round(pos));
}
function wireSlider() {
  const c = $("#cmp-in"), h = $("#c-handle");
  h.tabIndex = 0; h.setAttribute("role", "slider"); h.setAttribute("aria-label", "Compare original and redesign");
  h.setAttribute("aria-valuemin", "0"); h.setAttribute("aria-valuemax", "100");
  let drag = false;
  const at = e => { const r = c.getBoundingClientRect(); setPos(((e.clientX - r.left) / r.width) * 100); };
  c.addEventListener("pointerdown", e => {
    if ($("#cmp").dataset.v !== "slider" || e.button > 0) return;
    drag = true; c.setPointerCapture(e.pointerId); at(e); e.preventDefault();
  });
  c.addEventListener("pointermove", e => { if (drag) at(e); });
  const end = () => { drag = false; };
  c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end);
  h.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") { setPos(pos - (e.shiftKey ? 10 : 2)); e.preventDefault(); }
    if (e.key === "ArrowRight") { setPos(pos + (e.shiftKey ? 10 : 2)); e.preventDefault(); }
  });
}
function toggleFull(force) {
  const c = $("#cmp"), on = force == null ? !c.classList.contains("fs") : force;
  c.classList.toggle("fs", on);
  document.body.classList.toggle("lock", on);
  let x = c.querySelector(".fs-x");
  if (on && !x) c.append(el("button", { class: "icon-btn light fs-x", type: "button", "aria-label": "Exit full screen", html: '<svg><use href="#i-x"/></svg>', onclick: () => toggleFull(false) }));
  if (!on && x) x.remove();
}

function renderVersions() {
  const d = ctx.p.design, box = $("#versions");
  box.innerHTML = "";
  if (!d.versions.length) {
    box.append(el("div", { class: "v-empty" }, el("span", { text: "No versions yet." }), el("button", { class: "btn btn-light btn-small", type: "button", text: "Generate redesign", onclick: () => generate() })));
    return;
  }
  d.versions.forEach((v, i) => {
    const b = el("div", { class: "vthumb" + (v.id === d.current ? " on" : "") },
      el("button", { type: "button", class: "vt-open", title: (STYLES[v.style] || {}).name + " · " + v.label, onclick: () => { d.current = v.id; ctx.p.thumb = v.thumb || ctx.p.thumb; ctx.save(); render(); } },
        el("img", { src: v.thumb || v.img, alt: "Version " + (i + 1) }),
        el("span", { text: "v" + (i + 1) + (v.engine === "ai" ? " · AI" : "") })),
      el("button", { type: "button", class: "vt-del", "aria-label": "Delete version " + (i + 1), html: "×", onclick: e => { e.stopPropagation(); delVersion(v.id); } }));
    box.append(b);
  });
  const on = box.querySelector(".on"); if (on) { const l = on.offsetLeft, r = l + on.offsetWidth; if (l < box.scrollLeft || r > box.scrollLeft + box.clientWidth) box.scrollLeft = Math.max(0, r - box.clientWidth + 14); }
}
async function delVersion(id) {
  const d = ctx.p.design;
  if (!(await confirmBox("Delete this version?", "It will be removed from the room's history.", "Delete"))) return;
  const i = d.versions.findIndex(v => v.id === id);
  if (i < 0) return;
  d.versions.splice(i, 1);
  d.versions.forEach(v => { if (v.parent === id) v.parent = null; });
  if (d.current === id) d.current = (d.versions[Math.min(i, d.versions.length - 1)] || {}).id || null;
  const c = cur(); ctx.p.thumb = c ? c.thumb : await thumbOf(ctx.p.photo);
  ctx.save(); render();
}

let palFor = null;
async function renderPalette() {
  const v = cur(), box = $("#palette");
  if (!v) { box.innerHTML = ""; palFor = null; return; }
  if (palFor === v.id) return;
  palFor = v.id;
  try {
    const pal = v.palette || (v.palette = await extractPalette(v.img, 6));
    if (palFor !== v.id) return;
    box.innerHTML = "";
    pal.forEach(c => box.append(el("button", { type: "button", class: "pal", style: "--c:" + c.hex + ";flex-grow:" + Math.max(1, Math.round(c.share * 100)), title: "Copy " + c.hex,
      onclick: async () => { try { await navigator.clipboard.writeText(c.hex); toast("Copied " + c.hex); } catch (e) { toast(c.hex); } } }, el("span", { text: c.hex }))));
  } catch (e) { box.textContent = "Couldn't read colours from this image."; }
}

// ---------- generate ----------
let abortCtl = null, cancelled = false, busyTimer = 0;
const AVG_KEY = "makon_ai_ms";
const avgMs = () => { let v = 0; try { v = +localStorage.getItem(AVG_KEY) || 0; } catch (e) {} return v > 4000 && v < 150000 ? v : 30000; };
const noteMs = ms => { try { localStorage.setItem(AVG_KEY, String(Math.round(avgMs() * 0.6 + ms * 0.4))); } catch (e) {} };
// ai: show a progress bar that follows how long renders usually take here, and a Cancel button
function setBusy(on, title = "", sub = "", ai = false) {
  busy = on;
  $("#busy").hidden = !on;
  $("#busy-t").textContent = title; $("#busy-s").textContent = sub;
  clearInterval(busyTimer);
  const bar = $("#busy-bar"); bar.hidden = !(on && ai); $("#busy-x").hidden = !(on && ai);
  if (on && ai) {
    const t0 = Date.now(), avg = avgMs();
    const tick = () => {
      const t = Date.now() - t0, k = 1 - Math.exp(-t / (avg * 0.55));
      bar.style.setProperty("--p", Math.min(96, k * 100).toFixed(1) + "%");
      const left = Math.round((avg - t) / 1000);
      $("#busy-s").textContent = Math.round(t / 1000) + " s" + (left > 2 ? " · about " + left + " s left" : " · almost there…");
    };
    tick(); busyTimer = setInterval(tick, 1000);
  }
  renderControls();
}

// sharper, larger download: 2× upscale with high-quality smoothing, then a light unsharp mask
async function hdImage(src) {
  const img = await loadImage(src);
  const w0 = img.naturalWidth, h0 = img.naturalHeight;
  const k = Math.min(2, 3200 / Math.max(w0, h0));
  if (k <= 1.05) return src;
  const w = Math.round(w0 * k), h = Math.round(h0 * k);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, w, h);
  const id = g.getImageData(0, 0, w, h), d = id.data, o = new Uint8ClampedArray(d), amt = 0.45, row = w * 4;
  for (let y = 1; y < h - 1; y++) {
    if (y % 200 === 0) await new Promise(r => setTimeout(r));   // stay responsive on big pictures
    for (let x = 1; x < w - 1; x++) {
      const i = y * row + x * 4;
      for (let ch = 0; ch < 3; ch++) {
        const j = i + ch, blur = (o[j - 4] + o[j + 4] + o[j - row] + o[j + row]) * 0.25;
        d[j] = o[j] + (o[j] - blur) * amt;
      }
    }
  }
  g.putImageData(id, 0, 0);
  return c.toDataURL("image/jpeg", 0.93);
}

// FLUX follows a clear description best: the person's own request first, then the style, the options and what must not move.
function buildPrompt(extra) {
  const p = ctx.p, d = p.design, s = STYLES[d.style] || STYLES.warm, room = roomName(p.roomType).toLowerCase();
  const req = (d.notes || "").trim().replace(/\s+/g, " ");
  const keep = d.keep.map(keepName).map(x => x.toLowerCase());
  const furn = optOf(D_FURN, d.furn || (d.keep.includes("layout") ? "keep" : "new"));
  const mood = optOf(D_MOOD, d.mood || "style"), budget = optOf(D_BUDGET, d.budget || "mid"), lit = optOf(D_LIGHT, d.lit || "day");
  const k = d.intensity;
  const amount = k < 0.4 ? "A subtle refresh: keep most things, change colours, textiles and decor." : k < 0.75 ? "A clear makeover of furniture, colours and decor." : "A complete transformation into a finished, magazine-worthy interior.";
  return [
    req ? "MAIN REQUEST — follow it exactly: " + req + "." : "",
    (d.ref ? "Image 0 is the client's " + room + ". Redesign image 0" : "Redesign this " + room + " photo") + " as a photorealistic interior design photograph in " + s.name + " style: " + s.prompt + ".",
    mood[2] ? "Use " + mood[2] + " (this replaces the style's own colours)." : "",
    furn[2], budget[2], amount,
    d.ref ? "Image 1 is only an inspiration picture: copy its colours, materials, furniture style and mood onto image 0, but do not copy its room, layout or camera." : "",
    "Keep exactly the same camera position, angle and lens, the same walls, ceiling height, windows and doors in the same places and sizes.",
    keep.length ? "Do not change the " + keep.join(", ") + "." : "",
    lit[2] + (d.lit === "evening" ? "" : " Light comes from the " + LIGHT_NAMES[d.light] + "."),
    extra || "",
    req ? "If anything above conflicts with the main request, the main request wins. Most important: " + req + "." : "",
    "Professional architectural interior photography, realistic proportions and materials, sharp detail, no text, no people, no watermark."
  ].filter(Boolean).join(" ");
}

async function callAI(image, prompt, retried, opts = {}) {
  const ar = await aspect(image);
  const body = { image: scaleImage(await loadImage(image), ctx.ai.maxInput || 1280, 0.88), prompt, aspect: +ar.toFixed(3), orientation: ar > 1.15 ? "landscape" : ar < 0.87 ? "portrait" : "square" };
  if (opts.ref) body.ref = scaleImage(await loadImage(opts.ref), ctx.ai.maxInput || 1024, 0.86);
  if (opts.strict) body.strict = true;
  let code = ""; try { code = localStorage.getItem(CODE_KEY) || ""; } catch (e) {}
  const c = new AbortController(); abortCtl = c; cancelled = false; const t = setTimeout(() => c.abort(), 150000);
  const t0 = Date.now();
  try {
    const r = await fetch("api/redesign", { method: "POST", headers: { "Content-Type": "application/json", "x-makon-code": code }, body: JSON.stringify(body), signal: c.signal });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && /access code/i.test(j.error || "") && !retried) {
      clearTimeout(t);
      const v = await modal({ title: "AI access code", body: code ? "That code wasn't right. Type the access code again." : "This site asks for a password before making AI renders. Type the access code the site owner gave you.",
        fields: [{ label: "Access code", type: "password", value: "", required: true, maxlength: 100 }], ok: "Render" });
      if (!v) throw new Error("No access code entered.");
      try { localStorage.setItem(CODE_KEY, v[0].trim()); } catch (e) {}
      renderControls();
      return callAI(image, prompt, true, opts);
    }
    if (j.remaining != null) { ctx.ai.remaining = j.remaining; renderControls(); }
    if (!r.ok || !j.image) throw new Error(j.error || "The AI service returned an error (" + r.status + ").");
    noteMs(Date.now() - t0);
    return j.image;
  } catch (e) {
    if (e.name === "AbortError") { const er = new Error(cancelled ? "Cancelled." : "The AI render took too long."); er.cancelled = cancelled; throw er; }
    throw e;
  } finally { clearTimeout(t); if (abortCtl === c) abortCtl = null; }
}

async function addVersion(v) {
  const d = ctx.p.design;
  v.id = uid("v_"); v.created = Date.now();
  v.thumb = await thumbOf(v.img, 220);
  d.versions.push(v);
  if (d.versions.length > MAX_VERSIONS) {
    const drop = d.versions.findIndex(x => x.id !== v.id);
    const gone = d.versions.splice(drop, 1)[0];
    d.versions.forEach(x => { if (x.parent === gone.id) x.parent = null; if (x.baseId === gone.id) x.baseId = null; });
    toast("Kept the latest " + MAX_VERSIONS + " versions — the oldest was removed.");
  }
  d.current = v.id;
  ctx.p.thumb = v.thumb;
  ctx.save();
  view = "slider"; pos = 50;
  render();
}

async function generate() {
  const p = ctx.p;
  if (busy || !p || !p.photo) return;
  const d = p.design, style = STYLES[d.style];
  const projectId = p.id;
  let engine = engineChoice();
  const t0 = Date.now();
  let timer;
  try {
    if (engine === "ai") {
      setBusy(true, "Rendering with AI…", "", true);
      try {
        const img = await callAI(p.photo, buildPrompt(), false, { ref: d.ref || null, strict: !!(d.notes || "").trim() });
        if (ctx.p.id !== projectId) { toast("The AI render finished for a room you've left."); return; }
        ctx.ai.lastError = null;
        await addVersion({ img, style: d.style, engine: "ai", label: "AI redesign", intensity: d.intensity, light: d.light, adj: { b: 1, c: 1, s: 1, w: 0 }, prompt: buildPrompt(), baseSelf: true });
        toast("AI render ready.");
        return;
      } catch (e) {
        clearInterval(timer); setBusy(false);
        if (e.cancelled) { toast("Render cancelled."); return; }
        ctx.ai.lastError = e.message; renderControls();
        const again = await confirmBox("The AI redesign didn't work", e.message + " Nothing was changed — press Try again in a moment.", "Try again", false);
        if (again) return generate();
        return;
      }
    }
    setBusy(true, "Creating mood preview…", "Re-grading colour and light on your device");
    const base = p.sample ? SAMPLE_AFTER : p.photo;
    const img = await renderMood(base, style, { intensity: d.intensity, light: d.light, keep: d.keep });
    if (ctx.p.id !== projectId) return;
    await addVersion({ img, style: d.style, engine: "local", label: p.sample ? "Example render + colour" : "Colour preview", intensity: d.intensity, light: d.light, adj: { b: 1, c: 1, s: 1, w: 0 }, keep: d.keep.slice() });
    toast(style.name + " preview ready" + (ctx.ai.enabled ? "." : " — drag the slider to compare."));
  } catch (e) {
    console.error(e);
    toast("Couldn't render this image. Try another photo.", "error");
  } finally { clearInterval(timer); setBusy(false); }
}

// ---------- refine ----------
async function refine(text) {
  const p = ctx.p, v = cur();
  if (!v) { toast("Generate a version first."); return; }
  if (!text) { toast("Type what you'd like to change, or tap a suggestion."); return; }
  if (busy) return;
  const projectId = p.id;
  const adj = Object.assign({ b: 1, c: 1, s: 1, w: 0 }, v.adj);
  const applied = [];
  RULES.forEach(([re, label, fn]) => { if (re.test(text.toLowerCase())) { fn(adj); applied.push(label); } });

  if (engineChoice() === "ai") {
    setBusy(true, "Refining with AI…", "", true);
    try {
      const img = await callAI(v.img, "MAIN REQUEST — follow it exactly: " + text + ". This is an interior design photo: make only that change and keep everything else identical — same camera, room, furniture, positions and lighting. Most important: " + text + ". Photorealistic, no text.", false, { strict: true });
      if (ctx.p.id !== projectId) return;
      await addVersion({ img, style: v.style, engine: "ai", label: "AI refine: " + text.slice(0, 40), intensity: v.intensity, light: v.light, adj: { b: 1, c: 1, s: 1, w: 0 }, parent: v.id, baseSelf: true, refine: text });
      $("#refine").value = ""; toast("Refined.");
      return;
    } catch (e) { if (e.cancelled) { toast("Cancelled."); return; } toast(e.message, "error"); if (!applied.length) return; }
    finally { setBusy(false); }
  }

  if (!applied.length) { toast("Mood preview understands words like warmer, cooler, brighter, darker, softer, more contrast, richer or muted.", "error"); return; }
  setBusy(true, "Applying: " + applied.join(", ").toLowerCase(), "On your device");
  try {
    const baseV = v.baseSelf ? v : (v.baseId ? p.design.versions.find(x => x.id === v.baseId) : null);
    const base = baseV ? baseV.img : (p.sample ? SAMPLE_AFTER : p.photo);
    const img = await renderMood(base, STYLES[v.style], { intensity: baseV ? 0 : v.intensity, light: v.light, keep: v.keep || [], adj });
    if (ctx.p.id !== projectId) return;
    await addVersion({ img, style: v.style, engine: v.engine === "ai" ? "ai" : "local", label: applied.join(" · "), intensity: v.intensity, light: v.light, adj, keep: v.keep, parent: v.id, baseId: baseV ? baseV.id : null, refine: text });
    $("#refine").value = "";
    toast("Applied: " + applied.join(", ").toLowerCase() + ".");
  } catch (e) { console.error(e); toast("Couldn't apply that change.", "error"); }
  finally { setBusy(false); }
}
async function undoRefine() {
  const d = ctx.p.design, v = cur();
  if (!v || !v.parent || !d.versions.some(x => x.id === v.parent)) { toast("Nothing to undo — this version wasn't made by a refine."); return; }
  d.versions = d.versions.filter(x => x.id !== v.id);
  d.current = v.parent;
  const c = cur(); ctx.p.thumb = c ? c.thumb : ctx.p.thumb;
  ctx.save(); render(); toast("Undone.");
}

// ---------- quick edits: one tap, one change, everything else kept ----------
const PAINTS = [["Warm white", "#f1ece2"], ["Greige", "#cfc5b5"], ["Sage green", "#a7b49d"], ["Olive", "#6f7352"], ["Dusty blue", "#7f97aa"], ["Navy", "#2c3a4f"], ["Terracotta", "#c46a48"], ["Blush", "#e2c3b6"], ["Charcoal", "#3a3c3b"]];
const FLOORS = [["Light oak planks", "wide light natural oak wooden planks"], ["Walnut herringbone", "dark walnut herringbone parquet"], ["White marble", "large polished white Carrara marble tiles"], ["Terrazzo", "light terrazzo with small coloured chips"], ["Polished concrete", "smooth polished light-grey concrete"], ["Patterned tiles", "patterned encaustic cement tiles in muted colours"], ["Wool carpet", "soft wall-to-wall beige wool carpet"]];
const KEEP_ALL = " Keep exactly the same camera, room shape, walls, windows, doors, furniture and their positions unless this asks to change them. Photorealistic, natural light, no text.";
const QUICK = {
  stage: s => ["Furnish this room completely in " + s.name + " style: " + s.prompt + ". Add a full, well-proportioned set of real furniture that fits the room size, a rug, lamps, curtains, wall art and plants. Keep the walls, floor, ceiling, windows, doors and camera exactly the same. Photorealistic, no text.", "Furnished · " + s.name],
  declutter: () => ["Remove all clutter: loose items, boxes, bags, clothes, cables, papers and mess on the floor and surfaces. Make the room clean and tidy." + KEEP_ALL, "Decluttered"],
  paint: (s, x) => ["Repaint all the walls in " + x[0].toLowerCase() + " (" + x[1] + ") matte paint. Change only the wall colour; keep the ceiling, trim, floor, furniture, decor and light identical." + KEEP_ALL, "Walls: " + x[0]],
  floor: (s, x) => ["Replace the floor with " + x[1] + ". Change only the floor surface; keep rugs that are on it, the walls, furniture and light identical." + KEEP_ALL, "Floor: " + x[0]],
  evening: () => ["Make this the same room in the evening: dusk outside the windows, every lamp and ceiling light switched on with a warm cosy glow." + KEEP_ALL, "Evening light"],
  plants: () => ["Add finishing touches: two or three large healthy indoor plants, framed art on the walls, cushions and a throw. Keep all existing furniture where it is." + KEEP_ALL, "Plants & art"]
};

function quickEdit(q, btn) {
  const pick = $("#qe-pick");
  if (q === "paint" || q === "floor") {
    const open = btn.getAttribute("aria-expanded") === "true";
    $$("#qe button").forEach(b => b.removeAttribute("aria-expanded"));
    if (open) { pick.hidden = true; return; }
    btn.setAttribute("aria-expanded", "true");
    pick.innerHTML = ""; pick.hidden = false;
    if (q === "paint") {
      PAINTS.forEach(x => pick.append(el("button", { type: "button", class: "qe-sw", style: "--c:" + x[1], title: x[0], "aria-label": x[0], onclick: () => runQuick("paint", x) })));
      const c = el("input", { type: "color", value: "#d9cbb8", title: "Any colour", "aria-label": "Any colour" });
      c.addEventListener("change", () => runQuick("paint", ["Colour " + c.value, c.value]));
      pick.append(c);
    } else FLOORS.forEach(x => pick.append(el("button", { type: "button", class: "qe-fl", text: x[0], onclick: () => runQuick("floor", x) })));
    return;
  }
  runQuick(q);
}

async function runQuick(q, arg) {
  const p = ctx.p; if (busy || !p || !p.photo) return;
  $("#qe-pick").hidden = true; $$("#qe button").forEach(b => b.removeAttribute("aria-expanded"));
  const v = cur(), styleKey = v ? v.style : p.design.style, s = STYLES[styleKey] || STYLES.warm;
  const [prompt, label] = QUICK[q](s, arg);
  const projectId = p.id;
  if (engineChoice() !== "ai") {
    if (q !== "evening") { toast("This quick edit redraws part of the photo, so it needs AI renders.", "error"); return; }
    setBusy(true, "Evening light", "On your device");
    try {
      const base = v ? (v.baseSelf ? v.img : (p.sample ? SAMPLE_AFTER : p.photo)) : (p.sample ? SAMPLE_AFTER : p.photo);
      const adj = { b: 0.84, c: 1.06, s: 1.05, w: 0.4 };
      const img = await renderMood(base, s, { intensity: v && !v.baseSelf ? v.intensity : 0, light: v ? v.light : p.design.light, keep: [], adj });
      if (ctx.p.id !== projectId) return;
      await addVersion({ img, style: styleKey, engine: "local", label, intensity: v ? v.intensity : 0, light: v ? v.light : p.design.light, adj, keep: [], parent: v ? v.id : null });
      toast("Evening preview ready.");
    } catch (e) { toast("Couldn't apply that change.", "error"); }
    finally { setBusy(false); }
    return;
  }
  setBusy(true, label + "…", "", true);
  try {
    const img = await callAI(v ? v.img : p.photo, prompt, false, { strict: true });
    if (ctx.p.id !== projectId) { toast("The edit finished for a room you've left."); return; }
    await addVersion({ img, style: styleKey, engine: "ai", label, intensity: v ? v.intensity : p.design.intensity, light: v ? v.light : p.design.light, adj: { b: 1, c: 1, s: 1, w: 0 }, parent: v ? v.id : null, baseSelf: true, refine: label });
    toast(label + " — ready. Drag the slider to compare.");
  } catch (e) {
    if (e.cancelled) toast("Cancelled.");
    else { ctx.ai.lastError = e.message; toast(e.message, "error"); }
  } finally { setBusy(false); }
}
