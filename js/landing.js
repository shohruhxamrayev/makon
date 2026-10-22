/* Makon — scroll-driven room story */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- auth-aware links ----------
  const signedIn = !!(window.MakonAuth && MakonAuth.current());
  $$("[data-auth-link]").forEach(a => { a.href = signedIn ? "studio.html" : "signin.html?next=studio.html"; });

  // ---------- toast ----------
  let tt;
  function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 2600); }

  // ---------- loader ----------
  const hideLoader = () => $("#loader").classList.add("done");
  const first = $("#img-before");
  if (first.complete) setTimeout(hideLoader, 400); else { first.addEventListener("load", () => setTimeout(hideLoader, 250)); first.addEventListener("error", hideLoader); }
  setTimeout(hideLoader, 2500);

  const chapters = $$(".chapter");
  const card = $("#spot-card"), spots = $$(".spot"), layer = $("#ov-build");
  const before = $("#img-before"), after = $("#img-after"), shade = $("#shade"), divider = $("#divider");
  const ov = { understand: $("#ov-understand"), refine: $("#ov-refine"), plan: $("#ov-plan"), build: $("#ov-build") };
  const railBtns = $$("#rail button");
  const range = $("#cb-range"), knob = $("#cb-knob");
  const afterSec = $("#after");

  // prepare "draw-on" lines
  $$(".draw > *").forEach(el => {
    if (el.classList.contains("dash") || el.classList.contains("ray")) return;
    let L = 1000;
    try { L = el.getTotalLength(); } catch (e) { /* not rendered yet */ }
    el.style.strokeDasharray = L; el.style.strokeDashoffset = L; el.dataset.len = L;
  });
  function drawLines(svg, p) {
    $$(".draw > *", svg).forEach(el => {
      if (el.dataset.len) el.style.strokeDashoffset = el.dataset.len * (1 - p);
      else el.style.opacity = p;
    });
  }

  // ---------- compare ----------
  let userDragged = false;
  function setCompare(v) {
    const c = Math.max(0, Math.min(100, v));
    after.style.clipPath = "inset(0 " + (100 - c) + "% 0 0)";
    divider.style.left = c + "%";
    knob.style.left = c + "%";
    range.value = c;
  }
  range.addEventListener("input", () => { userDragged = true; setCompare(+range.value); });

  // ---------- main scroll loop ----------
  let active = -1, past = false;
  function update() {
    const vh = window.innerHeight, mid = window.scrollY + vh * 0.5;
    const isPast = afterSec.offsetTop - window.scrollY < vh * 0.55;
    if (isPast !== past) {
      past = isPast;
      document.body.classList.toggle("past", past);
      if (past) { $$(".panel").forEach(el => el.classList.remove("on")); hideCard(); active = -1; }
    }
    if (past) return;

    let i = 0;
    chapters.forEach((c, k) => { if (c.offsetTop <= mid) i = k; });
    const c = chapters[i];
    const p = Math.max(0, Math.min(1, (mid - c.offsetTop) / c.offsetHeight));

    if (i !== active) {
      active = i;
      $$(".panel").forEach(el => el.classList.toggle("on", chapters[i].contains(el)));
      railBtns.forEach((b, k) => { b.classList.toggle("on", k === i); b.setAttribute("aria-current", k === i ? "step" : "false"); });
      $("#c-num").textContent = String(i + 1).padStart(2, "0");
      $("#c-name").textContent = c.dataset.name;
      ov.understand.classList.toggle("on", i === 1);
      ov.refine.classList.toggle("on", i === 3);
      ov.plan.classList.toggle("on", i === 4);
      ov.build.classList.toggle("on", i === 5);
      divider.style.opacity = i === 2 ? 1 : 0;
      if (i !== 5) hideCard();
      if (i !== 3) $$(".tagpin.open").forEach(t => t.classList.remove("open"));
      if (i < 2) userDragged = false;
    }

    // per-chapter look
    if (i <= 1) {
      setCompare(0);
      before.style.filter = i === 1 ? "brightness(.82)" : "none";
      before.style.transform = "scale(" + (1.04 - 0.04 * (i === 0 ? p : 1)) + ")";
      shade.style.background = i === 1 ? "rgba(10,12,11,.18)" : "transparent";
      if (i === 1) {
        drawLines(ov.understand, Math.min(1, p * 2.2));
        $(".notes", ov.understand).style.opacity = Math.max(0, Math.min(1, (p - 0.3) * 4));
      }
    } else if (i === 2) {
      before.style.filter = "none"; before.style.transform = "scale(1)";
      shade.style.background = "transparent"; after.style.filter = "none";
      if (!userDragged) setCompare(Math.min(82, Math.max(0, (p - 0.08) * 190)));
    } else {
      setCompare(100);
      before.style.transform = "scale(1)";
      if (i === 3) { after.style.filter = "none"; shade.style.background = "rgba(10,12,11,.08)"; }
      if (i === 4) {
        after.style.filter = "grayscale(.55) brightness(.42)";
        shade.style.background = "rgba(10,12,11,.35)";
        drawLines(ov.plan, Math.min(1, p * 2.4));
        ov.plan.style.opacity = p > 0.55 ? 0.25 : "";
      }
      if (i === 5) { after.style.filter = "brightness(1.04) saturate(1.05)"; shade.style.background = "transparent"; }
    }
  }
  let ticking = false;
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); } }, { passive: true });
  window.addEventListener("resize", () => { active = -1; update(); });
  update();

  // ---------- navigation ----------
  function goTo(k) {
    const c = chapters[k];
    window.scrollTo({ top: c.offsetTop + (k === 0 ? 0 : window.innerHeight * 0.05), behavior: "smooth" });
  }
  railBtns.forEach(b => b.addEventListener("click", () => goTo(+b.dataset.go)));
  $$("[data-scroll]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); goTo(+a.dataset.scroll); }));
  document.addEventListener("keydown", e => {
    if (past || e.target.matches("input, textarea, select, summary")) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") { if (active >= 0 && active < 5) { e.preventDefault(); goTo(active + 1); } }
    if (e.key === "ArrowUp" || e.key === "PageUp") { if (active > 0) { e.preventDefault(); goTo(active - 1); } }
  });

  // ---------- refine tags ----------
  $$(".tagpin").forEach(t => t.addEventListener("click", e => {
    e.stopPropagation();
    const open = t.classList.contains("open");
    $$(".tagpin").forEach(x => x.classList.remove("open"));
    if (!open) t.classList.add("open");
  }));
  document.addEventListener("click", () => { $$(".tagpin.open").forEach(x => x.classList.remove("open")); hideCard(); });

  // ---------- plan: set a known length ----------
  const form = $("#scale-form");
  $("#scale-btn").addEventListener("click", () => { form.classList.toggle("open"); if (form.classList.contains("open")) $("#win-len").focus({ preventScroll: true }); });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const w = parseFloat($("#win-len").value);
    if (!(w > 0) || w > 20) { toast("Enter a window width in metres, e.g. 1.40"); return; }
    const k = w / 140;                       // window line is 140 plan units long
    const f = n => (n * k).toFixed(2) + " m";
    $("#dim-w").textContent = f(480);
    $("#dim-d").textContent = f(270);
    $("#dim-win").textContent = f(140);
    $("#plan-panel").classList.add("scaled");
    $("#plan-sub").textContent = "Walls, openings and objects · true to scale";
    $("#scale-btn").textContent = "Scale set · room " + f(480) + " × " + f(270) + " · " + (480 * k * 270 * k).toFixed(1) + " m²";
    form.classList.remove("open");
    if (document.activeElement) document.activeElement.blur();
    toast("Plan calibrated — every wall now has a real length.");
  });

  // ---------- build hotspots ----------
  const MATS = [
    ["01 · Wall finish", "Warm limewash", "Breathable mineral paint with a soft, clouded finish. Catches the north-west light."],
    ["02 · Table surface", "Natural oak", "Oiled, lighter European oak in an organic low form."],
    ["03 · Retained", "Existing sideboard", "Kept as it is — the room is designed around it."]
  ];
  function showCard(i) {
    const s = spots[i], lr = layer.getBoundingClientRect(), sr = s.getBoundingClientRect();
    card.innerHTML = '<span class="label">' + MATS[i][0] + "</span><strong>" + MATS[i][1] + "</strong><span>" + MATS[i][2] + "</span>";
    const cw = Math.min(230, window.innerWidth - 32);
    card.style.width = cw + "px";
    // position in viewport space, then convert to layer space (layer is larger than viewport on narrow screens)
    let vx = sr.right + 10, vy = sr.top - 10;
    if (vx + cw > window.innerWidth - 12) vx = sr.left - cw - 10;
    if (vx < 12) vx = Math.max(12, Math.min(window.innerWidth - cw - 12, sr.left + sr.width / 2 - cw / 2));
    if (vy + 170 > window.innerHeight - 12) vy = sr.top - 160;
    if (vy < 70) vy = sr.bottom + 10;
    card.style.left = (vx - lr.left) + "px"; card.style.top = (vy - lr.top) + "px";
    card.classList.add("show");
    spots.forEach((x, j) => x.classList.toggle("open", j === i));
  }
  function hideCard() { card.classList.remove("show"); spots.forEach(x => x.classList.remove("open")); }
  // ---------- mobile: pan the cropped photo to a hotspot ----------
  const frame = $("#frame");
  const tagpins = $$(".tagpin");
  function panTo(pct) {
    const fw = frame.offsetWidth, max = Math.max(0, (fw - window.innerWidth) / 2);
    const px = Math.max(-max, Math.min(max, (0.5 - pct) * fw));
    frame.style.setProperty("--px", px.toFixed(1) + "px");
    return Math.abs(px) > 1;
  }
  function resetPan() { frame.style.setProperty("--px", "0px"); }
  $$("[data-pin]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    const i = +b.dataset.i, isSpot = b.dataset.pin === "spot";
    const el = isSpot ? spots[i] : tagpins[i];
    const moved = panTo(parseFloat(el.style.left) / 100);
    $$("[data-pin]").forEach(x => x.classList.toggle("on", x === b));
    setTimeout(() => {
      if (isSpot) showCard(i);
      else { tagpins.forEach(x => x.classList.remove("open")); el.classList.add("open"); }
    }, moved ? 820 : 0);
  }));
  const _update = update;
  update = function () { const was = active; _update(); if (active !== was) { resetPan(); $$("[data-pin]").forEach(x => x.classList.remove("on")); } };

  const hoverable = window.matchMedia("(hover: hover)").matches;
  spots.forEach((s, i) => {
    if (hoverable) { s.addEventListener("mouseenter", () => showCard(i)); s.addEventListener("mouseleave", hideCard); }
    s.addEventListener("focus", () => showCard(i));
    s.addEventListener("click", e => { e.stopPropagation(); s.classList.contains("open") && !hoverable ? hideCard() : showCard(i); });
    s.addEventListener("blur", hideCard);
  });
})();
