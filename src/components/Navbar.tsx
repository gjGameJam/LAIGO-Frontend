import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, HelpCircle } from 'lucide-react'
import clsx from 'clsx'
import { BrickWord } from './BrickWord'
import { HelpModal } from './HelpModal'

export type ApiStatus = 'checking' | 'online' | 'offline'

interface NavbarProps {
    darkMode: boolean
    onToggleDark: () => void
    apiStatus: ApiStatus
}

const STATUS_CONFIG: Record<ApiStatus, { label: string; dot: string; text: string; bg: string; border: string }> = {
    checking: {
        label: 'Checking…',
        dot: 'bg-zinc-400 dark:bg-zinc-500',
        text: 'text-zinc-600 dark:text-zinc-400',
        bg: 'bg-zinc-500/10',
        border: 'border-zinc-500/20',
    },
    online: {
        label: 'Online',
        dot: 'bg-violet-500 dark:bg-violet-400',
        text: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
    },
    offline: {
        label: 'Offline',
        dot: 'bg-brick-yellow dark:bg-brick-yellow',
        text: 'text-amber-700 dark:text-brick-yellow',
        bg: 'bg-brick-yellow/15',
        border: 'border-brick-yellow/40',
    },
}

export function Navbar({ darkMode, onToggleDark, apiStatus }: NavbarProps) {
    const s = STATUS_CONFIG[apiStatus]
    const [helpOpen, setHelpOpen] = useState(false)
    return (
        <motion.nav
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800/60 glass"
        >
            <div className="pl-3 pr-3 sm:pl-4 sm:pr-4 lg:pl-5 lg:pr-6 h-11 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <motion.span
                        layout
                        className={clsx(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium',
                            s.bg,
                            s.border,
                            s.text,
                        )}
                        aria-live="polite"
                    >
                        <span
                            className={clsx(
                                'w-1.5 h-1.5 rounded-full',
                                s.dot,
                                apiStatus === 'checking' && 'animate-pulse',
                                apiStatus === 'online' && 'animate-pulse',
                            )}
                        />
                        {s.label}
                    </motion.span>

                    <BrickWord word="LAIGO Mosaic Maker" height={18} />
                </div>

                <div className="flex items-center gap-2">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onToggleDark}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                        aria-label="Toggle dark mode"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={darkMode ? 'moon' : 'sun'}
                                initial={{ rotate: -30, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 30, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                            </motion.div>
                        </AnimatePresence>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setHelpOpen(true)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                        aria-label="Open help"
                        title="Help"
                    >
                        <HelpCircle size={16} />
                    </motion.button>
                </div>
            </div>

            <AnimatePresence>
                {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
            </AnimatePresence>
        </motion.nav>
    )
}
