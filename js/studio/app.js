// Makon Studio — app shell: projects, saving, modes
import { $, $$, el, esc, toast, modal, confirmBox, debounce, bus, timeAgo, download, isMobile } from "./util.js";
import { listProjects, getProject, putProject, deleteProject, blankProject, normalize, persistent } from "./store.js";
import * as Design from "./design.js";
import * as Plan from "./plan.js";
import * as Three from "./scene3d.js";
import * as Furnish from "./furnish.js";
import * as Build from "./build.js";

const user = window.MakonAuth && MakonAuth.current();
if (!user) { location.replace("signin.html?next=studio.html"); throw new Error("not signed in"); }

const MODES = ["design", "plan", "3d", "furnish", "build"];
const LAST = "makon_last_" + user.email;
const ctx = {
  user, bus: bus(), p: null, mode: "design", furnishView: "plan",
  ai: { enabled: false, model: null, needsCode: false, checked: false },
  save: null, setMode: null, toast, projects: []
};
window.__makon = ctx; // handy for debugging in the console

// ---------- saving ----------
const saveEl = $("#save-state");
function setSave(t, cls = "") { saveEl.textContent = t; saveEl.className = "save-state " + cls; }
const persist = debounce(async () => {
  const p = ctx.p; if (!p) return;
  try {
    await putProject(p);
    setSave("Saved", "ok");
    const i = ctx.projects.findIndex(x => x.id === p.id);
    if (i >= 0) ctx.projects[i] = p;
    renderProjects();
  } catch (e) {
    console.error(e);
    setSave("Not saved", "err");
    toast("Couldn't save — your browser storage may be full. Export the project to keep it.", "error");
  }
}, 450);
ctx.save = () => { if (!ctx.p) return; ctx.p.updated = Date.now(); setSave("Saving…"); persist(); };
const flush = () => { if (ctx.p) persist.flush(); };
window.addEventListener("pagehide", flush);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

// ---------- user ----------
$("#uname").textContent = user.name || "Guest";
$("#uemail").textContent = user.guest ? "Guest session" : user.email;
$("#avatar").textContent = (user.name || "?").trim().charAt(0).toUpperCase();
$("#signout").addEventListener("click", async () => {
  if (user.guest && !(await confirmBox("Leave guest mode?", "Guest projects stay in this browser and will be here if you continue as guest again.", "Sign out", false))) return;
  flush(); MakonAuth.signOut(); location.href = "index.html";
});

// ---------- sidebar (mobile drawer) ----------
const side = $("#side"), scrim = $("#scrim");
const openSide = v => { side.classList.toggle("open", v); scrim.classList.toggle("show", v); document.body.classList.toggle("lock", v && isMobile()); };
$("#menu-btn").addEventListener("click", () => openSide(true));
$("#side-close").addEventListener("click", () => openSide(false));
scrim.addEventListener("click", () => openSide(false));

// ---------- projects list ----------
const listEl = $("#projects"), searchEl = $("#proj-search");
searchEl.addEventListener("input", renderProjects);
function meta(p) {
  const w = (p.plan.walls || []).length, v = (p.design.versions || []).length, f = (p.plan.items || []).length;
  return [w + (w === 1 ? " wall" : " walls"), v + (v === 1 ? " version" : " versions"), f ? f + " items" : null].filter(Boolean).join(" · ");
}
function renderProjects() {
  const q = searchEl.value.trim().toLowerCase();
  searchEl.hidden = ctx.projects.length < 6;
  $("#proj-count").textContent = ctx.projects.length;
  listEl.innerHTML = "";
  ctx.projects.filter(p => !q || p.name.toLowerCase().includes(q)).forEach(p => {
    const li = el("li", { class: "proj" + (ctx.p && p.id === ctx.p.id ? " on" : "") });
    const open = el("button", { class: "proj-open", type: "button", "aria-current": ctx.p && p.id === ctx.p.id ? "true" : null, onclick: () => { openProject(p.id); openSide(false); } },
      p.thumb ? el("img", { src: p.thumb, alt: "" }) : el("span", { class: "proj-ic", html: '<svg><use href="#i-3d"/></svg>' }),
      el("span", { class: "proj-txt" }, el("b", { text: p.name }), el("small", { text: meta(p) }), el("small", { class: "faint", text: timeAgo(p.updated) })));
    const more = el("button", { class: "icon-btn proj-more", type: "button", "aria-label": "More for " + p.name, html: '<svg><use href="#i-dots"/></svg>', onclick: e => { e.stopPropagation(); projMenu(p, more); } });
    li.append(open, more);
    listEl.append(li);
  });
}

