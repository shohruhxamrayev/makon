// Makon — AI room render (Vercel serverless function).
//
// Two providers. Set ONE of them in Vercel → Project → Settings → Environment Variables, then redeploy:
//
//   FREE  — Cloudflare Workers AI (FLUX.2 Klein, ~100+ renders/day on the free allowance)
//           CLOUDFLARE_ACCOUNT_ID = your Cloudflare account ID
//           CLOUDFLARE_API_TOKEN  = an API token with the "Workers AI" permission
//
//   PAID  — OpenAI (best quality, a few cents per render)
//           OPENAI_API_KEY = sk-…        optional: MAKON_IMAGE_MODEL (default gpt-image-1.5), MAKON_IMAGE_QUALITY (low|medium|high)
//
// If both are set, OpenAI is used. Optional for either:
//   MAKON_ACCESS_CODE  — a password visitors must type once in the Studio
//   MAKON_DAILY_LIMIT  — AI renders per person per day (default 5; 0 = no per-person limit)
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN — free Upstash Redis to make the per-person limit exact
//                         across all servers (without it the limit is kept in each server's memory: good, not perfect)
//
// GET  /api/redesign  → { enabled, provider, model, needsCode, maxInput, configError }
// POST /api/redesign  { image: "data:image/jpeg;base64,…", prompt, orientation, aspect } → { image } or { error }

const CF_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

// ---------- per-person daily limit ----------
const mem = new Map(); // fallback store: key -> count (per server instance)
const today = () => new Date().toISOString().slice(0, 10); // UTC day, same reset as Cloudflare's allowance
function who(req) {
  const xf = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return (xf || req.headers["x-real-ip"] || (req.socket && req.socket.remoteAddress) || "unknown").toString().slice(0, 64);
}
async function redis(cmds) {
  const url = process.env.UPSTASH_REDIS_REST_URL, tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !tok) return null;
  try {
    const r = await fetch(url.replace(/\/$/, "") + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify(cmds) });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
async function used(key) {
  const j = await redis([["GET", key]]);
  if (j && j[0]) return parseInt(j[0].result || "0", 10) || 0;
  return mem.get(key) || 0;
}
async function bump(key) {
  const j = await redis([["INCR", key], ["EXPIRE", key, 90000]]);
  if (j && j[0] && typeof j[0].result === "number") return j[0].result;
  if (mem.size > 5000) mem.clear();
  const n = (mem.get(key) || 0) + 1; mem.set(key, n); return n;
}
const dailyLimit = () => { const v = parseInt(process.env.MAKON_DAILY_LIMIT || "5", 10); return isFinite(v) && v >= 0 ? v : 5; };

function config() {
  const okey = (process.env.OPENAI_API_KEY || "").trim();
  const cfId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const cfTok = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
  const errors = [];
  let provider = null;
  if (okey) {
    if (/^sk-[A-Za-z0-9_\-]{20,}$/.test(okey)) provider = "openai";
    else errors.push("OPENAI_API_KEY doesn't look like an OpenAI key (it should start with sk-).");
  }
  if (!provider && (cfId || cfTok)) {
    if (!/^[a-f0-9]{32}$/i.test(cfId)) errors.push("CLOUDFLARE_ACCOUNT_ID should be the 32-character account ID from your Cloudflare dashboard.");
    else if (cfTok.length < 30) errors.push("CLOUDFLARE_API_TOKEN looks too short — create a token with the Workers AI permission.");
    else provider = "cloudflare";
  }
  return {
    provider, okey, cfId, cfTok,
    model: provider === "openai" ? (process.env.MAKON_IMAGE_MODEL || "gpt-image-1.5") : provider === "cloudflare" ? "flux-2-klein-4b (free)" : null,
    code: process.env.MAKON_ACCESS_CODE || "",
    configError: provider ? null : errors.length ? errors.join(" ") + " Fix it in Vercel → Settings → Environment Variables, then redeploy." : null
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const c = config();

  const limit = dailyLimit(), key = "makon:" + today() + ":" + who(req);
  if (req.method === "GET") {
    const u = limit && c.provider ? await used(key) : 0;
    return res.status(200).json({
      enabled: !!c.provider, provider: c.provider, model: c.model, needsCode: !!c.code,
      maxInput: c.provider === "cloudflare" ? 496 : 1280, configError: c.configError,
      limit, remaining: limit ? Math.max(0, limit - u) : null
    });
  }
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Method not allowed" }); }
  if (!c.provider) return res.status(501).json({ error: c.configError || "AI rendering is not configured on this deployment." });
  if (c.code && req.headers["x-makon-code"] !== c.code) return res.status(401).json({ error: "Wrong or missing AI access code." });
  if (limit && (await used(key)) >= limit) return res.status(429).json({ error: "You've used your " + limit + " free AI renders for today. More tomorrow (from 05:00 Tashkent time) — mood previews still work.", limitReached: true, remaining: 0 });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const { image, prompt, orientation, aspect } = body || {};
  const m = typeof image === "string" && /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!m) return res.status(400).json({ error: "Send the photo as a JPEG, PNG or WebP data URL." });
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 6000) return res.status(400).json({ error: "Prompt is missing or too long." });
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 4 * 1024 * 1024) return res.status(413).json({ error: "Photo is too large — keep it under 4 MB." });
  const ext = m[1].split("/")[1].replace("jpeg", "jpg");

  try {
    const out = c.provider === "openai"
      ? await viaOpenAI(c, buf, m[1], ext, prompt, orientation)
      : await viaCloudflare(c, buf, m[1], ext, prompt, aspect);
    if (out.status === 200 && limit) out.body.remaining = Math.max(0, limit - (await bump(key)));
    return res.status(out.status).json(out.body);
  } catch (e) {
    return res.status(502).json({ error: "Couldn't reach the image service. Try again in a moment." });
  }
};

