// Makon — a Signature interior: full-quality photos, viewer, film, get this look
import { SIGNATURE, sigImg, sigThumb, sigReel, sigPoster } from "./signature.js";
import { STYLES, catalogItem, SHOPS } from "./studio/data.js";
import { $, $$, esc, studioLink, initHeader, autoplayInView, lightbox } from "./gallery-common.js";

initHeader();
const id = new URLSearchParams(location.search).get("id");
const idx = Math.max(0, SIGNATURE.findIndex(x => x.id === id));
const p = SIGNATURE[idx], st = STYLES[p.style] || {};
document.title = p.name + " — Makon";
const lb = lightbox();
const items = p.shots.map((c, k) => ({ src: sigImg(p.id, k + 1), thumb: sigThumb(p.id, k + 1), cap: p.name + " — " + c, name: "makon-" + p.id + "-" + (k + 1) + ".jpg" }));

$("#r-cat").textContent = "Signature · " + p.room;
$("#r-name").textContent = p.name;
$("#r-desc").textContent = p.desc;
$("#r-facts").innerHTML = [["Style", st.name || ""], ["Space", p.room], ["Photos", String(p.shots.length)], ["Film", "Reels & Shorts"]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
$("#r-pal").innerHTML = p.palette.map(c => `<i style="background:${c}"></i>`).join("");
$("#r-use").href = studioLink("?style=" + p.style);
$("#dl-reel").href = sigReel(p.id); $("#dl-reel").setAttribute("download", "makon-" + p.id + ".mp4");

// photos: full original quality, every one the same 4:5 size
$("#s-gal").innerHTML = items.map((it, k) => `<figure class="${k === 0 ? "s-first" : ""}"><span class="g-media s-media" data-k="${k}" role="button" tabindex="0" aria-label="Open picture"><img src="${k < 2 ? it.src : it.thumb}" ${k < 2 ? "" : `srcset="${it.thumb} 720w, ${it.src} 1440w" sizes="(max-width: 900px) 100vw, 50vw"`} alt="${esc(it.cap)}" loading="${k < 2 ? "eager" : "lazy"}" decoding="async"><span class="g-plus" aria-hidden="true">+</span></span><figcaption>${esc(p.shots[k])}</figcaption></figure>`).join("");
$$("#s-gal [data-k]").forEach(m => { const go = () => lb.open(items, +m.dataset.k); m.addEventListener("click", go); m.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }); });

// get this look
$("#r-swatches").innerHTML = p.palette.map(c => `<button type="button" class="r-sw" data-c="${c}"><i style="background:${c}"></i><span>${c.toUpperCase()}</span></button>`).join("");
$$("#r-swatches .r-sw").forEach(b => b.addEventListener("click", async () => { try { await navigator.clipboard.writeText(b.dataset.c); } catch (e) {} const sp = b.querySelector("span"); sp.textContent = "Copied"; setTimeout(() => { sp.textContent = b.dataset.c.toUpperCase(); }, 1200); }));
$("#r-mats").innerHTML = p.mats.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
const word = (st.name || "").split(/[ &]+/)[0].toLowerCase();
$("#r-shop").innerHTML = p.shop.map(([cid, n]) => {
  const c = catalogItem(cid); if (!c) return "";
  const q = (c.q || c.name) + " " + word, size = Math.round(c.w * 100) + " × " + Math.round(c.d * 100) + (c.h > 0.05 ? " × " + Math.round(c.h * 100) : "") + " cm";
  return `<li><span class="r-dot" style="background:${c.color}"></span><span class="r-item"><b>${esc(c.name)}${n > 1 ? " ×" + n : ""}</b><small>${size}</small></span><span class="r-links">${SHOPS.slice(0, 3).map(([nm, f]) => `<a href="${f(q)}" target="_blank" rel="noopener noreferrer">${esc(nm.replace("Google Shopping", "Google"))}</a>`).join("")}</span></li>`;
}).join("");

// film: plays on the page (light copy), full quality in full screen and for download
const v = $("#reel"); v.poster = sigPoster(p.id); v.innerHTML = `<source src="${sigReel(p.id, true)}" type="video/mp4">`;
v.dataset.full = sigReel(p.id);
autoplayInView([v]);
document.addEventListener("fullscreenchange", () => { const f = document.fullscreenElement; if (f === v && !/-sm\.mp4/.test(v.dataset.full) && /-sm\.mp4/.test(v.currentSrc)) { const t = v.currentTime; v.src = v.dataset.full; v.currentTime = t; v.play().catch(() => {}); } });

const nx = SIGNATURE[(idx + 1) % SIGNATURE.length];
$("#r-next").href = "project.html?id=" + nx.id; $("#r-next-name").textContent = nx.name;
$("#r-next-img").innerHTML = nx.shots.slice(0, 3).map((_, k) => `<img src="${sigThumb(nx.id, k + 1)}" alt="" loading="lazy" decoding="async">`).join("");
