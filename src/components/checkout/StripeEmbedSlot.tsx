import { motion } from 'framer-motion'
import { Lock, CreditCard } from 'lucide-react'
import type { CheckoutSessionResponse } from '../../checkoutApi'

interface StripeEmbedSlotProps {
    session: CheckoutSessionResponse | null
    /** Called by the embedded form's onComplete handler — see TODO below. */
    onComplete: () => void
}

/**
 * Mount point for Stripe's <EmbeddedCheckoutProvider> / <EmbeddedCheckout>.
 *
 * TODO(stripe-embed):
 *   1. `npm install @stripe/react-stripe-js @stripe/stripe-js`
 *   2. Replace the placeholder block below with:
 *
 *        const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK!)
 *        <EmbeddedCheckoutProvider
 *            stripe={stripePromise}
 *            options={{ clientSecret: session.client_secret, onComplete }}
 *        >
 *            <EmbeddedCheckout />
 *        </EmbeddedCheckoutProvider>
 *
 *   3. Wire `onComplete` to call `props.onComplete()` so useCheckout can
 *      flip to the `processing` stage and start polling /status.
 *
 *   4. Add Stripe publishable key to .env: VITE_STRIPE_PK=pk_test_...
 *
 *   5. Confirm a backend webhook handler for `checkout.session.completed`
 *      exists and advances the saga via the existing checkout_id. Without
 *      the webhook, the customer pays but the saga never starts.
 */
export function StripeEmbedSlot({ session, onComplete }: StripeEmbedSlotProps) {
    if (!session) {
        return (
            <motion.div
                key="embed-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
                aria-busy
            >
                <SkeletonStripe />
            </motion.div>
        )
    }

    return (
        <motion.div
            key="embed-ready"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white/40 dark:bg-zinc-900/40"
        >
            {/* TODO(stripe-embed): replace this block with EmbeddedCheckoutProvider. */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60">
                <Lock size={12} className="text-zinc-400 dark:text-zinc-500" />
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Secure payment via Stripe
                </span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                    Placeholder
                </span>
            </div>
            <div className="p-4 flex flex-col items-center gap-3 text-center min-h-[180px] justify-center">
                <CreditCard size={28} className="text-zinc-300 dark:text-zinc-700" />
                <p className="text-xs text-zinc-500 dark:text-zinc-500 max-w-[280px]">
                    Embedded Checkout mounts here with{' '}
                    <code className="px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px]">
                        clientSecret
                    </code>{' '}
                    {session.client_secret ? '— ready when SDK is wired.' : 'once the session lands.'}
                </p>
                <button
                    type="button"
                    onClick={onComplete}
                    className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline outline-none focus-visible:underline"
                >
                    Simulate paid → start polling
                </button>
            </div>
        </motion.div>
    )
}

function SkeletonStripe() {
    return (
        <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-9 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="grid grid-cols-2 gap-2">
                <div className="h-9 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                <div className="h-9 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            </div>
            <div className="h-9 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
    )
}
