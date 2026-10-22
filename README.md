# Makon — redesign your room with AI

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

Without a key everything works and Design makes on-device mood previews. To get real AI redesigns:

1. Vercel → your project → **Settings → Environment Variables**
2. Add `OPENAI_API_KEY` = your key from platform.openai.com
3. Optional: `MAKON_ACCESS_CODE` = any password (strongly recommended — otherwise anyone with your link can spend your credits; users enter the code once in the Design panel)
4. Optional: `MAKON_IMAGE_MODEL` (default `gpt-image-1.5`), `MAKON_IMAGE_QUALITY` = `low` | `medium` | `high` (default `medium`)
5. Redeploy. The Design panel will show “AI renders connected”.

The function is `api/redesign.js`. It sends the photo + a prompt built from the room type, style, kept elements, daylight and notes to OpenAI’s image-edit endpoint. Each render costs OpenAI credits.

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
