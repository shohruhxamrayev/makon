// Makon Studio — project storage (IndexedDB, with in-memory fallback)
import { uid } from "./util.js";

const DB = "makon", VER = 1, STORE = "projects";
let dbp = null, memory = null;

function openDB() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("no idb"));
    let r;
    try { r = indexedDB.open(DB, VER); } catch (e) { return reject(e); }
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" }).createIndex("owner", "owner");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("blocked"));
  }).catch(e => { console.warn("IndexedDB unavailable, using memory", e); memory = new Map(); return null; });
  return dbp;
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode), s = t.objectStore(STORE);
    let out;
    Promise.resolve(fn(s, v => { out = v; })).catch(reject);
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("aborted"));
  });
}

export const persistent = async () => { await openDB(); return !memory; };

export async function listProjects(owner) {
  const db = await openDB();
  let all;
  if (!db) all = [...memory.values()].filter(p => p.owner === owner);
  else all = await tx(db, "readonly", (s, set) => {
    const r = s.index("owner").getAll(owner);
    r.onsuccess = () => set(r.result);
  });
  return (all || []).sort((a, b) => b.updated - a.updated);
}
export async function getProject(id) {
  const db = await openDB();
  if (!db) return structuredClone(memory.get(id) || null);
  return tx(db, "readonly", (s, set) => { const r = s.get(id); r.onsuccess = () => set(r.result || null); });
}
export async function putProject(p) {
  const db = await openDB();
  if (!db) { memory.set(p.id, structuredClone(p)); return; }
  return tx(db, "readwrite", s => { s.put(p); });
}
export async function deleteProject(id) {
  const db = await openDB();
  if (!db) { memory.delete(id); return; }
  return tx(db, "readwrite", s => { s.delete(id); });
}

export function blankProject(owner, name = "Untitled room") {
  const now = Date.now();
  return {
    id: uid("p_"), owner, name, created: now, updated: now, schema: 1,
    roomType: "living", units: "m", thumb: null,
    photo: null, sample: false,
    design: { style: "warm", intensity: 0.75, light: 315, keep: ["window", "openings"], notes: "", engine: "auto", versions: [], current: null },
    plan: { walls: [], openings: [], items: [], height: 2.6, calibrated: false, started: false },
    finish: { wall: null, floor: null },
    brief: { location: "", budget: "", currency: "USD", timing: "", notes: "", coats: 2, coverage: 10, waste: 10, prices: {} }
  };
}

// fill any fields missing from older / imported projects
export function normalize(p, owner) {
  const b = blankProject(owner || p.owner);
  const out = Object.assign({}, b, p);
  out.design = Object.assign({}, b.design, p.design || {});
  out.plan = Object.assign({}, b.plan, p.plan || {});
  out.finish = Object.assign({}, b.finish, p.finish || {});
  out.brief = Object.assign({}, b.brief, p.brief || {});
  out.brief.prices = Object.assign({}, (p.brief || {}).prices || {});
  ["walls", "openings", "items"].forEach(k => { if (!Array.isArray(out.plan[k])) out.plan[k] = []; });
  if (!Array.isArray(out.design.versions)) out.design.versions = [];
  if (!Array.isArray(out.design.keep)) out.design.keep = [];
  if (owner) out.owner = owner;
  return out;
}
