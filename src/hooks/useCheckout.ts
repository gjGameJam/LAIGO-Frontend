import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
    createCheckoutSession,
    getCheckoutStatus,
    getQuote,
    SUCCESS_SAGA_STATUSES,
    TERMINAL_SAGA_STATUSES,
    type CheckoutSessionResponse,
    type CheckoutStatusResponse,
    type QuoteRequest,
    type QuoteResponse,
    type SagaStatus,
} from '../checkoutApi'

export type CheckoutStage =
    | 'shipping'    // minimal country/zip/email form — entry state once a jobId exists
    | 'quoting'     // /quote in flight
    | 'review'      // quote returned, awaiting embedded checkout mount
    | 'paying'      // user inside the embedded checkout UI
    | 'processing'  // checkout completed, polling saga
    | 'succeeded'   // saga reached payment_captured → download unlocked
    | 'failed'      // any unrecoverable error

export interface CheckoutState {
    stage: CheckoutStage
    quote: QuoteResponse | null
    session: CheckoutSessionResponse | null
    sagaStatus: SagaStatus | null
    statusSnapshot: CheckoutStatusResponse | null
    error: string | null
    /** Last submitted shipping input — preserved so the form can re-hydrate after a recoverable quote error. */
    lastShipping: QuoteRequest | null
}

const INITIAL: CheckoutState = {
    stage: 'shipping',
    quote: null,
    session: null,
    sagaStatus: null,
    statusSnapshot: null,
    error: null,
    lastShipping: null,
}

type Action =
    | { type: 'quoting'; values: QuoteRequest }
    | { type: 'quote_ok'; quote: QuoteResponse }
    | { type: 'session_ok'; session: CheckoutSessionResponse }
    | { type: 'paying' }
    | { type: 'processing' }
    | { type: 'status'; status: CheckoutStatusResponse }
    | { type: 'failed'; error: string }
    | { type: 'shipping_error'; error: string }
    | { type: 'reset' }

function reducer(state: CheckoutState, action: Action): CheckoutState {
    switch (action.type) {
        case 'quoting':
            return { ...state, stage: 'quoting', error: null, lastShipping: action.values }
        case 'quote_ok':
            return { ...state, stage: 'review', quote: action.quote, error: null }
        case 'shipping_error':
            return { ...state, stage: 'shipping', error: action.error }
        case 'session_ok':
            return { ...state, session: action.session }
        case 'paying':
            return { ...state, stage: 'paying' }
        case 'processing':
            return { ...state, stage: 'processing' }
        case 'status': {
            const next: CheckoutState = {
                ...state,
                sagaStatus: action.status.saga_status,
                statusSnapshot: action.status,
            }
            if (TERMINAL_SAGA_STATUSES.has(action.status.saga_status)) {
                next.stage = SUCCESS_SAGA_STATUSES.has(action.status.saga_status)
                    ? 'succeeded'
                    : 'failed'
                if (next.stage === 'failed') {
                    next.error = action.status.customer_message ?? 'Checkout could not be completed.'
                }
            }
            return next
        }
        case 'failed':
            return { ...state, stage: 'failed', error: action.error }
        case 'reset':
            return { ...INITIAL }
        default:
            return state
    }
}

const STATUS_POLL_MS = 2500

interface UseCheckoutOptions {
    jobId: string | null
}

interface UseCheckoutReturn extends CheckoutState {
    /** Drop any in-flight state and return to a clean shipping form. */
    reset: () => void
    /** Submit shipping form → triggers /quote, then attempts to mint a session. */
    submitShipping: (values: QuoteRequest) => Promise<void>
    /** Called by the embedded Stripe form once payment finishes — starts polling. */
    markPaymentComplete: () => void
    /** Convenience flag: download is unlocked. */
    isUnlocked: boolean
}

/**
 * Coordinates the post-job Stripe checkout flow.
 *
 * Owns:
 *   • /quote request lifecycle (abortable)
 *   • Checkout Session mint (TODO once backend endpoint lands)
 *   • Saga status polling while in `processing`
 *
 * Does NOT own Stripe.js mount — that's the component layer's responsibility.
 */
export function useCheckout({ jobId }: UseCheckoutOptions): UseCheckoutReturn {
    const [state, dispatch] = useReducer(reducer, INITIAL)
    const abortRef = useRef<AbortController | null>(null)

    // Reset whenever the underlying job changes — stale quote/session bound
    // to the old job_id must never leak into the new one.
    useEffect(() => {
        dispatch({ type: 'reset' })
        abortRef.current?.abort()
        abortRef.current = null
    }, [jobId])

    // Poll /status while in `processing`.
    useEffect(() => {
        if (state.stage !== 'processing' || !jobId || !state.quote) return

        const controller = new AbortController()
        let cancelled = false
        let timer: number | null = null

        const tick = async () => {
            if (cancelled || !state.quote) return
            try {
                const status = await getCheckoutStatus(jobId, state.quote.checkout_id, controller.signal)
                if (cancelled) return
                dispatch({ type: 'status', status })
                if (!TERMINAL_SAGA_STATUSES.has(status.saga_status)) {
                    timer = window.setTimeout(tick, STATUS_POLL_MS)
                }
            } catch (err) {
                if (cancelled || controller.signal.aborted) return
                const message = err instanceof Error ? err.message : 'Status lookup failed'
                dispatch({ type: 'failed', error: message })
            }
        }

        tick()
        return () => {
            cancelled = true
            controller.abort()
            if (timer) clearTimeout(timer)
        }
    }, [state.stage, state.quote, jobId])

    const submitShipping = useCallback(
        async (values: QuoteRequest) => {
            if (!jobId) return
            abortRef.current?.abort()
            const controller = new AbortController()
            abortRef.current = controller

            dispatch({ type: 'quoting', values })
            try {
                const quote = await getQuote(jobId, values, controller.signal)
                if (controller.signal.aborted) return

                if (!quote.can_proceed) {
                    dispatch({
                        type: 'shipping_error',
                        error: `${quote.unsourceable_items.length} piece(s) couldn't be sourced to this address. Try a different ZIP.`,
                    })
                    return
                }

                dispatch({ type: 'quote_ok', quote })

                // Mint the embedded Checkout Session up-front so the iframe is
                // ready as soon as the user lands on the review step. If this
                // fails we still let the user see the priced quote — they can
                // retry, and we surface the error inline.
                try {
                    const session = await createCheckoutSession(jobId, quote.checkout_id, controller.signal)
                    if (controller.signal.aborted) return
                    dispatch({ type: 'session_ok', session })
                } catch (sessionErr) {
                    if (controller.signal.aborted) return
                    const message = sessionErr instanceof Error ? sessionErr.message : 'Payment session unavailable'
                    // Non-fatal: keep the review stage so the price is visible
                    // and the user can retry. The Stripe slot will show the
                    // error and a retry affordance.
                    dispatch({ type: 'failed', error: message })
                }
            } catch (err) {
                if (controller.signal.aborted) return
                const message = err instanceof Error ? err.message : 'Quote failed'
                dispatch({ type: 'shipping_error', error: message })
            }
        },
        [jobId],
    )

    const reset = useCallback(() => {
        abortRef.current?.abort()
        abortRef.current = null
        dispatch({ type: 'reset' })
    }, [])
    const markPaymentComplete = useCallback(() => dispatch({ type: 'processing' }), [])

    // Abort any in-flight request on unmount.
    useEffect(() => {
        return () => {
            abortRef.current?.abort()
        }
    }, [])

    return {
        ...state,
        reset,
        submitShipping,
        markPaymentComplete,
        isUnlocked: state.stage === 'succeeded',
    }
}