let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
document.addEventListener("pointerdown", e => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); });
function projMenu(p, anchor) {
  closeMenu();
  const r = anchor.getBoundingClientRect();
  menuEl = el("div", { class: "pop", role: "menu" },
    el("button", { type: "button", role: "menuitem", text: "Rename", onclick: () => { closeMenu(); renameProject(p); } }),
    el("button", { type: "button", role: "menuitem", text: "Duplicate", onclick: () => { closeMenu(); duplicateProject(p); } }),
    el("button", { type: "button", role: "menuitem", text: "Export file", onclick: () => { closeMenu(); exportProject(p); } }),
    el("button", { type: "button", role: "menuitem", class: "danger-t", text: "Delete", onclick: () => { closeMenu(); removeProject(p); } }));
  document.body.append(menuEl);
  const mw = 170;
  menuEl.style.left = Math.min(window.innerWidth - mw - 8, r.left) + "px";
  menuEl.style.top = Math.min(window.innerHeight - 190, r.bottom + 4) + "px";
  menuEl.querySelector("button").focus();
}
async function freshCopy(p) { return ctx.p && ctx.p.id === p.id ? ctx.p : normalize(await getProject(p.id), user.email); }
async function renameProject(p) {
  const v = await modal({ title: "Rename room", fields: [{ label: "Name", value: p.name, required: true, maxlength: 60 }], ok: "Rename" });
  if (!v) return;
  const full = await freshCopy(p);
  full.name = v[0].trim().slice(0, 60); full.updated = Date.now();
  if (ctx.p && ctx.p.id === full.id) { $("#room-name").value = full.name; ctx.save(); await persist.flush(); } else await putProject(full);
  await refreshList();
}
async function duplicateProject(p) {
  flush();
  const full = structuredClone(await freshCopy(p));
  const n = normalize(full, user.email);
  n.id = blankProject(user.email).id; n.name = (p.name + " copy").slice(0, 60); n.created = n.updated = Date.now();
  await putProject(n); await refreshList(); await openProject(n.id); toast("Duplicated.");
}
function exportProject(p) {
  freshCopy(p).then(full => {
    const data = JSON.stringify({ makon: 1, exported: new Date().toISOString(), project: full });
    download((full.name || "room").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".makon.json", new Blob([data], { type: "application/json" }));
    toast("Project exported.");
  });
}
ctx.exportProject = () => exportProject(ctx.p);
async function removeProject(p) {
  if (!(await confirmBox("Delete “" + esc(p.name) + "”?", "Its photo, versions, plan and brief are removed from this browser. This can't be undone.", "Delete room"))) return;
  persist.flush();
  await deleteProject(p.id);
  await refreshList();
  if (ctx.p && ctx.p.id === p.id) {
    ctx.p = null;
    if (ctx.projects[0]) await openProject(ctx.projects[0].id); else await newProject(true);
  }
  toast("Room deleted.");
}
async function refreshList() { ctx.projects = await listProjects(user.email); renderProjects(); }

async function newProject(silent) {
  flush();
  const n = ctx.projects.length + 1;
  const p = blankProject(user.email, ctx.projects.length ? "Room " + String(n).padStart(2, "0") : "Untitled room");
  await putProject(p);
  await refreshList();
  await openProject(p.id);
  setMode("design");
  if (!silent) toast("New room created. Start with a photo or open the plan.");
}
$("#new-room").addEventListener("click", () => { newProject(); openSide(false); });

// import
$("#import-btn").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = "";
  if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    const raw = j && j.project ? j.project : j;
    if (!raw || typeof raw !== "object" || !raw.plan || !raw.design) throw new Error("bad");
    const p = normalize(raw, user.email);
    p.id = blankProject(user.email).id; p.updated = Date.now();
    await putProject(p); await refreshList(); await openProject(p.id);
    toast("Imported “" + p.name + "”.");
  } catch (err) { toast("That file isn't a Makon project.", "error"); }
});

// ---------- open a project ----------
const nameInput = $("#room-name");
nameInput.addEventListener("input", () => { if (!ctx.p) return; ctx.p.name = nameInput.value.slice(0, 60) || "Untitled room"; ctx.save(); });
nameInput.addEventListener("keydown", e => { if (e.key === "Enter") nameInput.blur(); });
nameInput.addEventListener("blur", () => { if (!nameInput.value.trim()) nameInput.value = ctx.p ? ctx.p.name : "Untitled room"; });

async function openProject(id) {
  if (ctx.p && ctx.p.id !== id) persist.flush();
  const raw = await getProject(id);
  if (!raw) { toast("That room couldn't be found.", "error"); return; }
  ctx.p = normalize(raw, user.email);
  try { localStorage.setItem(LAST, id); } catch (e) {}
  nameInput.value = ctx.p.name;
  setSave("Saved", "ok");
  renderProjects();
  ctx.bus.emit("project", ctx.p);
  ctx.bus.emit("mode", ctx.mode);
}

