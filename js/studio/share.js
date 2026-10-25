// Makon — turn a redesign into something people post: a branded before/after picture or a 9:16 reel.
import { el, toast, download } from "./util.js";

const SITE = "makon-khaki.vercel.app";
const INK = "#121614", CREAM = "#f4efe6", ACCENT = "#e2a964";
const load = src => new Promise((ok, no) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = no; i.src = src; });
let wordmark = null;
const getMark = async () => wordmark || (wordmark = await load("img/wordmark-cream.svg").catch(() => null));

// draw an image to fill a box (like CSS object-fit: cover), optionally only the left `reveal` share of the box
function cover(g, img, x, y, w, h, reveal = 1) {
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
  g.save(); g.beginPath(); g.rect(x, y, w * reveal, h); g.clip();
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h); g.restore();
}
function pill(g, text, x, y, dark) {
  g.font = "600 30px Inter, system-ui, sans-serif";
  const w = g.measureText(text).width + 44;
  g.fillStyle = dark ? "rgba(18,22,20,.72)" : "rgba(244,239,230,.92)";
  g.beginPath(); g.roundRect(x, y, w, 56, 28); g.fill();
  g.fillStyle = dark ? "#fff" : INK; g.textBaseline = "middle"; g.fillText(text, x + 22, y + 29);
}
function brand(g, W, y, mark, sub) {
  if (mark) { const mw = 230, mh = mark.height * (mw / mark.width); g.drawImage(mark, (W - mw) / 2, y, mw, mh); y += mh + 22; }
  g.textAlign = "center"; g.textBaseline = "top";
  g.fillStyle = "rgba(244,239,230,.85)"; g.font = "400 30px Inter, system-ui, sans-serif"; g.fillText(sub, W / 2, y);
  g.fillStyle = ACCENT; g.font = "600 32px Inter, system-ui, sans-serif"; g.fillText(SITE, W / 2, y + 46);
  g.textAlign = "left";
}

// 1080×1350 (Instagram portrait): before on top, after below, Makon at the bottom
export async function shareImage(beforeSrc, afterSrc, styleName) {
  const [b, a, mark] = await Promise.all([load(beforeSrc), load(afterSrc), getMark()]);
  const W = 1080, H = 1350, ph = 540, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = INK; g.fillRect(0, 0, W, H);
  cover(g, b, 0, 0, W, ph); cover(g, a, 0, ph + 6, W, ph);
  pill(g, "Before", 32, 32, true); pill(g, "After · " + (styleName || "Makon"), 32, ph + 38, false);
  brand(g, W, ph * 2 + 40, mark, "Redesigned with Makon — try your room free");
  return new Promise(ok => c.toBlob(bl => ok(bl), "image/jpeg", 0.92));
}

// 1080×1920 reel: the old room, a wipe into the new one, a slow push, then the Makon end card
export async function shareReel(beforeSrc, afterSrc, styleName, onProgress) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error("This browser can't make videos — share the picture instead.");
  const [b, a, mark] = await Promise.all([load(beforeSrc), load(afterSrc), getMark()]);
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const types = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || "";
  const stream = c.captureStream(30), rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8e6 } : {});
  const chunks = []; rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  const done = new Promise(ok => { rec.onstop = ok; });
  const DUR = 9.5, ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const frame = t => {
    g.fillStyle = INK; g.fillRect(0, 0, W, H);
    if (t < 8) {
      // the photo sits in the middle third, slowly pushing in
      const z = 1 + 0.06 * (t / 8), ph = 1180 * z, pw = W * z, x = (W - pw) / 2, y = (H - ph) / 2 - 60;
      cover(g, b, x, y, pw, ph);
      const k = ease((t - 1.6) / 1.8);
      if (k > 0) {
        cover(g, a, x, y, pw, ph, k);
        if (k < 1) { g.fillStyle = "#fff"; g.fillRect(x + pw * k - 3, y, 6, ph); }
      }
      g.globalAlpha = Math.min(1, t / 0.4); pill(g, k < 0.5 ? "Before" : "After", 60, 150, k < 0.5);
      g.globalAlpha = 1;
      g.textAlign = "center"; g.fillStyle = "#fff"; g.font = "500 54px Georgia, serif";
      g.fillText(k < 0.5 ? "My room today" : (styleName || "Redesigned"), W / 2, H - 300);
      g.textAlign = "left";
      if (mark) { const mw = 170, mh = mark.height * (mw / mark.width); g.globalAlpha = 0.9; g.drawImage(mark, (W - mw) / 2, H - 200, mw, mh); g.globalAlpha = 1; }
    } else {
      const f = ease((t - 8) / 0.5); g.globalAlpha = f;
      brand(g, W, H / 2 - 120, mark, "Design your room before you move a thing.");
      g.globalAlpha = 1;
    }
  };
  frame(0); rec.start(250);
  const t0 = performance.now();
  await new Promise(ok => {
    const tick = () => { const t = (performance.now() - t0) / 1000; frame(Math.min(t, DUR)); onProgress && onProgress(Math.min(1, t / DUR)); if (t < DUR) requestAnimationFrame(tick); else ok(); };
    requestAnimationFrame(tick);
  });
  rec.stop(); await done; stream.getTracks().forEach(tr => tr.stop());
  return new Blob(chunks, { type: (mime || "video/webm").split(";")[0] });
}

