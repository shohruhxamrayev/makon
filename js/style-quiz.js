// Makon — style finder: six "which room do you like more?" choices → your interior style
import { STYLES, CATALOG, furnPic } from "./studio/data.js";
import { $, esc, initHeader } from "./gallery-common.js";

initHeader();
const T = "img/templates/sm/", S = "img/signature/sm/", U = id => "https://images.unsplash.com/photo-" + id + "?w=900&q=78&auto=format&fit=crop";
// every picture is a real Makon room (or a real photo) with a known style
const PICS = [
  { src: T + "warm-living.jpg", s: "warm" }, { src: T + "nordic-bedroom.jpg", s: "nordic" }, { src: T + "japandi-studio.jpg", s: "japandi" },
  { src: T + "sage-kids.jpg", s: "sage" }, { src: T + "midnight-lounge.jpg", s: "midnight" }, { src: T + "industrial-office.jpg", s: "industrial" },
  { src: T + "mediterranean-bath.jpg", s: "mediterranean" }, { src: T + "midcentury-dining.jpg", s: "midcentury" }, { src: T + "minimal-kitchen.jpg", s: "minimal" },
  { src: T + "noir-bedroom.jpg", s: "noir" }, { src: T + "obsidian-lounge.jpg", s: "noir" }, { src: S + "concrete-oak-house-1.jpg", s: "stone" },
  { src: S + "ivory-residence-1.jpg", s: "ivory" }, { src: U("1616594039964-ae9021a400a0"), s: "luxe" }, { src: U("1771372125074-5c7c4332095f"), s: "contemporary" },
];
const GROUP = { warm: "light", nordic: "light", japandi: "light", minimal: "light", ivory: "light", stone: "light", noir: "dark", midnight: "dark", luxe: "dark", industrial: "dark", sage: "colour", midcentury: "colour", mediterranean: "colour", contemporary: "colour" };
const TPL = { warm: "warm-living", nordic: "nordic-bedroom", japandi: "japandi-studio", sage: "sage-kids", midnight: "midnight-lounge", industrial: "industrial-office", mediterranean: "mediterranean-bath", midcentury: "midcentury-dining", minimal: "minimal-kitchen", noir: "noir-bedroom", luxe: "noir-bedroom", stone: "warm-living", ivory: "warm-living", contemporary: "minimal-kitchen" };
const PIECES = { light: ["sofa3", "coffee", "floorlamp", "plant", "rug", "vases"], dark: ["chesterfield", "marblecoffee", "chandelier", "tubchair", "brassvase", "sconce"], colour: ["lounge", "rdining", "pendant", "accent", "monstera", "bluevase"] };
const ROUNDS = 6;
const box = $("#qz");
let round = 0, score = {}, used = new Set();
const rnd = a => a[Math.floor(Math.random() * a.length)];

