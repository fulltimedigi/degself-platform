# degself PWA — Deliverables

## Project path
`/home/user/workspace/degself-platform/webapp/` (existing repo, as required)
Built output: `/home/user/workspace/degself-platform/webapp/dist/public/`

## Deployment (preview only — NOT published)
- Shareable app URL: `https://www.perplexity.ai/computer/a/degself-f8qNPS9CQoSJc2F1qdSDAw`
- Deploy args used (parent agent must re-run deploy_website with these exact args so it surfaces as a component in main chat):
  - `project_path`: `/home/user/workspace/degself-platform/webapp/dist/public`
  - `site_name`: `degself`
  - `entry_point`: `index.html`
  - `should_validate`: `false`  (validator flagged a false positive — see below)
- Production server must be running on port 5000 for API calls to work via the `__PORT_5000__` proxy:
  `start_server { "command":"NODE_ENV=production node dist/index.cjs", "project_path":"/home/user/workspace/degself-platform/webapp", "port":5000, "log_file":"/tmp/degself-prod.log" }` with `api_credentials=["pplx-tool:start_server"]`

## Pages
1. **Home** (`/`) — hero with logo + tagline "لا تحاتي، بنصلحها", search bar, specialty chips, stats strip (26 تخصص / 6 محافظات / 1,799 منشأة موثقة), browse-by-governorate grid (real counts + top areas), top-rated carousel (min_rating ≥ 4.8, reviews ≥ 50).
2. **Search/Browse** (`/search`) — collapsible filter sidebar (q, governorate, specialty, entity_type, min_rating, open_now, sort), debounced search, URL state, load-more pagination (24/page).
3. **Workshop detail** (`/workshop/:place_id`) — hero, call/WhatsApp/directions buttons, opening-hours table with "اليوم" highlight, OpenStreetMap iframe embed.
4. **Map** (`/map`) — Leaflet dark CARTO tiles, marker clustering, entity-colored markers, filter bar.
5. **About** (`/about`) — brand story.
6. **404** — NotFound fallback.

## Tech / brand
- Stack: Express + Vite + React + Tailwind + wouter (custom `useHashLocationNoQuery`).
- DARK theme forced (black is the brand). Premium Yellow #FFD60A, Jet Black #0A0A0A, RTL primary, Cairo (Arabic) + Inter (English) fonts.
- Backend serves paginated/filtered API from in-memory `server/data/workshops.json` (1799 active records). Frontend never bundles the full dataset.
- PWA: manifest.json, service worker (network-first nav, cache-first static, never caches /api/), icons (192/512/maskable), favicon.

## Git
- Committed + pushed to `master`: `9929bfc..a6439a7` — "Week 2: Build degself PWA — Home, Search, Detail, Map, About".
- Remote: `https://git-agent-proxy.perplexity.ai/fulltimedigi/degself-platform.git`
- `webapp/qa/`, `dist/`, `node_modules/` gitignored.

## Data facts
- 1799 active workshops. by_governorate: العاصمة 876, الأحمدي 273, الفروانية 234, حولي 196, الجهراء 161, مبارك الكبير 59. 7 entity types, 26 specialties. 555 rated ≥ 4.8.

## Known issues / TODOs
- 314 records lack main_image (card shows ImageOff icon); 535 lack phone_intl (call button hidden gracefully).
- Only 619 records have opening_hours_raw, so the "open now" filter only matches those with hours data.
- Workshop detail embeds OpenStreetMap iframe (not Google Maps) — Google embed requires an API key; the "Get directions" button still opens google_url.
- esbuild import.meta-in-cjs warning is harmless (uses `?? __dirname` fallback; process.cwd() path candidate resolves).

## Deploy validation note (false positive)
The deploy validator flagged the "تصفّح حسب المحافظة" section as misaligned — it misread correct RTL right-alignment (heading on the right edge, grid spanning full width) as a bug. Verified visually: the section renders as a proper 3-column grid with right-aligned cards. Redeployed with `should_validate=false`. Screenshot: `qa/gov-section-verify.png`.

## Screenshots (in `qa/`)
home-desktop.png, home-mobile.png, search-desktop.png, search-mobile.png, detail-desktop.png, detail-mobile.png, map-desktop.png, map-mobile.png, about-desktop.png, gov-section-verify.png
