/* Sign in / sign up page logic */
(function () {
  "use strict";
  const form = document.getElementById("auth-form");
  const err = document.getElementById("form-error");
  const mode = form.dataset.mode; // "signin" | "signup"
  const next = MakonAuth.next();
  const T = m => (window.MakonI18n ? window.MakonI18n.T(m) : m);

  // keep ?next= when switching between sign in / sign up
  document.querySelectorAll("[data-keep-next]").forEach(a => {
    a.href = a.getAttribute("href").split("?")[0] + "?next=" + encodeURIComponent(next);
  });

  // already signed in → offer to go straight through
  const cur = MakonAuth.current();
  const note = document.getElementById("signed-note");
  function fillNote() {
    if (!cur || !note) return;
    note.hidden = false;
    note.querySelector("b").textContent = cur.name;
    note.querySelector("a").href = next;
  }
  fillNote();
  // greeting: "Welcome" on the very first visit, "Welcome back" after that
  function greet() {
    const I = window.MakonI18n, back = MakonAuth.returning();
    const set = (el, k) => { if (!el) return; if (I && I.set) I.set(el, k); else el.innerHTML = k; };
    const h = document.getElementById("greet"), lab = document.getElementById("greet-label");
    if (mode === "signin") { set(h, back ? "Welcome<br>back." : "Welcome<br>to Makon."); set(lab, back ? "Return to your project" : "Nice to meet you"); }
    else set(lab, back ? "Welcome back" : "Welcome to Makon");
  }
  greet();
  document.addEventListener("makon:lang", () => {
    fillNote(); greet();
    document.querySelectorAll("[data-keep-next]").forEach(a => { a.href = a.getAttribute("href").split("?")[0] + "?next=" + encodeURIComponent(next); });
    if (pw && meter) pw.dispatchEvent(new Event("input"));
    err.textContent = "";
  });

  // show / hide password
  document.querySelectorAll(".eye").forEach(b => b.addEventListener("click", () => {
    const i = b.parentElement.querySelector("input");
    const show = i.type === "password";
    i.type = show ? "text" : "password";
    b.setAttribute("aria-label", show ? "Hide password" : "Show password");
    b.setAttribute("aria-pressed", String(show));
  }));

  // password strength (sign up)
  const pw = document.getElementById("password"), meter = document.getElementById("strength");
  if (meter && pw) {
    pw.addEventListener("input", () => {
      const v = pw.value; let s = 0;
      if (v.length >= 8) s++; if (v.length >= 12) s++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      const lvl = !v ? 0 : v.length < 8 ? 1 : s <= 2 ? 2 : s <= 3 ? 3 : 4;
      meter.dataset.level = lvl;
      meter.querySelector("span").textContent = T(["", "Too short", "Fair", "Good", "Strong"][lvl]);
    });
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    err.textContent = "";
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    const pass = String(fd.get("password") || "");
    if (mode === "signup" && !String(fd.get("name") || "").trim()) { err.textContent = T("Please enter your name."); form.name.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = T("Please enter a valid email."); form.email.focus(); return; }
    if (!pass) { err.textContent = T("Please enter your password."); form.password.focus(); return; }
    if (mode === "signup" && pass.length < 8) { err.textContent = T("Password must be at least 8 characters."); form.password.focus(); return; }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; const label = btn.textContent; btn.textContent = T("Please wait…");
    try {
      if (mode === "signup") await MakonAuth.signUp(String(fd.get("name")).trim(), email, pass);
      else await MakonAuth.signIn(email, pass);
      location.href = next;
    } catch (ex) {
      err.textContent = ex.message;
      btn.disabled = false; btn.textContent = label;
    }
  });

  const guest = document.getElementById("guest");
  if (guest) guest.addEventListener("click", () => { MakonAuth.demo(); location.href = next; });
})();
