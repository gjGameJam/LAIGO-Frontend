import clsx from 'clsx'

interface StudStripProps {
    count?: number
    tone?: 'yellow' | 'violet'
    className?: string
    /** Width of each stud (rectangle + oval cap). Default matches legacy LegoButton (20). */
    studWidth?: number
    /** Height of the rectangle body. Default 11 (legacy). */
    studHeight?: number
    /** Optional inner padding for the row — controls how far the outer studs sit from the parent's edges. */
    padX?: number
}

const PALETTE = {
    yellow: { body: '#E5BE00', cap: '#FFD700' },
    violet: { body: '#6d28d9', cap: '#a78bfa' },
} as const

/**
 * A row of LEGO studs styled exactly like the legacy LegoButton studs:
 * a rectangle body with an elliptical (rounded-full) cap on top.
 * Caller must position relative to its parent. The strip sits entirely
 * above the parent's top edge.
 */
export function StudStrip({
    count = 6,
    tone = 'yellow',
    className,
    studWidth = 20,
    studHeight = 11,
    padX = 12,
}: StudStripProps) {
    const { body, cap } = PALETTE[tone]

    // Legacy ratios: rectangle 11 tall, oval 7 tall positioned at top=-2 relative to rectangle.
    // i.e. 2px of oval sticks above the rectangle, 5px overlaps.
    const ovalHeight = Math.max(4, Math.round(studHeight * 0.64))
    const ovalProtrusion = Math.max(2, Math.round(studHeight * 0.18))
    const totalH = studHeight + ovalProtrusion

    return (
        <div
            aria-hidden
            className={clsx(
                'pointer-events-none absolute left-0 right-0 flex justify-between items-end',
                className
            )}
            style={{
                top: `-${totalH}px`,
                height: `${totalH}px`,
                paddingLeft: padX,
                paddingRight: padX,
            }}
        >
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="relative"
                    style={{ width: studWidth, height: totalH }}
                >
                    {/* Rectangle body — anchored to the bottom */}
                    <div
                        className="absolute left-0 right-0 bottom-0 border-2 border-black"
                        style={{
                            height: studHeight,
                            backgroundColor: body,
                            boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.22)',
                            zIndex: 1,
                        }}
                    />
                    {/* Oval cap — anchored to the top, overlapping the rectangle */}
                    <div
                        className="absolute left-0 right-0 top-0 rounded-full border-2 border-black"
                        style={{
                            height: ovalHeight,
                            backgroundColor: cap,
                            zIndex: 2,
                        }}
                    />
                </div>
            ))}
        </div>
    )
}
