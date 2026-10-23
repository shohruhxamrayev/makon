// Makon — templates gallery (filters, staggered grid, lightbox)
import { TEMPLATES, TEMPLATE_CATS, templateImage, buildPlan } from "./studio/templates.js";
import { STYLES, roomName } from "./studio/data.js";
import { polyArea } from "./studio/geom.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const I = window.MakonI18n || { T: x => x, set: (e, k) => { e.textContent = k; } };
const T = s => I.T(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const area = t => polyArea(t.pts || [[0, 0], [t.w, 0], [t.w, t.d], [0, t.d]]);
const size = t => t.pts ? "L-shaped" : t.w.toFixed(1) + " × " + t.d.toFixed(1) + " m";
const VIEWS = [["", "Photo"], ["angle", "Another angle"], ["evening", "Evening"], ["overview", "3D overview"], ["plan", "Floor plan"], ["video", "Film"]];
const film = id => "img/templates/" + id + ".mp4";
const zipOf = id => "img/templates/" + id + ".zip";
const canHover = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

// auth-aware links
const me = window.MakonAuth && MakonAuth.current();
const studioLink = q => me ? "studio.html" + q : "signin.html?next=" + encodeURIComponent("studio.html" + q);
$$("[data-auth-link]").forEach(a => { a.href = studioLink(""); });
if (me) { $$(".signin-link").forEach(a => { a.style.display = "none"; }); $$(".cta-txt").forEach(e => I.set(e, "Open Studio")); }

// phone menu
const menuBtn = $("#lmenu"), mnav = $("#lmnav");
function menu(open) {
  mnav.hidden = !open; document.body.classList.toggle("menu-open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
}
menuBtn.addEventListener("click", () => menu(mnav.hidden));
mnav.addEventListener("click", e => { if (e.target.closest("a")) menu(false); });
window.addEventListener("scroll", () => $("#lhead").classList.toggle("scrolled", scrollY > 10), { passive: true });

// ---------- filters + grid ----------
let cat = "all";
try { const h = location.hash.slice(1); if (TEMPLATE_CATS.some(c => c[0] === h)) cat = h; } catch (e) {}
const list = () => TEMPLATES.filter(t => cat === "all" || t.cat === cat);

function renderFilters() {
  $("#t-total").textContent = pad(TEMPLATES.length);
  $("#filters").innerHTML = TEMPLATE_CATS.map(([k, n]) => {
    const c = k === "all" ? TEMPLATES.length : TEMPLATES.filter(t => t.cat === k).length;
    if (!c) return "";
    return `<button type="button" data-cat="${k}" aria-pressed="${k === cat}">${esc(T(n))}<sup>${pad(c)}</sup></button>`;
  }).join("");
  $$("#filters button").forEach(b => b.addEventListener("click", () => {
    cat = b.dataset.cat; history.replaceState(null, "", cat === "all" ? location.pathname : "#" + cat);
    renderFilters(); renderGrid();
  }));
}
function renderGrid() {
  const items = list();
  $("#grid").innerHTML = items.map((t, i) => `
    <article class="t-card${i % 2 ? " low" : ""}">
      <button type="button" class="t-open" data-id="${t.id}" aria-label="${esc(T(t.name))}">
        <span class="t-img"><img src="${templateImage(t.id)}" alt="${esc(T(t.name))} — photo" loading="lazy" width="1200" height="800"><img class="t-alt" src="${templateImage(t.id, "evening")}" alt="" loading="lazy" width="1200" height="800">${canHover ? `<video class="t-vid" muted loop playsinline preload="none" src="${film(t.id)}"></video>` : ""}<i class="t-play" aria-hidden="true">▶ ${esc(T("Film"))}</i></span>
      </button>
      <div class="t-meta">
        <div><span class="t-cat">${esc(T(roomName(t.room)))} · ${esc((STYLES[t.style] || {}).name || "")}</span>
        <h3>${esc(T(t.name))}</h3>
        <span class="t-sub">${area(t).toFixed(1)} m² · ${t.items.length} ${esc(T("pieces"))}</span></div>
        <button type="button" class="t-arrow" data-id="${t.id}" aria-label="${esc(T("Open"))} ${esc(T(t.name))}">↗</button>
      </div>
    </article>`).join("");
  $$("#grid [data-id]").forEach(b => b.addEventListener("click", () => openLb(b.dataset.id)));
  // the film plays while you hover a room (like a showreel); phones get the evening photo on tap-and-hold instead
  $$("#grid .t-open").forEach(b => {
    const v = b.querySelector(".t-vid"); if (!v) return;
    b.addEventListener("mouseenter", () => { v.currentTime = 0; const pr = v.play(); if (pr) pr.then(() => b.classList.add("playing")).catch(() => {}); });
    b.addEventListener("mouseleave", () => { v.pause(); b.classList.remove("playing"); });
  });
}
function renderFilms() {
  const pick = ["warm-living", "japandi-studio", "midnight-lounge", "nordic-bedroom"];
  $("#films").innerHTML = pick.map((id, i) => {
    const t = TEMPLATES.find(x => x.id === id);
    return `<figure class="t-filmcard f${i}">
      <button type="button" class="t-film-open" data-id="${id}" aria-label="${esc(T("Film"))} — ${esc(T(t.name))}">
        <video muted loop playsinline preload="none" poster="${templateImage(id)}" src="${film(id)}"></video>
      </button>
      <figcaption><span>${pad(i + 1)}</span><b>${esc(T(t.name))}</b><a href="${film(id)}" download="makon-${id}.mp4">↓ MP4</a></figcaption>
    </figure>`;
  }).join("");
  $$("#films .t-film-open").forEach(b => b.addEventListener("click", () => openLb(b.dataset.id, VIEWS.length - 1)));
  // play only while on screen
  const vids = $$("#films video");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const pr = e.target.play(); if (pr) pr.catch(() => {}); } else e.target.pause(); }), { threshold: 0.35 });
    vids.forEach(v => io.observe(v));
  }
}
function renderEvening() {
  const pick = ["japandi-studio", "warm-living", "midnight-lounge"];
  $("#eve").innerHTML = pick.map(id => {
    const t = TEMPLATES.find(x => x.id === id);
    return `<button type="button" class="t-eve-card" data-id="${id}"><img src="${templateImage(id, "evening")}" alt="${esc(T(t.name))} — evening" loading="lazy"><span>${esc(T(t.name))}</span></button>`;
  }).join("");
  $$("#eve [data-id]").forEach(b => b.addEventListener("click", () => openLb(b.dataset.id, 2)));
}

