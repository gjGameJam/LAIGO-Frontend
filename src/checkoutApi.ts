/**
 * LAIGO checkout API client.
 *
 * Mirrors backend contract in scripts/checkout/{models.py,router.py,gate_router.py}.
 *
 * Two independent monetization surfaces live in this file:
 *
 * LIVE — build pack checkout (the only flow with UI today):
 *   POST /jobs/:jobId/pay                                → PayResponse
 *
 * PAUSED — physical parts purchase (BrickOwl + Stripe Embedded Checkout saga).
 *   Client code is complete but nothing mounts StripeCheckoutPanel; don't
 *   build on this without confirming the pause has been lifted:
 *   GET  /checkout/gate                                  → CheckoutGateResponse
 *   POST /jobs/:jobId/checkout/quote                     → QuoteResponse
 *   POST /jobs/:jobId/checkout/session                   → { clientSecret }   (TODO — backend pending)
 *   GET  /jobs/:jobId/checkout/:checkoutId/status        → CheckoutStatusResponse
 */

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')
const DEV = import.meta.env.DEV

function log(...args: unknown[]) {
    if (DEV) console.log(...args)
}

function errLog(...args: unknown[]) {
    if (DEV) console.error(...args)
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
    const text = await res.text().catch(() => '')
    if (!text) return fallback
    try {
        const parsed = JSON.parse(text) as { detail?: unknown; error?: string; message?: string }
        const detail = parsed.detail
        if (typeof detail === 'string') return detail
        if (detail && typeof detail === 'object' && 'error' in detail) {
            const inner = (detail as { error?: unknown }).error
            if (typeof inner === 'string') return inner
        }
        return parsed.error ?? parsed.message ?? fallback
    } catch {
        return text.length > 240 ? text.slice(0, 240) + '…' : text
    }
}

// ════ PAUSED: parts-purchase saga — everything down to the build-pack ═══════
// ════ section belongs to the unmounted parts flow (see file header)   ═══════

// ── Gate ────────────────────────────────────────────────────────────────────

export interface CheckoutGateResponse {
    mode: 'disabled' | 'test' | 'live'
    is_open: boolean
    payment_provider: string | null
    marketplaces_live: string[]
    reasons: string[]
    commit: string | null
}

export async function getCheckoutGate(signal?: AbortSignal): Promise<CheckoutGateResponse> {
    log('GET →', `${API}/checkout/gate`)
    const res = await fetch(`${API}/checkout/gate`, { signal, cache: 'no-store' })
    if (!res.ok) {
        const message = await readErrorMessage(res, 'Checkout gate not reachable')
        errLog('Gate failed:', res.status, message)
        throw new Error(message)
    }
    return (await res.json()) as CheckoutGateResponse
}

// ── Quote ───────────────────────────────────────────────────────────────────

export interface QuoteRequest {
    shipping_country: string
    shipping_zip: string
    customer_email: string
}

export interface SellerAllocation {
    seller_id: string
    seller_name: string
    pieces_count: number
    piece_cost_cents: number
    shipping_cost_cents: number
    subtotal_cents: number
}

export interface UnsourceableItem {
    elementId: string
    quantity: number
}

export interface QuoteResponse {
    checkout_id: string
    expires_at: number
    pieces_total: number
    sellers: SellerAllocation[]
    lego_fallback_items: UnsourceableItem[]
    lego_fallback_cost_cents: number
    unsourceable_items: UnsourceableItem[]
    can_proceed: boolean
    total_cost_cents: number
    laigo_service_fee_cents: number
    grand_total_cents: number
}

