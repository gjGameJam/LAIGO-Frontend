# CLAUDE.md — LAIGO Frontend

React + Three.js app: image → LEGO mosaic. User uploads a photo, tunes parameters, backend runs color-quantization, frontend renders the result as an interactive 3D mosaic. Optionally buy the parts via a Stripe + BrickOwl checkout saga.

---

## Running

```powershell
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # tsc -b && vite build → dist/
npm run typecheck    # tsc -b (no emit — fastest type check)
npm run lint
npm run preview      # preview the production build
```

**Backend URL:** set `VITE_API_URL` in `.env` (shared file points at Render). For local backend work, use `.env.local` (gitignored):
```
VITE_API_URL=http://localhost:8000
```
Vite only reads env files at startup — restart dev server after changes.

**TLS error on install:** `$env:NODE_OPTIONS="--use-system-ca"; npm install`

---

## Architecture

### Data flow

1. `App` → `health()` on mount → drives status pill in Navbar
2. `ParameterForm` collects `{ image, blockWidth, mosaicType, backgroundPercent, framed }`
3. Convert → `buildFormData()` → `submitJob()` → `job_id` lifted to `App` via `onJobCreated`
4. `useJob(jobId)` polls `GET /jobs/:id` → drives `OutputPanel` state machine:
   - `queued` → queue chip
   - `running` → brick-stacking loader + live progress %
   - `complete` → one-shot `GET /jobs/:id/preview` → `BrickPreview3D` swaps CSS cube for `MosaicScene`
   - `failed` → error breakdown
5. Expand button: snapshots camera `{ position, target, isAutoRotating }` from `MosaicScene` ref, hands to `MosaicExpandedView` portal

### Key files

```
src/
  api.ts                     Core API client (health, submitJob, getJob, getPreview, buildFormData, PreviewError)
  checkoutApi.ts             Checkout + donation API client
  App.tsx                    Root layout; owns apiStatus + jobId state
  util.ts                    cn() helper (clsx + tailwind-merge)

  components/
    ParameterForm.tsx         Image upload, sliders, Convert + polling orchestration
    OutputPanel.tsx           State-machine renderer (idle/queued/running/complete/failed)
    BrickPreview3D.tsx        CSS-3D placeholder cube → MosaicScene swap
    MosaicScene.tsx           Three.js canvas: InstancedMesh/color, OrbitControls, wall hooks on back face
    MosaicExpandedView.tsx    Portal modal; inherits camera state from inline preview
    StudStackingLoader.tsx    Framer Motion brick-stacking animation
    checkout/
      StripeCheckoutPanel.tsx  Shipping → quote → pay → saga state machine UI
      StripeEmbedSlot.tsx      Stripe Embedded Checkout mount point (placeholder — see below)
      ShippingStep.tsx         Email + country + ZIP form

  hooks/
    useJob.ts                 Polls /jobs/:id; fetches /preview on complete
    useCheckout.ts            Checkout state machine (shipping→quoting→review→paying→processing→done)
    useDarkMode.ts            System-aware dark mode; persists to localStorage

  ui/                        Button, Slider, SegmentedControl, ImageUpload, StudStrip primitives
  legacy/                    Pre-2026 "brick wall" UI — not imported, won't ship (see bottom of file)
```

---

## Backend contract

### Core endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | any 2xx = online |
| POST | `/generate` | multipart: `file`, `mosaic_block_width`, `mosaic_type`, `background_color_percent`, `to_frame` → `{ job_id }` |
| GET | `/jobs/:id` | `{ status, progress?, queue_position?, preview_url?, error? }` |
| GET | `/jobs/:id/preview` | mosaic JSON — see `PreviewData` in `api.ts` |
| GET | `/jobs/:id/download` | streams ZIP build pack |

### PreviewData shape

```json
{
  "schema_version": 1,
  "job_id": "...",
  "mosaic_type": "2d" | "3d",
  "width_studs": 32,
  "height_studs": 32,
  "block_width": 2,         ← baseplates wide  (width_studs / 16)
  "block_height": 2,        ← baseplates tall  (height_studs / 16)
  "has_frame": true,
  "foreground_lift_plates": 1,
  "frame": { "thickness_studs": 1, "height_plates": 6, "palette_index": 0 },
  "palette": [{ "hex": "#1B2A34", "element_id": null }, ...],
  "background_grid": [[1,2,...], ...],
  "foreground_grid": [[1,-1,...], ...]   ← 3D only; -1 = empty cell
}
```

`SUPPORTED_PREVIEW_SCHEMA = 1` in `api.ts` — bump when the shape changes.