function pair() {
  // two rooms from different families that haven't been shown yet
  const left = PICS.filter(p => !used.has(p.src));
  const a = rnd(left), b = rnd(left.filter(p => p !== a && GROUP[p.s] !== GROUP[a.s])) || rnd(left.filter(p => p !== a));
  used.add(a.src); used.add(b.src); return [a, b];
}
function ask() {
  if (round >= ROUNDS) return result();
  const [a, b] = pair();
  box.innerHTML = `
    <h1 class="qz-h">Which room feels more like <span class="ital">you?</span></h1>
    <div class="qz-prog" aria-label="Question ${round + 1} of ${ROUNDS}">${Array.from({ length: ROUNDS }, (_, i) => `<i class="${i < round ? "done" : i === round ? "now" : ""}"></i>`).join("")}</div>
    <div class="qz-pair">${[a, b].map((p, i) => `<button type="button" class="qz-opt" data-i="${i}"><img src="${p.src}" alt="Room ${i ? "B" : "A"}" decoding="async"><span>${i ? "B" : "A"}</span></button>`).join("")}</div>
    <p class="qz-skip"><button type="button" id="qz-skip">Neither — show me others</button></p>`;
  box.querySelectorAll(".qz-opt").forEach(btn => btn.addEventListener("click", () => {
    const p = [a, b][+btn.dataset.i], g = GROUP[p.s];
    score[p.s] = (score[p.s] || 0) + 3;
    Object.keys(GROUP).forEach(k => { if (GROUP[k] === g && k !== p.s) score[k] = (score[k] || 0) + 1; });
    btn.classList.add("picked"); setTimeout(() => { round++; ask(); }, 280);
  }));
  $("#qz-skip").addEventListener("click", () => { if (used.size >= PICS.length - 1) used.clear(); ask(); });
  scrollTo({ top: 0, behavior: "smooth" });
}
function result() {
  const ranked = Object.entries(score).sort((x, y) => y[1] - x[1]), key = ranked[0][0], st = STYLES[key], second = ranked.find(([k]) => k !== key && STYLES[k]);
  try { localStorage.setItem("makon_style", key); } catch (e) {}
  const pieces = PIECES[GROUP[key]].map(id => CATALOG.find(c => c.id === id)).filter(Boolean);
  box.innerHTML = `
    <div class="qz-res">
      <div class="qz-res-l">
        <span class="label">Your style</span>
        <h1 class="qz-name">${esc(st.name)}</h1>
        <p class="qz-note">${esc(st.note || "")}${second ? ` — with a touch of <b>${esc(STYLES[second[0]].name)}</b>` : ""}</p>
        <div class="qz-pal">${st.palette.map(c => `<span style="background:${c}" title="${c}"></span>`).join("")}</div>
        <ul class="qz-mats">${(st.mats || []).map(([a, b]) => `<li><b>${esc(a)}</b>${esc(b)}</li>`).join("")}</ul>
        <div class="qz-act">
          <a class="d-try mk-btn" href="studio.html?style=${key}">Redesign my room in this style ↗</a>
          <a class="d-try" href="studio.html?template=${TPL[key] || "warm-living"}">Open a room like this in 3D</a>
          <button type="button" class="d-try" id="qz-share">Share my style</button>
          <button type="button" class="d-try" id="qz-again">Take it again</button>
        </div>
      </div>
      <div class="qz-res-r">
        <span class="label">Pieces that suit you</span>
        <div class="qz-pieces">${pieces.map(c => `<a href="studio.html?add=${c.id}"><img src="${furnPic(c.id)}" alt="" loading="lazy"><span>${esc(c.name)}</span></a>`).join("")}</div>
      </div>
    </div>`;
  $("#qz-again").addEventListener("click", () => { round = 0; score = {}; used.clear(); ask(); });
  $("#qz-share").addEventListener("click", () => share(st));
  scrollTo({ top: 0, behavior: "smooth" });
}
async function share(st) {
  const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  g.fillStyle = "#141a17"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#e2a964"; g.font = "600 34px Inter, sans-serif"; g.fillText("MY INTERIOR STYLE", 90, 200);
  g.fillStyle = "#f4efe6"; g.font = "400 112px Georgia, serif";
  const words = st.name.split(" "); let line = "", y = 340;
  words.forEach(w => { if (g.measureText(line + w).width > 900) { g.fillText(line, 90, y); line = ""; y += 124; } line += w + " "; }); g.fillText(line, 90, y);
  st.palette.forEach((col, i) => { g.fillStyle = col; g.fillRect(90 + i * 180, y + 90, 160, 380); });
  g.fillStyle = "rgba(244,239,230,.75)"; g.font = "400 36px Inter, sans-serif"; g.fillText(st.note || "", 90, y + 560);
  g.fillStyle = "#e2a964"; g.font = "600 40px Inter, sans-serif"; g.fillText("Find yours on Makon", 90, H - 110);
  const blob = await new Promise(ok => c.toBlob(ok, "image/jpeg", 0.92)), file = new File([blob], "my-makon-style.jpg", { type: "image/jpeg" });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], text: "My interior style is " + st.name + " — find yours: " + location.origin + "/style-quiz.html" }); } catch (e) { if (e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// preload the pictures so each choice appears instantly
PICS.forEach(p => { const i = new Image(); i.src = p.src; });
ask();
