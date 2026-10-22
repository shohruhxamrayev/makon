// Makon Studio — Build mode: brief document, quantities, budget, exports
import { $, el, esc, toast, debounce, download, money, fmtLen, fmtArea, fmtCm } from "./util.js";
import { STYLES, FLOORS, CURRENCIES, keepName, roomName, LIGHT_NAMES } from "./data.js";
import { loops, polyArea, dist, wlen } from "./geom.js";
import { planSnapshot } from "./plan.js";

let ctx;
const B = () => ctx.p.brief;

export function init(c) {
  ctx = c;
  const cur = $("#b-cur");
  CURRENCIES.forEach(k => cur.append(el("option", { value: k, text: k })));
  const later = debounce(() => { if (ctx.mode === "build") renderDoc(); }, 250);
  const bind = (id, key, num) => $(id).addEventListener("input", e => {
    let v = e.target.value;
    if (num) { v = v === "" ? "" : parseFloat(v); if (v !== "" && !isFinite(v)) return; }
    B()[key] = v; ctx.save(); later(); renderProgress();
  });
  bind("#b-loc", "location"); bind("#b-budget", "budget", true); bind("#b-time", "timing"); bind("#b-notes", "notes");
  cur.addEventListener("change", () => { B().currency = cur.value; ctx.save(); renderDoc(); });
  const q = (id, key, min, max) => $(id).addEventListener("change", e => {
    const v = parseFloat(e.target.value);
    if (!(v >= min && v <= max)) { toast("Enter a value between " + min + " and " + max + ".", "error"); e.target.value = B()[key]; return; }
    B()[key] = v; ctx.save(); renderDoc();
  });
  q("#q-coats", "coats", 1, 5); q("#q-cov", "coverage", 4, 20); q("#q-waste", "waste", 0, 30);
  $("#x-print").addEventListener("click", () => { renderDoc(); setTimeout(() => window.print(), 60); });
  $("#x-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(briefText()); toast("Brief copied to clipboard."); }
    catch (e) { toast("Copying isn't allowed here — use Download .txt instead.", "error"); }
  });
  $("#x-txt").addEventListener("click", () => { download(slug() + "-brief.txt", new Blob([briefText()], { type: "text/plain;charset=utf-8" })); toast("Brief downloaded."); });
  $("#x-json").addEventListener("click", () => ctx.exportProject());
  window.addEventListener("beforeprint", () => { if (ctx.p) renderDoc(); });

  ctx.bus.on("mode", m => { if (m === "build") { fill(); renderDoc(); } });
  ["project", "plan", "prices", "style"].forEach(ev => ctx.bus.on(ev, () => { if (ctx.mode === "build") { fill(); renderDoc(); } }));
}
const slug = () => (ctx.p.name || "room").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "room";

function fill() {
  const b = B();
  const set = (id, v) => { const e = $(id); if (document.activeElement !== e) e.value = v ?? ""; };
  set("#b-loc", b.location); set("#b-budget", b.budget); set("#b-time", b.timing); set("#b-notes", b.notes);
  $("#b-cur").value = b.currency || "USD";
  set("#q-coats", b.coats); set("#q-cov", b.coverage); set("#q-waste", b.waste);
  renderProgress();
}

// ---------- numbers ----------
function data() {
  const p = ctx.p, pl = p.plan, b = p.brief, u = p.units;
  const lp = loops(pl.walls);
  const floor = lp.reduce((s, l) => s + polyArea(l), 0);
  const perim = lp.reduce((s, l) => s + l.reduce((a, q, i) => a + dist(q, l[(i + 1) % l.length]), 0), 0);
  const wallLen = pl.walls.reduce((s, w) => s + wlen(w), 0);
  const openArea = pl.openings.reduce((s, o) => s + o.w * Math.min(o.h, pl.height - (o.sill || 0)), 0);
  const gross = wallLen * pl.height, net = Math.max(0, gross - openArea);
  const doorW = pl.openings.filter(o => o.type !== "window").reduce((s, o) => s + o.w, 0);
  const coats = b.coats || 2, cov = b.coverage || 10, waste = (b.waste ?? 10) / 100;
  const half = v => Math.ceil(v * 2) / 2;
  const v = p.design.versions.find(x => x.id === p.design.current);
  const items = pl.items.map(it => ({ it, price: b.prices[it.id] > 0 ? b.prices[it.id] : null }));
  const spend = items.reduce((s, x) => s + (x.price || 0), 0);
  const budget = parseFloat(b.budget) > 0 ? parseFloat(b.budget) : 0;
  const st = STYLES[p.design.style] || STYLES.warm;
  return {
    p, pl, b, u, st, v, items, spend, budget, closed: lp.length > 0, floor, perim, wallLen, gross, net, openArea,
    paint: half(net * coats / cov), ceilPaint: half(floor * coats / cov), flooring: floor * (1 + waste), skirting: Math.max(0, perim - doorW),
    floorName: (FLOORS[p.finish.floor || st.floor] || {}).name || "—", wallHex: p.finish.wall || st.wall
  };
}