// ---------- modes ----------
const STAGE = { design: "design", plan: "plan", "3d": "three", furnish: null, build: "build" };
function showStage(name) { $$(".st").forEach(s => { s.hidden = s.id !== "st-" + name; }); }
function setMode(m) {
  if (!MODES.includes(m)) m = "design";
  ctx.mode = m;
  document.body.dataset.mode = m;
  $$("#modes button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
  $$(".ip").forEach(p => { p.hidden = p.id !== "in-" + (m === "3d" ? "three" : m); });
  showStage(m === "furnish" ? ctx.furnishView : STAGE[m]);
  $("#stage-switch").hidden = m !== "furnish";
  $("#stage-switch-3").hidden = m !== "furnish";
  try { history.replaceState(null, "", "?mode=" + m); } catch (e) {}
  $("#insp").scrollTop = 0;
  ctx.bus.emit("mode", m);
}
ctx.setMode = setMode;
ctx.showStage = showStage;
$$("#modes button").forEach(b => b.addEventListener("click", () => { setMode(b.dataset.mode); if (isMobile()) window.scrollTo({ top: 0 }); }));
// furnish: 2D / 3D switch
$$(".stage-switch button").forEach(b => b.addEventListener("click", () => {
  ctx.furnishView = b.dataset.s;
  $$(".stage-switch button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.s === ctx.furnishView)));
  showStage(ctx.furnishView);
  ctx.bus.emit("mode", ctx.mode);
}));

// keyboard
const typing = e => e.target.closest("input, textarea, select, [contenteditable]");
document.addEventListener("keydown", e => {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey || document.querySelector(".modal-wrap")) return;
  if (/^[1-5]$/.test(e.key)) { setMode(MODES[+e.key - 1]); e.preventDefault(); }
  if (e.key === "?") { help(); e.preventDefault(); }
});
function help() {
  modal({
    title: "Shortcuts", cancel: null, ok: "Got it",
    body: '<table class="keys"><tr><td><kbd>1</kbd>–<kbd>5</kbd></td><td>Design · Plan · 3D · Furnish · Build</td></tr>' +
      '<tr><td><kbd>V</kbd> <kbd>W</kbd> <kbd>D</kbd> <kbd>N</kbd> <kbd>M</kbd></td><td>Select · Wall · Door · Window · Measure</td></tr>' +
      '<tr><td><kbd>Enter</kbd> / <kbd>Esc</kbd></td><td>Finish / cancel a wall</td></tr>' +
      '<tr><td><kbd>R</kbd> / <kbd>Shift</kbd>+<kbd>R</kbd></td><td>Rotate selection 90° / 15°</td></tr>' +
      '<tr><td><kbd>Del</kbd></td><td>Delete selection</td></tr>' +
      '<tr><td><kbd>Ctrl</kbd>+<kbd>D</kbd></td><td>Duplicate selection</td></tr>' +
      '<tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd></td><td>Undo / redo in the plan</td></tr>' +
      '<tr><td><kbd>Arrows</kbd></td><td>Nudge selection 5 cm (Shift: 1 cm)</td></tr>' +
      '<tr><td><kbd>Alt</kbd> while dragging</td><td>Turn off snapping</td></tr>' +
      '<tr><td><kbd>F</kbd></td><td>Fit plan to screen</td></tr></table>'
  });
}
$("#help-btn").addEventListener("click", help);

// ---------- AI availability ----------
async function checkAI() {
  ctx.recheckAI = checkAI;
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 5000);
    let code = ""; try { code = localStorage.getItem("makon_ai_code") || ""; } catch (e) {}
    const r = await fetch("api/redesign", { signal: c.signal, headers: { Accept: "application/json", "x-makon-code": code } });
    clearTimeout(t);
    if (r.ok && (r.headers.get("content-type") || "").includes("json")) {
      const j = await r.json();
      ctx.ai = { enabled: !!j.enabled, provider: j.provider || null, model: j.model || null, needsCode: !!j.needsCode, maxInput: j.maxInput || 1280, configError: j.configError || null, limit: j.limit || 0, remaining: j.remaining ?? null, owner: !!j.owner, checked: true };
    } else ctx.ai.checked = true;
  } catch (e) { ctx.ai.checked = true; }
  ctx.bus.emit("ai", ctx.ai);
}

// ---------- boot ----------
(async function boot() {
  Design.init(ctx); Plan.init(ctx); Three.init(ctx); Furnish.init(ctx); Build.init(ctx);
  if (!(await persistent())) $("#side-note").textContent = "This browser is blocking storage, so rooms only last until you close the tab. Export to keep them.";
  await refreshList();
  if (!ctx.projects.length) {
    const p = blankProject(user.email, "Untitled room");
    await putProject(p); await refreshList();
  }
  let last = null; try { last = localStorage.getItem(LAST); } catch (e) {}
  const start = ctx.projects.find(p => p.id === last) || ctx.projects[0];
  const qm = new URLSearchParams(location.search).get("mode");
  ctx.mode = MODES.includes(qm) ? qm : "design";
  await openProject(start.id);
  setMode(ctx.mode);
  document.body.classList.add("ready");
  checkAI();
})().catch(err => { console.error(err); toast("Something went wrong loading the studio. Try reloading the page.", "error"); });
