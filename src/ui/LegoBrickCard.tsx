import { useLayoutEffect, useRef, useState, useId, type ReactNode } from 'react'
import clsx from 'clsx'

interface LegoBrickCardProps {
    tone: 'yellow' | 'violet'
    className?: string
    children: ReactNode
}

/* Three-face shading: top is the lit face (lighter), front catches oblique
 * light (medium), right is the shadow side (darkest). Each face gets a
 * gradient stop so it reads as a lit surface, not flat fill. */
const PALETTES = {
    yellow: {
        topHigh: '#FFE96B',
        top: '#FFD700',
        frontHigh: '#E5BE00',
        front: '#C49A00',
        right: '#8C7400',
        rightDark: '#5A4A00',
        studBody: '#E5BE00',
        studCap: '#FFE866',
    },
    violet: {
        topHigh: '#B5A5E8',
        top: '#9B85F0',
        frontHigh: '#6B55DC',
        front: '#5B3FBF',
        right: '#382678',
        rightDark: '#1F1547',
        studBody: '#48319A',
        studCap: '#9B85F0',
    },
} as const

/**
 * Real-LEGO proportions (sourced from LDraw / BrickLink / studs.io specs).
 *
 *   P  = 1 LEGO module = stud-to-stud pitch = 8 mm in real life
 *
 *   stud diameter           = 0.600 P   ( 4.8 mm)
 *   stud height             = 0.225 P   ( 1.8 mm)
 *   brick depth (1 unit)    = 1.000 P   ( 8.0 mm)
 *   first-stud edge offset  = 0.500 P   ( 4.0 mm)
 *
 * Cap-ellipse ry is the geometric projection of a horizontal circle of
 * radius (STUD_W / 2) under our depth-axis projection (DEPTH_X, -DEPTH_Y)/P:
 *
 *     ry = (STUD_W / 2) × (DEPTH_Y / P)
 *
 * The brick is exactly one unit deep; depth projects to (DEPTH_X, -DEPTH_Y).
 */

// 1 LEGO module in our scale (px)
const STUD_PITCH = 56

// Depth projection — single-block-thick, viewed from top-right
const DEPTH_X = 14
const DEPTH_Y = 9

// Real-LEGO stud proportions
const STUD_W = Math.round(0.60 * STUD_PITCH)         // 34: stud diameter
const STUD_BODY_H = Math.round(0.225 * STUD_PITCH)   // 13: stud height
const STUD_CAP_RY = Math.max(                        // 3: projected cap vertical radius
    2,
    Math.round((STUD_W / 2) * (DEPTH_Y / STUD_PITCH)),
)

// Wrapper padding to accommodate the visible brick chassis
const STUD_PEEK = STUD_BODY_H + STUD_CAP_RY - DEPTH_Y / 2
const PAD_TOP = DEPTH_Y + Math.ceil(STUD_PEEK) + 6
const PAD_RIGHT = DEPTH_X + 2

