import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { AlertCircle, DownloadIcon } from 'lucide-react'
import { createDonationIntent } from '../../checkoutApi'

interface DonationPaymentFormProps {
    amountCents: number
    amountLabel: string
    onSuccess: () => void
}

export function DonationPaymentForm({ amountCents, amountLabel, onSuccess }: DonationPaymentFormProps) {
    const stripe = useStripe()
    const elements = useElements()
    const [ready, setReady] = useState(false)
    const [paying, setPaying] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!stripe || !elements || !ready || paying || amountCents < 50) return
        setPaying(true)
        setError(null)

        try {
            // 1. Deferred-intent REQUIREMENT (Elements is created with
            //    mode/amount/currency, not a clientSecret): validate + collect the
            //    card BEFORE any async work. Skipping this is what throws
            //    "elements.submit() must be called before stripe.confirmPayment()".
            const { error: submitError } = await elements.submit()
            if (submitError) {
                setError(submitError.message ?? 'Please check your card details.')
                setPaying(false)
                return
            }

            // 2. Create the PaymentIntent on the server, get its clientSecret.
            const { client_secret: clientSecret } =
                await createDonationIntent({ amount_cents: amountCents })

            // 3. Confirm. Billing details (if any are needed for this card) are
            //    collected by the PaymentElement via fields.billingDetails:
            //    'if_required' — so nothing is passed manually here.
            const { error: stripeError } = await stripe.confirmPayment({
                elements,
                clientSecret,
                redirect: 'if_required',
                confirmParams: { return_url: window.location.href },
            })

            if (stripeError) {
                setError(stripeError.message ?? 'Payment failed.')
                setPaying(false)
                return
            }

            onSuccess()
        } catch (err) {
            // Any thrown (not returned) error must reset the button so it never
            // gets stuck on "Processing…".
            setError(err instanceof Error ? err.message : 'Something went wrong.')
            setPaying(false)
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Stripe collects whatever billing fields this card needs
                (fields.billingDetails: 'auto', the default) and we pass nothing
                at confirm — that's what keeps the billing-details errors away.
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
                disabled={!ready || paying || !stripe || amountCents < 50}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-brick-yellow text-zinc-900 hover:bg-brick-yellowLight active:bg-brick-yellowDark border border-zinc-900/10 shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <DownloadIcon size={14} />
                {paying ? 'Processing…' : `Tip ${amountLabel} & Download`}
            </button>
        </div>
    )
}
