// Makon — templates gallery: filters, staggered grid (films on hover), the moving image
import { TEMPLATES, TEMPLATE_CATS } from "./studio/templates.js";
import { STYLES, roomName } from "./studio/data.js";
import { polyArea } from "./studio/geom.js";
import { $, $$, T, esc, pad, pic, clip, sources, initHeader, autoplayInView, hoverPlay } from "./gallery-common.js";

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
    const tall = i % 2 === 1, st = STYLES[t.style] || {};
    const img = tall ? pic(t.id, "d1") : pic(t.id), film = tall ? clip(t.id, "m1") : clip(t.id);
    return `<a class="g-card${tall ? " tall" : ""}" href="${roomUrl(t.id)}">
      <span class="g-media"><img src="${img}" alt="${esc(T(t.name))}" loading="${i < 2 ? "eager" : "lazy"}"><video muted loop playsinline preload="none" aria-hidden="true">${sources(film)}</video><span class="g-plus" aria-hidden="true">+</span></span>
      <span class="g-meta"><span><h3>${esc(T(t.name))}</h3><small>${esc(T(roomName(t.room)))} · ${esc(st.name || "")}</small></span><span>${area(t).toFixed(1)} m²</span></span>
    </a>`;
  }).join("");
  hoverPlay($$("#grid .g-card"));
}
function renderClips() {
  const pick = [["warm-living", "m1"], ["japandi-studio", "m3"], ["midnight-lounge", "m3"]];
  $("#clips").innerHTML = pick.map(([id, m]) => {
    const t = TEMPLATES.find(x => x.id === id);
    return `<figure class="g-clip"><video controls muted loop playsinline preload="metadata" poster="${pic(id, m)}">${sources(clip(id, m))}</video>
      <figcaption><span>${esc(T(t.name))}</span><a href="${roomUrl(id)}">${esc(T("Open"))} ↗</a></figcaption></figure>`;
  }).join("");
  autoplayInView($$("#clips video"));
}
function render() { renderFilters(); renderGrid(); renderClips(); }
document.addEventListener("makon:lang", () => { renderFilters(); renderGrid(); $$("#clips figcaption").forEach((f, k) => { const id = ["warm-living", "japandi-studio", "midnight-lounge"][k]; f.firstElementChild.textContent = T(TEMPLATES.find(x => x.id === id).name); f.lastElementChild.textContent = T("Open") + " ↗"; }); });
render();
