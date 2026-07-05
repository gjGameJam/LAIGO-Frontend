import { motion, AnimatePresence } from 'framer-motion'
import { DownloadIcon, RefreshCcw, AlertCircle } from 'lucide-react'
import { Button } from '../../ui/Button'
import { useCheckout } from '../../hooks/useCheckout'
import { ShippingStep } from './ShippingStep'
import { QuoteSummary } from './QuoteSummary'
import { StripeEmbedSlot } from './StripeEmbedSlot'
import { SagaProgress } from './SagaProgress'

interface StripeCheckoutPanelProps {
    jobId: string | null
    /** Direct download URL — only revealed once the saga succeeds. */
    downloadUrl: string | null
}

/**
 * PAUSED — this panel is not mounted anywhere. It belongs to the physical
 * parts-purchase saga (BrickOwl + Stripe Embedded Checkout), which is on hold
 * indefinitely; the live monetization path is the $1.99 build pack modal in
 * OutputPanel. Check before building on this.
 *
 * Post-mosaic Stripe gate.
 *
 * Lifecycle (see useCheckout for the state machine):
 *
 *   shipping    →  email + country + ZIP (the minimum /quote requires) — entry state
 *   quoting     →  /quote in flight; skeleton shimmer
 *   review      →  QuoteSummary + embedded Stripe slot
 *   paying      →  user inside the embedded form (Stripe owns the UI)
 *   processing  →  saga running; SagaProgress polls /status
 *   succeeded   →  download unlocked
 *   failed      →  inline error + retry
 *
 * Shown directly after conversion to keep the path to checkout one click shorter.
 * The quote summary, Stripe slot, and saga progress are all unmounted when not
 * in use — no hidden fields, no eager network calls, no orphaned listeners.
 */
export function StripeCheckoutPanel({ jobId, downloadUrl }: StripeCheckoutPanelProps) {
    const checkout = useCheckout({ jobId })
    const { stage, quote, session, sagaStatus, statusSnapshot, error, lastShipping, reset, submitShipping, markPaymentComplete, isUnlocked } = checkout

    return (
        <div className="flex flex-col gap-3">
            <AnimatePresence mode="wait" initial={false}>
                {stage === 'shipping' && (
                    <ShippingStep
                        key="shipping"
                        onSubmit={submitShipping}
                        error={error}
                        initialValues={lastShipping}
                    />
                )}

                {stage === 'quoting' && (
                    <motion.div
                        key="quoting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2"
                        aria-busy
                    >
                        <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                        <div className="h-8 w-24 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                        <div className="h-16 rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
                            Pricing your build pack across sellers…
                        </p>
                    </motion.div>
                )}

                {(stage === 'review' || stage === 'paying') && quote && (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col gap-3"
                    >
                        <QuoteSummary quote={quote} />
                        <StripeEmbedSlot session={session} onComplete={markPaymentComplete} />
                    </motion.div>
                )}

                {stage === 'processing' && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col gap-3"
                    >
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Finalizing your order
                        </p>
                        <SagaProgress
                            status={sagaStatus}
                            customerMessage={statusSnapshot?.customer_message}
                        />
                    </motion.div>
                )}

                {stage === 'succeeded' && (
                    <motion.div
                        key="succeeded"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="flex flex-col gap-3"
                    >
                        <SagaProgress
                            status={sagaStatus}
                            customerMessage={statusSnapshot?.customer_message}
                        />
                        {downloadUrl ? (
                            <a
                                href={downloadUrl}
                                download
                                rel="noopener noreferrer"
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-brick-yellow text-zinc-900 hover:bg-brick-yellowLight active:bg-brick-yellowDark border border-zinc-900/10 shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                            >
                                <DownloadIcon size={14} /> Download Build Pack
                            </a>
                        ) : (
                            <Button variant="yellow" size="md" disabled className="w-full">
                                <DownloadIcon size={14} /> Download Build Pack
                            </Button>
                        )}
                    </motion.div>
                )}

                {stage === 'failed' && (
                    <motion.div
                        key="failed"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col gap-3"
                    >
                        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 dark:text-red-300">
                                {error ?? 'Checkout could not be completed.'}
                            </p>
                        </div>
                        <Button variant="outline" size="md" onClick={reset} className="w-full">
                            <RefreshCcw size={14} /> Try again
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Discreet "use cached download" escape hatch is intentionally
                omitted — the gate must hold or there is no gate. If the saga
                fails before payment_captured, the customer was never charged
                (see saga.py compensation contract). */}
            {!isUnlocked && stage !== 'succeeded' && (
                <p className="text-xs text-center text-zinc-600 dark:text-zinc-400">
                    Your card isn't charged until your order is estimated and confirmed.
                </p>
            )}
        </div>
    )
}
