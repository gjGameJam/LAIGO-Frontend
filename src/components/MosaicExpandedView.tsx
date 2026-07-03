import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, RotateCcw } from 'lucide-react'
import { MosaicScene, type MosaicSceneHandle, type Vec3Tuple } from './MosaicScene'
import { MosaicStatsChip } from './MosaicStatsChip'
import type { JobStats, PreviewData } from '../api'

interface MosaicExpandedViewProps {
    data: PreviewData
    onClose: () => void
    /** Piece count + cost estimate for the top-center chip; null hides it. */
    stats?: JobStats | null
    /** Camera state captured from the small preview, so the expanded view
     *  opens at the same angle and zoom the user was already looking at. */
    initialCamera?: { position: Vec3Tuple; target: Vec3Tuple } | null
    /** True if the small preview's auto-rotation had been stopped (user
     *  manually positioned it). Modal opens in the same state. */
    initialUserStopped?: boolean
}

/**
 * Near-full-screen overlay that mounts a second MosaicScene instance at a
 * much larger size for inspection. Independent of the inline preview's
 * scene state — closing the modal leaves the small preview untouched.
 *
 * Dismiss: X button, Esc key, or backdrop click.
 */
export function MosaicExpandedView({
    data,
    onClose,
    stats = null,
    initialCamera = null,
    initialUserStopped = false,
}: MosaicExpandedViewProps) {
    const sceneRef = useRef<MosaicSceneHandle | null>(null)
    const closeBtnRef = useRef<HTMLButtonElement | null>(null)
    // Mount the Canvas only after the card's scale animation settles, so r3f
    // measures the full layout size instead of the 92%-scale transformed rect.
    const [cardReady, setCardReady] = useState(false)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        // Body scroll lock while the modal is mounted.
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        // Land keyboard focus on the close button so Esc/Enter feel natural.
        closeBtnRef.current?.focus()
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prevOverflow
        }
    }, [onClose])

    // Portal to body so we escape any framer-motion / sticky ancestors that
    // would otherwise act as the containing block for our `fixed` backdrop.
    // z-[60] sits above the Navbar's z-50.
    return createPortal(
        <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Expanded 3D mosaic preview"
        >
            <motion.div
                className="relative w-full h-full max-w-7xl max-h-[92vh] glass rounded-2xl overflow-hidden select-none"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onAnimationComplete={() => setCardReady(true)}
                onClick={(e) => e.stopPropagation()}
            >
                <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: cardReady ? 1 : 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                    {cardReady && (
                        <MosaicScene
                            ref={sceneRef}
                            data={data}
                            autoRotate
                            initialCamera={initialCamera}
                            initialUserStopped={initialUserStopped}
                        />
                    )}
                </motion.div>

                {stats && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2">
                        <MosaicStatsChip
                            pieces={stats.piece_count}
                            costCents={stats.estimated_cost_cents}
                            currency={stats.currency}
                        />
                    </div>
                )}

                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => sceneRef.current?.reset()}
                        aria-label="Reset view"
                        title="Reset view"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-200 shadow-md shadow-black/10 transition-all hover:bg-white dark:hover:bg-zinc-900 hover:scale-105 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                    >
                        <RotateCcw size={14} />
                    </button>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close expanded preview"
                        title="Close (Esc)"
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-200 shadow-md shadow-black/10 transition-all hover:bg-white dark:hover:bg-zinc-900 hover:scale-105 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                    >
                        <X size={14} />
                    </button>
                </div>

                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-zinc-400 dark:text-zinc-600 pointer-events-none">
                    Drag to rotate · scroll to zoom · Esc to close
                </p>
            </motion.div>
        </motion.div>,
        document.body,
    )
}
