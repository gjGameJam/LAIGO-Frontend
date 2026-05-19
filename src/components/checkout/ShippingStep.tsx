import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { Button } from '../../ui/Button'
import type { QuoteRequest } from '../../checkoutApi'

interface ShippingStepProps {
    onSubmit: (values: QuoteRequest) => void
    submitting?: boolean
    /** Inline error from a prior submission attempt — keeps the form open so the user can fix their input. */
    error?: string | null
    /** Re-hydrate the form after a recoverable error so the user doesn't retype. */
    initialValues?: QuoteRequest | null
}

const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 ' +
    'text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 ' +
    'outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50 ' +
    'transition-colors'

export function ShippingStep({ onSubmit, submitting = false, error = null, initialValues = null }: ShippingStepProps) {
    const [email, setEmail] = useState(initialValues?.customer_email ?? '')
    const [country, setCountry] = useState(initialValues?.shipping_country ?? 'US')
    const [zip, setZip] = useState(initialValues?.shipping_zip ?? '')

    const isValid = email.includes('@') && zip.trim().length >= 3 && country.length === 2

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (!isValid || submitting) return
        onSubmit({
            customer_email: email.trim(),
            shipping_country: country.trim().toUpperCase(),
            shipping_zip: zip.trim(),
        })
    }

    return (
        <motion.form
            key="shipping"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onSubmit={handleSubmit}
            className="flex flex-col gap-3"
            aria-label="Shipping details"
        >
            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2"
                >
                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-300 leading-snug">
                        {error}
                    </p>
                </div>
            )}

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                We need a destination to price your build pack — nothing is saved until you pay.
            </p>

            <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Email
                </span>
                <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass + ' mt-1'}
                    disabled={submitting}
                />
            </label>

            <div className="grid grid-cols-[1fr_2fr] gap-2">
                <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Country
                    </span>
                    <input
                        type="text"
                        autoComplete="country"
                        required
                        maxLength={2}
                        value={country}
                        onChange={(e) => setCountry(e.target.value.toUpperCase())}
                        className={inputClass + ' mt-1 uppercase tabular-nums'}
                        disabled={submitting}
                    />
                </label>
                <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        ZIP / Postal
                    </span>
                    <input
                        type="text"
                        autoComplete="postal-code"
                        required
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        placeholder="94110"
                        className={inputClass + ' mt-1'}
                        disabled={submitting}
                    />
                </label>
            </div>

            <Button type="submit" variant="primary" size="md" disabled={!isValid || submitting} className="w-full mt-2">
                {submitting ? 'Pricing…' : 'Get price'}
            </Button>
        </motion.form>
    )
}