function checklist(d) {
  const p = d.p;
  return [
    ["Room photograph", !!p.photo, p.photo ? (p.sample ? "Sample room" : "Uploaded") : "Not added", "design"],
    ["Redesign", !!d.v, d.v ? (d.st.name + " · " + d.v.label) : "None generated", "design"],
    ["Plan", d.pl.walls.length > 0, d.pl.walls.length ? d.pl.walls.length + " walls · " + d.pl.openings.length + " openings" + (d.closed ? "" : " · not closed") : "Not drawn", "plan"],
    ["Scale", d.pl.calibrated, d.pl.calibrated ? "Calibrated from a measured wall" : "Not calibrated — measurements are estimates", "plan"],
    ["Furniture", d.items.length > 0, d.items.length ? d.items.length + " pieces planned" : "None placed", "furnish"],
    ["Location", !!d.b.location.trim(), d.b.location.trim() || "Not stated", null],
    ["Budget", d.budget > 0, d.budget > 0 ? money(d.budget, d.b.currency) : "Not stated", null],
    ["Timing", !!d.b.timing.trim(), d.b.timing.trim() || "Not stated", null],
    ["Notes", !!d.b.notes.trim(), d.b.notes.trim() ? "Added" : "None", null]
  ];
}
function renderProgress() {
  if (!ctx.p) return;
  const d = data(), cl = checklist(d), n = cl.filter(x => x[1]).length;
  $("#brief-progress").innerHTML = `<div class="pbar"><i style="width:${Math.round(n / cl.length * 100)}%"></i></div><span>${n} of ${cl.length} complete</span>`;
}