export async function getQuote(
    jobId: string,
    body: QuoteRequest,
    signal?: AbortSignal,
): Promise<QuoteResponse> {
    log('POST →', `${API}/jobs/${jobId}/checkout/quote`)
    const res = await fetch(`${API}/jobs/${jobId}/checkout/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
    })
    if (!res.ok) {
        const message = await readErrorMessage(res, 'Quote failed')
        errLog('Quote failed:', res.status, message)
        throw new Error(message)
    }
    return (await res.json()) as QuoteResponse
}

// ── Embedded Checkout session ───────────────────────────────────────────────
// TODO(backend): wire to a new endpoint that creates a Stripe Checkout Session
// (mode='payment', ui_mode='embedded', client_reference_id=checkout_id,
// line_items derived from the cached quote) and returns its clientSecret.
// The session's `metadata.checkout_id` should match the quote so the
// checkout.session.completed webhook can advance the existing saga.
//
// Until the endpoint exists, this function returns a synthetic placeholder
// so the UI can render and animate against a stable contract.

export interface CheckoutSessionResponse {
    /** Stripe Checkout Session client secret — feed to <EmbeddedCheckoutProvider/>. */
    client_secret: string
    /** Echo of the checkout_id this session belongs to. */
    checkout_id: string
}

export async function createCheckoutSession(
    jobId: string,
    checkoutId: string,
    signal?: AbortSignal,
): Promise<CheckoutSessionResponse> {
    log('POST →', `${API}/jobs/${jobId}/checkout/session`)
    const res = await fetch(`${API}/jobs/${jobId}/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkout_id: checkoutId }),
        signal,
    })
    if (!res.ok) {
        const message = await readErrorMessage(res, 'Could not start payment session')
        errLog('Session failed:', res.status, message)
        throw new Error(message)
    }
    return (await res.json()) as CheckoutSessionResponse
}

// ── Saga status polling ─────────────────────────────────────────────────────

export type SagaStatus =
    | 'initiated'
    | 'stripe_held'
    | 'orders_placed'
    | 'fallback_ordered'
    | 'payment_captured'
    | 'compensated'
    | 'failed'
    | 'manual_review'

export const TERMINAL_SAGA_STATUSES: ReadonlySet<SagaStatus> = new Set([
    'payment_captured',
    'compensated',
    'failed',
    'manual_review',
])

export const SUCCESS_SAGA_STATUSES: ReadonlySet<SagaStatus> = new Set([
    'payment_captured',
])

export interface CheckoutStatusResponse {
    checkout_id: string
    saga_status: SagaStatus
    brickowl_order_ids: string[]
    lego_order_id: string | null
    payment_hold_id: string | null
    payment_authorized_cents: number | null
    total_charged_cents: number | null
    error: string | null
    /** Customer-safe translated message — render this, never `error`. */
    customer_message: string | null
    manual_review_reason: string | null
    completed_at: string | null
}

export async function getCheckoutStatus(
    jobId: string,
    checkoutId: string,
    signal?: AbortSignal,
): Promise<CheckoutStatusResponse> {
    const res = await fetch(`${API}/jobs/${jobId}/checkout/${checkoutId}/status`, { signal })
    if (!res.ok) {
        const message = await readErrorMessage(res, 'Status lookup failed')
        errLog('Status failed:', res.status, message)
        throw new Error(message)
    }
    return (await res.json()) as CheckoutStatusResponse
}

// ════ LIVE: build pack checkout ═════════════════════════════════════════════
//
// The UI charges a fixed $0.99 (BUILD_PACK_PRICE_CENTS in OutputPanel.tsx).
// The contract itself still accepts any amount_cents ≥ 0 — allowlisted tester
// emails (BYPASS_EMAIL_HASHES in OutputPanel.tsx) use the 0 path.
//
// POST /jobs/:jobId/pay
//   Body:    { amount_cents: int >= 0, payment_method_id?: "pm_…", email: str }
//            payment_method_id is required only when amount_cents > 0.
//            email is required for ALL amounts, including 0 — the backend emails
//            the build pack (instructions PDF + brick order list) after every
//            completed checkout. Send outcomes are fire-and-forget server-side
//            and never surface in the /pay response; the ungated /download
//            endpoint remains the parallel in-browser channel.
//   200:     { status: "free", amount_cents: 0 }
//            { status: "paid", amount_cents: N, payment_intent_id: "pi_…" }
//            { status: "requires_action", client_secret, payment_intent_id }
//              → finish 3DS via Stripe.js with client_secret. Do NOT re-call
//                /pay afterwards — the backend's webhook detects completion and
//                sends the email itself (the address rides in the PaymentIntent
//                metadata).
//   Errors come in two distinct shapes:
//     business rules → { detail: { error, code } } — render detail.error
//     body validation (422) → FastAPI array { detail: [{ loc, msg, … }] } —
//       entries with "email" in loc are exposed via PayError.emailErrors for
//       inline display on the email input.

