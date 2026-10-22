// Makon Studio — Design mode: photo, style, render (AI or on-device), versions, refine, palette
import { $, $$, el, esc, toast, confirmBox, modal, uid, fileToDataURL, scaleImage, loadImage, thumbOf, download, isTouch } from "./util.js";
import { STYLES, ROOM_TYPES, KEEP, keepName, LIGHT, LIGHT_NAMES, roomName } from "./data.js";
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
  rt.addEventListener("change", () => { p().roomType = rt.value; ctx.save(); });

  const st = $("#styles");
  Object.entries(STYLES).forEach(([k, s]) => {
    st.append(el("button", { type: "button", class: "style-opt", "data-k": k, "aria-pressed": "false", onclick: () => { p().design.style = k; p().finish = { wall: null, floor: null }; ctx.save(); renderControls(); ctx.bus.emit("style"); } },
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

  $("#notes").addEventListener("input", e => { p().design.notes = e.target.value; ctx.save(); });

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
  $("#v-download").addEventListener("click", () => {
    const v = cur(); const src = v ? v.img : p().photo; if (!src) return;
    const name = (p().name || "room").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase();
    if (src.startsWith("data:")) download(name + (v ? "-v" + (p().design.versions.indexOf(v) + 1) : "-original") + ".jpg", src);
    else loadImage(src).then(i => download(name + ".jpg", scaleImage(i, 4000, 0.92)));
  });
  $("#v-full").addEventListener("click", () => toggleFull());
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#cmp").classList.contains("fs")) toggleFull(false); });

  // ---- refine ----
  $$("#refine-chips button").forEach(b => b.addEventListener("click", () => {
    const t = $("#refine"); t.value = (t.value.trim() ? t.value.trim().replace(/[,.]?$/, ", ") : "") + b.textContent; t.focus();
  }));
  $("#refine-form").addEventListener("submit", e => { e.preventDefault(); refine($("#refine").value.trim()); });
  $("#refine").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#refine-form").requestSubmit(); } });
  $("#refine-undo").addEventListener("click", undoRefine);

  ctx.bus.on("project", render);
  ctx.bus.on("mode", m => { if (m === "design") render(); });
  ctx.bus.on("ai", renderControls);
}

const cur = () => { const d = ctx.p.design; return d.versions.find(v => v.id === d.current) || null; };
const engineChoice = () => { const e = ctx.p.design.engine; return ctx.ai.enabled && e !== "local" ? "ai" : "local"; };

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
    p.photo = data; p.sample = false; p.design.versions = []; p.design.current = null;
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
  $$("#styles .style-opt").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === d.style)));
  $("#intensity").value = Math.round(d.intensity * 100); $("#int-out").textContent = Math.round(d.intensity * 100) + "%";
  $$("#compass button").forEach(b => b.setAttribute("aria-checked", String(+b.dataset.d === d.light)));
  $$("#keep button").forEach(b => b.setAttribute("aria-pressed", String(d.keep.includes(b.dataset.k))));
  if (document.activeElement !== $("#notes")) $("#notes").value = d.notes || "";

  const eng = engineChoice();
  $$("#engine button").forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.e === eng)); if (b.dataset.e === "ai") b.classList.toggle("off", !ctx.ai.enabled); });
  $("#engine-hint").textContent = eng === "ai"
    ? "Redraws furniture and finishes in your photo. Takes 20–60 seconds."
    : "Instant and private: re-grades colour and light toward the style on your device. Furniture stays as photographed.";
  const ai = $("#ai-state");
  if (!ctx.ai.checked) ai.innerHTML = '<span class="dot"></span>Checking AI connection…';
  else if (ctx.ai.enabled) {
    ai.className = "ai-state on";
    ai.innerHTML = '<span class="dot"></span>AI renders connected' + (ctx.ai.model ? " · " + esc(ctx.ai.model) : "") + (ctx.ai.provider === "cloudflare" ? '<small>Free daily allowance — about 100 renders a day, resets at 05:00 Tashkent time.</small>' : "");
    if (ctx.ai.needsCode) {
      let code = ""; try { code = localStorage.getItem(CODE_KEY) || ""; } catch (e) {}
      const inp = el("input", { class: "input small", type: "password", placeholder: "Access code", value: code, "aria-label": "AI access code", oninput: e => { try { localStorage.setItem(CODE_KEY, e.target.value); } catch (er) {} } });
      ai.append(inp);
    }
  } else if (ctx.ai.configError) {
    ai.className = "ai-state";
    ai.innerHTML = '<span class="dot"></span><b>AI renders are set up wrongly.</b> ' + esc(ctx.ai.configError) + ' <small>Until then Makon makes on-device mood previews.</small>';
  } else {
    ai.className = "ai-state";
    ai.innerHTML = '<span class="dot"></span>AI renders aren\'t switched on for this site yet, so Makon makes an instant on-device mood preview. <small>Owner: add a free Cloudflare token or an OpenAI key in Vercel — see README.</small>';
  }
  const g = $("#generate");
  g.disabled = busy || !p.photo;
  g.textContent = busy ? "Working…" : !p.photo ? "Add a photo to start" : (d.versions.length ? "Generate another version" : "Generate redesign");
  $("#refine-box").hidden = !cur();
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
    : "<b>Original photo</b> · " + (p.sample ? "sample room" : "your upload");
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
function setBusy(on, title = "", sub = "") {
  busy = on;
  $("#busy").hidden = !on;
  $("#busy-t").textContent = title; $("#busy-s").textContent = sub;
  renderControls();
}