// ---------- lightbox ----------
const lb = $("#lb");
let cur = null, view = 0, lastFocus = null;
function openLb(id, v = 0) {
  cur = TEMPLATES.find(t => t.id === id); view = v;
  if (!cur) return;
  lastFocus = document.activeElement;
  lb.hidden = false; document.body.classList.add("lb-open");
  requestAnimationFrame(() => lb.classList.add("show"));
  paintLb(); $("#lb-close").focus();
}
function closeLb() {
  $("#lb-vid").pause();
  lb.classList.remove("show"); document.body.classList.remove("lb-open");
  setTimeout(() => { lb.hidden = true; }, 250);
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
function paintLb() {
  const t = cur, st = STYLES[t.style] || {};
  const all = TEMPLATES, idx = all.indexOf(t);
  $("#lb-count").textContent = pad(idx + 1) + " / " + pad(all.length);
  const img = $("#lb-img"), vid = $("#lb-vid"), isFilm = VIEWS[view][0] === "video";
  img.hidden = isFilm; vid.hidden = !isFilm;
  if (isFilm) {
    if (vid.getAttribute("src") !== film(t.id)) { vid.src = film(t.id); vid.poster = templateImage(t.id); }
    const pr = vid.play(); if (pr) pr.catch(() => {});
  } else {
    vid.pause();
    img.src = templateImage(t.id, VIEWS[view][0]); img.alt = T(t.name) + " — " + T(VIEWS[view][1]);
  }
  const pic = $("#dl-pic"), picName = "makon-" + t.id + (VIEWS[view][0] && !isFilm ? "-" + VIEWS[view][0] : "") + ".jpg";
  pic.href = isFilm ? templateImage(t.id) : templateImage(t.id, VIEWS[view][0]); pic.setAttribute("download", isFilm ? "makon-" + t.id + ".jpg" : picName);
  $("#dl-vid").href = film(t.id); $("#dl-vid").setAttribute("download", "makon-" + t.id + ".mp4");
  $("#dl-zip").href = zipOf(t.id); $("#dl-zip").setAttribute("download", "makon-" + t.id + ".zip");
  $("#lb-cap").textContent = T(VIEWS[view][1]);
  $("#lb-dots").innerHTML = VIEWS.map((v, i) => `<button type="button" aria-label="${esc(T(v[1]))}" aria-pressed="${i === view}" data-v="${i}"></button>`).join("");
  $$("#lb-dots button").forEach(b => b.addEventListener("click", () => { view = +b.dataset.v; paintLb(); }));
  $("#lb-cat").textContent = T(roomName(t.room)) + " · " + (st.name || "");
  $("#lb-name").textContent = T(t.name);
  $("#lb-desc").textContent = T(t.desc);
  $("#lb-facts").innerHTML = [["Style", st.name], ["Size", size(t)], ["Floor area", area(t).toFixed(1) + " m²"], ["Furniture", t.items.length + " " + T("pieces")], ["Ceiling", (t.height || 2.6).toFixed(2) + " m"]]
    .map(([k, v]) => `<div><dt>${esc(T(k))}</dt><dd>${esc(T(v))}</dd></div>`).join("");
  $("#lb-pal").innerHTML = (st.palette || []).map(c => `<i style="background:${c}" title="${c}"></i>`).join("");
  $("#lb-open").href = studioLink("?template=" + t.id);
}
// the project file opens in Studio → ⋯ → Import project, even offline
$("#dl-proj").addEventListener("click", () => {
  const t = cur; if (!t) return;
  const project = { name: T(t.name), roomType: t.room, design: { style: t.style }, plan: buildPlan(t), finish: { az: t.cam || "se" }, template: t.id, photo: templateImage(t.id), thumb: templateImage(t.id), photoSource: "template" };
  const blob = new Blob([JSON.stringify({ makon: 1, exported: new Date().toISOString(), project })], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "makon-" + t.id + ".makon.json";
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});
const step = d => { view = (view + d + VIEWS.length) % VIEWS.length; paintLb(); };
const stepTpl = d => { const a = TEMPLATES, i = a.indexOf(cur); cur = a[(i + d + a.length) % a.length]; view = 0; paintLb(); };
$("#lb-prev").addEventListener("click", () => step(-1));
$("#lb-next").addEventListener("click", () => step(1));
$("#lb-ptpl").addEventListener("click", () => stepTpl(-1));
$("#lb-ntpl").addEventListener("click", () => stepTpl(1));
$("#lb-close").addEventListener("click", closeLb);
lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb-body")) closeLb(); });
document.addEventListener("keydown", e => {
  if (lb.hidden) { if (e.key === "Escape" && !mnav.hidden) menu(false); return; }
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
  if (e.key === "ArrowUp") { e.preventDefault(); stepTpl(-1); }
  if (e.key === "ArrowDown") { e.preventDefault(); stepTpl(1); }
});
// swipe between pictures on phones
let sx = null;
$(".lb-stage").addEventListener("touchstart", e => { sx = e.touches[0].clientX; }, { passive: true });
$(".lb-stage").addEventListener("touchend", e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); sx = null; });

function render() { renderFilters(); renderGrid(); renderFilms(); renderEvening(); if (!lb.hidden && cur) paintLb(); }
document.addEventListener("makon:lang", render);
render();
const q = new URLSearchParams(location.search).get("open"); if (q) openLb(q);