export interface PayRequest {
    amount_cents: number
    payment_method_id?: string
    email: string
}

export type PayResponse =
    | { status: 'free'; amount_cents: number }
    | { status: 'paid'; amount_cents: number; payment_intent_id: string }
    | { status: 'requires_action'; client_secret: string; payment_intent_id: string }

/** Business-rule codes the backend returns in the { detail: { error, code } } shape. */
export type PayBusinessErrorCode =
    | 'AMOUNT_BELOW_MINIMUM'
    | 'PAYMENT_METHOD_REQUIRED'
    | 'INVALID_JOB_ID'
    | 'JOB_NOT_FOUND'
    | 'PAYMENTS_UNAVAILABLE'
    | 'PAYMENT_RETRYABLE'
    | 'PAYMENT_FAILED'

export class PayError extends Error {
    /** Business-rule code, when the error came in the { error, code } shape. */
    code: string | null
    /** Validation messages for the email field (422 array shape) — show inline. */
    emailErrors: string[]

    constructor(message: string, opts: { code?: string | null; emailErrors?: string[] } = {}) {
        super(message)
        this.name = 'PayError'
        this.code = opts.code ?? null
        this.emailErrors = opts.emailErrors ?? []
    }
}

async function readPayError(res: Response): Promise<PayError> {
    const fallback = 'Something went wrong — please try again.'
    const text = await res.text().catch(() => '')
    if (!text) return new PayError(fallback)

    let detail: unknown
    try {
        detail = (JSON.parse(text) as { detail?: unknown }).detail
    } catch {
        return new PayError(text.length > 240 ? text.slice(0, 240) + '…' : text)
    }

    // FastAPI/pydantic body-validation shape: detail is an array of { loc, msg }.
    if (Array.isArray(detail)) {
        const entries = detail.filter(
            (entry): entry is { loc?: unknown; msg: string } =>
                !!entry && typeof entry === 'object' &&
                typeof (entry as { msg?: unknown }).msg === 'string',
        )
        const emailErrors = entries
            .filter(entry => Array.isArray(entry.loc) && entry.loc.includes('email'))
            .map(entry => entry.msg.replace(/^Value error,\s*/i, ''))
        return new PayError(emailErrors[0] ?? entries[0]?.msg ?? fallback, { emailErrors })
    }

    // Business-rule shape: { detail: { error, code } }.
    if (detail && typeof detail === 'object') {
        const { error, code } = detail as { error?: unknown; code?: unknown }
        return new PayError(typeof error === 'string' ? error : fallback, {
            code: typeof code === 'string' ? code : null,
        })
    }

    if (typeof detail === 'string') return new PayError(detail)
    return new PayError(fallback)
}

export async function payJob(
    jobId: string,
    body: PayRequest,
    signal?: AbortSignal,
): Promise<PayResponse> {
    log('POST →', `${API}/jobs/${jobId}/pay`)
    const res = await fetch(`${API}/jobs/${jobId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
    })
    if (!res.ok) {
        const error = await readPayError(res)
        errLog('Pay failed:', res.status, error.message)
        throw error
    }
    return (await res.json()) as PayResponse
}

// ── Formatting helpers ──────────────────────────────────────────────────────

export function formatCents(cents: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(cents / 100)
}
