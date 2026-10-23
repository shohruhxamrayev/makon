# Makon — redesign your room with AI

Made by [Shohruh Xamrayev](https://www.shohruhxamrayev.uz), founder of Makon. Case study: [shohruhxamrayev.uz/projects/makon](https://www.shohruhxamrayev.uz/projects/makon.html).

Makon (“a place to live”) takes one photo of a room and carries it all the way to a build brief:

| Tool | What it does |
|---|---|
| **Design** | Upload / take / paste a photo (or use the sample). 10 styles, change strength, daylight direction, “keep exactly as is” locks, client notes. **AI render** (when connected) or instant on-device **mood preview** (real Lab colour transfer). Before/after slider, side-by-side, full screen, version history (24), refine in plain words with undo, palette extraction with copyable colour codes, download. |
| **Plan** | 2D floor-plan editor: rectangle / L-shape templates or draw walls (vertex, right-angle and alignment snapping), doors & windows on walls (swing, hinge, sill, size), drag corners / walls / openings, tape measure, calibrate from one measured wall, edit any wall length, area & perimeter, metric/imperial, undo/redo, pinch-zoom & two-finger pan, PNG export. |
| **3D** | The plan as a lit 3D room with real wall openings, glass, doors, skirting, plank/tile floor textures. Perspective, top, front, side and eye-level cameras, cut-away walls, shadows, sun follows the daylight direction, drag furniture on the floor, snapshot. |
| **Furnish** | 46 pieces at real sizes. New pieces find free space (sofas, beds, TV units… go back-to-wall). Fit checks: through-a-wall, outside the room, overlaps, blocked door swings, walkways under 60 cm. Resize, recolour, rotate, duplicate. Your own prices + shop-similar links (Google Shopping, IKEA, Amazon, Pinterest). |
| **Build** | Live brief: checklist, before/after, materials, plan drawing, wall table, **quantities** (paint litres, ceiling paint, flooring + waste, skirting), furniture schedule, budget bar with overspend warning. Print / PDF, copy, .txt, project export/import. |

Also: multiple rooms per account (rename, duplicate, export, delete, search), autosave to IndexedDB, keyboard shortcuts (`?`), phone layout with bottom tab bar and drawer.

## Run locally

The Studio uses JavaScript modules, so open it through a local server (double-clicking the file won’t work):

```bash
npx serve .          # or: python3 -m http.server 8000
```

## Deploy on Vercel (recommended)

1. Push this folder to a GitHub repo (upload **the contents**, not the folder).
2. vercel.com → **Add New → Project** → import the repo → Framework preset **Other** → Deploy.

### Switch on real AI renders (optional)

Without any key everything works and Design makes on-device mood previews. Pick ONE provider:

**Free — Cloudflare Workers AI (FLUX.2 Klein, about 100 renders a day)**
1. Sign up free at dash.cloudflare.com. Copy your **Account ID** (Workers AI page, or the right side of the account home).
2. My Profile → API Tokens → Create Token → template **Workers AI** → Create. Copy the token.
3. In Vercel → Settings → Environment Variables add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.

**Paid — OpenAI (best quality, a few cents per render)**
- Add `OPENAI_API_KEY` (starts with `sk-`). Optional: `MAKON_IMAGE_MODEL` (default `gpt-image-1.5`, cheaper: `gpt-image-1-mini`), `MAKON_IMAGE_QUALITY` = `low` | `medium` | `high`.

**Per-person daily limit:** each visitor gets 5 AI renders a day by default (failed renders don't count). Change it with `MAKON_DAILY_LIMIT` (e.g. `10`, or `0` for no per-person limit). The count is kept in server memory, which is good but can reset when Vercel starts a new server. For an exact limit, create a free database at upstash.com (Redis) and add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

**Owner (no limit for you):** add `MAKON_OWNER_CODE` = your private password. In the Studio click “Site owner? Enter your code” once — that browser then skips the access code and the daily limit.

For either: add `MAKON_ACCESS_CODE` = any password (optional) so only people you share it with can render, then **Redeploy**. If both providers are set, OpenAI is used.

GitHub Pages also works (no AI renders there — it can’t run the function).

## Accounts and data

Accounts and projects are stored in the visitor’s browser (localStorage + IndexedDB). That’s fine for a demo/portfolio and for single-device use; projects can be exported/imported as files. For real multi-device accounts, swap `js/auth.js` and `js/studio/store.js` for a backend such as Supabase or Firebase — the rest of the app only calls their functions.

## Files

```
index.html  signin.html  signup.html  studio.html  404.html  dashboard.html (redirects to studio)
css/site.css            landing + sign-in pages
css/studio.css          Studio (desktop, phone, print)
js/landing.js  js/auth.js  js/auth-page.js
js/studio/app.js        shell: projects, saving, modes
js/studio/design.js     photo, styles, renders, versions, refine
js/studio/engine.js     on-device colour/light transfer + palette
js/studio/plan.js       2D editor, fit checks
js/studio/scene3d.js    3D view
js/studio/furnish.js    catalogue, prices, shopping
js/studio/build.js      brief, quantities, exports
js/studio/data.js       styles, room types, furniture catalogue  ← add styles/furniture here
js/studio/geom.js  store.js  util.js
api/redesign.js         optional AI endpoint (Vercel)
vendor/                 three.js r160 (bundled, no CDN needed)
```
