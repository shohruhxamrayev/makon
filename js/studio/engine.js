// Makon Studio — on-device "mood preview" renderer.
// Reinhard-style colour transfer in CIE Lab toward a style palette, plus light glow,
// user adjustments, and soft masks for elements the user wants to keep.
import { loadImage } from "./util.js";

const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
const GAM = new Uint8ClampedArray(4097);
for (let i = 0; i <= 4096; i++) { const c = i / 4096; GAM[i] = Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); }
const gam = v => GAM[v <= 0 ? 0 : v >= 1 ? 4096 : (v * 4096) | 0];
const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
const finv = t => { const t3 = t * t * t; return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787; };

function rgb2lab(r, g, b, o, k) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const fx = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const fy = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const fz = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  o[k] = 116 * fy - 16; o[k + 1] = 500 * (fx - fy); o[k + 2] = 200 * (fy - fz);
}
function lab2rgb(L, a, b, o, k) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const X = finv(fx) * 0.95047, Y = finv(fy), Z = finv(fz) * 1.08883;
  o[k] = gam(3.2406 * X - 1.5372 * Y - 0.4986 * Z);
  o[k + 1] = gam(-0.9689 * X + 1.8758 * Y + 0.0415 * Z);
  o[k + 2] = gam(0.0557 * X - 0.2040 * Y + 1.0570 * Z);
}
export const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
export const rgbToHex = (r, g, b) => "#" + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, "0")).join("");

function stats(lab, n, step) {
  let s = [0, 0, 0], q = [0, 0, 0], c = 0;
  for (let i = 0; i < n; i += step) {
    const k = i * 3;
    for (let j = 0; j < 3; j++) { const v = lab[k + j]; s[j] += v; q[j] += v * v; }
    c++;
  }
  const m = s.map(v => v / c);
  return { m, sd: q.map((v, j) => Math.sqrt(Math.max(1e-6, v / c - m[j] * m[j]))) };
}

const yieldFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

/**
 * @param {string} src  image URL / data URL
 * @param {object} style  STYLES entry
 * @param {object} o  { intensity 0..1, light deg, keep [], adj {b,c,s,w}, max }
 */
