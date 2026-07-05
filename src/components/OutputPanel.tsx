import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { motion, AnimatePresence } from 'framer-motion'
import {
    AlertCircle,
    CheckCircle2Icon,
    CreditCardIcon,
    DownloadIcon,
    MailIcon,
    PackageOpenIcon,
    ShoppingCartIcon,
    HammerIcon,
} from 'lucide-react'
import { BrickPreview3D } from './BrickPreview3D'
import { StudStackingLoader } from './StudStackingLoader'
import { BuildPackPaymentForm } from './checkout/BuildPackPaymentForm'
import type { JobState } from '../hooks/useJob'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK ?? '')

const NEXT_STEPS = [
    { icon: CreditCardIcon, text: 'Tap Receive Build Pack below and check out — the build pack is 99¢.' },
    { icon: MailIcon, text: "We'll email your build pack: piece order list + step-by-step instructions." },
    { icon: ShoppingCartIcon, text: 'Order your pieces using the emailed list — full details in the email.' },
    { icon: HammerIcon, text: 'When the pieces arrive, follow the instructions and build!' },
]

// Fixed price — the build pack is no longer pay-what-you-want. The backend
// /pay contract still accepts any amount_cents ≥ 0; the UI just sends 99.
const BUILD_PACK_PRICE_CENTS = 99
const BUILD_PACK_PRICE_LABEL = '99¢'

// Mirrors the server's deliberately loose email check — do not be stricter.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const EMAIL_MAX_LENGTH = 254
const EMAIL_STORAGE_KEY = 'laigo:buildPackEmail'

function loadStoredEmail(): string {
    try {
        return localStorage.getItem(EMAIL_STORAGE_KEY) ?? ''
    } catch {
        return ''
    }
}

function storeEmail(email: string) {
    try {
        localStorage.setItem(EMAIL_STORAGE_KEY, email)
    } catch {
        // Private mode / blocked storage — prefill is a nice-to-have only.
    }
}


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
                    <CompleteView
                        jobId={jobId}
                        downloadUrl={downloadUrl}
                        previewData={previewData}
                        previewError={previewError}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

