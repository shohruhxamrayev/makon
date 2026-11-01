// Makon — makers & designers: workshops and designers present their work; the owner approves each page.
// Storage: Upstash Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN). Owner actions use MAKON_OWNER_CODE.
//
// GET  /api/makers                    → { storage, makers: [summary…] }            live pages
// GET  /api/makers?m=<slug>[&key=…]   → { maker }                                  live, or any status with the edit key / owner code
// GET  /api/makers?img=<id>           → the picture (JPEG/WebP), cached at the edge
// GET  /api/makers?pending=1          → { makers } (owner code in x-makon-code)
// POST /api/makers { action: "submit", profile }            → { slug, key }       new page, waits for review
// POST /api/makers { action: "update", slug, key, profile } → { ok }
// POST /api/makers { action: "review", slug, status }       → { ok }              owner: live | hidden | rejected
const crypto = require("crypto");

async function redis(cmds) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL, tok = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !tok) throw Object.assign(new Error("Makers storage isn't connected yet."), { code: 503 });
  const r = await fetch(url.replace(/\/$/, "") + "/pipeline", { method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify(cmds) });
  if (!r.ok) throw Object.assign(new Error("Storage error " + r.status), { code: 502 });
  const out = await r.json();
  return out.map(x => { if (x.error) throw new Error(x.error); return x.result; });
}
const one = async cmd => (await redis([cmd]))[0];
const hasStorage = () => !!((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN));
const isOwner = req => !!process.env.MAKON_OWNER_CODE && String(req.headers["x-makon-code"] || "") === process.env.MAKON_OWNER_CODE;
const hash = s => crypto.createHash("sha256").update("makon-maker|" + s).digest("hex");
const who = req => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "x";

