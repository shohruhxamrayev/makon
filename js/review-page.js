// Makon — owner review of maker pages (needs the owner code; it stays in this browser only)
import { $, $$, esc, initHeader } from "./gallery-common.js";
import { API, imgUrl, KIND, contactLinks } from "./makers-common.js";

initHeader();
let code = ""; try { code = sessionStorage.getItem("makon_owner") || ""; } catch (e) {}
let tab = "pending";
const call = async (q, opts = {}) => {
  const r = await fetch(API + q, Object.assign({}, opts, { headers: { "Content-Type": "application/json", "x-makon-code": code } }));
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Error " + r.status); return j;
};
async function load() {
  const box = $("#rv-list"); box.innerHTML = "<p>Loading…</p>";
  try {
    const j = await call(tab === "pending" ? "?pending=1" : "");
    $("#rv-code").hidden = true; $("#rv-tabs").hidden = false;
    if (j.storage === false) { box.innerHTML = "<p>Storage isn't connected: add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel.</p>"; return; }
    let list = j.makers || [];
    if (tab === "live") list = await Promise.all(list.map(s => call("?m=" + encodeURIComponent(s.slug)).then(x => x.maker)));
    box.innerHTML = list.length ? list.map(m => `
      <article class="rv-item" data-s="${esc(m.slug)}">
        <header><b>${esc(m.name)}</b> <small>${esc(KIND[m.kind] || "")} · ${esc(m.city || "")} · ${new Date(m.created).toLocaleString()}</small></header>
        <p>${esc(m.tagline || "")}</p><p class="rv-about">${esc(m.about || "")}</p>
        <p>${contactLinks(m).map(c => `<a href="${esc(c.href)}" target="_blank" rel="noopener">${esc(c.label)}</a>`).join(" · ")}</p>
        <div class="rv-pics">${m.works.map(w => `<figure><img src="${imgUrl(w.img)}" alt="" loading="lazy"><figcaption>${esc(w.title)} ${esc(w.price || "")}</figcaption></figure>`).join("")}</div>
        <div class="rv-act">${tab === "pending" ? `<button class="d-try" data-a="live">Approve</button><button class="d-try" data-a="rejected">Reject</button>` : `<button class="d-try" data-a="hidden">Hide</button>`}<a class="d-try" href="maker.html?m=${encodeURIComponent(m.slug)}" target="_blank">Open</a></div>
      </article>`).join("") : `<p>${tab === "pending" ? "Nothing waiting." : "No live pages yet."}</p>`;
  } catch (e) {
    $("#rv-code").hidden = false; box.innerHTML = `<p class="bad">${esc(e.message)}</p>`;
  }
}
$("#rv-list").addEventListener("click", async e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const s = b.closest(".rv-item").dataset.s; b.disabled = true;
  try { await call("", { method: "POST", body: JSON.stringify({ action: "review", slug: s, status: b.dataset.a }) }); b.closest(".rv-item").remove(); }
  catch (err) { alert(err.message); b.disabled = false; }
});
$("#rv-code").addEventListener("submit", e => { e.preventDefault(); code = $("#rv-pass").value.trim(); try { sessionStorage.setItem("makon_owner", code); } catch (err) {} load(); });
$$("#rv-tabs button").forEach(b => b.addEventListener("click", () => { tab = b.dataset.s; $$("#rv-tabs button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); load(); }));
if (code) load();
