// Makon — create or edit a maker / designer page
import { $, $$, esc, initHeader } from "./gallery-common.js";
import { api, imgUrl, shrink } from "./makers-common.js";

initHeader();
const qs = new URLSearchParams(location.search), editSlug = qs.get("m"), editKey = qs.get("key");
const form = $("#jn-form"), worksBox = $("#jn-works"), st = $("#jn-st");
let logo = "", works = [];                       // each work: { img (data URL or stored id), title, price, size, material, desc }
const MAX = 12;
const kind = () => (form.querySelector('[name="kind"]:checked') || {}).value || "producer";
const say = (t, bad) => { st.textContent = t; st.classList.toggle("bad", !!bad); };
const picSrc = v => !v ? "" : v.startsWith("data:") ? v : imgUrl(v);

function labels() {
  const d = kind() === "designer";
  $("#jn-works-l").textContent = d ? "Your projects" : "Your pieces"; $("#jn-works-uz").textContent = d ? "Loyihalaringiz" : "Buyumlaringiz";
  $("#jn-add-w").textContent = d ? "project" : "piece";
  $$(".jn-w").forEach(el => {
    el.querySelector('[data-f="price"]').placeholder = d ? "From 80 000 so‘m / m²" : "4 500 000 so‘m";
    el.querySelector('[data-f="size"]').placeholder = d ? "Flat, 85 m²" : "180 × 90 × 75 cm";
    el.querySelector('[data-f="title"]').placeholder = d ? "Living room in Tashkent City" : "Carved walnut dining table";
  });
}
function renderWorks() {
  worksBox.innerHTML = works.map((w, i) => `
    <div class="jn-w" data-i="${i}">
      <label class="jn-wpic">${w.img ? `<img src="${picSrc(w.img)}" alt="">` : `<span>+ Photo<small>Surat</small></span>`}<input type="file" accept="image/*" data-pic></label>
      <div class="jn-wf">
        <input data-f="title" maxlength="80" value="${esc(w.title || "")}" aria-label="Title">
        <div class="jn-row3"><input data-f="price" maxlength="40" value="${esc(w.price || "")}" aria-label="Price"><input data-f="size" maxlength="60" value="${esc(w.size || "")}" aria-label="Size"><input data-f="material" maxlength="80" value="${esc(w.material || "")}" placeholder="Walnut, linen" aria-label="Material"></div>
        <textarea data-f="desc" maxlength="400" rows="2" placeholder="A few words (optional)" aria-label="Description">${esc(w.desc || "")}</textarea>
      </div>
      <button type="button" class="jn-rm" aria-label="Remove">×</button>
    </div>`).join("");
  $("#jn-add").hidden = works.length >= MAX;
  labels();
}
worksBox.addEventListener("input", e => { const f = e.target.dataset.f, row = e.target.closest(".jn-w"); if (f && row) works[+row.dataset.i][f] = e.target.value; });
worksBox.addEventListener("click", e => { const rm = e.target.closest(".jn-rm"); if (rm) { works.splice(+rm.closest(".jn-w").dataset.i, 1); renderWorks(); } });
worksBox.addEventListener("change", async e => {
  if (!e.target.matches("[data-pic]") || !e.target.files[0]) return;
  const i = +e.target.closest(".jn-w").dataset.i; say("Preparing photo…");
  try { works[i].img = await shrink(e.target.files[0]); say(""); renderWorks(); } catch (err) { say(err.message, true); }
});
$("#jn-add").addEventListener("click", () => { if (works.length < MAX) { works.push({}); renderWorks(); worksBox.lastElementChild.querySelector("input[type=file]").click(); } });
// several photos at once: drop them on the list
worksBox.addEventListener("dragover", e => e.preventDefault());
worksBox.addEventListener("drop", async e => {
  e.preventDefault(); const fs = [...e.dataTransfer.files].filter(f => f.type.startsWith("image/")).slice(0, MAX - works.length);
  for (const f of fs) works.push({ img: await shrink(f), title: f.name.replace(/\.\w+$/, "").replace(/[_-]+/g, " ") });
  renderWorks();
});
$("#jn-logo").addEventListener("change", async e => { if (!e.target.files[0]) return; logo = await shrink(e.target.files[0], 400, 60 * 1024); $("#jn-logo-pic").innerHTML = `<img src="${logo}" alt="">`; });
$$('[name="kind"]').forEach(r => r.addEventListener("change", labels));