// ---------- cleaning what people send ----------
const str = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim().slice(0, n);
const KINDS = ["producer", "designer"];
function link(v, kind) {
  let s = str(v, 200); if (!s) return "";
  if (kind === "instagram") { s = s.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").split(/[/?#]/)[0]; return /^[\w.]{1,30}$/.test(s) ? s : ""; }
  if (kind === "telegram") { s = s.replace(/^@/, "").replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "").split(/[/?#]/)[0]; return /^\w{4,32}$/.test(s) ? s : ""; }
  if (kind === "phone") { s = s.replace(/[^\d+]/g, ""); return /^\+?\d{7,15}$/.test(s) ? s : ""; }
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try { const u = new URL(s); return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.href : ""; } catch (e) { return ""; }
}
const IMG_RE = /^data:image\/(jpeg|webp|png);base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMG = 420 * 1024;           // bytes after decoding
function cleanProfile(p) {
  p = p || {};
  const works = (Array.isArray(p.works) ? p.works : []).slice(0, 12).map(w => ({
    title: str(w.title, 80), price: str(w.price, 40), size: str(w.size, 60), material: str(w.material, 80), desc: str(w.desc, 400),
    img: typeof w.img === "string" ? w.img : "",
  })).filter(w => w.title && w.img);
  return {
    kind: KINDS.includes(p.kind) ? p.kind : "producer",
    name: str(p.name, 70), city: str(p.city, 50), tagline: str(p.tagline, 120), about: str(p.about, 1200),
    phone: link(p.phone, "phone"), telegram: link(p.telegram, "telegram"), instagram: link(p.instagram, "instagram"), website: link(p.website, "web"),
    logo: typeof p.logo === "string" ? p.logo : "", works,
  };
}
function checkImg(d) {
  if (/^[a-f0-9]{24}$/.test(d)) return { keep: d };                      // an image we already store
  const m = IMG_RE.exec(d || ""); if (!m) return null;
  const bytes = Math.floor(m[2].length * 3 / 4); if (bytes > MAX_IMG) return null;
  return { data: d };
}
const slugify = s => (str(s, 60).toLowerCase().replace(/[‘’ʻʼ'`]/g, "").replace(/[^a-z0-9а-яё]+/gi, "-").replace(/^-|-$/g, "") || "maker").slice(0, 40);

// store new pictures, return the profile with picture ids in place of data
async function storeImages(prof) {
  const sets = [], ids = [];
  const put = d => { const c = checkImg(d); if (!c) return ""; if (c.keep) return c.keep; const id = crypto.randomBytes(12).toString("hex"); sets.push(["SET", "mkimg:" + id, c.data]); ids.push(id); return id; };
  if (prof.logo) prof.logo = put(prof.logo);
  prof.works = prof.works.map(w => Object.assign(w, { img: put(w.img) })).filter(w => w.img);
  for (const s of sets) await redis([s]);          // one picture per request keeps every request small
  return prof;
}
const summary = m => ({ slug: m.slug, kind: m.kind, name: m.name, city: m.city, tagline: m.tagline, logo: m.logo, cover: (m.works[0] || {}).img || "", count: m.works.length, status: m.status, created: m.created });
const publicView = m => { const o = Object.assign({}, m); delete o.keyHash; delete o.ip; return o; };

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const q = req.query || {};
    if (req.method === "GET") {
      if (q.img) {
        if (!/^[a-f0-9]{24}$/.test(q.img)) return res.status(400).end();
        const d = await one(["GET", "mkimg:" + q.img]); const m = d && IMG_RE.exec(d);
        if (!m) return res.status(404).end();
        res.setHeader("Content-Type", "image/" + m[1]);
        res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
        return res.status(200).send(Buffer.from(m[2], "base64"));
      }
      if (!hasStorage()) return res.status(200).json({ storage: false, makers: [] });
      if (q.m) {
        const raw = await one(["GET", "maker:" + str(q.m, 60)]); if (!raw) return res.status(404).json({ error: "This page doesn't exist." });
        const m = JSON.parse(raw), canSee = m.status === "live" || isOwner(req) || (q.key && hash(String(q.key)) === m.keyHash);
        if (!canSee) return res.status(404).json({ error: m.status === "pending" ? "This page is waiting for review." : "This page isn't public." });
        return res.status(200).json({ maker: publicView(m) });
      }
      const set = q.pending ? "makers:pending" : "makers:live";
      if (q.pending && !isOwner(req)) return res.status(403).json({ error: "Owner code needed." });
      const slugs = await one(["SMEMBERS", set]);
      if (!slugs || !slugs.length) return res.status(200).json({ storage: true, makers: [] });
      const raws = await one(["MGET", ...slugs.map(s => "maker:" + s)]);
      const list = raws.filter(Boolean).map(r => JSON.parse(r)).sort((a, b) => b.created - a.created);
      if (!q.pending) res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      return res.status(200).json({ storage: true, makers: q.pending ? list.map(publicView) : list.map(summary) });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } } b = b || {};

    if (b.action === "submit") {
      const ip = who(req), day = new Date().toISOString().slice(0, 10), rk = "mklimit:" + day + ":" + ip;
      const n = await one(["INCR", rk]); if (n === 1) await one(["EXPIRE", rk, 90000]);
      if (n > 4) return res.status(429).json({ error: "Too many pages sent today from this connection. Try again tomorrow." });
      const p = cleanProfile(b.profile);
      if (!p.name || p.name.length < 2) return res.status(400).json({ error: "Please add your workshop or studio name." });
      if (!p.phone && !p.telegram && !p.instagram) return res.status(400).json({ error: "Add at least one way for buyers to reach you: phone, Telegram or Instagram." });
      if (!p.works.length) return res.status(400).json({ error: "Add at least one piece of work with a photo." });
      await storeImages(p);
      if (!p.works.length) return res.status(400).json({ error: "Your photos were too large — please try again (each photo is shrunk before sending)." });
      let slug = slugify(p.name); if (await one(["EXISTS", "maker:" + slug])) slug += "-" + crypto.randomBytes(2).toString("hex");
      const key = crypto.randomBytes(16).toString("hex");
      const m = Object.assign(p, { slug, status: "pending", created: Date.now(), updated: Date.now(), keyHash: hash(key), ip: hash(ip) });
      await redis([["SET", "maker:" + slug, JSON.stringify(m)], ["SADD", "makers:pending", slug]]);
      return res.status(200).json({ slug, key });
    }
    if (b.action === "update") {
      const slug = str(b.slug, 60), raw = await one(["GET", "maker:" + slug]);
      if (!raw) return res.status(404).json({ error: "Page not found." });
      const old = JSON.parse(raw);
      if (!(isOwner(req) || (b.key && hash(String(b.key)) === old.keyHash))) return res.status(403).json({ error: "This edit link isn't valid." });
      const p = cleanProfile(b.profile);
      if (!p.name || !p.works.length) return res.status(400).json({ error: "A name and at least one piece of work are needed." });
      await storeImages(p);
      const m = Object.assign({}, old, p, { updated: Date.now() });
      await one(["SET", "maker:" + slug, JSON.stringify(m)]);
      return res.status(200).json({ ok: true, status: m.status });
    }
    if (b.action === "review") {
      if (!isOwner(req)) return res.status(403).json({ error: "Owner code needed." });
      const slug = str(b.slug, 60), status = ["live", "hidden", "rejected"].includes(b.status) ? b.status : null;
      const raw = await one(["GET", "maker:" + slug]); if (!raw || !status) return res.status(400).json({ error: "Unknown page or status." });
      const m = JSON.parse(raw); m.status = status; m.reviewed = Date.now();
      await redis([["SET", "maker:" + slug, JSON.stringify(m)], ["SREM", "makers:pending", slug], status === "live" ? ["SADD", "makers:live", slug] : ["SREM", "makers:live", slug]]);
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    return res.status(e.code || 500).json({ error: e.code === 503 ? e.message : "Something went wrong — please try again.", storage: hasStorage() });
  }
};

// pictures arrive as data URLs inside JSON: allow up to ~6 MB bodies
module.exports.config = { api: { bodyParser: { sizeLimit: "6mb" } } };
