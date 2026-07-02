import { useState } from 'react'
import { createPortal } from 'react-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { motion, AnimatePresence } from 'framer-motion'
import {
    AlertCircle,
    DownloadIcon,
    PackageOpenIcon,
    ShoppingCartIcon,
    HammerIcon,
    HeartIcon,
} from 'lucide-react'
import { BrickPreview3D } from './BrickPreview3D'
import { StudStackingLoader } from './StudStackingLoader'
import { DonationPaymentForm } from './checkout/DonationPaymentForm'
import type { JobState } from '../hooks/useJob'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK ?? '')

const PICK_A_BRICK_URL = 'https://www.lego.com/en-us/pick-and-build/pick-a-brick?consent-modal=show'

const NEXT_STEPS = [
    { icon: DownloadIcon, text: 'Download the ZIP file with everything inside.' },
    { icon: PackageOpenIcon, text: 'Open zip for piece list to order and instructions.' },
    {
        icon: ShoppingCartIcon,
        text: (
            <>
                Upload the piece list to{' '}
                <a
                    href={PICK_A_BRICK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 dark:text-violet-400 hover:underline"
                >
                    Pick a Brick
                </a>{' '}
                and order parts.
            </>
        ),
    },
    { icon: HammerIcon, text: 'When pieces arrive, follow the instructions and build!' },
]

type AmountOption = 0 | 99 | 300 | 'custom'

const AMOUNT_BUTTONS: { label: string; option: AmountOption }[] = [
    { label: 'Free',   option: 0 },
    { label: '99¢',   option: 99 },
    { label: '$3',    option: 300 },
    { label: 'Custom', option: 'custom' },
]

const DEFAULT_AMOUNT: AmountOption = 99


interface OutputPanelProps {
    jobId: string | null
    job: JobState
    submissionError: string | null
}

export function OutputPanel({ job, submissionError }: OutputPanelProps) {
    // A pre-poll submission error overrides job state — display it as a failure.
    const isFailed = job.status === 'failed' || submissionError !== null
    const errorMessage = submissionError ?? job.error
    const status = isFailed ? 'failed' : job.status
    const { progress, queuePosition, downloadUrl, previewData, previewError } = job

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
                    <CompleteView downloadUrl={downloadUrl} previewData={previewData} previewError={previewError} />
                )}
            </AnimatePresence>
        </div>
    )
}

