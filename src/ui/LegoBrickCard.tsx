import { useEffect, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'

interface LegoBrickCardProps {
    tone: 'yellow' | 'violet'
    className?: string
    children: ReactNode
}

/* Palettes match the legacy LegoBrickCanvas / LegoButton aesthetic:
 * "body" is the saturated brick color, "cap" is the lighter top highlight,
 * "side" is the darker face used for 3D depth. */
const PALETTES = {
    yellow: {
        body: '#FFD700',
        cap: '#FFE866',
        side: '#A88800',
        studBody: '#E5BE00',
        studCap: '#FFE866',
        capText: '#5A4400',
    },
    violet: {
        body: '#7C3AED',
        cap: '#A78BFA',
        side: '#4C1D95',
        studBody: '#6D28D9',
        studCap: '#A78BFA',
        capText: '#FFFFFF',
    },
} as const

// Stud geometry matches the legacy LegoButton studs (rectangle + oval).
const STUD_W = 20
const STUD_BODY_H = 11
const STUD_CAP_H = 7
const STUD_PROTRUSION = 2
const STUD_TOTAL_H = STUD_BODY_H + STUD_PROTRUSION

// Layout
const STUD_PITCH = 48      // target horizontal spacing between stud centers
const SIDE_PAD = 18        // padding at the left/right of the stud strip
const CAP_STRIPE_H = 16    // top-cap (lighter shade) stripe
const SIDE_DEPTH = 6       // chunky 3D offset

export function LegoBrickCard({ tone, className, children }: LegoBrickCardProps) {
    const brickRef = useRef<HTMLDivElement>(null)
    const [studCount, setStudCount] = useState(6)
    const p = PALETTES[tone]

    useEffect(() => {
        const el = brickRef.current
        if (!el) return
        const observer = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width
            const available = Math.max(0, width - SIDE_PAD * 2)
            const count = Math.max(3, Math.floor(available / STUD_PITCH))
            setStudCount(count)
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            className={clsx('relative', className)}
            style={{ paddingTop: STUD_TOTAL_H + 2 }}
        >
            {/* Studs sit on top of the brick */}
            <div
                aria-hidden
                className="absolute left-0 right-0 z-20 flex items-end justify-between pointer-events-none"
                style={{
                    top: 2,
                    height: STUD_TOTAL_H,
                    paddingLeft: SIDE_PAD,
                    paddingRight: SIDE_PAD,
                }}
            >
                {Array.from({ length: studCount }).map((_, i) => (
                    <div
                        key={i}
                        className="relative"
                        style={{ width: STUD_W, height: STUD_TOTAL_H }}
                    >
                        {/* Cylinder body — sits flush with the brick top */}
                        <div
                            className="absolute left-0 right-0 bottom-0 border-2 border-black"
                            style={{
                                height: STUD_BODY_H,
                                backgroundColor: p.studBody,
                                boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.22)',
                                zIndex: 1,
                            }}
                        />
                        {/* Elliptical cap — protrudes above */}
                        <div
                            className="absolute left-0 right-0 top-0 rounded-full border-2 border-black"
                            style={{
                                height: STUD_CAP_H,
                                backgroundColor: p.studCap,
                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45)',
                                zIndex: 2,
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Brick chassis */}
            <div
                ref={brickRef}
                className="relative border-2 border-black rounded-md"
                style={{
                    backgroundColor: p.body,
                    boxShadow: `
                        ${SIDE_DEPTH}px ${SIDE_DEPTH}px 0 0 ${p.side},
                        ${SIDE_DEPTH}px ${SIDE_DEPTH}px 0 2px #000,
                        ${SIDE_DEPTH + 4}px ${SIDE_DEPTH + 4}px 22px rgba(0,0,0,0.22)
                    `,
                }}
            >
                {/* Top cap stripe (lighter shade) */}
                <div
                    className="relative"
                    style={{
                        height: CAP_STRIPE_H,
                        backgroundColor: p.cap,
                        borderBottom: '1px solid #000',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)',
                    }}
                />

                {/* Inner content "window" — keeps forms/output readable on top of the brick */}
                <div className="p-2 sm:p-3">
                    <div className="relative rounded-xl bg-white/90 dark:bg-zinc-900/85 backdrop-blur-sm border border-black/15 dark:border-white/10 p-5 sm:p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
