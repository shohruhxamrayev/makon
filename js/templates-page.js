// Makon — templates gallery: filters, staggered grid (films on hover), the moving image
import { TEMPLATES, TEMPLATE_CATS } from "./studio/templates.js";
import { STYLES, roomName } from "./studio/data.js";
import { polyArea } from "./studio/geom.js";
import { $, $$, T, esc, pad, pic, clip, clipSm, thumb, srcset, sources, initHeader, autoplayInView, hoverPlay, lightbox } from "./gallery-common.js";
const lb = lightbox();
import { SIGNATURE, sigImg, sigThumb, sigReel } from "./signature.js";
const VIEWS = [["", "Daylight"], ["d1", "Close-up"], ["angle", "Another angle"], ["evening", "Evening, lamps on"], ["plan", "Floor plan"]];
const quick = t => VIEWS.map(([s, c]) => ({ src: pic(t.id, s), thumb: thumb(t.id, s), cap: T(t.name) + " — " + T(c), name: "makon-" + t.id + (s ? "-" + s : "") + ".jpg", room: roomUrl(t.id) }));

initHeader();
const area = t => polyArea(t.pts || [[0, 0], [t.w, 0], [t.w, t.d], [0, t.d]]);
const roomUrl = id => "room.html?id=" + id;

let cat = "all";
try { const h = location.hash.slice(1); if (TEMPLATE_CATS.some(c => c[0] === h)) cat = h; } catch (e) {}
// old links (?open=id) go straight to the room page
const legacy = new URLSearchParams(location.search).get("open");
if (legacy && TEMPLATES.some(t => t.id === legacy)) location.replace(roomUrl(legacy));

function renderFilters() {
  $("#t-total").textContent = pad(TEMPLATES.length);
  $("#filters").innerHTML = TEMPLATE_CATS.map(([k, n]) => {
    const c = k === "all" ? TEMPLATES.length : TEMPLATES.filter(t => t.cat === k).length;
    return c ? `<button type="button" data-cat="${k}" aria-pressed="${k === cat}">${esc(T(n))}<sup>${pad(c)}</sup></button>` : "";
  }).join("");
  $$("#filters button").forEach(b => b.addEventListener("click", () => {
    cat = b.dataset.cat; history.replaceState(null, "", cat === "all" ? location.pathname : "#" + cat);
    renderFilters(); renderGrid();
  }));
}
function renderGrid() {
  const items = TEMPLATES.filter(t => cat === "all" || t.cat === cat);
  $("#grid").innerHTML = items.map((t, i) => {
    const st = STYLES[t.style] || {};
    const film = clipSm(t.id, "m1");
    return `<div class="g-card">
      <div class="g-mbox"><a class="g-media" href="${roomUrl(t.id)}" aria-label="${esc(T(t.name))}"><img src="${thumb(t.id)}" srcset="${srcset(t.id)}" sizes="(max-width: 900px) 100vw, 50vw" alt="${esc(T(t.name))}" loading="${i < 2 ? "eager" : "lazy"}" decoding="async"><video muted loop playsinline preload="none" aria-hidden="true">${sources(film)}</video></a>
        <button type="button" class="g-plus" data-id="${t.id}" aria-label="Quick view: ${esc(T(t.name))} photos" title="Quick view">+</button></div>
      <a class="g-meta" href="${roomUrl(t.id)}"><span><h3>${esc(T(t.name))}</h3><small>${esc(T(roomName(t.room)))} · ${esc(st.name || "")}</small></span><span>${area(t).toFixed(1)} m²</span></a>
    </div>`;
  }).join("");
  hoverPlay($$("#grid .g-card"));
  $$("#grid .g-plus").forEach(b => b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); lb.open(quick(TEMPLATES.find(x => x.id === b.dataset.id)), 0); }));
}
function renderClips() {
  const pick = [["warm-living", "m1"], ["japandi-studio", "m1"], ["midnight-lounge", "m1"]];
  $("#clips").innerHTML = pick.map(([id, m]) => {
    const t = TEMPLATES.find(x => x.id === id);
    return `<figure class="g-clip"><video controls muted loop playsinline preload="none" poster="${thumb(id, m)}">${sources(clipSm(id, m))}</video>
      <figcaption><span>${esc(T(t.name))}</span><a href="${roomUrl(id)}">${esc(T("Open"))} ↗</a></figcaption></figure>`;
  }).join("");
  autoplayInView($$("#clips video"));
}
function renderSignature() {
  $("#sig-grid").innerHTML = SIGNATURE.map((p, i) => `<div class="g-card">
      <div class="g-mbox"><a class="g-media" href="project.html?id=${p.id}" aria-label="${esc(p.name)}"><img src="${sigThumb(p.id, 1)}" srcset="${sigThumb(p.id, 1)} 720w, ${sigImg(p.id, 1)} 1440w" sizes="(max-width: 900px) 78vw, 33vw" alt="${esc(p.name)}" loading="eager" decoding="async"><video muted loop playsinline preload="none" aria-hidden="true"><source src="${sigReel(p.id, true)}" type="video/mp4"></video></a>
        <button type="button" class="g-plus" data-sig="${p.id}" aria-label="Quick view: ${esc(p.name)}" title="Quick view">+</button></div>
      <a class="g-meta" href="project.html?id=${p.id}"><span><h3>${esc(p.name)}</h3><small>${esc(p.room)}</small></span><span>${p.shots.length} photos</span></a>
    </div>`).join("");
  hoverPlay($$("#sig-grid .g-card"));
  $$("#sig-grid .g-plus").forEach(b => b.addEventListener("click", e => {
    e.preventDefault(); e.stopPropagation(); const p = SIGNATURE.find(x => x.id === b.dataset.sig);
    lb.open(p.shots.map((c, k) => ({ src: sigImg(p.id, k + 1), thumb: sigThumb(p.id, k + 1), cap: p.name + " — " + c, name: "makon-" + p.id + "-" + (k + 1) + ".jpg", room: "project.html?id=" + p.id })), 0);
  }));
}
function render() { renderSignature(); renderFilters(); renderGrid(); renderClips(); }
document.addEventListener("makon:lang", () => { renderFilters(); renderGrid(); $$("#clips figcaption").forEach((f, k) => { const id = ["warm-living", "japandi-studio", "midnight-lounge"][k]; f.firstElementChild.textContent = T(TEMPLATES.find(x => x.id === id).name); f.lastElementChild.textContent = T("Open") + " ↗"; }); });
render();
