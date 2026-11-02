// Makon — see a piece at its real size in your own room through the phone camera (AR), or turn it in 3D on a computer.
// Uses Google's <model-viewer>: WebXR / Scene Viewer on Android, Quick Look on iPhone. Models are real-size CC0 scans.
import { REAL } from "./studio/real.js";
import { CATALOG } from "./studio/data.js";

const MV = "https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js";
const QR = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
const BASE = new URL("../models/ar/", import.meta.url).href;   // plain-geometry copies that every phone AR viewer can open
const byId = Object.fromEntries(CATALOG.map(c => [c.id, c]));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const script = src => new Promise((ok, no) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement("script"); s.src = src; if (src === MV) s.type = "module"; s.onload = ok; s.onerror = no; document.head.append(s); });
const touch = () => matchMedia("(hover: none)").matches;

export const hasAR = id => { const e = REAL[id]; return !!(e && e.f); };

let wrap = null;
export async function openAR(id) {
  const e = REAL[id], c = byId[id]; if (!e || !e.f || !c) return;
  if (!wrap) {
    wrap = document.createElement("div"); wrap.className = "ar-wrap"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true");
    wrap.addEventListener("click", ev => { if (ev.target === wrap || ev.target.closest(".ar-x")) close(); });
    document.addEventListener("keydown", ev => { if (ev.key === "Escape" && wrap.classList.contains("show")) close(); });
    document.body.append(wrap);
  }
  const page = location.origin + location.pathname.replace(/[^/]*$/, "") + "decor.html?ar=" + encodeURIComponent(id);
  wrap.innerHTML = `<div class="ar-box">
    <button type="button" class="ar-x" aria-label="Close">×</button>
    <div class="ar-stage"><p class="ar-load">Loading the 3D piece…</p></div>
    <div class="ar-side">
      <span class="ar-k">Real size · ${Math.round(c.w * 100)} × ${Math.round(c.d * 100)} × ${Math.round(c.h * 100)} cm</span>
      <h3>${esc(c.name)}</h3>
      <p>${touch() ? "Tap <b>See it in my room</b>, point your camera at the floor and the piece appears at its true size. Walk around it." : "Drag to turn it. To place it in your real room at its true size, scan this code with your phone camera."}</p>
      <div class="ar-qr" ${touch() ? "hidden" : ""}></div>
      <a class="ar-try" href="studio.html?add=${encodeURIComponent(id)}">Put it in my 3D room instead ↗</a>
    </div></div>`;
  requestAnimationFrame(() => wrap.classList.add("show"));
  try {
    await script(MV);
    const mv = document.createElement("model-viewer");
    Object.entries({ src: BASE + e.f + ".glb", alt: c.name + " — 3D model", ar: "", "ar-modes": "webxr scene-viewer quick-look", "ar-scale": "fixed", "ar-placement": /sconce|clock|art|mirror/.test(c.shape) ? "wall" : "floor",
      "camera-controls": "", "auto-rotate": "", "shadow-intensity": "1", exposure: "1", "environment-image": "neutral", "touch-action": "pan-y", loading: "eager" }).forEach(([k, v]) => mv.setAttribute(k, v));
    mv.innerHTML = `<button slot="ar-button" class="ar-btn">📱 See it in my room</button>`;
    const st = wrap.querySelector(".ar-stage"); st.innerHTML = ""; st.append(mv);
    mv.addEventListener("error", () => { st.innerHTML = `<p class="ar-load">This piece couldn't load. Check your connection and try again.</p>`; });
    if (!touch()) { await script(QR); const q = window.qrcode(0, "M"); q.addData(page); q.make(); wrap.querySelector(".ar-qr").innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) + "<small>Scan with your phone</small>"; }
  } catch (err) { const st = wrap.querySelector(".ar-stage"); if (st) st.innerHTML = `<p class="ar-load">3D viewer couldn't start on this browser.</p>`; }
}
function close() { wrap.classList.remove("show"); setTimeout(() => { if (!wrap.classList.contains("show")) wrap.innerHTML = ""; }, 250); }

// a little stylesheet so every page can use it
const css = document.createElement("style");
css.textContent = `
.ar-wrap{position:fixed;inset:0;z-index:2000;background:rgba(10,12,11,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px;opacity:0;transition:opacity .25s}
.ar-wrap.show{opacity:1}.ar-wrap:empty{display:none}
.ar-box{position:relative;width:min(980px,100%);max-height:92vh;background:#f4efe6;color:#18201d;border-radius:20px;overflow:hidden;display:grid;grid-template-columns:1.5fr 1fr}
.ar-stage{background:radial-gradient(circle at 50% 40%,#fff,#e9e3d8);min-height:420px;display:grid;place-items:center}
.ar-stage model-viewer{width:100%;height:100%;min-height:420px;--poster-color:transparent}
.ar-load{color:#6f675c;font:500 14px Inter,system-ui,sans-serif;padding:20px;text-align:center}
.ar-side{padding:26px;display:grid;gap:12px;align-content:start}
.ar-k{font:600 11px Inter,system-ui,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#b9783a}
.ar-side h3{font:400 30px/1.1 "Playfair Display",Georgia,serif;margin:0}
.ar-side p{font:400 14.5px/1.55 Inter,system-ui,sans-serif;color:#4a453d;margin:0}
.ar-qr{display:grid;justify-items:start;gap:6px}.ar-qr svg{width:150px;height:150px;background:#fff;border-radius:10px}.ar-qr small{font:12px Inter,system-ui,sans-serif;color:#8a8174}
.ar-try{font:600 13px Inter,system-ui,sans-serif;color:#18201d}
.ar-btn{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);border:0;border-radius:99px;background:#18201d;color:#fff;font:600 14px Inter,system-ui,sans-serif;padding:13px 20px;box-shadow:0 10px 30px -10px rgba(0,0,0,.5);cursor:pointer}
.ar-x{position:absolute;top:10px;right:12px;z-index:3;width:40px;height:40px;border-radius:50%;border:0;background:rgba(0,0,0,.08);font-size:24px;cursor:pointer;color:#18201d}
@media (max-width:760px){.ar-box{grid-template-columns:1fr;overflow:auto}.ar-stage,.ar-stage model-viewer{min-height:56vh}.ar-side{padding:18px}.ar-side h3{font-size:24px}}`;
document.head.append(css);
