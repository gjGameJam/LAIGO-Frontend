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
 * radius (studW / 2) under the depth axis (DEPTH_X, -DEPTH_Y)/P:
 *
 *     ry = (studW / 2) × (DEPTH_Y / P)
 *
 * Stud row spans the full card width: we pick N = ceil(w / P_target) so
 * the actual pitch (w / N) is at most the target; every stud sits on its
 * own P-cell, which gives the canonical 0.2P gutter at each end of the
 * row and 0.4P gap between adjacent studs — no manual centering needed.
 */

// Design-target LEGO module (px). Actual pitch per render is w / N and is
// always ≤ this value, so target-derived padding is a safe upper bound.
const STUD_PITCH_TARGET = 43

// Depth projection of one P-unit (top-right view). Ratios chosen so the
// viewing angle matches the wider scene (FallingBricks, StudStackingLoader).
const DEPTH_X = 11
const DEPTH_Y = 7

// Pure view-angle ratios: depth-axis projection per LEGO module. Used by the
// stud-cap projection at any pitch, including the slightly sub-target pitch
// we may end up with after fitting the row to w.
const DEPTH_Y_RATIO = DEPTH_Y / STUD_PITCH_TARGET

// Real-LEGO stud proportions at target pitch — used only to size the wrapper
// padding for the worst case. Per-render stud dimensions are derived from the
// actual pitch inside the component.
const STUD_W_TARGET = Math.round(0.60 * STUD_PITCH_TARGET)         // 26
const STUD_BODY_H_TARGET = Math.round(0.225 * STUD_PITCH_TARGET)   // 10
const STUD_CAP_RY_TARGET = Math.max(
    2,
    Math.round((STUD_W_TARGET / 2) * DEPTH_Y_RATIO),
)

// Wrapper padding to accommodate the visible brick chassis. STUD_PEEK is how
// far the stud extends above the back edge of the top face; computed against
// target dimensions so the padding never under-shoots.
const STUD_PEEK = STUD_BODY_H_TARGET + STUD_CAP_RY_TARGET - DEPTH_Y / 2
const PAD_TOP = DEPTH_Y + Math.ceil(STUD_PEEK) + 6
const PAD_RIGHT = DEPTH_X + 2

export function LegoBrickCard({ tone, className, children }: LegoBrickCardProps) {
    const ref = useRef<HTMLDivElement>(null)
    // React's useId may emit characters that aren't valid in SVG `id` attributes
    // (':', '«', '»' across versions). Normalize to a permissive alphabet.
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '_')
    const [size, setSize] = useState({ w: 0, h: 0 })
    const p = PALETTES[tone]

    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const update = () => {
            const r = el.getBoundingClientRect()
            setSize({ w: r.width, h: r.height })
        }
        update()
        const observer = new ResizeObserver(update)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const { w, h } = size

    // Fit the row to span exactly w: ceil makes the conceptual 1×N brick at
    // least as wide as the card, so pitch = w / N is ≤ target. The first
    // stud sits at 0.5·pitch from x=0 and the last at w − 0.5·pitch, which
    // is the canonical real-LEGO arrangement (0.2P gutter at each end,
    // 0.4P between adjacent studs) without any manual centering.
    const studCount = w > 0 ? Math.max(2, Math.ceil(w / STUD_PITCH_TARGET)) : 6
    const pitch = w > 0 ? w / studCount : STUD_PITCH_TARGET
    const studW = 0.6 * pitch
    const studBodyH = 0.225 * pitch
    const studCapRy = Math.max(2, (studW / 2) * DEPTH_Y_RATIO)

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

                    {/* Painter's algorithm: SVG paints in document order, so we
                        emit surfaces back-to-front.
                          1. TOP face   — the plane studs sit on
                          2. RIGHT face — shares the back-right edge of the top
                          3. FRONT face — closest wall, shares the front edge of the top
                          4. Studs      — drawn on top of the chassis */}

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

                    {/* Studs — each centered on its own P-cell of the top face,
                        sitting at chassis mid-depth and rising studBodyH up */}
                    {Array.from({ length: studCount }, (_, i) => {
                        const fx = (i + 0.5) * pitch
                        const baseX = fx + DEPTH_X / 2
                        const baseY = PAD_TOP - DEPTH_Y / 2
                        const bodyTopY = baseY - studBodyH
                        const bodyX = baseX - studW / 2
                        return (
                            <g key={i}>
                                {/* Cylinder body — the side wall of the stud */}
                                <rect
                                    x={bodyX}
                                    y={bodyTopY}
                                    width={studW}
                                    height={studBodyH}
                                    fill={p.studBody}
                                    stroke="#000"
                                    strokeWidth={1.5}
                                />
                                {/* Side shadow on the cylinder body (right edge slightly darker) */}
                                <rect
                                    x={bodyX + studW * 0.65}
                                    y={bodyTopY + 1}
                                    width={studW * 0.32}
                                    height={studBodyH - 2}
                                    fill="rgba(0,0,0,0.18)"
                                />
                                {/* Oval cap on top */}
                                <ellipse
                                    cx={baseX}
                                    cy={bodyTopY}
                                    rx={studW / 2}
                                    ry={studCapRy}
                                    fill={p.studCap}
                                    stroke="#000"
                                    strokeWidth={1.5}
                                />
                                {/* Cap highlight */}
                                <ellipse
                                    cx={baseX - studW * 0.18}
                                    cy={bodyTopY - 0.6}
                                    rx={studW * 0.22}
                                    ry={studCapRy * 0.5}
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
                <div className="relative rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-black/30 dark:border-white/10 px-5 pt-3 pb-5 sm:px-6 sm:pt-4 sm:pb-6 shadow-[inset_0_2px_6px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.55)]">
                    {children}
                </div>
            </div>
        </div>
    )
}
