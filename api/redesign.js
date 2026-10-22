// Makon — AI room render (Vercel serverless function).
// Turns on when the OPENAI_API_KEY environment variable is set in Vercel → Project → Settings → Environment Variables.
// Optional: MAKON_IMAGE_MODEL (default gpt-image-1.5), MAKON_IMAGE_QUALITY (low | medium | high, default medium),
//           MAKON_ACCESS_CODE (if set, the Studio must send the same code — stops strangers spending your credits).
//
// GET  /api/redesign  → { enabled, model, needsCode }
// POST /api/redesign  { image: "data:image/jpeg;base64,…", prompt: "…", orientation: "landscape|portrait|square" }
//                     → { image: "data:image/jpeg;base64,…" }  or  { error }

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.MAKON_IMAGE_MODEL || "gpt-image-1.5";
  const code = process.env.MAKON_ACCESS_CODE || "";

  if (req.method === "GET") return res.status(200).json({ enabled: !!key, model: key ? model : null, needsCode: !!code });
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Method not allowed" }); }
  if (!key) return res.status(501).json({ error: "AI rendering is not configured on this deployment." });
  if (code && req.headers["x-makon-code"] !== code) return res.status(401).json({ error: "Wrong or missing AI access code." });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const { image, prompt, orientation } = body || {};
  const m = typeof image === "string" && /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image);
  if (!m) return res.status(400).json({ error: "Send the photo as a JPEG, PNG or WebP data URL." });
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 6000) return res.status(400).json({ error: "Prompt is missing or too long." });

  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 4 * 1024 * 1024) return res.status(413).json({ error: "Photo is too large — keep it under 4 MB." });

  const ext = m[1].split("/")[1].replace("jpeg", "jpg");
  const form = new FormData();
  form.append("model", model);
  form.append("image", new Blob([buf], { type: m[1] }), "room." + ext);
  form.append("prompt", prompt);
  form.append("size", orientation === "portrait" ? "1024x1536" : orientation === "square" ? "1024x1024" : "1536x1024");
  form.append("quality", process.env.MAKON_IMAGE_QUALITY || "medium");
  form.append("output_format", "jpeg");
  form.append("output_compression", "86");
  if (/^gpt-image-1(\.5)?$/.test(model)) form.append("input_fidelity", "high");

  try {
    const r = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { Authorization: "Bearer " + key }, body: form
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || "The image service returned an error (" + r.status + ")." });
    const b64 = j.data && j.data[0] && j.data[0].b64_json;
    if (!b64) return res.status(502).json({ error: "The image service returned no image." });
    return res.status(200).json({ image: "data:image/jpeg;base64," + b64, model });
  } catch (e) {
    return res.status(502).json({ error: "Couldn't reach the image service. Try again in a moment." });
  }
};
