# CLAUDE.md — LAIGO Frontend

React + Three.js app: image → LEGO mosaic. User uploads a photo, tunes parameters, backend runs color-quantization, frontend renders the result as an interactive 3D mosaic. Converting is free; the product is the **$0.99 build pack** (piece order list + step-by-step instructions), paid by card and delivered by email — see the Monetization section. A physical parts-purchase flow (Stripe + BrickOwl saga) exists in code but is **paused** with no UI entry point.

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

**Stripe key:** the build pack checkout reads `VITE_STRIPE_PK` (publishable key) at build time — `pk_test_…` in `.env.local` for testing, the live key wherever production builds happen. Without it the checkout modal renders a config warning instead of the payment form (everything else still works).

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
6. Purchase: **Receive Build Pack** (main CTA under the preview, or the package button in the 3D preview's corner) → modal in `OutputPanel` collects the delivery email → `BuildPackPaymentForm` tokenizes the card → `POST /jobs/:id/pay` → backend emails the pack; the ZIP also auto-downloads as a parallel copy

### Key files

```
src/
  api.ts                     Core API client (health, submitJob, getJob, getPreview, buildFormData, PreviewError)
  checkoutApi.ts             Payments client: /pay (live) + parts-saga endpoints (paused) + formatCents
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
      BuildPackPaymentForm.tsx LIVE — fixed-price ($0.99) card form: tokenize (createPaymentMethod)
                               → POST /jobs/:id/pay → handleNextAction on requires_action.
                               Needs Elements paymentMethodCreation: 'manual' (set in OutputPanel)
      StripeCheckoutPanel.tsx  PAUSED — parts saga UI (shipping → quote → pay → saga); not mounted
      ShippingStep.tsx         PAUSED — email + country + ZIP form for the parts saga
      QuoteSummary.tsx         PAUSED — BrickOwl seller/cost breakdown for a quote
      StripeEmbedSlot.tsx      PAUSED — Embedded Checkout mount point (placeholder — see gotchas)
      SagaProgress.tsx         PAUSED — saga status polling display

  hooks/
    useJob.ts                 Polls /jobs/:id; fetches /preview on complete
    useJobStats.ts            One-shot /jobs/:id/stats fetch; 'unavailable' hides the stats chip
    useCheckout.ts            PAUSED — parts-saga state machine (shipping→quoting→review→paying→processing→done)
    useDarkMode.ts            System-aware dark mode; persists to localStorage

  ui/                        Button, Slider, SegmentedControl, ImageUpload, StudStrip primitives
  legacy/                    Pre-2026 "brick wall" UI — not imported, won't ship (see bottom of file)
```

---

## Monetization

Converting is free. Revenue is the **$0.99 build pack** — a ZIP with the piece order list + step-by-step instructions, emailed by the backend after checkout. Everything lives in `OutputPanel.tsx` (modal + policy) and `BuildPackPaymentForm.tsx` (card form).

### Live: $0.99 build pack

- **Entry points:** the "Receive Build Pack" CTA under the finished preview, and the package button in the 3D preview's corner. Both open the same modal. There is deliberately no direct-download link anywhere in the UI.
- **Flow:** required delivery email (prefilled from localStorage `laigo:buildPackEmail`) → Stripe Payment Element → `elements.submit()` → `stripe.createPaymentMethod()` → `POST /jobs/:id/pay` with `{ amount_cents: 99, payment_method_id, email }` → on `requires_action`, `stripe.handleNextAction()` runs 3DS and the flow **must not** re-call `/pay` (the backend webhook completes the charge and sends the email).
- **Delivery:** email is the primary channel — sends are fire-and-forget server-side and never surface in `/pay` responses, so the UI can't know if one bounced. The ZIP also auto-downloads in the browser as a parallel copy. `GET /jobs/:id/download` stays **ungated** (accepted for now): the paywall is UI-level only.
- **Price:** `BUILD_PACK_PRICE_CENTS = 99` / `BUILD_PACK_PRICE_LABEL = '$0.99'` in `OutputPanel.tsx`. Write the label as `$0.99`, never `99¢` — the cent sign is too easy to misread as $99. The `/pay` contract accepts any `amount_cents ≥ 0`; the fixed price is UI policy, not a backend rule.
- **Stripe specifics:** `<Elements>` must use `mode: 'payment'` + `paymentMethodTypes: ['card']` (backend PaymentIntent is card-only) + `paymentMethodCreation: 'manual'` (required to call `createPaymentMethod` with the Payment Element).
- **Email validation:** mirror the server loosely, never stricter — trimmed, ≤ 254 chars, `^[^@\s]+@[^@\s]+\.[^@\s]+$` (`EMAIL_RE` in `OutputPanel.tsx`).

### Tester bypass (permanent testing tool)

Allowlisted tester emails skip Stripe: typing one into the modal's email field swaps the payment form for a "Send Build Pack" button that calls `/pay` with `amount_cents: 0`, and the backend emails the pack for free.

- The list is `BYPASS_EMAIL_HASHES` in `OutputPanel.tsx` — SHA-256 hashes of the trimmed, **lowercased** address. Plaintext tester addresses must never ship in the bundle.
- Add a tester: `printf '%s' 'new@email.com' | sha256sum` → add the hex string to the set. Remove one by deleting its line.
- Depends on the backend continuing to accept `amount_cents: 0`. If a server-side minimum is ever enforced, testers will hit `AMOUNT_BELOW_MINIMUM`; the fix then is to move the allowlist into the backend (return `{ status: 'free' }` for allowlisted addresses) and delete the frontend set.

### Paused: physical parts purchase (Stripe + BrickOwl saga)

Buy the actual bricks in-app: shipping form → `/checkout/quote` (BrickOwl seller allocation + LEGO Pick-a-Brick fallback) → Stripe Embedded Checkout → saga status polling. The client code is complete but **nothing mounts `StripeCheckoutPanel`** — the flow is paused indefinitely. Don't build on it (or delete it) without checking first. If resumed, the remaining work is listed under Known gotchas → Stripe Embedded Checkout.

### Removed: donations

A pay-what-you-want checkout + tip flow (`POST /donate`) shipped briefly and was removed in July 2026 when the build pack went fixed-price. The client code is deleted — recover from git history if it ever comes back.

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

### Build pack checkout (live)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/jobs/:id/pay` | `{ amount_cents ≥ 0, payment_method_id? (pm_…, required when > 0), email (required for ALL amounts, incl. 0) }` → `{ status: 'free' }` \| `{ status: 'paid', payment_intent_id }` \| `{ status: 'requires_action', client_secret, payment_intent_id }`. On `requires_action`, finish 3DS with `client_secret` and do **not** re-call `/pay` — the webhook completes the charge and sends the email |

`/pay` errors come in two shapes — business rules `{ detail: { error, code } }` (codes: `AMOUNT_BELOW_MINIMUM` + `min_cents`, `PAYMENT_METHOD_REQUIRED`, `INVALID_JOB_ID`, `JOB_NOT_FOUND`, `PAYMENTS_UNAVAILABLE`, `PAYMENT_RETRYABLE`, `PAYMENT_FAILED`; render `detail.error`) and FastAPI 422 field validation `{ detail: [{ loc, msg }] }` (entries with `email` in `loc` show inline on the email input — see `PayError` in `checkoutApi.ts`). The backend emails the build pack after every completed checkout — including `status: 'free'` and webhook-completed 3DS charges.

### Parts-saga endpoints (paused — client code exists, no UI)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/checkout/gate` | `{ mode: 'disabled'\|'test'\|'live', is_open, payment_provider }` |
| POST | `/jobs/:id/checkout/quote` | body: `{ shipping_country, shipping_zip, customer_email }` → `QuoteResponse` |
| POST | `/jobs/:id/checkout/session` | **backend TODO** — returns `{ client_secret, checkout_id }` for Stripe Embedded Checkout |
| GET | `/jobs/:id/checkout/:checkoutId/status` | saga status polling |

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

### Avast false positive — `vite.config.js`

Avast falsely flags drei bundle patterns as obfuscation. Two shields fire: Web Shield resets the HTTP transfer (white page), and File Shield quarantines `node_modules/.vite/deps/@react-three_drei.js` **as it's written**, leaving a 0-byte `asw-…` marker — Vite then can never finish an optimize run and the browser wedges in a permanent *504 Outdated Optimize Dep* loop after any re-optimization.

The `avastSafePrebundle` esbuild plugin (in `optimizeDeps.esbuildOptions.plugins`) strips the trigger patterns from **all** dependency sources during dep pre-bundling, so written bundles never contain them:

- `.toString()` → `["toString"]()` (identical property access, no precedence pitfalls; `?.toString()` handled first)
- `String.fromCharCode(` → `String.fromCodePoint(` (identical for BMP 0–0xFFFF)

Dev-only: `vite build` doesn't run optimizeDeps, so production output is untouched. `optimizeDeps.holdUntilCrawlEnd: false` commits the bundle at startup (all deps are pre-listed in `include`), avoiding in-flight-hash windows.

Do not remove this plugin. History: this replaced an HTTP-middleware patch of the on-disk bundle, which couldn't survive the File Shield eating the file and itself caused stale-hash 504 wedges. If a *504 Outdated Optimize Dep* loop or `EBUSY … asw-…` error ever returns: stop all dev servers, delete `node_modules/.vite`, restart.

### Stripe Embedded Checkout — incomplete (only matters if the paused parts saga resumes)

`StripeEmbedSlot.tsx` renders a placeholder with a "Simulate paid" button. Remaining work to go live:

1. Wire `<EmbeddedCheckoutProvider>` / `<EmbeddedCheckout>` in `StripeEmbedSlot.tsx` — reuse the `loadStripe(VITE_STRIPE_PK)` promise that already exists in `OutputPanel.tsx` (Stripe warns if you create two)
2. Backend: `POST /jobs/:id/checkout/session` — create a Stripe Checkout Session, return `client_secret`
3. Backend: webhook for `checkout.session.completed` to advance the saga via `checkout_id`
4. Mount `StripeCheckoutPanel` somewhere (nothing imports it today)

### All logging gated on `DEV`

`api.ts` and `checkoutApi.ts` suppress all `console.log/error` in production. Don't add bare console calls to those files.

---

## Status: live / paused / TODO

**Live:**
- Full conversion pipeline (2D/3D, framing, color quantization)
- 3D preview with full 360° orbit + back-face wall hooks
- $0.99 build pack checkout with email delivery + tester bypass (see Monetization)

**Paused (working client code, no UI entry point — check before building on or deleting):**
- Parts-purchase saga: `StripeCheckoutPanel` + `useCheckout` + gate/quote/session/status clients. Still missing: session endpoint (backend), completion webhook (backend), real Embedded Checkout mount (frontend)

**Backend TODO (frontend already handles both cases):**
- Pricing behind `/jobs/:id/stats` — returns `estimated_cost_cents: null` until finished; the stats chip shows piece count only

---

## Legacy

`src/legacy/` — previous "brick wall" UI (2025). Not imported, won't ship. To mount temporarily: swap `main.jsx` to import `legacy/Laigo.tsx` instead of `App.tsx` and re-import `legacy/index.css`.
