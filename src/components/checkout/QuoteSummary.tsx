import { motion } from 'framer-motion'
import { Truck, Package } from 'lucide-react'
import { formatCents, type QuoteResponse } from '../../checkoutApi'

interface QuoteSummaryProps {
    quote: QuoteResponse
    /**
     * TODO(pricing): once price-optimized checkout lands, surface the
     * optimization win here (e.g., "Saved $4.20 by routing through 2 sellers").
     */
    children?: React.ReactNode
}

/**
 * Dense, glanceable summary of what the customer is about to pay.
 *
 * Numbers come straight from /quote — never hard-coded. The grand total
 * animates on mount so the user sees it resolve rather than just appear,
 * which reinforces "this is your actual price, freshly computed."
 */
export function QuoteSummary({ quote, children }: QuoteSummaryProps) {
    return (
        <motion.div
            key="quote"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-col gap-3"
        >
            <div className="flex items-baseline justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Your build pack
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                        {quote.pieces_total.toLocaleString()} pieces · {quote.sellers.length} seller
                        {quote.sellers.length === 1 ? '' : 's'}
                    </p>
                </div>
                <motion.span
                    key={quote.grand_total_cents}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50"
                >
                    {formatCents(quote.grand_total_cents)}
                </motion.span>
            </div>

            <ul className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
                {quote.sellers.map((s) => (
                    <li
                        key={s.seller_id}
                        className="flex items-center justify-between px-3 py-2 text-xs bg-white/30 dark:bg-zinc-900/30"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <Package size={12} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                            <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                                {s.seller_name}
                            </span>
                            <span className="text-zinc-400 dark:text-zinc-600 shrink-0">
                                · {s.pieces_count}
                            </span>
                        </div>
                        <span className="tabular-nums text-zinc-600 dark:text-zinc-400 shrink-0">
                            {formatCents(s.subtotal_cents)}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-500">
                    <Truck size={11} /> Shipping included
                </div>
                <div className="text-right tabular-nums text-zinc-500 dark:text-zinc-500">
                    + {formatCents(quote.laigo_service_fee_cents)} service
                </div>
            </div>

            {children}
        </motion.div>
    )
}