function CompleteView({
    downloadUrl,
    previewData,
    previewError,
}: {
    downloadUrl: string | null
    previewData: JobState['previewData']
    previewError: JobState['previewError']
}) {
    const [showModal, setShowModal] = useState(false)
    const [amountOption, setAmountOption] = useState<AmountOption>(DEFAULT_AMOUNT)
    const [customDollars, setCustomDollars] = useState('')

    // Cents to send to the backend and display in the button label
    const donationCents =
        amountOption === 'custom'
            ? Math.round(parseFloat(customDollars || '0') * 100)
            : amountOption

    // Label shown on the confirm button
    const amountLabel =
        amountOption === 'custom'
            ? customDollars ? `$${parseFloat(customDollars).toFixed(2)}` : '$0.00'
            : AMOUNT_BUTTONS.find(b => b.option === amountOption)?.label ?? ''

    // Stable key: remount Elements when switching presets, but not on every custom keystroke
    const elementsKey = amountOption === 'custom' ? 'custom' : String(amountOption)

    // Minimum amount Elements needs to initialize (50¢ is Stripe's floor)
    const elementsCents = amountOption === 'custom' ? Math.max(50, donationCents || 50) : (amountOption as number)

    const stripeConfigured = Boolean(import.meta.env.VITE_STRIPE_PK)

    const triggerDownload = () => {
        if (!downloadUrl) return
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = ''
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    const handleSuccess = () => {
        setShowModal(false)
        triggerDownload()
    }

    return (
        <>
            <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col h-full"
            >
                <div className="flex-1 min-h-[300px]">
                    <BrickPreview3D
                        downloadUrl={downloadUrl}
                        previewData={previewData}
                        previewError={previewError}
                    />
                </div>

                <div className="mt-3 glass rounded-xl p-4 flex flex-col gap-4">
                    <div>
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                            Next Steps
                        </p>
                        <ol className="space-y-1.5">
                            {NEXT_STEPS.map(({ icon: Icon, text }, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <span className="text-xs font-bold tabular-nums text-violet-600 dark:text-violet-400 shrink-0 w-4">
                                        {i + 1}.
                                    </span>
                                    <Icon size={13} className="text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        {text}
                                    </p>
                                </li>
                            ))}
                        </ol>
                        <a
                            href={PICK_A_BRICK_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                        >
                            lego.com/pick-a-brick →
                        </a>
                    </div>

                    <button
                        onClick={() => downloadUrl && setShowModal(true)}
                        disabled={!downloadUrl}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-brick-yellow text-zinc-900 hover:bg-brick-yellowLight active:bg-brick-yellowDark border border-zinc-900/10 shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <DownloadIcon size={14} /> Download Build Pack
                    </button>
                </div>
            </motion.div>

            {createPortal(
                <AnimatePresence>
                {showModal && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
                            onClick={() => setShowModal(false)}
                        />

                        <motion.div
                            key="modal"
                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="w-full max-w-lg glass rounded-2xl p-5 shadow-xl pointer-events-auto flex flex-col gap-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <HeartIcon size={14} className="text-rose-400" />
                                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            Support LAIGO
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                        aria-label="Close"
                                    >
                                        ×
                                    </button>
                                </div>

                                <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-1">
                                    LAIGO is free to use, but not to run. Please pay what you can if you enjoyed it.
                                </p>

                                {/* Amount picker */}
                                <div className="grid grid-cols-4 gap-1.5">
                                    {AMOUNT_BUTTONS.map(({ label, option }) => (
                                        <button
                                            key={String(option)}
                                            onClick={() => setAmountOption(option)}
                                            className={`py-2 rounded-lg text-xs font-medium border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
                                                amountOption === option
                                                    ? 'bg-violet-500 border-violet-500 text-white'
                                                    : 'bg-white/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-violet-400 dark:hover:border-violet-500'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom amount input */}
                                {amountOption === 'custom' && (
                                    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/40 px-3 py-2 focus-within:ring-2 focus-within:ring-violet-500/50 focus-within:border-violet-500/50 transition-colors">
                                        <span className="text-sm text-zinc-400 select-none">$</span>
                                        <input
                                            type="number"
                                            min="0.50"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={customDollars}
                                            onChange={e => setCustomDollars(e.target.value)}
                                            autoFocus
                                            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 outline-none min-w-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                                        />
                                    </div>
                                )}

                                {/* Payment fields or free download */}
                                {amountOption === 0 ? (
                                    <button
                                        onClick={handleSuccess}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-brick-yellow text-zinc-900 hover:bg-brick-yellowLight active:bg-brick-yellowDark border border-zinc-900/10 shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                                    >
                                        <DownloadIcon size={14} /> Download for Free
                                    </button>
                                ) : !stripeConfigured ? (
                                    <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2">
                                        <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            Add <code className="px-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-[10px]">VITE_STRIPE_PK</code> to your <code className="px-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-[10px]">.env</code> to enable payments.
                                        </p>
                                    </div>
                                ) : (
                                    <Elements
                                        key={elementsKey}
                                        stripe={stripePromise}
                                        options={{
                                            mode: 'payment',
                                            amount: elementsCents,
                                            currency: 'usd',
                                            // Pin card-only to match the backend PaymentIntent
                                            // (payment_method_types=["card"]). Without this, deferred
                                            // Elements defaults to automatic payment methods, which
                                            // Stripe won't confirm against a card-only intent.
                                            paymentMethodTypes: ['card'],
                                            appearance: { theme: 'stripe' },
                                        }}
                                    >
                                        <DonationPaymentForm
                                            amountCents={donationCents}
                                            amountLabel={amountLabel}
                                            onSuccess={handleSuccess}
                                        />
                                    </Elements>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>,
                document.body
            )}
        </>
    )
}