// ---------- document ----------
function renderDoc() {
  if (!ctx.p) return;
  const d = data(), u = d.u, cur = d.b.currency || "USD";
  const est = d.pl.calibrated ? "" : ' <em class="est">estimate</em>';
  const cl = checklist(d);
  const date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
  const over = d.budget > 0 && d.spend > d.budget;
  const pct = d.budget > 0 ? Math.min(100, d.spend / d.budget * 100) : 0;

  let h = `<header class="doc-head"><span class="eyebrow">Build · project brief</span><h1>${esc(d.p.name)}</h1>
    <p class="doc-meta">${esc(roomName(d.p.roomType))} · ${esc(d.st.name)} · ${esc(date)} · prepared for ${esc(ctx.user.name || "you")}</p></header>`;

  h += `<section><h2>Checklist <small>${cl.filter(x => x[1]).length} of ${cl.length}</small></h2><ul class="doc-check">` +
    cl.map(([n, ok, t, m]) => `<li class="${ok ? "ok" : ""}"><span class="tick">${ok ? "✓" : ""}</span><b>${n}</b><span>${esc(t)}</span>${!ok && m ? `<button type="button" class="link-btn no-print" data-go="${m}">Add in ${m === "furnish" ? "Furnish" : m[0].toUpperCase() + m.slice(1)} →</button>` : ""}</li>`).join("") + `</ul></section>`;

  if (d.p.photo) {
    h += `<section><h2>Before and after</h2><div class="doc-imgs"><figure><img src="${esc(d.p.photo)}" alt="Before"><figcaption>Before</figcaption></figure>` +
      (d.v ? `<figure><img src="${esc(d.v.img)}" alt="After"><figcaption>After · ${esc(d.v.label)}</figcaption></figure>` : `<figure class="ph"><span>No redesign yet</span></figure>`) + `</div></section>`;
  }

  const keep = d.p.design.keep.map(keepName);
  h += `<section><h2>Design direction</h2><div class="doc-two"><div><p class="lead">${esc(d.st.name)} — ${esc(d.st.note)}.</p>
    <p>Daylight from the ${esc(LIGHT_NAMES[d.p.design.light] || "")}. ${keep.length ? "Keep exactly as is: " + esc(keep.join(", ").toLowerCase()) + "." : "Nothing locked."}</p>
    ${d.p.design.notes ? `<p>Client notes: ${esc(d.p.design.notes)}</p>` : ""}</div>
    <div class="doc-pal">${(d.v && d.v.palette ? d.v.palette.map(x => x.hex) : d.st.palette).map(c => `<span style="background:${c}"><i>${c}</i></span>`).join("")}</div></div>
    <table class="doc-t"><thead><tr><th>Element</th><th>Specification</th></tr></thead><tbody>` +
    d.st.mats.map(m => row(esc(m[0]), esc(m[1]))).join("") +
    row("Wall colour (3D)", `<span class="chipc" style="background:${esc(d.wallHex)}"></span>${esc(d.wallHex)}`) + row("Floor finish (3D)", esc(d.floorName)) + `</tbody></table></section>`;

  const svg = planSnapshot();
  h += `<section><h2>Plan${est}</h2>` + (svg ? `<div class="doc-plan">${svg}</div>` : `<p class="muted">No plan yet — draw it in Plan.</p>`);
  if (d.pl.walls.length) {
    h += `<div class="doc-two"><table class="doc-t"><tbody>` +
      row("Floor area", d.closed ? fmtArea(d.floor, u) : "Close the walls to measure") + row("Perimeter", d.closed ? fmtLen(d.perim, u) : "—") +
      row("Ceiling height", fmtLen(d.pl.height, u)) + row("Wall area (net of openings)", fmtArea(d.net, u)) + `</tbody></table>
      <table class="doc-t"><thead><tr><th>Wall</th><th>Length</th><th>Openings</th></tr></thead><tbody>` +
      d.pl.walls.map((w, i) => `<tr><td>${i + 1}</td><td>${fmtLen(wlen(w), u)}</td><td>${d.pl.openings.filter(o => o.wall === w.id).map(o => (o.type === "window" ? "Window " : o.type === "door" ? "Door " : "Opening ") + fmtCm(o.w) + " × " + fmtCm(o.h)).join(", ") || "—"}</td></tr>`).join("") + `</tbody></table></div>`;
  }
  h += `</section>`;

  if (d.pl.walls.length) {
    h += `<section><h2>Quantities${est}</h2><table class="doc-t"><thead><tr><th>Item</th><th>Quantity</th><th>Basis</th></tr></thead><tbody>` +
      `<tr><td>Wall paint</td><td><b>${d.paint.toFixed(1)} L</b></td><td>${fmtArea(d.net, u)} × ${d.b.coats} coats ÷ ${d.b.coverage} m²/L</td></tr>` +
      (d.closed ? `<tr><td>Ceiling paint</td><td><b>${d.ceilPaint.toFixed(1)} L</b></td><td>${fmtArea(d.floor, u)} × ${d.b.coats} coats ÷ ${d.b.coverage} m²/L</td></tr>
       <tr><td>Flooring (${esc(d.floorName)})</td><td><b>${fmtArea(d.flooring, u)}</b></td><td>${fmtArea(d.floor, u)} + ${d.b.waste}% cutting waste</td></tr>
       <tr><td>Skirting board</td><td><b>${fmtLen(d.skirting, u)}</b></td><td>Perimeter less door openings</td></tr>` : `<tr><td colspan="3" class="muted">Close the room's walls to get floor, ceiling and skirting quantities.</td></tr>`) +
      `</tbody></table><p class="small muted">Buy about 10% extra paint for touch-ups. Confirm quantities on site before ordering.</p></section>`;
  }

  h += `<section><h2>Furniture schedule</h2>` + (d.items.length ? `<table class="doc-t"><thead><tr><th>Item</th><th>Size (W×D×H)</th><th>Colour</th><th class="r">Price</th></tr></thead><tbody>` +
    d.items.map(({ it, price }) => `<tr><td>${esc(it.name)}</td><td>${fmtCm(it.w)} × ${fmtCm(it.d)} × ${fmtCm(it.h)}</td><td><span class="chipc" style="background:${esc(it.color)}"></span>${esc(it.color)}</td><td class="r">${price ? money(price, cur) : '<span class="muted">—</span>'}</td></tr>`).join("") +
    `</tbody><tfoot><tr><td colspan="3">Total (${d.items.filter(x => x.price).length} of ${d.items.length} priced)</td><td class="r">${money(d.spend, cur)}</td></tr></tfoot></table>` : `<p class="muted">Nothing placed yet — add pieces in Furnish.</p>`) + `</section>`;

  h += `<section><h2>Budget</h2>` + (d.budget > 0
    ? `<div class="doc-budget ${over ? "over" : ""}"><div class="bb"><i style="width:${pct}%"></i></div><p><b>${money(d.spend, cur)}</b> of <b>${money(d.budget, cur)}</b> planned on furniture · ${over ? `<span class="bad">${money(d.spend - d.budget, cur)} over budget</span>` : money(d.budget - d.spend, cur) + " left for finishes and labour"}</p></div>`
    : `<p class="muted">No budget set. Add one on the right to track spending.</p>`) + `</section>`;

  h += `<section><h2>Project details</h2><table class="doc-t"><tbody>` + row("Location", esc(d.b.location || "—")) + row("Timing", esc(d.b.timing || "—")) + `</tbody></table>` +
    (d.b.notes ? `<p class="doc-notes">${esc(d.b.notes).replace(/\n/g, "<br>")}</p>` : "") + `</section>`;

  h += `<section><h2>Next steps</h2><ol class="doc-steps"><li>${d.pl.calibrated ? "Re-check two or three key measurements on site." : "Measure one wall and calibrate the plan so every length is real."}</li>
    <li>Get quotes for paint, flooring and labour using the quantities above.</li><li>Order long-lead furniture first; confirm it fits through the door.</li><li>Schedule work around the elements marked “keep”.</li></ol></section>
    <footer class="doc-foot">Made with Makon · ${d.pl.calibrated ? "plan calibrated to scale" : "lengths are estimates until calibrated"} · prices are entered by you</footer>`;

  const doc = $("#doc");
  doc.innerHTML = h;
  doc.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => ctx.setMode(b.dataset.go)));
  renderProgress();
}

