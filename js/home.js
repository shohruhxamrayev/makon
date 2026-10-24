// Makon — home page: header, the live 3D story, before/after, language refresh
import { start } from "./home3d.js";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const I = window.MakonI18n || { T: x => x, set: (el, k) => { if (el) el.innerHTML = k; } };

// ---------- signed-in aware header ----------
const me = window.MakonAuth && MakonAuth.current();
$$("[data-auth-link]").forEach(a => { a.href = "studio.html"; });
if (me) {
  $$(".signin-link").forEach(a => { a.style.display = "none"; });
  const chip = $("#me-chip"); if (chip) { chip.hidden = false; $("#me-av").textContent = (me.name || "?").trim().charAt(0).toUpperCase(); chip.title = me.name || ""; }
  $$(".cta-txt").forEach(el => { if (/Start designing/.test(el.dataset.i18nSrc || el.textContent)) I.set(el, "Open Studio"); });
}
const ANN = "makon_ann_closed_v1"; let closed = false; try { closed = localStorage.getItem(ANN) === "1"; } catch (e) {}
const ann = $("#announce"); if (ann && !closed) { ann.hidden = false; document.body.classList.add("has-announce"); }
$("#announce-x") && $("#announce-x").addEventListener("click", () => { ann.hidden = true; document.body.classList.remove("has-announce"); try { localStorage.setItem(ANN, "1"); } catch (e) {} });
const mnav = $("#mnav"), mt = $("#menu-toggle");
const menu = open => { if (open) { mnav.hidden = false; requestAnimationFrame(() => document.body.classList.add("menu-open")); } else { document.body.classList.remove("menu-open"); setTimeout(() => { if (!document.body.classList.contains("menu-open")) mnav.hidden = true; }, 300); } mt.setAttribute("aria-expanded", String(open)); };
mt && mt.addEventListener("click", () => menu(!document.body.classList.contains("menu-open")));
mnav && mnav.addEventListener("click", e => { if (e.target.closest("a")) menu(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) menu(false); });
addEventListener("scroll", () => document.body.classList.toggle("scrolled", scrollY > 30), { passive: true });

// ---------- live 3D story ----------
const steps = $$(".story-steps .step"), dots = $$(".story-dots i");
const STOPS = [0, 0.14, 0.34, 0.5, 0.78];
let cur = 0;
function onStep(p) {
  let k = 0; STOPS.forEach((s, i) => { if (p >= s) k = i; });
  if (k !== cur) { cur = k; steps.forEach((s, i) => s.classList.toggle("on", i === k)); dots.forEach((d, i) => d.classList.toggle("on", i === k)); }
  document.body.classList.toggle("story-past", p >= 0.999);
  $("#story-hint").style.opacity = p > 0.06 ? "0" : "";
}
let room = null;
try { room = start({ canvas: $("#h3d"), story: $("#story"), labels: $("#h3d-labels"), onStep }); } catch (e) { console.warn(e); }
if (!room) { $("#h3d").hidden = true; $("#h3d-fallback").hidden = false; }
requestAnimationFrame(() => document.body.classList.add("intro-done"));
$$(".room-chips [data-room]").forEach(b => b.addEventListener("click", () => {
  $$(".room-chips [data-room]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  room && room.setRoom(b.dataset.room);
}));
const eve = $("#eve-btn");
eve.addEventListener("click", () => { const on = eve.getAttribute("aria-pressed") !== "true"; eve.setAttribute("aria-pressed", String(on)); I.set(eve, on ? "☀ Day" : "☾ Evening"); room && room.setEvening(on); });

// ---------- before / after ----------
const ba = $("#ba"), range = $("#ba-range");
const setX = v => ba.style.setProperty("--x", v + "%");
range.addEventListener("input", () => setX(range.value));
// a gentle hint the first time it comes into view
new IntersectionObserver((es, o) => { if (!es[0].isIntersecting) return; o.disconnect(); let t0 = null; const go = t => { t0 = t0 || t; const k = Math.min(1, (t - t0) / 1800); const v = 50 + Math.sin(k * Math.PI * 2) * 22 * (1 - k); setX(v); range.value = v; if (k < 1) requestAnimationFrame(go); }; requestAnimationFrame(go); }, { threshold: 0.5 }).observe(ba);

// the template showreel only moves while it's on screen
const reel = $(".reel-track");
if (reel && "IntersectionObserver" in window) new IntersectionObserver(es => reel.classList.toggle("on", es[0].isIntersecting), { threshold: 0 }).observe(reel);

// ---------- films: play silently while on screen; tap for sound (one at a time) ----------
const films = $$(".ig-card video");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { const p = v.play(); if (p) p.catch(() => {}); } else { v.pause(); }
  }), { threshold: 0.35 });
  films.forEach(v => io.observe(v));
}
function sound(v, on) {
  films.forEach(o => { if (o !== v) { o.muted = true; o.parentElement.querySelector(".ig-snd").setAttribute("aria-pressed", "false"); } });
  v.muted = !on; const b = v.parentElement.querySelector(".ig-snd");
  b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "Turn sound off" : "Turn sound on");
  if (on) { v.currentTime = 0; const p = v.play(); if (p) p.catch(() => {}); }
}
films.forEach(v => {
  const b = v.parentElement.querySelector(".ig-snd");
  const toggle = () => sound(v, v.muted);
  b.addEventListener("click", toggle); v.addEventListener("click", toggle);
});
