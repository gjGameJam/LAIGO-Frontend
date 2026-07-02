import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { ArrowRightLeft } from 'lucide-react'

interface ConvertButtonProps {
    progress: number
    running: boolean
    queued?: boolean
    queuePosition?: number | null
    noFile?: boolean
    disabled?: boolean
    /** Current form values already produced a completed job — suppresses the attract animation. */
    converted?: boolean
    onClick?: () => void
}

/**
 * Modern Convert CTA — violet gradient idle with a periodic shine sweep + glow
 * while ready to click, fills with LEGO yellow as the job progresses.
 */
export function ConvertButton({
    progress,
    running,
    queued = false,
    queuePosition = null,
    noFile = false,
    disabled = false,
    converted = false,
    onClick,
}: ConvertButtonProps) {
    const isDisabled = disabled || noFile || running || queued
    // Attract mode: ready to click and there's something new to convert.
    const attract = !isDisabled && !converted
    const clampedProgress = Math.max(0, Math.min(100, progress))

    let label: string
    if (running) label = clampedProgress >= 100 ? 'Done!' : `${Math.round(clampedProgress)}%`
    else if (queued) label = queuePosition != null ? `#${queuePosition} in line…` : 'In queue…'
    else if (noFile) label = 'Upload an image first'
    else label = 'Convert to LEGO'

    // Smooth text-color transition: white over the violet base, fading to
    // zinc-900 as the yellow fill passes underneath. Centered around 50%
    // progress so the swap happens once the fill reaches the label — no
    // hard pop like the previous `clampedProgress > 50` cutoff.
    const textMixPercent = running
        ? Math.max(0, Math.min(100, (clampedProgress - 30) * 2.5))
        : 0
    const runningTextColor = running
        ? `color-mix(in srgb, white, rgb(24 24 27) ${textMixPercent}%)`
        : undefined

    return (
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
                'transition-[color,background-color,filter,box-shadow] duration-200',
                isDisabled && !running && !queued
                    ? 'bg-zinc-300 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed'
                    : 'bg-gradient-to-br from-violet-500 via-violet-600 to-violet-700 text-white hover:brightness-110 active:brightness-95',
            )}
            style={{
                boxShadow:
                    isDisabled && !running && !queued
                        ? 'inset 0 2px 0 rgba(0,0,0,0.18)'
                        : attract
                          ? 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.25), 0 0 22px rgba(107,85,220,0.45)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.25)',
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

            {/* Attract shine — periodic diagonal light band while ready to click.
                Transform-based, so MotionConfig reducedMotion="user" disables it. */}
            {attract && (
                <motion.div
                    className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
                    animate={{ x: ['-150%', '450%'] }}
                    transition={{ repeat: Infinity, duration: 1.1, repeatDelay: 2.6, ease: 'easeInOut' }}
                    aria-hidden
                />
            )}

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
                        className="flex items-center gap-2"
                        style={runningTextColor ? { color: runningTextColor } : undefined}
                    >
                        {!running && !queued && !noFile && <ArrowRightLeft size={14} />}
                        {label}
                    </motion.span>
                </AnimatePresence>
            </div>
        </motion.button>
    )
}
