import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { BrickPreview3D } from './BrickPreview3D'
import { StudStackingLoader } from './StudStackingLoader'
import { StripeCheckoutPanel } from './checkout/StripeCheckoutPanel'
import type { JobState } from '../hooks/useJob'

interface OutputPanelProps {
    jobId: string | null
    job: JobState
    submissionError: string | null
}

export function OutputPanel({ jobId, job, submissionError }: OutputPanelProps) {
    // A pre-poll submission error overrides job state — display it as a failure.
    const isFailed = job.status === 'failed' || submissionError !== null
    const errorMessage = submissionError ?? job.error
    const status = isFailed ? 'failed' : job.status
    const { progress, queuePosition, downloadUrl } = job

    return (
        <div className="flex flex-col h-full">
            <AnimatePresence mode="wait" initial={false}>
                {status === 'idle' && (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <BrickPreview3D />
                    </motion.div>
                )}

                {status === 'queued' && (
                    <motion.div
                        key="queued"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col h-full"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Waiting in Queue
                                </span>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                                    <span className="text-xs text-violet-500 dark:text-violet-400 font-medium">
                                        Queued
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 glass rounded-xl overflow-hidden flex flex-col items-center justify-center py-12 min-h-[300px] gap-3">
                            <div className="text-5xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
                                {queuePosition != null ? `#${queuePosition}` : '…'}
                            </div>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300">
                                {queuePosition != null
                                    ? `${queuePosition === 1 ? 'You are next' : `${queuePosition - 1} job${queuePosition - 1 === 1 ? '' : 's'} ahead of you`}`
                                    : 'Your job is in line on the server'}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                We'll start as soon as the worker is free.
                            </p>
                        </div>
                    </motion.div>
                )}

                {status === 'running' && (
                    <motion.div
                        key="running"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col h-full"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Building Mosaic
                                </span>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brick-yellow/20 border border-brick-yellow/40">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brick-yellow animate-pulse" />
                                    <span className="text-xs text-amber-700 dark:text-brick-yellow font-medium">
                                        Running
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 glass rounded-xl overflow-hidden flex items-center justify-center py-10 min-h-[300px]">
                            <StudStackingLoader progress={progress} />
                        </div>
                    </motion.div>
                )}

                {status === 'failed' && (
                    <motion.div
                        key="failed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col h-full"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Conversion Failed
                                </span>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                                        Error
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 glass rounded-xl overflow-hidden p-6 min-h-[280px]">
                            <div className="flex items-start gap-3 mb-5">
                                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                <div>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                                        {errorMessage ?? 'Something went wrong.'}
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                        Here are the most common causes:
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                        Failed to fetch
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                        The backend went down briefly — reload the page and try again.
                                    </p>
                                </div>
                                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                        Unsupported file type
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                        Only PNG, JPG, GIF, and WEBP are supported.
                                    </p>
                                </div>
                                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                        Unexpected error
                                    </p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                                        If this keeps happening, please contact support.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {status === 'complete' && (
                    <motion.div
                        key="complete"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col h-full"
                    >
                        <div className="flex-1 min-h-[300px]">
                            <BrickPreview3D downloadUrl={downloadUrl} />
                        </div>

                        <div className="mt-3 glass rounded-xl p-4">
                            <StripeCheckoutPanel jobId={jobId} downloadUrl={downloadUrl} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
