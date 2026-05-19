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
                    <RadixSlider.Range className="absolute h-full bg-gradient-to-r from-brick-yellow via-violet-500 to-violet-700 rounded-full" />
                </RadixSlider.Track>

                {/* Stylized 1x1 round LEGO stud (top-down).
                    Real-LEGO proportions: stud diameter = 0.60 × plate diameter
                    (see LegoBrickCard.tsx). At 20px outer → 12px cap, ~4px rim.
                    Lighting matches the brick cards' palette: upper-left lit
                    (topHigh #B5A5E8 → top #9B85F0), lower-right shadowed
                    (right #382678 → rightDark #1F1547). */}
                <RadixSlider.Thumb
                    className="
                        relative block h-5 w-5 rounded-full
                        border border-[#1F1547]
                        outline-none cursor-grab active:cursor-grabbing
                        transition-shadow duration-150
                        shadow-[0_2px_4px_rgba(0,0,0,0.45),inset_1px_1px_1px_rgba(255,255,255,0.28),inset_-1px_-1.5px_2px_rgba(20,10,55,0.45)]
                        hover:shadow-[0_2px_4px_rgba(0,0,0,0.45),inset_1px_1px_1px_rgba(255,255,255,0.28),inset_-1px_-1.5px_2px_rgba(20,10,55,0.45),0_0_0_5px_rgba(107,85,220,0.25)]
                        focus-visible:shadow-[0_2px_4px_rgba(0,0,0,0.45),inset_1px_1px_1px_rgba(255,255,255,0.28),inset_-1px_-1.5px_2px_rgba(20,10,55,0.45),0_0_0_5px_rgba(107,85,220,0.4)]
                    "
                    style={{
                        background:
                            'radial-gradient(circle at 30% 26%, #B5A5E8 0%, #9B85F0 30%, #6B55DC 65%, #48319A 90%, #382678 100%)',
                    }}
                >
                    {/* Stud cap — diameter = 0.60 × 20px = 12px. Slight drop
                        shadow lifts it off the plate to suggest the stud
                        height; inset highlight/shadow keeps the same upper-
                        left lighting direction as the outer plate. */}
                    <span
                        aria-hidden
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                            width: '12px',
                            height: '12px',
                            border: '0.5px solid rgba(31, 21, 71, 0.75)',
                            background:
                                'radial-gradient(circle at 30% 26%, #CFC2F0 0%, #B5A5E8 28%, #9B85F0 65%, #7A65D8 100%)',
                            boxShadow:
                                'inset 0.5px 0.5px 0.5px rgba(255,255,255,0.45), inset -0.5px -1px 1.5px rgba(31,21,71,0.5), 0 0.5px 1px rgba(0,0,0,0.4)',
                        }}
                    />
                </RadixSlider.Thumb>
            </RadixSlider.Root>
        </div>
    )
}
