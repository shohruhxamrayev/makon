// Makon — shared bits for the makers & designers pages
export const API = "/api/makers";
export const imgUrl = id => id ? API + "?img=" + encodeURIComponent(id) : "";
export const KIND = { producer: "Furniture maker", designer: "Interior designer" };
export const contactLinks = m => [
  m.telegram && { k: "tg", label: "Telegram", href: "https://t.me/" + m.telegram },
  m.instagram && { k: "ig", label: "Instagram", href: "https://www.instagram.com/" + m.instagram + "/" },
  m.phone && { k: "ph", label: m.phone, href: "tel:" + m.phone },
  m.website && { k: "web", label: (() => { try { return new URL(m.website).hostname.replace(/^www\./, ""); } catch (e) { return "Website"; } })(), href: m.website },
].filter(Boolean);
export async function api(params, opts = {}) {
  const url = typeof params === "string" ? API + params : API;
  const r = await fetch(url, Object.assign({ headers: { "Content-Type": "application/json" } }, opts));
  let j = {}; try { j = await r.json(); } catch (e) { j = { error: r.status === 404 ? "Makers aren't available on this server yet." : "Unexpected reply (" + r.status + ")." }; }
  if (!r.ok) throw Object.assign(new Error(j.error || "Request failed (" + r.status + ")"), { status: r.status, storage: j.storage });
  return j;
}

// shrink a photo in the browser before upload: longest side ≤ max, JPEG (or WebP), under ~260 KB
export async function shrink(file, max = 1400, budget = 260 * 1024) {
  const bmp = await (window.createImageBitmap ? createImageBitmap(file).catch(() => null) : null) || await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("That file isn't a picture we can read.")); i.src = URL.createObjectURL(file); });
  let s = Math.min(1, max / Math.max(bmp.width, bmp.height)), q = 0.84, out = "";
  for (let k = 0; k < 7; k++) {
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    out = c.toDataURL("image/jpeg", q);
    if (out.length * 0.75 <= budget) break;
    if (q > 0.66) q -= 0.08; else s *= 0.82;
  }
  return out;
}
