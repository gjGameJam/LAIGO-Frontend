import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { AlertCircle, DownloadIcon } from 'lucide-react'
import { payJob, PayError } from '../../checkoutApi'

interface BuildPackPaymentFormProps {
    jobId: string
    amountCents: number
    amountLabel: string
    /** Validates the shared email input; returns the trimmed address, or null
     *  after flagging the field (owner shows the inline error + focuses it). */
    requestEmail: () => string | null
    /** Server-side email rejection (422) — surface inline on the email input. */
    onEmailError: (message: string) => void
    onSuccess: (email: string) => void
}

export function BuildPackPaymentForm({
    jobId,
    amountCents,
    amountLabel,
    requestEmail,
    onEmailError,
    onSuccess,
}: BuildPackPaymentFormProps) {
    const stripe = useStripe()
    const elements = useElements()
    const [ready, setReady] = useState(false)
    const [paying, setPaying] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!stripe || !elements || !ready || paying || amountCents < 1) return
        const email = requestEmail()
        if (!email) return
        setPaying(true)
        setError(null)

        try {
            // 1. Deferred-intent REQUIREMENT (Elements is created with
            //    mode/amount/currency, not a clientSecret): validate + collect the
            //    card BEFORE any async work. Skipping this is what throws
            //    "elements.submit() must be called before tokenizing".
            const { error: submitError } = await elements.submit()
            if (submitError) {
                setError(submitError.message ?? 'Please check your card details.')
                setPaying(false)
                return
            }

            // 2. Tokenize the card into a PaymentMethod. The backend creates and
            //    confirms the PaymentIntent itself from this pm_… id.
            const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
                elements,
            })
            if (pmError || !paymentMethod) {
                setError(pmError?.message ?? 'Could not read your card details.')
                setPaying(false)
                return
            }

            // 3. Charge through /pay so the backend can email the build pack.
            const result = await payJob(jobId, {
                amount_cents: amountCents,
                payment_method_id: paymentMethod.id,
                email,
            })

            // 4. 3DS: finish authentication with the returned client_secret.
            //    Do NOT re-call /pay afterwards — the backend's Stripe webhook
            //    detects the completion and sends the email itself.
            if (result.status === 'requires_action') {
                const { error: actionError } = await stripe.handleNextAction({
                    clientSecret: result.client_secret,
                })
                if (actionError) {
                    setError(actionError.message ?? 'Card authentication failed.')
                    setPaying(false)
                    return
                }
            }

            onSuccess(email)
        } catch (err) {
            // Any thrown (not returned) error must reset the button so it never
            // gets stuck on "Processing…".
            if (err instanceof PayError && err.emailErrors.length > 0) {
                onEmailError(err.emailErrors.join(' '))
            } else {
                setError(err instanceof Error ? err.message : 'Something went wrong.')
            }
            setPaying(false)
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Stripe collects whatever billing fields this card needs
                (fields.billingDetails: 'auto', the default) and we pass nothing
                at tokenization — that's what keeps the billing-details errors away.
                Valid top-level values are only 'auto' | 'never' | object. */}
            <PaymentElement
                onReady={() => setReady(true)}
                options={{ fields: { billingDetails: 'auto' } }}
            />

            {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
                    <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={!ready || paying || !stripe || amountCents < 1}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-brick-yellow text-zinc-900 hover:bg-brick-yellowLight active:bg-brick-yellowDark border border-zinc-900/10 shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <DownloadIcon size={14} />
                {paying ? 'Processing…' : `Pay ${amountLabel} & Download`}
            </button>
        </div>
    )
}
