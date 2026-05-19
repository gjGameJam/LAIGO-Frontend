import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import type { SagaStatus } from '../../checkoutApi'

interface SagaProgressProps {
    status: SagaStatus | null
    customerMessage?: string | null
}

const STEPS: { id: SagaStatus; label: string }[] = [
    { id: 'initiated', label: 'Payment authorized' },
    { id: 'stripe_held', label: 'Funds held' },
    { id: 'orders_placed', label: 'Orders placed with sellers' },
    { id: 'payment_captured', label: 'Payment captured · build pack unlocked' },
]

const STEP_INDEX: Record<SagaStatus, number> = {
    initiated: 0,
    stripe_held: 1,
    orders_placed: 2,
    fallback_ordered: 2,
    payment_captured: 3,
    compensated: -1,
    failed: -1,
    manual_review: 2,
}

export function SagaProgress({ status, customerMessage }: SagaProgressProps) {
    const activeIndex = status ? STEP_INDEX[status] : -1

    return (
        <motion.div
            key="saga"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-2"
            aria-live="polite"
        >
            <ol className="space-y-2">
                {STEPS.map((step, i) => {
                    const isDone = activeIndex > i || (activeIndex === i && status === 'payment_captured')
                    const isActive = activeIndex === i && !isDone
                    return (
                        <li key={step.id} className="flex items-center gap-2.5">
                            <span
                                className={
                                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0 ' +
                                    (isDone
                                        ? 'bg-emerald-500 text-white'
                                        : isActive
                                        ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600')
                                }
                            >
                                {isDone ? (
                                    <Check size={12} strokeWidth={3} />
                                ) : isActive ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                )}
                            </span>
                            <span
                                className={
                                    'text-xs ' +
                                    (isDone
                                        ? 'text-zinc-700 dark:text-zinc-300'
                                        : isActive
                                        ? 'text-zinc-900 dark:text-zinc-100 font-medium'
                                        : 'text-zinc-400 dark:text-zinc-600')
                                }
                            >
                                {step.label}
                            </span>
                        </li>
                    )
                })}
            </ol>
            {customerMessage && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1">{customerMessage}</p>
            )}
        </motion.div>
    )
}
