// Makon Studio — small shared helpers
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const round = (v, step) => Math.round(v / step) * step;

export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); return fn(...a); };
  return d;
}

export function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}

// ---------- toast ----------
let tt;
export function toast(msg, kind = "") {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast show " + kind;
  clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), kind === "error" ? 4200 : 2800);
}

// ---------- modal dialogs (promise based, keyboard + touch friendly) ----------
export function modal({ title, body = "", fields = [], ok = "OK", cancel = "Cancel", danger = false }) {
  return new Promise(resolve => {
    const prev = document.activeElement;
    const wrap = el("div", { class: "modal-wrap", role: "dialog", "aria-modal": "true", "aria-label": title });
    const form = el("form", { class: "modal" });
    form.append(el("h3", { text: title }));
    if (body) form.append(el("p", { class: "muted", html: body }));
    const inputs = fields.map(f => {
      const id = uid("f");
      const inp = f.type === "select"
        ? el("select", { id, class: "input" }, f.options.map(o => el("option", { value: o[0], text: o[1], selected: o[0] === f.value ? true : null })))
        : el("input", { id, class: "input", type: f.type || "text", value: f.value ?? "", placeholder: f.placeholder || "", step: f.step, min: f.min, max: f.max, inputmode: f.inputmode, required: f.required ? true : null, maxlength: f.maxlength });
      form.append(el("label", { class: "field", for: id }, el("span", { text: f.label }), inp));
      return inp;
    });
    const err = el("p", { class: "form-err", "aria-live": "polite" });
    form.append(err);
    const okBtn = el("button", { class: "btn " + (danger ? "btn-danger" : "btn-primary"), type: "submit", text: ok });
    const row = el("div", { class: "modal-row" });
    if (cancel) row.append(el("button", { class: "btn btn-ghost", type: "button", text: cancel, onclick: () => close(null) }));
    row.append(okBtn);
    form.append(row);
    wrap.append(form);
    document.body.append(wrap);
    requestAnimationFrame(() => wrap.classList.add("show"));
    (inputs[0] || okBtn).focus();
    if (inputs[0] && inputs[0].select) inputs[0].select();

    function close(v) {
      wrap.classList.remove("show");
      document.removeEventListener("keydown", onKey, true);
      setTimeout(() => wrap.remove(), 200);
      if (prev && prev.focus) prev.focus({ preventScroll: true });
      resolve(v);
    }
    function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); close(null); } }
    document.addEventListener("keydown", onKey, true);
    wrap.addEventListener("pointerdown", e => { if (e.target === wrap) close(null); });
    form.addEventListener("submit", e => {
      e.preventDefault();
      const vals = inputs.map(i => i.value);
      for (let k = 0; k < fields.length; k++) {
        const f = fields[k], v = vals[k];
        if (f.required && !String(v).trim()) { err.textContent = f.label + " is required."; inputs[k].focus(); return; }
        if (f.type === "number" && v !== "") {
          const n = parseFloat(v);
          if (!isFinite(n) || (f.min != null && n < +f.min) || (f.max != null && n > +f.max)) {
            err.textContent = f.label + " must be between " + f.min + " and " + f.max + "."; inputs[k].focus(); return;
          }
        }
      }
      close(fields.length ? vals : true);
    });
  });
}
export const confirmBox = (title, body, ok = "Confirm", danger = true) => modal({ title, body, ok, danger });

// ---------- units ----------
export function fmtLen(m, units = "m", digits = 2) {
  if (!isFinite(m)) return "—";
  if (units === "ft") {
    const inches = m / 0.0254, ft = Math.floor(inches / 12 + 1e-9), inch = Math.round(inches - ft * 12);
    return inch === 12 ? (ft + 1) + "′ 0″" : ft + "′ " + inch + "″";
  }
  return m.toFixed(digits) + " m";
}
export function fmtArea(m2, units = "m") {
  if (!isFinite(m2)) return "—";
  return units === "ft" ? (m2 * 10.7639).toFixed(1) + " ft²" : m2.toFixed(2) + " m²";
}
export function fmtCm(m) { return Math.round(m * 100) + " cm"; }
export function money(v, cur = "USD") {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0); }
  catch (e) { return (v || 0).toLocaleString() + " " + cur; }
}

// ---------- files ----------
export function download(name, data, type = "application/octet-stream") {
  const a = document.createElement("a");
  a.href = typeof data === "string" && data.startsWith("data:") ? data : URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  a.download = name; document.body.append(a); a.click(); a.remove();
  if (a.href.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.decoding = "async";
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Couldn't load image"));
    i.src = src;
  });
}
export async function fileToDataURL(file, max = 1600, quality = 0.88) {
  let src;
  if (window.createImageBitmap) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close && bmp.close();
      return c.toDataURL("image/jpeg", quality);
    } catch (e) { /* fall back to <img> */ }
  }
  src = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
  const img = await loadImage(src);
  return scaleImage(img, max, quality);
}
export function scaleImage(img, max = 1600, quality = 0.88) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}
export async function thumbOf(src, max = 240) {
  try { return scaleImage(await loadImage(src), max, 0.8); } catch (e) { return null; }
}
export function timeAgo(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  if (s < 86400 * 7) return Math.floor(s / 86400) + " d ago";
  return new Date(t).toLocaleDateString();
}

// tiny event bus
export function bus() {
  const m = {};
  return {
    on(e, f) { (m[e] = m[e] || []).push(f); },
    emit(e, ...a) { (m[e] || []).forEach(f => { try { f(...a); } catch (err) { console.error(err); } }); }
  };
}

export const isTouch = () => window.matchMedia("(pointer: coarse)").matches;
export const isMobile = () => window.matchMedia("(max-width: 900px)").matches;