export async function renderMood(src, style, o = {}) {
  const img = await loadImage(src);
  await yieldFrame();
  const max = o.max || 1400;
  const k0 = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const W = Math.round(img.naturalWidth * k0), H = Math.round(img.naturalHeight * k0);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const id = ctx.getImageData(0, 0, W, H), px = id.data, N = W * H;
  const lab = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) rgb2lab(px[i * 4], px[i * 4 + 1], px[i * 4 + 2], lab, i * 3);

  const S = stats(lab, N, Math.max(1, (N / 60000) | 0));
  const pal = new Float32Array(style.palette.length * 3);
  style.palette.forEach((h, i) => { const [r, g, b] = hexToRgb(h); rgb2lab(r, g, b, pal, i * 3); });
  const P = stats(pal, style.palette.length, 1);

  const t = style.t, K = o.intensity == null ? 0.75 : o.intensity;
  const adj = Object.assign({ b: 1, c: 1, s: 1, w: 0 }, o.adj || {});
  const keep = new Set(o.keep || []);
  const tgtL = S.m[0] + t.lift, sdL = S.sd[0] * t.contrast;
  const sdA = (S.sd[1] * 0.55 + Math.max(4, P.sd[1]) * 0.45) * t.sat;
  const sdB = (S.sd[2] * 0.55 + Math.max(4, P.sd[2]) * 0.45) * t.sat;
  const mA = S.m[1] * 0.35 + P.m[1] * 0.65 + t.warm * 2;
  const mB = S.m[2] * 0.35 + P.m[2] * 0.65 + t.warm * 7;
  // user adjustments (Lab space)
  const uL = (adj.b - 1) * 40, uC = adj.c, uS = adj.s, uW = adj.w * 30;

  const out = new Uint8ClampedArray(3);
  for (let y = 0; y < H; y++) {
    const floorMask = keep.has("floor") ? Math.min(1, Math.max(0, (y / H - 0.68) * 6)) : 0;
    const ceilMask = keep.has("ceiling") ? Math.min(1, Math.max(0, (0.16 - y / H) * 8)) : 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x, k = i * 3;
      const L = lab[k], A = lab[k + 1], B = lab[k + 2];
      let nL = (L - S.m[0]) / S.sd[0] * sdL + tgtL;
      let nA = (A - S.m[1]) / S.sd[1] * sdA + mA;
      let nB = (B - S.m[2]) / S.sd[2] * sdB + mB;
      // protect deep shadows and highlights from colour casts
      const tone = Math.min(1, L / 18) * Math.min(1, (100 - L) / 8);
      let kk = K * tone;
      if (keep.has("walls")) { const chroma = Math.hypot(A, B); kk *= 1 - Math.max(0, Math.min(1, (L - 62) / 15)) * Math.max(0, 1 - chroma / 22); }
      kk *= 1 - Math.max(floorMask, ceilMask) * 0.85;
      nL = L + (nL - L) * kk; nA = A + (nA - A) * kk; nB = B + (nB - B) * kk;
      // user tweaks
      nL = (nL - 50) * uC + 50 + uL;
      nA = nA * uS + uW * 0.25; nB = nB * uS + uW;
      lab2rgb(Math.max(0, Math.min(100, nL)), nA, nB, out, 0);
      px[i * 4] = out[0]; px[i * 4 + 1] = out[1]; px[i * 4 + 2] = out[2];
    }
    if ((y & 127) === 127) await yieldFrame();
  }
  ctx.putImageData(id, 0, 0);

  // daylight glow from the chosen side
  const th = ((o.light ?? 315) * Math.PI) / 180;
  const gx = W * (0.5 + 0.55 * Math.sin(th)), gy = H * (0.3 - 0.3 * Math.cos(th));
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.9);
  const warm = style.t.warm > 0.2 ? "255,226,180" : "235,242,255";
  g.addColorStop(0, "rgba(" + warm + "," + (0.42 * K).toFixed(3) + ")");
  g.addColorStop(0.55, "rgba(" + warm + "," + (0.12 * K).toFixed(3) + ")");
  g.addColorStop(1, "rgba(0,0,0," + (0.18 * K).toFixed(3) + ")");
  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  return cv.toDataURL("image/jpeg", 0.9);
}

// k-means palette (returns [{hex, share}])
export async function extractPalette(src, k = 5) {
  const img = await loadImage(src);
  const S = 72, c = document.createElement("canvas");
  const r = img.naturalWidth / img.naturalHeight;
  c.width = r >= 1 ? S : Math.round(S * r); c.height = r >= 1 ? Math.round(S / r) : S;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data, n = c.width * c.height;
  const lab = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) rgb2lab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2], lab, i * 3);
  // init: spread over lightness
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => lab[a * 3] - lab[b * 3]);
  let cent = Array.from({ length: k }, (_, j) => { const i = order[Math.floor((j + 0.5) / k * n)]; return [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]]; });
  const asg = new Int32Array(n);
  for (let it = 0; it < 10; it++) {
    for (let i = 0; i < n; i++) {
      let best = 0, bd = 1e9;
      for (let j = 0; j < k; j++) {
        const dl = lab[i * 3] - cent[j][0], da = lab[i * 3 + 1] - cent[j][1], db = lab[i * 3 + 2] - cent[j][2];
        const dd = dl * dl + da * da * 1.6 + db * db * 1.6;
        if (dd < bd) { bd = dd; best = j; }
      }
      asg[i] = best;
    }
    const sum = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) { const s = sum[asg[i]]; s[0] += lab[i * 3]; s[1] += lab[i * 3 + 1]; s[2] += lab[i * 3 + 2]; s[3]++; }
    cent = cent.map((c0, j) => sum[j][3] ? [sum[j][0] / sum[j][3], sum[j][1] / sum[j][3], sum[j][2] / sum[j][3]] : c0);
  }
  const counts = new Array(k).fill(0); for (let i = 0; i < n; i++) counts[asg[i]]++;
  const o = new Uint8ClampedArray(3);
  return cent.map((c0, j) => { lab2rgb(c0[0], c0[1], c0[2], o, 0); return { hex: rgbToHex(o[0], o[1], o[2]), share: counts[j] / n, L: c0[0] }; })
    .filter(x => x.share > 0.01).sort((a, b) => b.share - a.share);
}