export function LegoBrickCard({ tone, className, children }: LegoBrickCardProps) {
    const ref = useRef<HTMLDivElement>(null)
    // React's useId may emit characters that aren't valid in SVG `id` attributes
    // (':', '«', '»' across versions). Normalize to a permissive alphabet.
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '_')
    const [size, setSize] = useState({ w: 0, h: 0 })
    const [studCount, setStudCount] = useState(6)
    const p = PALETTES[tone]

    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const update = () => {
            const r = el.getBoundingClientRect()
            setSize({ w: r.width, h: r.height })
            // Pick the largest real-LEGO 1×N brick that fits the current
            // card width. width(1×N) = N × P, so N = floor(w / P).
            setStudCount(Math.max(2, Math.floor(r.width / STUD_PITCH)))
        }
        update()
        const observer = new ResizeObserver(update)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const { w, h } = size
    // Stud row uses exact P spacing (real-LEGO interval). The whole row is
    // centered, so any leftover width when w isn't a clean multiple of P is
    // split equally on left/right rather than warping the spacing.
    const studsRowWidth = studCount * STUD_PITCH
    const studRowStartX = (w - studsRowWidth) / 2

    return (
        <div
            className={clsx('relative', className)}
            style={{ paddingTop: PAD_TOP, paddingRight: PAD_RIGHT }}
        >
            {/* Brick chassis: top + right + front faces, plus studs on top */}
            {w > 0 && (
                <svg
                    aria-hidden
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        overflow: 'visible',
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.45))',
                    }}
                >
                    <defs>
                        <linearGradient id={`top-${uid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor={p.topHigh} />
                            <stop offset="1" stopColor={p.top} />
                        </linearGradient>
                        <linearGradient id={`front-${uid}`} x1="0" y1="0" x2="0.15" y2="1">
                            <stop offset="0" stopColor={p.frontHigh} />
                            <stop offset="1" stopColor={p.front} />
                        </linearGradient>
                        <linearGradient id={`right-${uid}`} x1="0" y1="0" x2="1" y2="0.4">
                            <stop offset="0" stopColor={p.right} />
                            <stop offset="1" stopColor={p.rightDark} />
                        </linearGradient>
                    </defs>

                    {/* TOP face (lit) */}
                    <polygon
                        points={`0,${PAD_TOP} ${w},${PAD_TOP} ${w + DEPTH_X},${PAD_TOP - DEPTH_Y} ${DEPTH_X},${PAD_TOP - DEPTH_Y}`}
                        fill={`url(#top-${uid})`}
                        stroke="#000"
                        strokeWidth={2}
                        strokeLinejoin="miter"
                    />

                    {/* RIGHT face (shadow) */}
                    <polygon
                        points={`${w},${PAD_TOP} ${w + DEPTH_X},${PAD_TOP - DEPTH_Y} ${w + DEPTH_X},${PAD_TOP - DEPTH_Y + h} ${w},${PAD_TOP + h}`}
                        fill={`url(#right-${uid})`}
                        stroke="#000"
                        strokeWidth={2}
                        strokeLinejoin="miter"
                    />

                    {/* FRONT face (medium) */}
                    <polygon
                        points={`0,${PAD_TOP} ${w},${PAD_TOP} ${w},${PAD_TOP + h} 0,${PAD_TOP + h}`}
                        fill={`url(#front-${uid})`}
                        stroke="#000"
                        strokeWidth={2}
                        strokeLinejoin="miter"
                    />

                    {/* Studs — each centered on a P × P cell of the top face,
                        sitting at mid-depth and rising STUD_BODY_H straight up */}
                    {Array.from({ length: studCount }, (_, i) => {
                        // Stud center on the front-face X axis (LEGO: P/2 + i·P from row start)
                        const fx = studRowStartX + (i + 0.5) * STUD_PITCH
                        // Project to mid-depth (depth_z = P/2) on the top face
                        const baseX = fx + DEPTH_X / 2
                        const baseY = PAD_TOP - DEPTH_Y / 2
                        const bodyTopY = baseY - STUD_BODY_H
                        const bodyX = baseX - STUD_W / 2
                        return (
                            <g key={i}>
                                {/* Cylinder body — the side wall of the stud */}
                                <rect
                                    x={bodyX}
                                    y={bodyTopY}
                                    width={STUD_W}
                                    height={STUD_BODY_H}
                                    fill={p.studBody}
                                    stroke="#000"
                                    strokeWidth={1.5}
                                />
                                {/* Side shadow on the cylinder body (right edge slightly darker) */}
                                <rect
                                    x={bodyX + STUD_W * 0.65}
                                    y={bodyTopY + 1}
                                    width={STUD_W * 0.32}
                                    height={STUD_BODY_H - 2}
                                    fill="rgba(0,0,0,0.18)"
                                />
                                {/* Oval cap on top */}
                                <ellipse
                                    cx={baseX}
                                    cy={bodyTopY}
                                    rx={STUD_W / 2}
                                    ry={STUD_CAP_RY}
                                    fill={p.studCap}
                                    stroke="#000"
                                    strokeWidth={1.5}
                                />
                                {/* Cap highlight */}
                                <ellipse
                                    cx={baseX - STUD_W * 0.18}
                                    cy={bodyTopY - 0.6}
                                    rx={STUD_W * 0.22}
                                    ry={STUD_CAP_RY * 0.5}
                                    fill="rgba(255,255,255,0.55)"
                                />
                            </g>
                        )
                    })}
                </svg>
            )}

            {/* Front-face content — recessed "screen" matched to the page background,
                so it reads as part of the surface rather than a white panel.
                The wrapper's padding shows the LEGO color as a frame around it. */}
            <div ref={ref} className="relative z-[1] p-3 sm:p-4">
                <div className="relative rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-black/30 dark:border-white/10 p-5 sm:p-6 shadow-[inset_0_2px_6px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.55)]">
                    {children}
                </div>
            </div>
        </div>
    )
}
