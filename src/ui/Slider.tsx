import * as RadixSlider from '@radix-ui/react-slider'

interface SliderProps {
    value: number
    onChange: (v: number) => void
    min?: number
    max?: number
    step?: number
    leftLabel?: string
    rightLabel?: string
    ariaLabel?: string
}

export function Slider({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    leftLabel,
    rightLabel,
    ariaLabel,
}: SliderProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">{leftLabel}</span>
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                    {value}
                </span>
                <span className="text-xs text-zinc-500">{rightLabel}</span>
            </div>

            <RadixSlider.Root
                value={[value]}
                onValueChange={([v]) => onChange(v)}
                min={min}
                max={max}
                step={step}
                className="relative flex h-5 w-full touch-none select-none items-center"
                aria-label={ariaLabel ?? 'Slider'}
            >
                <RadixSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-zinc-200 border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700">
                    <RadixSlider.Range className="absolute h-full bg-gradient-to-r from-violet-700 via-violet-500 to-brick-yellow rounded-full" />
                </RadixSlider.Track>

                <RadixSlider.Thumb
                    className="
                        block h-5 w-5 rounded-full border-2 border-violet-500 bg-white dark:bg-zinc-950
                        outline-none cursor-grab active:cursor-grabbing
                        transition-shadow duration-150
                        hover:shadow-[0_0_0_5px_rgba(139,92,246,0.2)]
                        focus-visible:shadow-[0_0_0_5px_rgba(139,92,246,0.35)]
                    "
                />
            </RadixSlider.Root>
        </div>
    )
}
