// Makon — My board: saved pieces, and "put them all in my room"
import { CATALOG, furnPic } from "./studio/data.js";
import { photoFor } from "./photos.js";
import { board } from "./looks.js";
import { $, esc, initHeader } from "./gallery-common.js";

initHeader();
const byId = Object.fromEntries(CATALOG.map(c => [c.id, c]));
function render() {
  const ids = board.all().filter(id => byId[id]);
  $("#bd-n").textContent = ids.length;
  $("#bd-bar").innerHTML = ids.length
    ? `<a class="d-try mk-btn" href="studio.html?add=${encodeURIComponent(ids.slice(0, 12).join(","))}">Put ${ids.length > 12 ? "12 of them" : ids.length === 1 ? "it" : "all " + ids.length} in my room ↗</a><button type="button" class="d-try" id="bd-clear">Clear board</button>`
    : "";
  $("#bd-grid").innerHTML = ids.length ? ids.map(id => { const c = byId[id], ph = photoFor(id, 640); return `
    <article class="d-card">
      <div class="d-img"><img src="${ph || furnPic(id)}" alt="${esc(c.name)}" loading="lazy" onerror="this.onerror=null;this.src='${furnPic(id)}'"></div>
      <div class="d-body"><span class="d-cat">${esc(c.cat)}</span><h3>${esc(c.name)}</h3><small>${Math.round(c.w * 100)} × ${Math.round(c.d * 100)} × ${Math.round(c.h * 100)} cm</small>
        <div class="d-act"><a class="d-try" href="studio.html?add=${id}">Try in my room ↗</a><button type="button" class="d-fav" data-id="${id}" aria-pressed="true" aria-label="Remove from board">♥</button></div></div>
    </article>`; }).join("")
    : `<div class="mk-empty"><b>Your board is empty.</b><p>Tap ♡ on pieces you like — on the home page rooms or in the decor catalogue.</p><a class="d-try" href="decor.html">Browse furniture &amp; decor ↗</a></div>`;
  const clr = $("#bd-clear"); if (clr) clr.addEventListener("click", () => { board.all().forEach(id => board.toggle(id)); });
}
$("#bd-grid").addEventListener("click", e => { const b = e.target.closest(".d-fav"); if (b) board.toggle(b.dataset.id); });
window.addEventListener("makon:board", render);
render();