form.addEventListener("submit", async e => {
  e.preventDefault();
  const v = n => (form.elements[n] && form.elements[n].value || "").trim();
  const ready = works.filter(w => w.img && (w.title || "").trim());
  if (v("name").length < 2) return say("Please add your workshop or studio name.", true), form.elements.name.focus();
  if (!v("telegram") && !v("instagram") && !v("phone")) return say("Add Telegram, Instagram or a phone number so buyers can reach you.", true), form.elements.telegram.focus();
  if (!ready.length) return say("Add at least one photo with a title.", true);
  if (works.some(w => w.img && !(w.title || "").trim())) return say("Every photo needs a title.", true);
  if (!form.elements.agree.checked) return say("Please confirm the photos are yours.", true);
  const profile = { kind: kind(), name: v("name"), city: v("city"), tagline: v("tagline"), about: v("about"), telegram: v("telegram"), instagram: v("instagram"), phone: v("phone"), website: v("website"), logo, works: ready };
  const btn = $("#jn-submit"); btn.disabled = true; say("Sending… big pages take a few seconds.");
  try {
    const j = await api("", { method: "POST", body: JSON.stringify(editSlug ? { action: "update", slug: editSlug, key: editKey, profile } : { action: "submit", profile }) });
    const slug = editSlug || j.slug, key = editKey || j.key;
    try { const all = JSON.parse(localStorage.getItem("makon_maker_pages") || "{}"); all[slug] = key; localStorage.setItem("makon_maker_pages", JSON.stringify(all)); } catch (err) {}
    const edit = location.origin + location.pathname + "?m=" + encodeURIComponent(slug) + "&key=" + encodeURIComponent(key);
    const view = "maker.html?m=" + encodeURIComponent(slug) + "&key=" + encodeURIComponent(key);
    form.hidden = true; $("#jn-done").hidden = false;
    $("#jn-done").innerHTML = editSlug
      ? `<h2>Saved.</h2><p>Your changes are on your page.</p><p><a class="d-try" href="${view}">See my page ↗</a></p>`
      : `<h2>Thank you — your page is in review.</h2><p>We usually check new pages within a day. Once approved it appears on <a href="makers.html">Makers &amp; designers</a>. <span class="uz">Sahifangiz tekshiruvda, odatda bir kun ichida e’lon qilinadi.</span></p>
         <div class="jn-key"><b>Your private edit link — save it</b><small>Use it to change your page later. Anyone with this link can edit it. <span class="uz">Bu havolani saqlang — sahifani keyin tahrirlash uchun.</span></small>
         <input readonly value="${esc(edit)}" onclick="this.select()"><button type="button" class="d-try" id="jn-copy">Copy link</button></div>
         <p><a class="d-try" href="${view}">Preview my page ↗</a></p>`;
    const c = $("#jn-copy"); if (c) c.addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText(edit).then(() => { c.textContent = "Copied ✓"; }); });
    scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    say(err.status === 503 ? "Pages can't be saved just yet — Makon is finishing setup. Please write to us on Instagram @makon.build meanwhile." : err.message, true);
  } finally { btn.disabled = false; }
});

// edit mode: load the page
if (editSlug && editKey) {
  $("#jn-h").innerHTML = 'Edit your page<br><span class="ital">on Makon.</span>'; $("#jn-submit").textContent = "Save changes ↗";
  api("?m=" + encodeURIComponent(editSlug) + "&key=" + encodeURIComponent(editKey), { headers: {} }).then(({ maker: m }) => {
    ["name", "city", "tagline", "about", "telegram", "instagram", "phone", "website"].forEach(n => { form.elements[n].value = m[n] || ""; });
    form.querySelector(`[name="kind"][value="${m.kind}"]`).checked = true; form.elements.agree.checked = true;
    logo = m.logo || ""; if (logo) $("#jn-logo-pic").innerHTML = `<img src="${imgUrl(logo)}" alt="">`;
    works = m.works.map(w => Object.assign({}, w)); renderWorks();
  }).catch(err => say(err.message, true));
} else { works = [{}]; renderWorks(); }

// is the service ready?
api("").then(j => { if (j.storage === false) { const o = $("#jn-off"); o.hidden = false; o.innerHTML = "Heads-up: page saving is being switched on — if sending fails, write to us on Instagram <a href='https://ig.me/m/makon.build' target='_blank' rel='noopener'>@makon.build</a>."; } }).catch(() => {});
