// Makon — makers & designers directory
import { $, $$, esc, initHeader } from "./gallery-common.js";
import { api, imgUrl, KIND } from "./makers-common.js";

initHeader();
let all = [], kind = "all";
const grid = $("#mk-grid");

function render() {
  const list = all.filter(m => kind === "all" || m.kind === kind);
  if (!list.length) {
    grid.innerHTML = `<div class="mk-empty"><b>${all.length ? "No one here yet in this group." : "The first makers are joining now."}</b>
      <p>Are you a furniture workshop, a craftsman or an interior designer? Your page could be the first one people see.</p>
      <a class="d-try" href="join.html">Create my page ↗</a></div>`;
    return;
  }
  grid.innerHTML = list.map(m => `
    <a class="mk-card" href="maker.html?m=${encodeURIComponent(m.slug)}">
      <span class="mk-cover">${m.cover ? `<img src="${imgUrl(m.cover)}" alt="" loading="lazy" decoding="async">` : ""}</span>
      <span class="mk-meta">
        <span class="mk-logo">${m.logo ? `<img src="${imgUrl(m.logo)}" alt="" loading="lazy">` : esc((m.name || "?").slice(0, 1))}</span>
        <span><b>${esc(m.name)}</b><small>${esc(KIND[m.kind] || "")}${m.city ? " · " + esc(m.city) : ""}</small></span>
      </span>
      ${m.tagline ? `<span class="mk-tag">${esc(m.tagline)}</span>` : ""}
      <span class="mk-count">${m.count} ${m.kind === "designer" ? (m.count === 1 ? "project" : "projects") : (m.count === 1 ? "piece" : "pieces")} ↗</span>
    </a>`).join("");
}
$$("#mk-filters button").forEach(b => b.addEventListener("click", () => {
  kind = b.dataset.k; $$("#mk-filters button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); render();
}));
api("").then(j => { all = j.makers || []; render(); }).catch(() => { all = []; render(); });
