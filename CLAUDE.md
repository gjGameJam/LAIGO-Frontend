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
    MosaicStatsChip.tsx       Top-center pieces + est. cost pill (inline preview + expanded modal)
    StudStackingLoader.tsx    Framer Motion brick-stacking animation
    checkout/
      StripeCheckoutPanel.tsx  Shipping → quote → pay → saga state machine UI
      StripeEmbedSlot.tsx      Stripe Embedded Checkout mount point (placeholder — see below)
      ShippingStep.tsx         Email + country + ZIP form
      BuildPackPaymentForm.tsx Pay-what-you-want card form: tokenize (createPaymentMethod)
                               → POST /jobs/:id/pay → handleNextAction on requires_action.
                               Needs Elements paymentMethodCreation: 'manual' (set in OutputPanel)

  hooks/
    useJob.ts                 Polls /jobs/:id; fetches /preview on complete
    useJobStats.ts            One-shot /jobs/:id/stats fetch; 'unavailable' hides the stats chip
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
| GET | `/jobs/:id/stats` | `{ piece_count, estimated_cost_cents: number\|null, currency?, pricing_as_of? }` for the preview stats chip; 404/malformed → chip hidden |

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
| POST | `/jobs/:id/pay` | pay-what-you-want build pack. `{ amount_cents ≥ 0, payment_method_id? (pm_…, required when > 0), email (required for ALL amounts, incl. 0) }` → `{ status: 'free'\|'paid'\|'requires_action', … }`. On `requires_action`, run 3DS with `client_secret` and do **not** re-call `/pay` — the webhook finishes and sends the email |
| POST | `/donate` | `{ amount_cents }` (≥ 50) → `{ client_secret }` PaymentIntent. No email — tips are never emailed |

Saga terminal states: `payment_captured` (success), `compensated`, `failed`, `manual_review`. Always render `customer_message`, never `error`.

`/pay` errors come in two shapes — business rules `{ detail: { error, code } }` (codes incl. `AMOUNT_BELOW_MINIMUM` + `min_cents`, `PAYMENT_METHOD_REQUIRED`, `PAYMENTS_UNAVAILABLE`…; render `detail.error`) and FastAPI 422 field validation `{ detail: [{ loc, msg }] }` (entries with `email` in `loc` show inline on the email input — see `PayError` in `checkoutApi.ts`). The backend emails the build pack after every completed checkout (fire-and-forget; send outcomes never surface in `/pay` responses, and `/download` stays ungated). Server email validation: trimmed, ≤ 254 chars, `^[^@\s]+@[^@\s]+\.[^@\s]+$` — the frontend mirrors this loosely, never stricter.

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

### Avast false positive — `vite.config.js`

Avast falsely flags drei bundle patterns as obfuscation. Two shields fire: Web Shield resets the HTTP transfer (white page), and File Shield quarantines `node_modules/.vite/deps/@react-three_drei.js` **as it's written**, leaving a 0-byte `asw-…` marker — Vite then can never finish an optimize run and the browser wedges in a permanent *504 Outdated Optimize Dep* loop after any re-optimization.

The `avastSafePrebundle` esbuild plugin (in `optimizeDeps.esbuildOptions.plugins`) strips the trigger patterns from **all** dependency sources during dep pre-bundling, so written bundles never contain them:

- `.toString()` → `["toString"]()` (identical property access, no precedence pitfalls; `?.toString()` handled first)
- `String.fromCharCode(` → `String.fromCodePoint(` (identical for BMP 0–0xFFFF)

Dev-only: `vite build` doesn't run optimizeDeps, so production output is untouched. `optimizeDeps.holdUntilCrawlEnd: false` commits the bundle at startup (all deps are pre-listed in `include`), avoiding in-flight-hash windows.

Do not remove this plugin. History: this replaced an HTTP-middleware patch of the on-disk bundle, which couldn't survive the File Shield eating the file and itself caused stale-hash 504 wedges. If a *504 Outdated Optimize Dep* loop or `EBUSY … asw-…` error ever returns: stop all dev servers, delete `node_modules/.vite`, restart.

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
- Pay-what-you-want build pack checkout via `POST /jobs/:id/pay` — required delivery email (both $0 and paid, prefilled from localStorage `laigo:buildPackEmail`), inline 422 field errors, card + 3DS via `BuildPackPaymentForm`

**In progress (backend or SDK work needed):**
- Stripe Embedded Checkout session endpoint + frontend SDK wiring
- Stripe webhook → saga advancement
- Backend pricing behind `/jobs/:id/stats` — while unfinished the endpoint returns `estimated_cost_cents: null` and the stats chip shows piece count only

---

## Legacy

`src/legacy/` — previous "brick wall" UI (2025). Not imported, won't ship. To mount temporarily: swap `main.jsx` to import `legacy/Laigo.tsx` instead of `App.tsx` and re-import `legacy/index.css`.
