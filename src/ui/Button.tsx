import { motion, type HTMLMotionProps } from 'framer-motion'
import clsx from 'clsx'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'yellow'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children: ReactNode
    variant?: Variant
    size?: Size
}

export function Button({ children, variant = 'primary', size = 'md', className, disabled, ...props }: ButtonProps) {
    const base =
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 disabled:opacity-40 disabled:pointer-events-none'

    const variants: Record<Variant, string> = {
        primary:
            'bg-violet-600 text-white hover:bg-violet-500 active:bg-violet-700',
        yellow:
            'bg-brick-yellow text-zinc-900 hover:bg-brick-yellowLight active:bg-brick-yellowDark border border-zinc-900/10 shadow-sm',
        secondary:
            'bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:hover:border-zinc-600',
        ghost:
            'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800',
        outline:
            'border border-violet-500/50 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:border-violet-400',
    }

    const sizes: Record<Size, string> = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
    }

    return (
        <motion.button
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={clsx(base, variants[variant], sizes[size], className)}
            disabled={disabled}
            {...props}
        >
            {children}
        </motion.button>
    )
}