function buildPrompt(extra) {
  const p = ctx.p, d = p.design, s = STYLES[d.style];
  const keep = d.keep.map(keepName);
  return [
    "Redesign the interior of this " + roomName(p.roomType).toLowerCase() + " photo as a photorealistic interior design render.",
    "Style: " + s.prompt + ".",
    "Keep the exact same camera angle, perspective, room geometry, wall positions, ceiling height, window and door positions and sizes.",
    keep.length ? "Do not change: " + keep.join(", ").toLowerCase() + "." : "",
    "Daylight enters from the " + LIGHT_NAMES[d.light] + "; keep the light direction consistent.",
    "Strength of change: " + Math.round(d.intensity * 100) + "% (low = subtle refresh, high = full makeover).",
    d.notes ? "Client notes: " + d.notes.trim() + "." : "",
    extra || "",
    "Realistic materials and scale, no text, no people, no watermark."
  ].filter(Boolean).join(" ");
}

async function callAI(image, prompt, retried) {
  const ar = await aspect(image);
  const body = { image: scaleImage(await loadImage(image), ctx.ai.maxInput || 1280, 0.88), prompt, aspect: +ar.toFixed(3), orientation: ar > 1.15 ? "landscape" : ar < 0.87 ? "portrait" : "square" };
  let code = ""; try { code = localStorage.getItem(CODE_KEY) || ""; } catch (e) {}
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 150000);
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
      return callAI(image, prompt, true);
    }
    if (!r.ok || !j.image) throw new Error(j.error || "The AI service returned an error (" + r.status + ").");
    return j.image;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("The AI render took too long.");
    throw e;
  } finally { clearTimeout(t); }
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
      setBusy(true, "Rendering with AI…", "Usually 20–60 seconds. You can keep using the other tools.");
      timer = setInterval(() => { $("#busy-s").textContent = Math.round((Date.now() - t0) / 1000) + " s · usually 20–60 seconds"; }, 1000);
      try {
        const img = await callAI(p.photo, buildPrompt());
        if (ctx.p.id !== projectId) { toast("The AI render finished for a room you've left."); return; }
        await addVersion({ img, style: d.style, engine: "ai", label: "AI render", intensity: d.intensity, light: d.light, adj: { b: 1, c: 1, s: 1, w: 0 }, prompt: buildPrompt(), baseSelf: true });
        toast("AI render ready.");
        return;
      } catch (e) {
        clearInterval(timer);
        toast(e.message + " Made an on-device mood preview instead.", "error");
        engine = "local";
      }
    }
    setBusy(true, "Creating mood preview…", "Re-grading colour and light on your device");
    const base = p.sample ? SAMPLE_AFTER : p.photo;
    const img = await renderMood(base, style, { intensity: d.intensity, light: d.light, keep: d.keep });
    if (ctx.p.id !== projectId) return;
    await addVersion({ img, style: d.style, engine: "local", label: p.sample ? "Example render + mood" : "Mood preview", intensity: d.intensity, light: d.light, adj: { b: 1, c: 1, s: 1, w: 0 }, keep: d.keep.slice() });
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
    setBusy(true, "Refining with AI…", "Usually 20–60 seconds");
    try {
      const img = await callAI(v.img, "This is an interior design render. Apply this change and keep everything else identical — same camera, room, furniture positions and lighting: " + text + ". Photorealistic, no text.");
      if (ctx.p.id !== projectId) return;
      await addVersion({ img, style: v.style, engine: "ai", label: "AI refine: " + text.slice(0, 40), intensity: v.intensity, light: v.light, adj: { b: 1, c: 1, s: 1, w: 0 }, parent: v.id, baseSelf: true, refine: text });
      $("#refine").value = ""; toast("Refined.");
      return;
    } catch (e) { toast(e.message, "error"); if (!applied.length) return; }
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
