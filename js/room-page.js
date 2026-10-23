// Makon — one room: photos, lightbox, films, downloads, next room
import { TEMPLATES, buildPlan } from "./studio/templates.js";
import { STYLES, roomName, catalogItem, SHOPS } from "./studio/data.js";
import { polyArea } from "./studio/geom.js";
import { $, $$, T, esc, pic, clip, sources, zip, studioLink, initHeader, autoplayInView, lightbox } from "./gallery-common.js";

initHeader();
const id = new URLSearchParams(location.search).get("id");
const idx = Math.max(0, TEMPLATES.findIndex(t => t.id === id));
const t = TEMPLATES[idx];
if (!id || TEMPLATES[idx].id !== id) history.replaceState(null, "", "room.html?id=" + t.id);
const st = STYLES[t.style] || {};
const area = polyArea(t.pts || [[0, 0], [t.w, 0], [t.w, t.d], [0, t.d]]);
const lb = lightbox();

// every photo, in the order the page shows them
const SHOTS = [["", "Daylight"], ["d1", "Detail"], ["angle", "Another angle"], ["evening", "Evening, lamps on"], ["plan", "Floor plan"]];
const items = () => SHOTS.map(([s, c], k) => ({ src: pic(t.id, s), cap: T(t.name) + " — " + T(c), name: "makon-" + t.id + (s ? "-" + s : "") + ".jpg", k }));

function render() {
  document.title = T(t.name) + " — Makon";
  $("#r-cat").textContent = T(roomName(t.room)) + " · " + (st.name || "");
  $("#r-name").textContent = T(t.name);
  $("#r-desc").textContent = T(t.desc);
  $("#r-facts").innerHTML = [["Style", st.name], ["Size", t.pts ? T("L-shaped") : t.w.toFixed(1) + " × " + t.d.toFixed(1) + " m"], ["Floor area", area.toFixed(1) + " m²"], ["Furniture", t.items.length + " " + T("pieces")]]
    .map(([k, v]) => `<div><dt>${esc(T(k))}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("#r-pal").innerHTML = (st.palette || []).map(c => `<i style="background:${c}"></i>`).join("");
  $("#r-open").href = studioLink("?template=" + t.id);
  $("#r-use").href = studioLink("?style=" + t.style + "&from=" + t.id);
  // get this look: colours, materials, shopping list
  $("#r-swatches").innerHTML = (st.palette || []).map(c => `<button type="button" class="r-sw" data-c="${c}"><i style="background:${c}"></i><span>${c.toUpperCase()}</span></button>`).join("");
  $$("#r-swatches .r-sw").forEach(b => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.c); } catch (e) {}
    const sp = b.querySelector("span"); sp.textContent = T("Copied"); setTimeout(() => { sp.textContent = b.dataset.c.toUpperCase(); }, 1200);
  }));
  $("#r-mats").innerHTML = (st.mats || []).map(([k, v]) => `<div><dt>${esc(T(k))}</dt><dd>${esc(v)}</dd></div>`).join("");
  const counts = new Map();
  t.items.forEach(x => { const c = catalogItem(x.id); if (!c) return; const key = c.id; counts.set(key, (counts.get(key) || 0) + 1); });
  $("#r-shop").innerHTML = [...counts].map(([cid, n]) => {
    const c = catalogItem(cid), q = (c.q || c.name) + " " + (st.name || "").split(/[ &]+/)[0].toLowerCase();
    const size = Math.round(c.w * 100) + " × " + Math.round(c.d * 100) + (c.h > 0.05 ? " × " + Math.round(c.h * 100) : "") + " cm";
    return `<li><span class="r-dot" style="background:${c.color}"></span><span class="r-item"><b>${esc(T(c.name))}${n > 1 ? " ×" + n : ""}</b><small>${size}</small></span><span class="r-links">${SHOPS.slice(0, 3).map(([nm, f]) => `<a href="${f(q)}" target="_blank" rel="noopener noreferrer">${esc(nm.replace("Google Shopping", "Google"))}</a>`).join("")}</span></li>`;
  }).join("");
  $("#dl-zip").href = zip(t.id); $("#dl-zip").setAttribute("download", "makon-" + t.id + ".zip");
  $("#dl-film").href = clip(t.id).mp4; $("#dl-film").setAttribute("download", "makon-" + t.id + ".mp4");

  $("#r-hero").innerHTML = `<span class="g-media" data-k="0"><img src="${pic(t.id)}" alt="${esc(T(t.name))}"><span class="g-plus" aria-hidden="true">+</span></span><figcaption>${esc(T("Daylight"))}</figcaption>`;
  $("#r-gal").innerHTML = SHOTS.slice(1).map(([s, c], k) => {
    return `<figure><span class="g-media" data-k="${k + 1}"><img src="${pic(t.id, s)}" alt="${esc(T(t.name) + " — " + T(c))}" loading="lazy"><span class="g-plus" aria-hidden="true">+</span></span><figcaption>${esc(T(c))}</figcaption></figure>`;
  }).join("");
  $$("#room [data-k]").forEach(m => { m.tabIndex = 0; m.setAttribute("role", "button"); m.setAttribute("aria-label", T("Open picture"));
    const go = () => lb.open(items(), +m.dataset.k);
    m.addEventListener("click", go); m.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }); });

  const clips = [["m1", "From day to evening"], ["m2", "Another angle"], ["m3", "Close-up"]];
  $("#clips").innerHTML = clips.map(([m, c]) => `<figure class="g-clip"><video controls muted loop playsinline preload="metadata" poster="${pic(t.id, m)}">${sources(clip(t.id, m))}</video><figcaption><span>${esc(T(c))}</span><a href="${clip(t.id, m).mp4}" download="makon-${t.id}-${m}.mp4">↓ MP4</a></figcaption></figure>`).join("");
  const film = $("#film"); film.poster = pic(t.id); film.innerHTML = sources(clip(t.id));
  autoplayInView([...$$("#clips video")]);

  const nx = TEMPLATES[(idx + 1) % TEMPLATES.length];
  $("#r-next").href = "room.html?id=" + nx.id;
  $("#r-next-name").textContent = T(nx.name);
  $("#r-next-img").innerHTML = ["", "d1", "evening"].map(s => `<img src="${pic(nx.id, s)}" alt="" loading="lazy">`).join("");
  lb.relabel();
}

// project file: open it in Studio → Import project
$("#dl-proj").addEventListener("click", () => {
  const project = { name: T(t.name), roomType: t.room, design: { style: t.style }, plan: buildPlan(t), finish: { az: t.cam || "se" }, template: t.id, photo: pic(t.id), thumb: pic(t.id), photoSource: "template" };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ makon: 1, exported: new Date().toISOString(), project })], { type: "application/json" }));
  a.download = "makon-" + t.id + ".makon.json"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
});
document.addEventListener("makon:lang", render);
render();
