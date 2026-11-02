// Download CC0 Poly Haven models (1k glTF) listed in tools/ph-list.txt into tmp/ph/<id>/
import fs from "node:fs"; import path from "node:path";
const ids = [...new Set(fs.readFileSync("tools/ph-list.txt", "utf8").split(/\s+/).filter(Boolean))];
const get = async u => { for (let i = 0; i < 4; i++) { const r = await fetch(u, { headers: { "User-Agent": "makon-model-fetch" } }); if (r.ok) return r; await new Promise(s => setTimeout(s, 1500)); } throw new Error("fetch failed " + u); };
const meta = {};
for (const id of ids) {
  if (fs.existsSync(`models/ph/${id}.glb`) && fs.existsSync(`models/ar/${id}.glb`)) continue;
  try {
    const f = await (await get(`https://api.polyhaven.com/files/${id}`)).json();
    const g = f.gltf && (f.gltf["1k"] || f.gltf["2k"]); if (!g) { console.log("no gltf", id); continue; }
    const dir = `tmp/ph/${id}`; fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/${id}.gltf`, Buffer.from(await (await get(g.gltf.url)).arrayBuffer()));
    for (const [p, v] of Object.entries(g.gltf.include || {})) { const out = path.join(dir, p); fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.from(await (await get(v.url)).arrayBuffer())); }
    const info = await (await get(`https://api.polyhaven.com/info/${id}`)).json();
    meta[id] = { name: info.name, authors: Object.keys(info.authors || {}), dims: info.dimensions || null };
    console.log("ok", id);
  } catch (e) { console.log("fail", id, e.message); }
}
const mf = "models/ph/meta.json"; const old = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, "utf8")) : {};
fs.mkdirSync("models/ph", { recursive: true }); fs.writeFileSync(mf, JSON.stringify(Object.assign(old, meta), null, 1));
