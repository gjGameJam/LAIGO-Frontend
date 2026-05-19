import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { Sparkles } from 'lucide-react'
import { StudStrip } from '../ui/StudStrip'

interface ConvertButtonProps {
    progress: number
    running: boolean
    queued?: boolean
    queuePosition?: number | null
    noFile?: boolean
    disabled?: boolean
    onClick?: () => void
}

/**
 * Modern Convert CTA — violet idle, fills with LEGO yellow as the job progresses.
 * Small studs sit on the top edge as a subtle LEGO accent.
 */
export function ConvertButton({
    progress,
    running,
    queued = false,
    queuePosition = null,
    noFile = false,
    disabled = false,
    onClick,
}: ConvertButtonProps) {
    const isDisabled = disabled || noFile || running || queued
    const clampedProgress = Math.max(0, Math.min(100, progress))

    let label: string
    if (running) label = clampedProgress >= 100 ? 'Done!' : `${Math.round(clampedProgress)}%`
    else if (queued) label = queuePosition != null ? `#${queuePosition} in line…` : 'In queue…'
    else if (noFile) label = 'Upload an image first'
    else label = 'Convert to LEGO'

    return (
        <div className="relative">
            <StudStrip count={6} tone="yellow" />

            <motion.button
                type="button"
                onClick={onClick}
                disabled={isDisabled}
                whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                whileTap={{ scale: isDisabled ? 1 : 0.97 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className={clsx(
                    'relative w-full h-12 rounded-lg overflow-hidden font-semibold text-sm',
                    'outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
                    'border border-black/20 dark:border-black/40',
                    'transition-colors',
                    isDisabled && !running && !queued
                        ? 'bg-zinc-300 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed'
                        : 'bg-violet-600 text-white hover:bg-violet-500 active:bg-violet-700',
                )}
                style={{
                    boxShadow: 'inset 0 2px 0 rgba(0,0,0,0.18)',
                }}
                aria-busy={running || queued}
            >
                {/* Yellow progress fill */}
                <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-brick-yellowDark via-brick-yellow to-brick-yellowLight"
                    initial={false}
                    animate={{ width: running ? `${clampedProgress}%` : queued ? '8%' : '0%' }}
                    transition={
                        running
                            ? { duration: 0.25, ease: 'easeOut' }
                            : { duration: 0.4, ease: 'easeOut' }
                    }
                    aria-hidden
                />

                {/* Queued shimmer */}
                {queued && (
                    <motion.div
                        className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-violet-300/40 to-transparent"
                        animate={{ x: ['-100%', '400%'] }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
                        aria-hidden
                    />
                )}

                {/* Label */}
                <div className="relative z-10 flex items-center justify-center gap-2 h-full px-4">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={label}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className={clsx(
                                'flex items-center gap-2',
                                running && clampedProgress > 50 && 'text-zinc-900',
                            )}
                        >
                            {!running && !queued && !noFile && <Sparkles size={14} />}
                            {label}
                        </motion.span>
                    </AnimatePresence>
                </div>
            </motion.button>
        </div>
    )
}
