// Makon Studio — Furnish mode: catalogue, placed items, fit issues, prices and shopping links
import { $, $$, el, toast, money, fmtCm } from "./util.js";
import { CATALOG, CATS, catalogItem, STYLES, SHOPS } from "./data.js";

let ctx, cat = "All", q = "";

export function init(c) {
  ctx = c;
  const cats = $("#cats");
  CATS.forEach(k => cats.append(el("button", { type: "button", "data-c": k, "aria-pressed": String(k === cat), text: k, onclick: () => { cat = k; $$("#cats button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.c === cat))); renderCatalog(); } })));
  $("#cat-search").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); renderCatalog(); });
  ["plan", "select", "project", "style"].forEach(ev => ctx.bus.on(ev, () => { if (ctx.mode === "furnish") render(); }));
  ctx.bus.on("mode", m => { if (m === "furnish") render(); });
}

function render() { if (!ctx.p) return; renderIssues(); renderSel(); renderPlaced(); renderCatalog(); }

function shopQuery(it) {
  const c = catalogItem(it.type) || {};
  const st = STYLES[ctx.p.design.style];
  const key = c.cat === "Seating" ? "Sofa" : c.cat === "Tables" ? "Tables" : c.cat === "Decor" && it.shape !== "tv" ? "Accents" : null;
  const spec = key && st ? (st.mats.find(m => m[0] === key) || [])[1] : "";
  const words = spec ? spec.split(/[ ,]+/).filter(w => !/^(and|with|&|—)$/i.test(w)).slice(0, 2).join(" ") : "";
  return [c.q || it.name, words, it.shape === "rug" || it.shape === "rrug" ? "" : Math.round(it.w * 100) + " cm"].filter(Boolean).join(" ").toLowerCase();
}
function shopRow(it) {
  const qy = shopQuery(it);
  return el("div", { class: "shops" }, el("span", { class: "muted small", text: "Shop similar · “" + qy + "”" }),
    el("div", { class: "shop-links" }, SHOPS.map(([n, f]) => el("a", { href: f(qy), target: "_blank", rel: "noopener noreferrer", text: n }))));
}

function renderIssues() {
  const box = $("#issues"), p = ctx.p.plan;
  box.innerHTML = "";
  if (!p.items.length) return;
  const iss = ctx.planOps.checkFit(p);
  let errs = 0, warns = 0;
  iss.forEach(a => a.forEach(x => x.kind === "err" ? errs++ : warns++));
  if (!errs && !warns) { box.append(el("div", { class: "fit ok", html: '<svg><use href="#i-check"/></svg><span>Everything fits — no overlaps, blocked doors or tight walkways.</span>' })); return; }
  const list = el("ul");
  iss.forEach((a, id) => {
    const it = p.items.find(i => i.id === id); if (!it) return;
    a.forEach(x => list.append(el("li", { class: x.kind }, el("button", { type: "button", onclick: () => ctx.select("item", id) }, el("b", { text: it.name }), " — " + x.text))));
  });
  box.append(el("div", { class: "fit " + (errs ? "err" : "warn") }, el("span", { html: '<svg><use href="#i-warn"/></svg>' }),
    el("div", {}, el("b", { text: (errs ? errs + " problem" + (errs > 1 ? "s" : "") : "") + (errs && warns ? " · " : "") + (warns ? warns + " warning" + (warns > 1 ? "s" : "") : "") }), list)));
}

function renderSel() {
  const box = $("#fsel-box"), s = ctx.sel;
  const it = s && s.kind === "item" && ctx.p.plan.items.find(i => i.id === s.id);
  if (!it) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false;
  ctx.planOps.itemEditor(box, it);
  box.append(shopRow(it));
}

function renderPlaced() {
  const ul = $("#placed"), p = ctx.p, items = p.plan.items, cur = p.brief.currency || "USD";
  $("#placed-count").textContent = items.length ? "(" + items.length + ")" : "";
  ul.innerHTML = "";
  if (!items.length) { ul.append(el("li", { class: "empty muted small", text: "Nothing placed yet. Add pieces from the list below — they appear in the plan and in 3D." })); $("#f-total").innerHTML = ""; return; }
  const iss = ctx.planOps.checkFit(p.plan);
  let total = 0, priced = 0;
  items.forEach(it => {
    const price = p.brief.prices[it.id];
    if (price > 0) { total += price; priced++; }
    const bad = iss.get(it.id);
    const priceIn = el("input", { class: "input price", type: "number", inputmode: "decimal", min: 0, step: "any", placeholder: "Price", value: price > 0 ? price : "", "aria-label": "Price of " + it.name });
    priceIn.addEventListener("change", () => {
      const v = parseFloat(priceIn.value);
      if (priceIn.value === "" || !(v > 0)) delete p.brief.prices[it.id]; else p.brief.prices[it.id] = Math.round(v * 100) / 100;
      ctx.save(); renderPlaced(); ctx.bus.emit("prices");
    });
    priceIn.addEventListener("click", e => e.stopPropagation());
    const sel = ctx.sel && ctx.sel.kind === "item" && ctx.sel.id === it.id;
    ul.append(el("li", { class: "pl" + (sel ? " on" : "") },
      el("button", { type: "button", class: "pl-main", onclick: () => ctx.select("item", it.id) },
        el("i", { class: "dot", style: "background:" + it.color }),
        el("span", {}, el("b", { text: it.name }), el("small", { text: fmtCm(it.w) + " × " + fmtCm(it.d) + " × " + fmtCm(it.h) })),
        bad ? el("span", { class: "flag " + (bad.some(x => x.kind === "err") ? "err" : "warn"), title: bad.map(x => x.text).join(", "), html: '<svg><use href="#i-warn"/></svg>' }) : null),
      priceIn));
  });
  $("#f-total").innerHTML = "";
  $("#f-total").append(el("span", { text: priced + " of " + items.length + " priced" }), el("b", { text: money(total, cur) }));
}

function renderCatalog() {
  const ul = $("#catalog");
  ul.innerHTML = "";
  const list = CATALOG.filter(c => (cat === "All" || c.cat === cat) && (!q || (c.name + " " + c.cat + " " + c.q).toLowerCase().includes(q)));
  if (!list.length) { ul.append(el("li", { class: "empty muted small", text: "No furniture matches “" + q + "”." })); return; }
  list.forEach(c => ul.append(el("li", {},
    el("span", { class: "ci-ic", style: "--c:" + c.color }),
    el("span", { class: "ci-t" }, el("b", { text: c.name }), el("small", { text: Math.round(c.w * 100) + " × " + Math.round(c.d * 100) + (c.h > 0.05 ? " × " + Math.round(c.h * 100) : "") + " cm · " + c.cat })),
    el("button", { class: "icon-btn add", type: "button", "aria-label": "Add " + c.name, title: "Add to room", html: '<svg><use href="#i-plus"/></svg>', onclick: () => add(c.id) }))));
}

function add(id) {
  const it = ctx.planOps.addItem(id);
  if (!it) return;
  const fit = ctx.planOps.checkFit(ctx.p.plan).get(it.id);
  toast(it.name + " added" + (fit ? " — " + fit[0].text.toLowerCase() + ", drag it into place." : ". Drag it into place."));
  if (window.matchMedia("(max-width: 900px)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
}