function CompleteView({
    jobId,
    downloadUrl,
    previewData,
    previewError,
}: {
    jobId: string | null
    downloadUrl: string | null
    previewData: JobState['previewData']
    previewError: JobState['previewError']
}) {
    const [showModal, setShowModal] = useState(false)

    // Build-pack delivery email — required by POST /jobs/:id/pay.
    // Prefilled from the last successful checkout.
    const [email, setEmail] = useState(loadStoredEmail)
    const [emailError, setEmailError] = useState<string | null>(null)
    const emailInputRef = useRef<HTMLInputElement>(null)

    // Set once /pay succeeds — swaps the modal to the confirmation view.
    const [sentTo, setSentTo] = useState<string | null>(null)

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

    /** Client-side gate mirroring the server's loose validation: non-empty,
     *  ≤254 chars, x@y.z. Returns the trimmed address or null after flagging
     *  the input. */
    const requestEmail = (): string | null => {
        const trimmed = email.trim()
        if (trimmed.length > 0 && trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(trimmed)) {
            setEmailError(null)
            return trimmed
        }
        setEmailError('Enter a valid email address — we need it to send your build pack.')
        emailInputRef.current?.focus()
        return null
    }

    const flagEmailFromServer = (message: string) => {
        setEmailError(message)
        emailInputRef.current?.focus()
    }

    const handleSuccess = (paidEmail: string) => {
        storeEmail(paidEmail)
        setSentTo(paidEmail)
        triggerDownload()
    }

    const openModal = () => {
        if (!downloadUrl) return
        // Clear transient state from a previous run; keep the email.
        setSentTo(null)
        setEmailError(null)
        setShowModal(true)
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
                        onReceiveBuildPack={downloadUrl ? openModal : null}
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
                    </div>

                    <button
                        onClick={openModal}
                        disabled={!downloadUrl}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-brick-yellow text-zinc-900 hover:bg-brick-yellowLight active:bg-brick-yellowDark border border-zinc-900/10 shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PackageOpenIcon size={14} /> Receive Build Pack
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
                                        <PackageOpenIcon size={14} className="text-violet-500 dark:text-violet-400" />
                                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            Get Your Build Pack
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

                                {sentTo ? (
                                    /* Post-checkout confirmation — the download has
                                       already auto-started; email is the parallel
                                       delivery channel. */
                                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                                        <CheckCircle2Icon size={28} className="text-emerald-500" />
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            Payment complete!
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                            Your build pack is on its way to{' '}
                                            <span className="font-medium text-zinc-700 dark:text-zinc-200">{sentTo}</span>
                                            {' '}— check spam if you don't see it.
                                        </p>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                            A copy has also started downloading in your browser.
                                        </p>
                                        <div className="flex gap-2 w-full mt-1">
                                            <button
                                                onClick={triggerDownload}
                                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-violet-400 dark:hover:border-violet-500 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                                            >
                                                <DownloadIcon size={13} /> Download again
                                            </button>
                                            <button
                                                onClick={() => setShowModal(false)}
                                                className="flex-1 inline-flex items-center justify-center px-4 py-2 text-xs font-medium rounded-lg bg-brick-yellow text-zinc-900 hover:bg-brick-yellowLight active:bg-brick-yellowDark border border-zinc-900/10 shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                <>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-1">
                                    Converting your photo is free — the finished build pack is{' '}
                                    <span className="font-semibold text-zinc-700 dark:text-zinc-200">{BUILD_PACK_PRICE_LABEL}</span>.
                                    Check out below and we'll email you everything you need to build it.
                                </p>

                                {/* Delivery email — required for every checkout, incl. $0 */}
                                <div className="flex flex-col gap-1">
                                    <label
                                        htmlFor="buildpack-email"
                                        className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                                    >
                                        Email
                                    </label>
                                    <input
                                        ref={emailInputRef}
                                        id="buildpack-email"
                                        type="email"
                                        maxLength={EMAIL_MAX_LENGTH}
                                        autoComplete="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={e => {
                                            setEmail(e.target.value)
                                            if (emailError) setEmailError(null)
                                        }}
                                        aria-invalid={emailError !== null}
                                        aria-describedby="buildpack-email-note"
                                        className={`rounded-lg border bg-white/70 dark:bg-zinc-900/40 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-colors placeholder:text-zinc-400 dark:placeholder:text-zinc-600 ${
                                            emailError
                                                ? 'border-red-500/60'
                                                : 'border-zinc-200 dark:border-zinc-700'
                                        }`}
                                    />
                                    {emailError ? (
                                        <p id="buildpack-email-note" className="text-xs text-red-600 dark:text-red-400">
                                            {emailError}
                                        </p>
                                    ) : (
                                        <p id="buildpack-email-note" className="text-xs text-zinc-500 dark:text-zinc-500">
                                            We'll send your build pack (instructions PDF + brick order list) here.
                                        </p>
                                    )}
                                </div>

                                {/* Payment fields */}
                                {!stripeConfigured ? (
                                    <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2">
                                        <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            Add <code className="px-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-[10px]">VITE_STRIPE_PK</code> to your <code className="px-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-[10px]">.env</code> to enable payments.
                                        </p>
                                    </div>
                                ) : jobId === null ? null : (
                                    <Elements
                                        stripe={stripePromise}
                                        options={{
                                            mode: 'payment',
                                            amount: BUILD_PACK_PRICE_CENTS,
                                            currency: 'usd',
                                            // Pin card-only to match the backend PaymentIntent
                                            // (payment_method_types=["card"]). Without this, deferred
                                            // Elements defaults to automatic payment methods, which
                                            // Stripe won't confirm against a card-only intent.
                                            paymentMethodTypes: ['card'],
                                            // /pay expects a pm_… id, so the frontend tokenizes via
                                            // stripe.createPaymentMethod — Stripe requires opting in.
                                            paymentMethodCreation: 'manual',
                                            appearance: { theme: 'stripe' },
                                        }}
                                    >
                                        <BuildPackPaymentForm
                                            jobId={jobId}
                                            amountCents={BUILD_PACK_PRICE_CENTS}
                                            amountLabel={BUILD_PACK_PRICE_LABEL}
                                            requestEmail={requestEmail}
                                            onEmailError={flagEmailFromServer}
                                            onSuccess={handleSuccess}
                                        />
                                    </Elements>
                                )}
                                </>
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
