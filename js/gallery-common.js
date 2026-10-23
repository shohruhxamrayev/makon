// Makon — shared bits for the templates gallery and the room pages
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const I = window.MakonI18n || { T: x => x, set: (e, k) => { e.innerHTML = k; } };
export const T = s => I.T(s);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const pad = n => String(n).padStart(2, "0");

// assets (rendered from each room's real plan)
const B = "img/templates/";
export const pic = (id, s) => B + id + (s ? "-" + s : "") + ".jpg";
export const clip = (id, s) => ({ webm: B + id + (s ? "-" + s : "") + ".webm", mp4: B + id + (s ? "-" + s : "") + ".mp4" });
export const zip = id => B + id + ".zip";
export const sources = c => `<source src="${c.webm}" type="video/webm"><source src="${c.mp4}" type="video/mp4">`;

// signed-in aware links + header behaviour
export const me = window.MakonAuth && MakonAuth.current();
export const studioLink = q => me ? "studio.html" + q : "signin.html?next=" + encodeURIComponent("studio.html" + q);
export function initHeader() {
  $$("[data-auth-link]").forEach(a => { a.href = studioLink(""); });
  if (me) { $$(".signin-link").forEach(a => { a.style.display = "none"; }); $$(".cta-txt").forEach(e => I.set(e, "Open Studio")); }
  const menuBtn = $("#lmenu"), mnav = $("#lmnav");
  const menu = open => { mnav.hidden = !open; document.body.classList.toggle("menu-open", open); menuBtn.setAttribute("aria-expanded", String(open)); };
  menuBtn.addEventListener("click", () => menu(mnav.hidden));
  mnav.addEventListener("click", e => { if (e.target.closest("a")) menu(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !mnav.hidden) menu(false); });
  const hd = $("#lhead");
  window.addEventListener("scroll", () => hd.classList.toggle("scrolled", scrollY > 10), { passive: true });
}

// videos: play while on screen (muted, inline — never a download)
let io = null;
export function autoplayInView(vids) {
  if (!("IntersectionObserver" in window)) return;
  io = io || new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (v.dataset.user !== "paused") { const p = v.play(); if (p) p.catch(() => {}); } }
    else if (!v.paused) v.pause();
  }), { threshold: 0.4 });
  vids.forEach(v => {
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.addEventListener("pause", () => { if (document.visibilityState === "visible" && isOnScreen(v)) v.dataset.user = "paused"; });
    v.addEventListener("play", () => { delete v.dataset.user; });
    io.observe(v);
  });
}
const isOnScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

// hover a card → its film plays over the photo
const canHover = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
export function hoverPlay(cards) {
  if (!canHover) return;
  cards.forEach(card => {
    const v = card.querySelector("video"); if (!v) return;
    v.muted = true; v.playsInline = true;
    card.addEventListener("mouseenter", () => { v.currentTime = 0; const p = v.play(); if (p) p.then(() => card.classList.add("playing")).catch(() => {}); });
    card.addEventListener("mouseleave", () => { v.pause(); card.classList.remove("playing"); });
  });
}

// dark centred lightbox: 02 / 08 · ← → · Close ×
export function lightbox() {
  const box = document.createElement("div");
  box.className = "glb"; box.hidden = true; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
  box.innerHTML = `<div class="glb-top"><span class="glb-count"></span><div class="glb-r"><a class="glb-dl" href="#" download>${T("Download")} ↓</a><button type="button" class="glb-x">${T("Close")} ×</button></div></div>
    <div class="glb-stage"><button type="button" class="glb-arrow prev" aria-label="${T("Previous")}">←</button><img alt=""><button type="button" class="glb-arrow next" aria-label="${T("Next")}">→</button></div>
    <div class="glb-cap"></div>`;
  document.body.append(box);
  let items = [], i = 0, last = null;
  const img = $("img", box);
  const paint = () => {
    const it = items[i];
    img.classList.add("fade");
    const n = new Image(); n.src = it.src;
    const show = () => { img.src = it.src; img.alt = it.cap; img.classList.remove("fade"); };
    if (n.complete) show(); else { n.onload = show; n.onerror = show; }
    $(".glb-count", box).textContent = pad(i + 1) + " / " + pad(items.length);
    $(".glb-cap", box).textContent = it.cap;
    const dl = $(".glb-dl", box); dl.href = it.src; dl.setAttribute("download", it.name || it.src.split("/").pop());
    // preload neighbours
    [items[(i + 1) % items.length], items[(i - 1 + items.length) % items.length]].forEach(x => { const p = new Image(); p.src = x.src; });
  };
  const step = d => { i = (i + d + items.length) % items.length; paint(); };
  const close = () => { box.classList.remove("show"); document.body.classList.remove("lb-open"); setTimeout(() => { box.hidden = true; }, 250); if (last) last.focus({ preventScroll: true }); };
  $(".glb-x", box).addEventListener("click", close);
  $(".prev", box).addEventListener("click", () => step(-1));
  $(".next", box).addEventListener("click", () => step(1));
  $(".glb-stage", box).addEventListener("click", e => { if (e.target.classList.contains("glb-stage")) close(); });
  document.addEventListener("keydown", e => {
    if (box.hidden) return;
    if (e.key === "Escape") close(); if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1);
  });
  let sx = null;
  box.addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); sx = null; });
  return {
    open(list, start = 0) { items = list; i = start; last = document.activeElement; box.hidden = false; document.body.classList.add("lb-open"); requestAnimationFrame(() => box.classList.add("show")); paint(); $(".glb-x", box).focus(); },
    relabel() { $(".glb-dl", box).innerHTML = T("Download") + " ↓"; $(".glb-x", box).textContent = T("Close") + " ×"; }
  };
}
