# LAIGO Frontend

Turn any image into a LEGO mosaic. Upload a photo, tune the parameters, and get a build pack — piece list and instructions ready for [Pick a Brick](https://www.lego.com/en-us/pick-and-build/pick-a-brick).

> LAIGO is an independent fan project. Not affiliated with, endorsed by, or sponsored by the LEGO Group. LEGO is a trademark of the LEGO Group.

---

## Run it

```powershell
# install
npm install

# dev server on http://localhost:5173
npm run dev

# production build to dist/
npm run build

# preview the production build locally
npm run preview

# lint
npm run lint
```

If you hit a TLS / `UNABLE_TO_VERIFY_LEAF_SIGNATURE` error during `npm install`, run with the system CA store:

```powershell
$env:NODE_OPTIONS="--use-system-ca"; npm install
```

---

## Environment

Configure the backend URL with `VITE_API_URL` in `.env`:

```
VITE_API_URL=https://laigo.onrender.com
```

If unset, the frontend falls back to `http://localhost:8000`. The frontend probes `GET /health` on load to drive the status pill in the nav.

For local backend development, drop the override into `.env.local` (gitignored) so the shared `.env` keeps pointing at Render:

```
VITE_API_URL=http://localhost:8000
```

Vite only reads env files at startup — restart `npm run dev` after changes.

---

## What's in the UI

| Area | What it does |
|------|--------------|
| **Navbar** | LAIGO wordmark (LegoThick brick font), API status pill (online / offline / checking), dark/light toggle. |
| **Hero** | Marketing headline + tagline. |
| **Parameters card** | Image upload (drag-drop), block-width slider (1–10), 2D/3D segmented control, % background-color slider (3D only), Frame toggle, Convert CTA. |
| **Output card** | Idle: draggable CSS-3D placeholder LEGO cube. Queued: queue-position chip. Running: animated brick-stacking loader. Complete: real Three.js mosaic (instanced studs, frame walls, baseplate) with orbit-controls, Reset + Expand buttons in the corner, and a Stripe checkout panel below. Expand pops the mosaic into a near-full-screen modal that opens at the same camera angle/zoom. Failed: error breakdown. |

### Design system

- **Palette** — violet (`violet-500/600/700`) base, **LEGO yellow `#FFD700`** as the primary action accent.
- **Typography** — Inter for UI, JetBrains Mono for code/numbers, LegoThick for the LAIGO wordmark, Nunito retained for any legacy surface.
- **Surfaces** — glassmorphic cards with subtle ambient violet/yellow orbs in the background. Stud rivets sit on the top edge of each card and the Convert button as a subtle LEGO accent.
- **Motion** — Framer Motion (`framer-motion`) drives the hero stagger, segmented-control active indicator, drag-rotate cube, brick-stacking loader, and button hover/press transforms.
- **Dark mode** — class-based, follows system preference on first load, then persisted to `localStorage`.

---

## Project layout

```
src/
  api.ts                       # health, submitJob, getJob, getPreview, getDownloadUrl, buildFormData + PreviewError class
  index.css                    # Tailwind layers, fonts (LegoThick, Nunito), glass/gradient/glow utilities
  main.jsx                     # ReactDOM entry — mounts <App/>
  App.tsx                      # Top-level layout: orbs + Navbar + Hero + Form/Output grid + disclaimer
  util.ts                      # cn() helper (clsx + tailwind-merge)

  components/
    Navbar.tsx                 # Sticky glass nav with wordmark + status pill + theme toggle
    LaigoWordmark.tsx          # Inline SVG wordmark built from LegoThick glyph paths
    ParameterForm.tsx          # Form values + Convert flow (submits + polls API)
    ConvertButton.tsx          # Violet button with LEGO-yellow progress fill + stud strip
    OutputPanel.tsx            # idle / queued / running / complete / failed state machine
    BrickPreview3D.tsx         # Placeholder CSS-3D cube + mounts MosaicScene once previewData loads
    MosaicScene.tsx            # Three.js mosaic — InstancedMesh per palette color, frame walls, OrbitControls
    MosaicExpandedView.tsx     # Portal'd near-full-screen modal that hands camera state over from the small preview
    StudStackingLoader.tsx     # Framer Motion loader — bricks drop and stack on loop
    ErrorBoundary.tsx          # React error boundary

  ui/
    Button.tsx                 # Motion button — primary | yellow | secondary | ghost | outline
    Slider.tsx                 # Radix slider — violet→yellow gradient range
    SegmentedControl.tsx       # Radix-style radiogroup with motion layout indicator
    ImageUpload.tsx            # Drop-zone + click-to-browse + preview, max 10MB
    StudStrip.tsx              # Decorative row of LEGO studs (top edge of cards/buttons)

  hooks/
    useDarkMode.ts             # System-aware dark-mode toggle, persists to localStorage
    useJob.ts                  # Polls /jobs/:id, fetches /preview on complete, exposes downloadUrl + previewData + previewError

  fonts/                       # LegoThick + Nunito (kept; used by legacy + wordmark)
  legacy/                      # Pre-2026 UI — see "Legacy" below

public/                        # Favicons + manifest; brickStackNobg.gif (no longer used)
```

### Data flow

1. `App` calls `health()` on mount → drives `apiStatus` pill in the nav.
2. `ParameterForm` collects `{ image, blockWidth, mosaicType, backgroundPercent, framed }`.
3. On **Convert**, it calls `buildFormData(...)` then `submitJob(...)`, gets back a `job_id`, and lifts it to `App` via `onJobCreated`.
4. `useJob(jobId)` polls `GET /jobs/:id` and drives the `OutputPanel` state machine:
   - `queued` → queue-position chip
   - `running` → brick-stacking loader + live progress
   - `complete` → fires a one-shot `GET /jobs/:id/preview` to grab the 3D mosaic JSON, then `BrickPreview3D` swaps the placeholder cube for a `MosaicScene` rendering the real mosaic. `PREVIEW_NOT_AVAILABLE` silently keeps the placeholder; `PREVIEW_CORRUPTED` / schema mismatch surfaces as a banner in the preview card (download still works).
   - `failed` → error breakdown
5. `ConvertButton` also tracks the in-flight job locally so its progress fill matches the output state without re-fetching.
6. **Expand button** on the preview card snapshots the small scene's camera state (`position`, `target`, auto-rotate flag) and hands it to `MosaicExpandedView`, which portals a near-full-screen modal to `document.body`. The modal opens at the exact same angle and zoom the user was looking at.

### Backend contract

The API is expected to expose:

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/health` | drives the status pill (any 2xx = online) |
| `POST` | `/generate` | multipart: `file`, `mosaic_block_width`, `mosaic_type`, `background_color_percent`, `to_frame`. Returns `{ job_id }`. |
| `GET`  | `/jobs/:id` | `{ status, progress?, queue_position?, preview_url?, error? }` |
| `GET`  | `/jobs/:id/preview` | 3D mosaic JSON — `{ schema_version, mosaic_type, width_studs, height_studs, palette[], background_grid[][], foreground_grid?[][], frame, ... }`. Fetched once the job hits `complete`. |
| `GET`  | `/jobs/:id/download` | streams the ZIP build pack |

Error contract for `/jobs/:id/preview`: `{ detail: { error, code } }` with codes `PREVIEW_NOT_AVAILABLE` (404 — job missing, in progress, failed, or evicted) and `PREVIEW_CORRUPTED` (500). The frontend matches on `detail.code`, not the error string. The frontend also refuses payloads with `schema_version` higher than it knows how to render (`SUPPORTED_PREVIEW_SCHEMA` in `src/api.ts`).

---

## Legacy (the old "2010" UI)

The previous LEGO-wall UI (falling-brick canvas background, brick-stud panels, brick-font title with status, LegoButton/LegoProgressButton) is preserved in `src/legacy/` for reference. It's not imported by the new app and won't ship in the build. Files:

```
src/legacy/
  Laigo.tsx, LaigoTitle.tsx, LaigoBrickCanvas.tsx
  LegoButton.tsx, LegoProgressButton.tsx
  parameter-form.tsx, output-panel.tsx
  index.css
  assets/{button,label,slider,switch}.tsx   # shadcn-style primitives
```

If you ever want to mount the old UI temporarily, swap `App.tsx` for `legacy/Laigo.tsx` in `src/main.jsx` and re-import `legacy/index.css`.

---

## Tech stack

- **React 19** + **Vite 7**
- **TypeScript** (per-file; `.jsx` for entry, `.tsx` for components)
- **Tailwind CSS 3** with `darkMode: 'class'`
- **Framer Motion 12** for animation
- **Three.js** + **@react-three/fiber 9** + **@react-three/drei 10** for the 3D mosaic scene (InstancedMesh per palette color, OrbitControls, real LEGO stud geometry)
- **Radix UI** (`react-slider`) for accessible controls
- **lucide-react** for iconography
