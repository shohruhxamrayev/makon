/* Makon — browser-only accounts.
   Accounts live in this browser's localStorage so every page works on a static host.
   To use real accounts, replace these functions with Supabase / Firebase / Clerk calls —
   the rest of the site only uses MakonAuth.current(), signIn(), signUp(), demo(), signOut(). */
(function () {
  "use strict";
  const USERS = "makon_users", SESSION = "makon_session";

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }
  let memSession = null; // fallback when storage is blocked

  async function hash(text) {
    try {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("makon|" + text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) { /* fall through */ }
    let h = 0; for (let i = 0; i < text.length; i++) { h = (h << 5) - h + text.charCodeAt(i); h |= 0; }
    return "x" + (h >>> 0).toString(16);
  }

  const Auth = {
    async signUp(name, email, password) {
      email = email.trim().toLowerCase();
      const users = read(USERS, {});
      if (users[email]) throw new Error("An account with this email already exists. Try signing in.");
      users[email] = { name: name.trim(), email, pw: await hash(email + ":" + password), created: Date.now() };
      if (!write(USERS, users)) throw new Error("This browser is blocking storage. Use guest mode or allow site data.");
      Auth._start(users[email]);
      return users[email];
    },
    async signIn(email, password) {
      email = email.trim().toLowerCase();
      const users = read(USERS, {});
      const u = users[email];
      if (!u || u.pw !== await hash(email + ":" + password)) throw new Error("Email or password is incorrect.");
      Auth._start(u);
      return u;
    },
    demo() {
      const u = { name: "Guest", email: "guest@makon.local", guest: true };
      Auth._start(u); return u;
    },
    rename(name) {
      const s = Auth.current(); if (!s) return;
      s.name = name; memSession = s; write(SESSION, s);
      const users = read(USERS, {});
      if (users[s.email]) { users[s.email].name = name; write(USERS, users); }
    },
    _start(u) {
      const s = { name: u.name, email: u.email, guest: !!u.guest, at: Date.now() };
      memSession = s;
      write(SESSION, s);
    },
    current() { return read(SESSION, null) || memSession; },
    signOut() { memSession = null; try { localStorage.removeItem(SESSION); } catch (e) {} },
    next(fallback) {
      const n = (new URLSearchParams(location.search).get("next") || fallback || "studio.html").replace(/^\//, "");
      // only allow same-site relative pages
      return /^[a-z0-9_\-]+\.html(\?[a-z0-9=&_\-]*)?(#[a-z0-9\-]+)?$/i.test(n) ? n : "studio.html";
    }
  };
  window.MakonAuth = Auth;
})();
