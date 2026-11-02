// Makon — "Tap anything in the room" on the home page
import { CATALOG, furnPic, SHOPS } from "./studio/data.js";
import { ROOMS, photoSrc, board } from "./looks.js";
import { hasAR, openAR } from "./ar.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const byId = Object.fromEntries(CATALOG.map(c => [c.id, c]));
const size = c => Math.round(c.w * 100) + " × " + Math.round(c.d * 100) + (c.h > 0.05 ? " × " + Math.round(c.h * 100) : "") + " cm";
const root = $("#tap"); if (root) init();

function init() {
  const tabs = $("#tap-tabs"), frame = $("#tap-frame"), card = $("#tap-card");
  let room = ROOMS[0], pick = 0;
  tabs.innerHTML = ROOMS.map((r, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${esc(r.name)}</button>`).join("");
  tabs.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; show(+b.dataset.i, 0); });

  function show(i, p) {
    room = ROOMS[i]; pick = p;
    tabs.querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    frame.style.setProperty("--ar", room.w + " / " + room.h); frame.style.setProperty("--arn", (room.w / room.h).toFixed(3));
    frame.innerHTML = `<img src="${photoSrc(room.photo, 1400)}" srcset="${photoSrc(room.photo, 800)} 800w, ${photoSrc(room.photo, 1400)} 1400w" sizes="(max-width: 900px) 100vw, 60vw" alt="${esc(room.title)}" decoding="async">
      ${room.spots.map(([x, y, id], k) => byId[id] ? `<button type="button" class="tap-dot${k === pick ? " on" : ""}" style="left:${x}%;top:${y}%" data-k="${k}" aria-label="${esc(byId[id].name)}"><i></i></button>` : "").join("")}
      <span class="tap-cap">${esc(room.title)}</span>`;
    frame.querySelectorAll(".tap-dot").forEach(d => d.addEventListener("click", () => select(+d.dataset.k)));
    select(pick, true);
  }
  function select(k, quiet) {
    pick = k; const id = room.spots[k][2], c = byId[id];
    frame.querySelectorAll(".tap-dot").forEach(d => d.classList.toggle("on", +d.dataset.k === k));
    const fav = board.has(id);
    card.innerHTML = `
      <div class="tap-pic"><img src="${furnPic(id)}" alt="${esc(c.name)} — 3D model" width="640" height="480"><span class="label">Our 3D model · real size</span></div>
      <div class="tap-body">
        <span class="label accent">${esc(c.cat)}${c.craft ? " · Handmade" : ""}</span>
        <h3>${esc(c.name)}</h3>
        <p>${esc(c.desc || "Real-size piece you can place, move and turn in your own room.")}</p>
        <small>${size(c)}${c.mat ? " · " + esc(c.mat) : ""}</small>
        <div class="tap-act">
          <a class="btn-light label" href="studio.html?add=${encodeURIComponent(id)}">Put it in my room</a>
          <button type="button" class="tap-fav label" aria-pressed="${fav}">${fav ? "♥ Saved" : "♡ Save"}</button>
          ${hasAR(id) ? `<button type="button" class="tap-ar label">📱 See it in your room</button>` : ""}
        </div>
        <div class="tap-more"><a href="studio.html?template=${encodeURIComponent(room.tpl)}">Open the whole look in 3D →</a>
          <details><summary>Shop similar</summary>${SHOPS.slice(0, 3).map(([n, f]) => `<a href="${f(c.q || c.name)}" target="_blank" rel="noopener noreferrer">${esc(n.replace("Google Shopping", "Google"))}</a>`).join("")}</details></div>
        <div class="tap-nav"><button type="button" data-d="-1" aria-label="Previous piece">←</button><span>${k + 1} / ${room.spots.length}</span><button type="button" data-d="1" aria-label="Next piece">→</button></div>
      </div>`;
    card.querySelector(".tap-fav").addEventListener("click", e => { const on = board.toggle(id); e.currentTarget.setAttribute("aria-pressed", on); e.currentTarget.textContent = on ? "♥ Saved" : "♡ Save"; });
    const arb = card.querySelector(".tap-ar"); if (arb) arb.addEventListener("click", () => openAR(id));
    card.querySelectorAll(".tap-nav button").forEach(b => b.addEventListener("click", () => select((k + +b.dataset.d + room.spots.length) % room.spots.length)));
    if (!quiet && matchMedia("(max-width: 900px)").matches) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  show(Math.floor(Date.now() / 864e5) % ROOMS.length, 0);   // a different room each day
}