const reply = (status, body) => ({ status, body });

async function viaOpenAI(c, buf, mime, ext, prompt, orientation) {
  const form = new FormData();
  form.append("model", c.model);
  form.append("image", new Blob([buf], { type: mime }), "room." + ext);
  form.append("prompt", prompt);
  form.append("size", orientation === "portrait" ? "1024x1536" : orientation === "square" ? "1024x1024" : "1536x1024");
  form.append("quality", process.env.MAKON_IMAGE_QUALITY || "medium");
  form.append("output_format", "jpeg");
  form.append("output_compression", "86");
  if (/^gpt-image-1(\.5)?$/.test(c.model)) form.append("input_fidelity", "high");
  const r = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: "Bearer " + c.okey }, body: form });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j.error && j.error.message) || "";
    // never echo key fragments back to visitors
    const friendly = r.status === 401 ? "The OpenAI key on this site was rejected. The site owner needs to check OPENAI_API_KEY in Vercel."
      : r.status === 429 ? (/quota|billing/i.test(msg) ? "The OpenAI account is out of credit. Add billing at platform.openai.com." : "Too many renders right now — wait a minute and try again.")
      : r.status === 403 ? "This OpenAI account can't use " + c.model + " yet (it may need organisation verification on platform.openai.com)."
      : /safety|moderation/i.test(msg) ? "The image service declined this photo. Try a different one."
      : "The image service returned an error (" + r.status + ").";
    return reply(502, { error: friendly });
  }
  const b64 = j.data && j.data[0] && j.data[0].b64_json;
  if (!b64) return reply(502, { error: "The image service returned no image." });
  return reply(200, { image: "data:image/jpeg;base64," + b64, model: c.model });
}

async function viaCloudflare(c, buf, mime, ext, prompt, aspect) {
  // output size: keep the photo's shape, long side 1024, multiples of 16
  let ar = Number(aspect); if (!(ar > 0.33 && ar < 3)) ar = 1.5;
  const W = ar >= 1 ? 1024 : Math.round(1024 * ar / 16) * 16;
  const H = ar >= 1 ? Math.round(1024 / ar / 16) * 16 : 1024;
  const form = new FormData();
  form.append("prompt", "Edit image 0. " + prompt);
  form.append("input_image_0", new Blob([buf], { type: mime }), "room." + ext);
  form.append("width", String(W));
  form.append("height", String(H));
  const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + c.cfId + "/ai/run/" + CF_MODEL, {
    method: "POST", headers: { Authorization: "Bearer " + c.cfTok }, body: form
  });
  const type = r.headers.get("content-type") || "";
  if (r.ok && type.startsWith("image/")) {
    const out = Buffer.from(await r.arrayBuffer()).toString("base64");
    return reply(200, { image: "data:" + type.split(";")[0] + ";base64," + out, model: c.model });
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) {
    const msg = ((j.errors || [])[0] || {}).message || "";
    const friendly = r.status === 401 || r.status === 403 || /auth/i.test(msg) ? "Cloudflare rejected the token. The site owner needs to check CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI permission) in Vercel."
      : r.status === 429 || /neuron|limit|quota|capacity/i.test(msg) ? "Today's free AI renders are used up. They reset at 05:00 Tashkent time (00:00 UTC)."
      : "The image service returned an error (" + r.status + ").";
    return reply(502, { error: friendly });
  }
  const b64 = (j.result && (j.result.image || (j.result.images || [])[0])) || j.image;
  if (!b64) return reply(502, { error: "The image service returned no image." });
  const kind = b64.startsWith("/9j/") ? "image/jpeg" : b64.startsWith("UklG") ? "image/webp" : "image/png";
  return reply(200, { image: "data:" + kind + ";base64," + b64, model: c.model });
}