Preview error codes: `PREVIEW_NOT_AVAILABLE` (404) | `PREVIEW_CORRUPTED` (500) | `PREVIEW_SCHEMA_TOO_NEW` | `PREVIEW_UNKNOWN`. Frontend matches on `detail.code`.

### Checkout endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/checkout/gate` | `{ mode: 'disabled'\|'test'\|'live', is_open, payment_provider }` |
| POST | `/jobs/:id/checkout/quote` | body: `{ shipping_country, shipping_zip, customer_email }` → `QuoteResponse` |
| POST | `/jobs/:id/checkout/session` | **backend TODO** — returns `{ client_secret, checkout_id }` for Stripe Embedded Checkout |
| GET | `/jobs/:id/checkout/:checkoutId/status` | saga status polling |
| POST | `/donate` | `{ amount_cents }` (≥ 50) → `{ client_secret }` PaymentIntent |

Saga terminal states: `payment_captured` (success), `compensated`, `failed`, `manual_review`. Always render `customer_message`, never `error`.

---

## 3D scene

The mosaic sits in the **X-Z plane, Y-up**. Front (studs) faces +Y. Centered on origin.

**LEGO stud-units** (1 unit = 1 stud = 8mm):

| Constant | Value | mm |
|----------|-------|----|
| PLATE_H | 0.4 | 3.2 |
| STUD_H | 0.225 | 1.8 |
| STUD_R | 0.3 | 2.4 |

Baseplate back face: `Y = -PLATE_H = -0.4`. Top of the mosaic image = negative-Z edge.

**Rendering:** one `InstancedMesh` per unique palette color — efficient up to ~400k cells.

**OrbitControls:** full 0–180° polar sweep (no `maxPolarAngle` constraint), so the mosaic can be flipped to reveal the back face. Zoom: `span * 0.4` – `span * 3`.

**Wall hooks (`WallHooks` component):** rendered on the back face, visible when flipped. Count mirrors backend `MosiacToOrder.py`: `min(block_width * block_height, 2)`. Positions: Y = back face − 0.2; Z = 25% down from the top edge; X = 0 (1 hook) or ±25% width (2 hooks).

---

## Known gotchas

### Avast Web Shield — `vite.config.js`

Avast falsely flags drei bundle patterns as obfuscation and resets the connection mid-transfer, white-paging the dev server. The `fixAvastFalsePositive` plugin in `vite.config.js` patches the pre-bundled `@react-three_drei.js` at the HTTP middleware level:

- `.toString()` → `+ ""` (23 occurrences — string coercion, semantically identical)
- `String.fromCharCode(` → `String.fromCodePoint(` (identical for BMP 0–0xFFFF)
- Rewrites relative chunk imports to absolute versioned paths (prevents dual-instance R3F context break — *"Hooks can only be used within the Canvas component!"*)

Do not remove this plugin.

### Stripe Embedded Checkout — incomplete

`StripeEmbedSlot.tsx` renders a placeholder with a "Simulate paid" button. The Stripe packages (`@stripe/react-stripe-js`, `@stripe/stripe-js`) are already installed. Remaining work:

1. Wire `loadStripe(VITE_STRIPE_PK)` + `<EmbeddedCheckoutProvider>` / `<EmbeddedCheckout>` in `StripeEmbedSlot.tsx`
2. Backend: `POST /jobs/:id/checkout/session` — create a Stripe Checkout Session, return `client_secret`
3. Backend: webhook for `checkout.session.completed` to advance the saga via `checkout_id`
4. Add `VITE_STRIPE_PK=pk_test_...` to `.env`

### All logging gated on `DEV`

`api.ts` and `checkoutApi.ts` suppress all `console.log/error` in production. Don't add bare console calls to those files.

---

## What's complete vs. in-progress

**Complete:**
- Full conversion pipeline (2D/3D, framing, color quantization)
- 3D preview with full 360° orbit + back-face wall hooks
- Checkout shipping form + BrickOwl/LEGO quote flow
- Saga status polling + customer-facing progress messages
- Donation / tip flow (PaymentIntent; backend contract defined in `checkoutApi.ts`)

**In progress (backend or SDK work needed):**
- Stripe Embedded Checkout session endpoint + frontend SDK wiring
- Stripe webhook → saga advancement

---

## Legacy

`src/legacy/` — previous "brick wall" UI (2025). Not imported, won't ship. To mount temporarily: swap `main.jsx` to import `legacy/Laigo.tsx` instead of `App.tsx` and re-import `legacy/index.css`.
