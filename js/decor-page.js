// Makon — Furniture & decor: real photos of every kind of piece, our 3D model beside it, and "try it in my room"
import { CATALOG, furnPic, SHOPS } from "./studio/data.js";
import { PHOTOS, LOOKS, photoUrl, photoFor } from "./photos.js";
import { board } from "./looks.js";
import { $, $$, esc, initHeader } from "./gallery-common.js";

initHeader();
const ORDER = ["All", "Lighting", "Handmade", "Seating", "Tables", "Storage", "Beds", "Decor", "Kitchen", "Bath", "Office"];
let cat = "All", q = "";
try { const h = decodeURIComponent(location.hash.slice(1)); if (ORDER.includes(h)) cat = h; } catch (e) {}
const size = c => Math.round(c.w * 100) + " × " + Math.round(c.d * 100) + (c.h > 0.05 ? " × " + Math.round(c.h * 100) : "") + " cm";
const tryUrl = id => "studio.html?add=" + encodeURIComponent(id);
const byId = Object.fromEntries(CATALOG.map(c => [c.id, c]));

// a picture box: the real photo when we have one (with a 3D toggle), else the 3D render.
// If the photo can't load, the box quietly switches to the 3D render.
function pic(c, w) {
  const ph = photoFor(c.id, w), three = furnPic(c.id), alt = esc(c.name);
  if (!ph) return `<img src="${three}" alt="${alt}" loading="lazy" decoding="async" width="640" height="480">`;
  return `<img class="ph" src="${ph}" alt="${esc(PHOTOS[c.id][1])}" loading="lazy" decoding="async" width="640" height="480" data-3d="${three}">
    <img class="m3" src="${three}" alt="${alt} — 3D model" loading="lazy" decoding="async" width="640" height="480">
    <button type="button" class="d-3d" aria-pressed="false" title="Show the 3D model">3D</button>`;
}
function wirePics(root) {
  root.querySelectorAll("img.ph").forEach(img => {
    const fail = () => img.closest("[data-pic]")?.classList.add("no-ph");
    if (img.complete && img.naturalWidth === 0) fail(); else img.addEventListener("error", fail, { once: true });
  });
}
function boardLink() { const n = board.all().length, a = document.getElementById("d-boardlink"); if (a) a.innerHTML = "♥ My board" + (n ? " <sup>" + n + "</sup>" : ""); }
document.addEventListener("click", e => {
  const h = e.target.closest(".d-heart");
  if (h) { e.preventDefault(); const on = board.toggle(h.dataset.id); h.setAttribute("aria-pressed", on); h.textContent = on ? "♥" : "♡"; h.classList.remove("pop"); void h.offsetWidth; h.classList.add("pop"); boardLink(); return; }
  const b = e.target.closest(".d-3d"); if (!b) return;
  e.preventDefault();
  const box = b.closest("[data-pic]"), on = !box.classList.contains("show3d");
  box.classList.toggle("show3d", on); b.setAttribute("aria-pressed", on); b.textContent = on ? "Photo" : "3D";
});

$("#d-total").textContent = CATALOG.length;

// lookbook of real rooms
$("#d-look").innerHTML = LOOKS.map(([pid, cap, id], i) => {
  const c = byId[id]; if (!c) return "";
  return `<a class="d-lk${i === 0 ? " big" : ""}" href="${tryUrl(id)}">
    <img src="${photoUrl(pid, i === 0 ? 1400 : 900)}" alt="${esc(cap)}" loading="${i < 3 ? "eager" : "lazy"}" decoding="async" onerror="this.closest('a').remove()">
    <span class="d-lk-cap"><b>${esc(cap)}</b><em>Try a ${esc(c.name.toLowerCase())} in my room ↗</em></span></a>`;
}).join("");

// handmade band
$("#d-craft").innerHTML = CATALOG.filter(c => c.craft).map(c => `
  <article class="d-cc">
    <div class="d-cc-img" data-pic>${pic(c, 700)}</div>
    <h3>${esc(c.name)}</h3><p>${esc(c.desc || "")}</p><small>${esc(c.mat || "")} · ${size(c)}</small>
    <a class="d-try" href="${tryUrl(c.id)}">Try it in my room ↗</a>
  </article>`).join("");
wirePics($("#d-craft"));

function renderFilters() {
  $("#d-filters").innerHTML = ORDER.map(k => {
    const n = k === "All" ? CATALOG.length : CATALOG.filter(c => c.cat === k).length;
    return n ? `<button type="button" data-c="${k}" aria-pressed="${k === cat}">${k}<sup>${n}</sup></button>` : "";
  }).join("");
  $$("#d-filters button").forEach(b => b.addEventListener("click", () => { cat = b.dataset.c; history.replaceState(null, "", cat === "All" ? location.pathname : "#" + cat); renderFilters(); renderGrid(); boardLink(); }));
}
function renderGrid() {
  const list = CATALOG.filter(c => (cat === "All" || c.cat === cat) && (!q || (c.name + " " + c.cat + " " + (c.q || "") + " " + (c.desc || "")).toLowerCase().includes(q)))
    .sort((a, b) => (!!PHOTOS[b.id] - !!PHOTOS[a.id]) || (b.cat === "Lighting") - (a.cat === "Lighting") || (b.craft ? 1 : 0) - (a.craft ? 1 : 0));
  $("#d-grid").innerHTML = list.length ? list.map(c => `
    <article class="d-card">
      <div class="d-img" data-pic>${pic(c, 640)}${c.craft ? '<span class="d-badge">Handmade</span>' : ""}<button type="button" class="d-heart" data-id="${c.id}" aria-pressed="${board.has(c.id)}" aria-label="Save ${esc(c.name)} to my board">${board.has(c.id) ? "♥" : "♡"}</button></div>
      <div class="d-body">
        <span class="d-cat">${esc(c.cat)}</span>
        <h3>${esc(c.name)}</h3>
        <small>${size(c)}${c.mat ? " · " + esc(c.mat) : ""}</small>
        <div class="d-act"><a class="d-try" href="${tryUrl(c.id)}">Try in my room ↗</a>
          <details class="d-shopx"><summary>Shop similar</summary><div>${SHOPS.slice(0, 3).map(([n, f]) => `<a href="${f(c.q || c.name)}" target="_blank" rel="noopener noreferrer">${esc(n.replace("Google Shopping", "Google"))}</a>`).join("")}</div></details></div>
      </div>
    </article>`).join("") : `<p class="d-empty">Nothing matches “${esc(q)}”.</p>`;
  wirePics($("#d-grid"));
}
$("#d-search").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); renderGrid(); });
renderFilters(); renderGrid(); boardLink();
