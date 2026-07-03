import { formatCents } from '../checkoutApi'

interface MosaicStatsChipProps {
    /** Backend-authoritative piece count (frame included). */
    pieces: number
    /** Estimated cost in minor units; null hides the cost segment entirely. */
    costCents: number | null
    currency?: string
}

/**
 * Read-only stats pill overlaid top-center on the 3D preview (inline card
 * and expanded modal). pointer-events-none so OrbitControls drag/zoom pass
 * straight through to the canvas underneath.
 */
export function MosaicStatsChip({ pieces, costCents, currency = 'USD' }: MosaicStatsChipProps) {
    return (
        <div className="pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-md shadow-black/10 text-xs font-medium whitespace-nowrap">
            <span className="tabular-nums text-zinc-800 dark:text-zinc-100">
                {pieces.toLocaleString()}
                {/* Word hidden below sm so the chip clears the top-right buttons
                    on narrow single-column layouts. */}
                <span className="hidden sm:inline"> pieces</span>
            </span>
            {costCents != null && (
                <>
                    <span className="text-zinc-400 dark:text-zinc-600">·</span>
                    <span
                        className="tabular-nums text-violet-600 dark:text-violet-400"
                        title="Estimated parts cost — final price at checkout"
                    >
                        ~{formatCents(costCents, currency)}
                    </span>
                </>
            )}
        </div>
    )
}
