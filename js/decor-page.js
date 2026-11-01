// Makon — Furniture & decor: every catalogue piece with its picture, size and materials; try it in your room
import { CATALOG, furnPic, SHOPS } from "./studio/data.js";
import { $, $$, esc, initHeader } from "./gallery-common.js";

initHeader();
const ORDER = ["All", "Lighting", "Handmade", "Seating", "Tables", "Storage", "Beds", "Decor", "Kitchen", "Bath", "Office"];
let cat = "All", q = "";
try { const h = decodeURIComponent(location.hash.slice(1)); if (ORDER.includes(h)) cat = h; } catch (e) {}
const size = c => Math.round(c.w * 100) + " × " + Math.round(c.d * 100) + (c.h > 0.05 ? " × " + Math.round(c.h * 100) : "") + " cm";
const tryUrl = id => "studio.html?add=" + encodeURIComponent(id);

$("#d-total").textContent = CATALOG.length;
// handmade band
$("#d-craft").innerHTML = CATALOG.filter(c => c.craft).map(c => `
  <article class="d-cc">
    <div class="d-cc-img"><img src="${furnPic(c.id)}" alt="${esc(c.name)}" loading="lazy" decoding="async" width="640" height="480"></div>
    <h3>${esc(c.name)}</h3><p>${esc(c.desc || "")}</p><small>${esc(c.mat || "")} · ${size(c)}</small>
    <a class="d-try" href="${tryUrl(c.id)}">Try it in my room ↗</a>
  </article>`).join("");

function renderFilters() {
  $("#d-filters").innerHTML = ORDER.map(k => {
    const n = k === "All" ? CATALOG.length : CATALOG.filter(c => c.cat === k).length;
    return n ? `<button type="button" data-c="${k}" aria-pressed="${k === cat}">${k}<sup>${n}</sup></button>` : "";
  }).join("");
  $$("#d-filters button").forEach(b => b.addEventListener("click", () => { cat = b.dataset.c; history.replaceState(null, "", cat === "All" ? location.pathname : "#" + cat); renderFilters(); renderGrid(); }));
}
function renderGrid() {
  const list = CATALOG.filter(c => (cat === "All" || c.cat === cat) && (!q || (c.name + " " + c.cat + " " + (c.q || "") + " " + (c.desc || "")).toLowerCase().includes(q)))
    .sort((a, b) => (b.cat === "Lighting") - (a.cat === "Lighting") || (b.craft ? 1 : 0) - (a.craft ? 1 : 0));
  $("#d-grid").innerHTML = list.length ? list.map(c => `
    <article class="d-card">
      <div class="d-img"><img src="${furnPic(c.id)}" alt="${esc(c.name)}" loading="lazy" decoding="async" width="640" height="480">${c.craft ? '<span class="d-badge">Handmade</span>' : ""}</div>
      <div class="d-body">
        <span class="d-cat">${esc(c.cat)}</span>
        <h3>${esc(c.name)}</h3>
        <small>${size(c)}${c.mat ? " · " + esc(c.mat) : ""}</small>
        <div class="d-act"><a class="d-try" href="${tryUrl(c.id)}">Try in my room ↗</a>
          <details class="d-shopx"><summary>Shop similar</summary><div>${SHOPS.slice(0, 3).map(([n, f]) => `<a href="${f(c.q || c.name)}" target="_blank" rel="noopener noreferrer">${esc(n.replace("Google Shopping", "Google"))}</a>`).join("")}</div></details></div>
      </div>
    </article>`).join("") : `<p class="d-empty">Nothing matches “${esc(q)}”.</p>`;
}
$("#d-search").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); renderGrid(); });
renderFilters(); renderGrid();
