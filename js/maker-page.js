// Makon — one maker's or designer's public page
import { $, esc, initHeader } from "./gallery-common.js";
import { api, imgUrl, KIND, contactLinks } from "./makers-common.js";

initHeader();
const qs = new URLSearchParams(location.search), slug = qs.get("m") || "", key = qs.get("key") || "";
const box = $("#mp"), lb = $("#mp-lb");
const ICON = { tg: "✈", ig: "◎", ph: "☎", web: "↗" };

function show(m) {
  document.title = m.name + " — Makon";
  const d = document.querySelector('meta[name="description"]'); if (d) d.content = (m.tagline || KIND[m.kind]) + (m.city ? " · " + m.city : "") + " — on Makon";
  const contacts = contactLinks(m), unit = m.kind === "designer" ? "Projects" : "Pieces";
  const ask = w => m.telegram ? "https://t.me/" + m.telegram : m.instagram ? "https://ig.me/m/" + m.instagram : m.phone ? "tel:" + m.phone : "";
  box.innerHTML = `
    ${m.status !== "live" ? `<p class="mp-flag">${m.status === "pending" ? "Waiting for review — only you can see this page for now." : "This page isn't public."} ${key ? `<a href="join.html?m=${encodeURIComponent(m.slug)}&key=${encodeURIComponent(key)}">Edit page</a>` : ""}</p>` : ""}
    <header class="mp-head">
      <span class="mp-logo">${m.logo ? `<img src="${imgUrl(m.logo)}" alt="">` : esc(m.name.slice(0, 1))}</span>
      <div>
        <span class="g-eyebrow">${esc(KIND[m.kind] || "")}${m.city ? " · " + esc(m.city) : ""}</span>
        <h1 class="mp-name">${esc(m.name)}</h1>
        ${m.tagline ? `<p class="mp-tagline">${esc(m.tagline)}</p>` : ""}
      </div>
    </header>
    <div class="mp-cols">
      <div class="mp-about">${m.about ? esc(m.about).split(/\n+/).map(p => `<p>${p}</p>`).join("") : ""}</div>
      <aside class="mp-contact"><b>Contact ${esc(m.name)}</b><small>Directly, no middleman · To‘g‘ridan-to‘g‘ri</small>
        ${contacts.map(c => `<a class="mp-c mp-${c.k}" href="${esc(c.href)}" ${c.k === "ph" ? "" : 'target="_blank" rel="noopener nofollow"'}><i>${ICON[c.k]}</i>${esc(c.label)}</a>`).join("")}
        <p class="mp-note">Say you found them on Makon. Prices are set by the maker.</p>
      </aside>
    </div>
    <h2 class="mk-h2 mp-wh">${unit} <small>${m.works.length}</small></h2>
    <div class="mp-works">${m.works.map((w, i) => `
      <figure class="mp-w">
        <button type="button" class="mp-wimg" data-i="${i}" aria-label="Open photo: ${esc(w.title)}"><img src="${imgUrl(w.img)}" alt="${esc(w.title)}" loading="${i < 4 ? "eager" : "lazy"}" decoding="async"></button>
        <figcaption><b>${esc(w.title)}</b>${w.price ? `<span class="mp-price">${esc(w.price)}</span>` : ""}
          <small>${[w.size, w.material].filter(Boolean).map(esc).join(" · ")}</small>
          ${w.desc ? `<p>${esc(w.desc)}</p>` : ""}
          ${ask(w) ? `<a class="mp-ask" href="${esc(ask(w))}" target="_blank" rel="noopener nofollow">Ask about this ↗</a>` : ""}</figcaption>
      </figure>`).join("")}</div>
    <p class="mp-back"><a href="makers.html">← All makers and designers</a> · <a href="studio.html">Plan your room in 3D first ↗</a></p>`;
  box.querySelectorAll(".mp-wimg").forEach(b => b.addEventListener("click", () => {
    const w = m.works[+b.dataset.i]; lb.querySelector("img").src = imgUrl(w.img); lb.querySelector("img").alt = w.title;
    lb.querySelector(".mp-lb-cap").textContent = [w.title, w.price, w.size].filter(Boolean).join(" · ");
    lb.showModal ? lb.showModal() : lb.setAttribute("open", "");
  }));
}
lb.addEventListener("click", e => { if (e.target === lb || e.target.closest(".mp-x")) lb.close(); });

if (!slug) box.innerHTML = `<p class="mk-load">No page chosen. <a href="makers.html">See all makers</a></p>`;
else api("?m=" + encodeURIComponent(slug) + (key ? "&key=" + encodeURIComponent(key) : ""), { headers: {} })
  .then(j => show(j.maker))
  .catch(e => { box.innerHTML = `<div class="mk-empty"><b>${esc(e.message)}</b><p><a href="makers.html">See all makers and designers</a></p></div>`; });
