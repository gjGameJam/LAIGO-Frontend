import { motion } from 'framer-motion'
import clsx from 'clsx'

interface SegmentedOption<T> {
    label: string
    value: T
}

interface SegmentedControlProps<T> {
    options: SegmentedOption<T>[]
    value: T
    onChange: (value: T) => void
    ariaLabel?: string
    id?: string
}

export function SegmentedControl<T extends string | number | boolean>({
    options,
    value,
    onChange,
    ariaLabel,
    id = 'segment',
}: SegmentedControlProps<T>) {
    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className="flex rounded-lg bg-zinc-100 border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 p-0.5 gap-0.5"
        >
            {options.map((opt) => {
                const isActive = value === opt.value
                const key = String(opt.value)
                return (
                    <button
                        key={key}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => onChange(opt.value)}
                        className={clsx(
                            'relative flex-1 py-2 text-sm font-medium rounded-md transition-colors duration-200 outline-none',
                            'focus-visible:ring-2 focus-visible:ring-violet-500/50',
                            isActive
                                ? 'text-zinc-900'
                                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        )}
                    >
                        {isActive && (
                            <motion.div
                                layoutId={`${id}-active`}
                                className="absolute inset-0 bg-brick-yellow rounded-md shadow-sm border border-zinc-900/15"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                            />
                        )}
                        <span className="relative z-10">{opt.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
