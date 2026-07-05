import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Upload, Sliders, Sparkles, Mail } from 'lucide-react'

interface HelpModalProps {
    onClose: () => void
}

const SUPPORT_EMAIL = 'grant@laigomosaicmaker.com'

const STEPS = [
    {
        icon: Upload,
        title: 'Upload an image',
        body: 'Drop a photo into the left panel, or click to browse. Higher-contrast images make for crisper mosaics.',
    },
    {
        icon: Sliders,
        title: 'Tune the parameters',
        body: 'Pick a block width (resolution of the mosaic), choose 2D or 3D, set the background fill, and decide whether to add a frame.',
    },
    {
        icon: Sparkles,
        title: 'Convert',
        body: 'Hit Convert and we\'ll queue your job. The output panel shows live progress and a 3D preview when it\'s ready — click the preview to expand it.',
    },
    {
        icon: Mail,
        title: 'Check out & build',
        body: 'Complete the $1.99 checkout and we\'ll email your build pack — a piece order list plus step-by-step instructions. Order the pieces, then build when they arrive.',
    },
]

export function HelpModal({ onClose }: HelpModalProps) {
    const closeBtnRef = useRef<HTMLButtonElement | null>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        closeBtnRef.current?.focus()
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prevOverflow
        }
    }, [onClose])

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
            aria-labelledby="help-modal-title"
        >
            <motion.div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass rounded-2xl"
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    ref={closeBtnRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Close help"
                    title="Close (Esc)"
                    className="absolute top-4 right-4 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-200 shadow-md shadow-black/10 transition-all hover:bg-white dark:hover:bg-zinc-900 hover:scale-105 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                >
                    <X size={14} />
                </button>

                <div className="px-6 sm:px-8 pt-7 pb-6">
                    <h2
                        id="help-modal-title"
                        className="text-2xl font-extrabold tracking-tight gradient-text mb-1"
                    >
                        How to use LAIGO
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                        Turn any image into a brick mosaic in four steps.
                    </p>

                    <ol className="space-y-4">
                        {STEPS.map(({ icon: Icon, title, body }, i) => (
                            <li key={title} className="flex gap-3">
                                <div className="shrink-0 w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center relative">
                                    <Icon size={16} />
                                    <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {title}
                                    </h3>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mt-0.5">
                                        {body}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <div className="mt-6 p-4 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
                        <div className="flex items-start gap-3">
                            <div className="shrink-0 w-8 h-8 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                                <Mail size={14} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Need more help?
                                </h3>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                                    Stuck or have feedback? Reach out at{' '}
                                    <a
                                        href={`mailto:${SUPPORT_EMAIL}`}
                                        className="font-medium text-violet-600 dark:text-violet-400 hover:underline"
                                    >
                                        {SUPPORT_EMAIL}
                                    </a>
                                    .
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 sm:px-8 py-4 border-t border-zinc-200/70 dark:border-zinc-800/70">
                    <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-500 text-center">
                        LAIGO is an independent fan project. <span className="font-semibold text-zinc-700 dark:text-zinc-300">I am not LEGO</span> — LAIGO is not affiliated with, endorsed by, or sponsored by the LEGO Group. LEGO is a trademark of the LEGO Group.
                    </p>
                </div>
            </motion.div>
        </motion.div>,
        document.body,
    )
}