// hand the file to the phone's share sheet (Instagram, Telegram, WhatsApp…), or download it
export async function deliver(blob, name, text) {
  const file = new File([blob], name, { type: blob.type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: "Makon" }); return "shared"; }
  } catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  const url = URL.createObjectURL(blob); download(name, url); setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded";
}

// the Share dialog
export function openShare({ before, after, styleName, roomName }) {
  if (document.querySelector(".share-wrap")) return;
  const text = "I redesigned my " + (roomName || "room").toLowerCase() + " with Makon ✨ Try yours free: https://" + SITE;
  const close = () => { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 200); };
  const status = el("p", { class: "share-st muted small" });
  const run = async (kind, btn) => {
    btn.disabled = true;
    try {
      let blob, name;
      if (kind === "img") { status.textContent = "Making your picture…"; blob = await shareImage(before, after, styleName); name = "makon-before-after.jpg"; }
      else { blob = await shareReel(before, after, styleName, p => { status.textContent = "Recording your reel… " + Math.round(p * 100) + "%"; }); name = "makon-reel." + (blob.type.includes("mp4") ? "mp4" : "webm"); }
      const how = await deliver(blob, name, text);
      status.textContent = how === "shared" ? "Shared — thank you!" : how === "downloaded" ? "Saved to your device — post it on Instagram or Telegram." : "";
      if (how === "downloaded" && name.endsWith(".webm")) status.textContent += " (Instagram prefers MP4: on iPhone or new Chrome the reel is MP4.)";
    } catch (e) { status.textContent = e.message || "Couldn't make that — try the picture."; }
    finally { btn.disabled = false; }
  };
  const bImg = el("button", { type: "button", class: "share-opt" }, el("span", { class: "share-ic", text: "▣" }), el("span", {}, el("b", { text: "Before / after picture" }), el("small", { text: "Instagram post size, with your room and the Makon link" })));
  const bVid = el("button", { type: "button", class: "share-opt" }, el("span", { class: "share-ic", text: "▶" }), el("span", {}, el("b", { text: "Reel video (9:16)" }), el("small", { text: "10 seconds: the old room wipes into the new one" })));
  bImg.addEventListener("click", () => run("img", bImg)); bVid.addEventListener("click", () => run("vid", bVid));
  const tg = el("a", { class: "share-link", href: "https://t.me/share/url?url=" + encodeURIComponent("https://" + SITE) + "&text=" + encodeURIComponent(text.replace(/ Try yours free:.*/, " Try yours free:")), target: "_blank", rel: "noopener", text: "Send the Makon link on Telegram ↗" });
  const box = el("div", { class: "share-box", role: "dialog", "aria-modal": "true", "aria-label": "Share your redesign" },
    el("button", { type: "button", class: "icon-btn ch-x", "aria-label": "Close", html: '<svg><use href="#i-x"/></svg>', onclick: close }),
    el("span", { class: "eyebrow", text: "Share" }), el("h3", { text: "Show off your new room" }),
    el("p", { class: "muted small", text: "Post it on Instagram, Telegram or WhatsApp — friends can try their own room for free." }),
    bImg, bVid, status, tg);
  const wrap = el("div", { class: "modal-wrap share-wrap" }, box);
  wrap.addEventListener("pointerdown", e => { if (e.target === wrap) close(); });
  document.body.append(wrap); requestAnimationFrame(() => wrap.classList.add("show"));
}