function briefText() {
  const d = data(), u = d.u, cur = d.b.currency || "USD", L = [];
  const line = s => L.push(s);
  line("MAKON — PROJECT BRIEF"); line(new Date().toLocaleDateString()); line("");
  line(d.p.name + " (" + roomName(d.p.roomType) + ")"); line("Direction: " + d.st.name + " — " + d.st.note);
  line("Daylight from the " + (LIGHT_NAMES[d.p.design.light] || "")); line("Keep: " + (d.p.design.keep.map(keepName).join(", ") || "nothing locked"));
  if (d.p.design.notes) line("Client notes: " + d.p.design.notes);
  line(""); line("MATERIALS"); d.st.mats.forEach(m => line("- " + m[0] + ": " + m[1]));
  line("- Wall colour: " + d.wallHex); line("- Floor: " + d.floorName);
  line(""); line("MEASUREMENTS" + (d.pl.calibrated ? "" : " (estimates — not calibrated)"));
  if (d.closed) { line("- Floor area: " + fmtArea(d.floor, u)); line("- Perimeter: " + fmtLen(d.perim, u)); }
  line("- Ceiling height: " + fmtLen(d.pl.height, u)); line("- Net wall area: " + fmtArea(d.net, u));
  d.pl.walls.forEach((w, i) => line("- Wall " + (i + 1) + ": " + fmtLen(wlen(w), u)));
  if (d.pl.walls.length) {
    line(""); line("QUANTITIES"); line("- Wall paint: " + d.paint.toFixed(1) + " L (" + d.b.coats + " coats)");
    if (d.closed) { line("- Ceiling paint: " + d.ceilPaint.toFixed(1) + " L"); line("- Flooring: " + fmtArea(d.flooring, u) + " incl. " + d.b.waste + "% waste"); line("- Skirting: " + fmtLen(d.skirting, u)); }
  }
  line(""); line("FURNITURE");
  if (!d.items.length) line("- None placed");
  d.items.forEach(({ it, price }) => line("- " + it.name + " — " + fmtCm(it.w) + " × " + fmtCm(it.d) + " × " + fmtCm(it.h) + (price ? " — " + money(price, cur) : "")));
  line("Total: " + money(d.spend, cur) + (d.budget ? " of " + money(d.budget, cur) + " budget" : ""));
  line(""); line("Location: " + (d.b.location || "—")); line("Timing: " + (d.b.timing || "—"));
  if (d.b.notes) { line(""); line("NOTES"); line(d.b.notes); }
  return L.join("\n");
}
