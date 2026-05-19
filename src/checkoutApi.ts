/**
 * LAIGO checkout API client.
 *
 * Mirrors backend contract in scripts/checkout/{models.py,router.py,gate_router.py}.
 *
 * Endpoint map:
 *   GET  /checkout/gate                                  → CheckoutGateResponse
 *   POST /jobs/:jobId/checkout/quote                     → QuoteResponse
 *   POST /jobs/:jobId/checkout/session                   → { clientSecret }   (TODO — backend pending)
 *   GET  /jobs/:jobId/checkout/:checkoutId/status        → CheckoutStatusResponse
 *
 * NOTE — Stripe surface:
 *   The current backend (models.py:ConfirmRequest) expects a Stripe Payment Element
 *   flow (pm_… token via POST /confirm). The frontend selected Stripe Embedded
 *   Checkout (Checkout Session + clientSecret). The `createCheckoutSession` call
 *   below is the bridge that the backend still needs to expose; once it lands,
 *   delete the TODO marker and remove `confirmCheckoutWithPaymentMethod`.
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

// ── Formatting helpers ──────────────────────────────────────────────────────

export function formatCents(cents: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(cents / 100)
}
