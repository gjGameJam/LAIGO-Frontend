import { useEffect, useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Navbar, type ApiStatus } from './components/Navbar'
import { ParameterForm, DEFAULT_VALUES, type FormValues } from './components/ParameterForm'
import { OutputPanel } from './components/OutputPanel'
import { LegoBrickCard } from './ui/LegoBrickCard'
import { useDarkMode } from './hooks/useDarkMode'
import { health } from './api'

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
}

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
    },
}

export default function App() {
    const [darkMode, toggleDark] = useDarkMode()
    const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')
    const [values, setValues] = useState<FormValues>(DEFAULT_VALUES)
    const [jobId, setJobId] = useState<string | null>(null)
    const [, setJobError] = useState<string | null>(null)

    useEffect(() => {
        health()
            .then(() => setApiStatus('online'))
            .catch(() => setApiStatus('offline'))
    }, [])

    return (
        <MotionConfig reducedMotion="user">
            <ErrorBoundary>
                <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 relative overflow-x-hidden">
                    {/* Ambient orbs */}
                    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
                        <div className="absolute -top-32 right-0 w-[600px] h-[600px] rounded-full bg-violet-600/[0.08] dark:bg-violet-600/[0.06] blur-[100px]" />
                        <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full bg-violet-800/[0.06] dark:bg-violet-800/[0.05] blur-[80px]" />
                        <div className="absolute -bottom-32 right-1/3 w-[300px] h-[300px] rounded-full bg-brick-yellow/[0.06] dark:bg-brick-yellow/[0.05] blur-[80px]" />
                    </div>

                    <Navbar darkMode={darkMode} onToggleDark={toggleDark} apiStatus={apiStatus} />

                    <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                        {/* Hero */}
                        <motion.div
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className="pt-8 pb-8 text-center"
                        >
                            <motion.h1
                                variants={fadeUp}
                                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] mb-5"
                            >
                                <span className="gradient-text">Turn any image</span>
                                <br />
                                <span className="gradient-text">into a LEGO mosaic.</span>
                            </motion.h1>

                            <motion.p
                                variants={fadeUp}
                                className="max-w-xl mx-auto text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed"
                            >
                                Upload a photo, tune the parameters, and get a build pack — piece list and instructions ready for Pick a Brick.
                            </motion.p>
                        </motion.div>

                        {/* Panels */}
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-8 items-start"
                        >
                            {/* Input brick */}
                            <LegoBrickCard tone="yellow">
                                <ParameterForm
                                    values={values}
                                    onChange={setValues}
                                    onJobCreated={setJobId}
                                    onError={setJobError}
                                />
                            </LegoBrickCard>

                            {/* Output brick */}
                            <LegoBrickCard tone="violet" className="lg:sticky lg:top-[4.5rem]">
                                <OutputPanel jobId={jobId ?? undefined} />
                            </LegoBrickCard>
                        </motion.div>
                    </main>

                    {/* Fixed-bottom disclaimer */}
                    <p className="fixed bottom-2 left-0 right-0 text-center text-[10px] text-zinc-400 dark:text-zinc-600 px-4 z-10 pointer-events-none">
                        LAIGO is an independent fan project and is not affiliated with, endorsed by, or sponsored by the LEGO Group. LEGO is a trademark of the LEGO Group.
                    </p>
                </div>
            </ErrorBoundary>
        </MotionConfig>
    )
}
