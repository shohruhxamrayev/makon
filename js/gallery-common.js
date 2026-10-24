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
// lighter copies for grids, posters and clips playing on the page (full size stays for the viewer and downloads)
export const thumb = (id, s) => B + "sm/" + id + (s ? "-" + s : "") + ".jpg";
export const clipSm = (id, s) => ({ webm: B + "sm/" + id + "-" + s + ".webm", mp4: B + "sm/" + id + "-" + s + ".mp4" });
export const srcset = (id, s) => `${thumb(id, s)} 1200w, ${pic(id, s)} 1800w`;
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
// going full screen swaps a page clip to its original full-size file, from the same moment
document.addEventListener("fullscreenchange", () => {
  const v = document.fullscreenElement; if (!v || v.tagName !== "VIDEO") return;
  const src = v.currentSrc || ""; if (!/\/sm\//.test(src)) return;
  const t = v.currentTime, playing = !v.paused;
  v.src = src.replace("/sm/", "/"); v.currentTime = t; if (playing) { const p = v.play(); if (p) p.catch(() => {}); }
});
document.addEventListener("webkitbeginfullscreen", e => { const v = e.target; if (v && v.currentSrc && /\/sm\//.test(v.currentSrc)) { const t = v.currentTime; v.src = v.currentSrc.replace("/sm/", "/"); v.currentTime = t; v.play(); } }, true);
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
  box.innerHTML = `<div class="glb-top"><span class="glb-count"></span><div class="glb-r"><a class="glb-room" href="#" hidden>Open this room ↗</a><a class="glb-dl" href="#" download>Download ↓</a><button type="button" class="glb-x">Close ×</button></div></div>
    <div class="glb-stage"><button type="button" class="glb-arrow prev" aria-label="Previous">←</button><img alt="" draggable="false"><span class="glb-spin" aria-hidden="true"></span><button type="button" class="glb-arrow next" aria-label="Next">→</button></div>
    <div class="glb-bot"><button type="button" class="glb-b prev" aria-label="Previous">←</button><span class="glb-cap"></span><button type="button" class="glb-b next" aria-label="Next">→</button></div>`;
  document.body.append(box);
  let items = [], i = 0, last = null, token = 0;
  const img = $("img", box);
  // instant: show the light copy straight away, swap in the full-size photo the moment it arrives
  const paint = () => {
    const it = items[i], my = ++token;
    const full = new Image(); full.decoding = "async"; full.src = it.src;
    if (full.complete) { img.src = it.src; box.classList.remove("loading"); }
    else {
      img.src = it.thumb || it.src; box.classList.add("loading");
      full.onload = () => { if (my === token) { img.src = it.src; box.classList.remove("loading"); } };
      full.onerror = () => { if (my === token) box.classList.remove("loading"); };
    }
    img.alt = it.cap;
    $(".glb-count", box).textContent = pad(i + 1) + " / " + pad(items.length);
    $(".glb-cap", box).textContent = it.cap;
    const dl = $(".glb-dl", box); dl.href = it.src; dl.setAttribute("download", it.name || it.src.split("/").pop());
    const rm = $(".glb-room", box); rm.hidden = !it.room; if (it.room) rm.href = it.room;
    // warm up the neighbours so the next tap is instant
    [items[(i + 1) % items.length], items[(i - 1 + items.length) % items.length]].forEach(x => { const p = new Image(); p.src = x.src; });
  };
  const step = d => { if (items.length < 2) return; i = (i + d + items.length) % items.length; paint(); };
  const close = () => { box.classList.remove("show"); document.body.classList.remove("lb-open"); setTimeout(() => { box.hidden = true; }, 250); if (last) last.focus({ preventScroll: true }); };
  $(".glb-x", box).addEventListener("click", close);
  box.querySelectorAll(".prev").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); step(-1); }));
  box.querySelectorAll(".next").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); step(1); }));
  // tap the picture: right half → next, left half → previous; tap the dark area → close
  $(".glb-stage", box).addEventListener("click", e => {
    if (e.target === img) { const r = img.getBoundingClientRect(); step(e.clientX > r.left + r.width / 2 ? 1 : -1); }
    else if (e.target.classList.contains("glb-stage")) close();
  });
  document.addEventListener("keydown", e => {
    if (box.hidden) return;
    if (e.key === "Escape") close(); if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1);
  });
  let sx = null, sy = null;
  box.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  box.addEventListener("touchend", e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1); else if (dy > 90) close(); sx = null; });
  return {
    open(list, start = 0) { items = list; i = start; last = document.activeElement; box.hidden = false; box.classList.toggle("single", list.length < 2); document.body.classList.add("lb-open"); requestAnimationFrame(() => box.classList.add("show")); paint(); $(".glb-x", box).focus({ preventScroll: true }); },
    relabel() {}
  };
}

