import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Framer Motion replacement for the legacy brickStackNobg.gif — rows of
 * 3D LEGO-style bricks drop in, settle, hold, and fade out in a continuous loop.
 *
 * Brick geometry mirrors LegoBrickCard / FallingBricks: a top-right orthogonal
 * projection with three shaded faces (lit top, medium front, shadow right)
 * and cylindrical studs with elliptical caps positioned at exact LEGO module
 * spacing — stud center i lies at ((i + 0.5) · P + DEPTH_X/2, PAD_TOP − DEPTH_Y/2),
 * which is mid-depth on the top face. That guarantees the studs sit on the
 * top face of the brick rather than floating relative to the front face.
 */

// Real-LEGO proportions (matches FallingBricks at a slightly larger scale).
const STUD_PITCH = 20                                    // 1 module in px
const DEPTH_X = 6                                        // depth axis x-projection
const DEPTH_Y = 4                                        // depth axis y-projection
const STUD_W = 12                                        // ~0.60 · P, stud diameter
const STUD_BODY_H = 4                                    // ~0.225 · P, stud height
const STUD_CAP_RY = 1.5                                  // (STUD_W/2) · (DEPTH_Y/P)
const BRICK_BODY_H = 22                                  // brick body height
const STUD_COUNT = 4
const NUM_ROWS = 5

const FRONT_W = STUD_COUNT * STUD_PITCH                  // 80
const STUD_OVERHEAD = Math.ceil(DEPTH_Y / 2 + STUD_BODY_H + STUD_CAP_RY)
const PAD_TOP = STUD_OVERHEAD + 2                        // 10: room for top studs
const BRICK_SVG_W = FRONT_W + DEPTH_X                    // 86: right face included
const BRICK_SVG_H = PAD_TOP + BRICK_BODY_H               // 32
// Stride equals body height so brick bodies touch — real-LEGO "clicked" look,
// where each row's studs are hidden inside the brick above (only the topmost
// row's studs stay visible, and intermediate rows' studs flash briefly between
// landings before being covered).
const ROW_STRIDE = BRICK_BODY_H                          // 22

const CONTAINER_W = BRICK_SVG_W + 8                      // breathing room for shadow
const CONTAINER_H = (NUM_ROWS - 1) * ROW_STRIDE + BRICK_SVG_H + 8

interface Palette {
    topHigh: string
    top: string
    frontHigh: string
    front: string
    right: string
    rightDark: string
}

// Five LEGO hues, three-face shaded — same palette family as LegoBrickCard.
const ROW_COLORS: Palette[] = [
    { topHigh: '#FF7070', top: '#FF3A3A', frontHigh: '#FF1A1A', front: '#E3000B', right: '#7A0008', rightDark: '#4A0005' },
    { topHigh: '#FFE96B', top: '#FFD700', frontHigh: '#E5BE00', front: '#C49A00', right: '#8C7400', rightDark: '#5A4A00' },
    { topHigh: '#1FB840', top: '#009624', frontHigh: '#0A8C28', front: '#007A1F', right: '#054515', rightDark: '#03290D' },
    { topHigh: '#4878C5', top: '#2A5298', frontHigh: '#2454A3', front: '#1C3F6E', right: '#0F2547', rightDark: '#08182C' },
    { topHigh: '#D77ECF', top: '#C44DB8', frontHigh: '#AE36A0', front: '#9B2D8E', right: '#56194E', rightDark: '#33102E' },
]

function Brick3D({ p, uid }: { p: Palette; uid: string }) {
    const w = FRONT_W
    const h = BRICK_BODY_H
    return (
        <svg
            width={BRICK_SVG_W}
            height={BRICK_SVG_H}
            style={{
                display: 'block',
                overflow: 'visible',
                filter: 'drop-shadow(0 2px 2.5px rgba(0,0,0,0.32))',
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

            {/* FRONT face (medium) */}
            <polygon
                points={`0,${PAD_TOP} ${w},${PAD_TOP} ${w},${PAD_TOP + h} 0,${PAD_TOP + h}`}
                fill={`url(#front-${uid})`}
                stroke="#000"
                strokeWidth={1.25}
                strokeLinejoin="miter"
            />

            {/* RIGHT face (shadow) */}
            <polygon
                points={`${w},${PAD_TOP} ${w + DEPTH_X},${PAD_TOP - DEPTH_Y} ${w + DEPTH_X},${PAD_TOP - DEPTH_Y + h} ${w},${PAD_TOP + h}`}
                fill={`url(#right-${uid})`}
                stroke="#000"
                strokeWidth={1.25}
                strokeLinejoin="miter"
            />

            {/* TOP face (lit) */}
            <polygon
                points={`0,${PAD_TOP} ${w},${PAD_TOP} ${w + DEPTH_X},${PAD_TOP - DEPTH_Y} ${DEPTH_X},${PAD_TOP - DEPTH_Y}`}
                fill={`url(#top-${uid})`}
                stroke="#000"
                strokeWidth={1.25}
                strokeLinejoin="miter"
            />

            {/* STUDS — each centered on a P-wide cell of the top face, projected
                to mid-depth so they sit on the lit face rather than the front. */}
            {Array.from({ length: STUD_COUNT }, (_, i) => {
                const fx = (i + 0.5) * STUD_PITCH
                const baseX = fx + DEPTH_X / 2
                const baseY = PAD_TOP - DEPTH_Y / 2
                const bodyTopY = baseY - STUD_BODY_H
                const bodyX = baseX - STUD_W / 2
                return (
                    <g key={i}>
                        <rect
                            x={bodyX}
                            y={bodyTopY}
                            width={STUD_W}
                            height={STUD_BODY_H}
                            fill={p.front}
                            stroke="#000"
                            strokeWidth={1}
                        />
                        <rect
                            x={bodyX + STUD_W * 0.65}
                            y={bodyTopY + 0.5}
                            width={STUD_W * 0.32}
                            height={STUD_BODY_H - 1}
                            fill="rgba(0,0,0,0.20)"
                        />
                        <ellipse
                            cx={baseX}
                            cy={bodyTopY}
                            rx={STUD_W / 2}
                            ry={STUD_CAP_RY}
                            fill={p.top}
                            stroke="#000"
                            strokeWidth={1}
                        />
                        <ellipse
                            cx={baseX - STUD_W * 0.18}
                            cy={bodyTopY - 0.3}
                            rx={STUD_W * 0.22}
                            ry={STUD_CAP_RY * 0.5}
                            fill="rgba(255,255,255,0.55)"
                        />
                    </g>
                )
            })}
        </svg>
    )
}

// Cycle timing (seconds). Each row enters with a tight stagger, all rows
// hold, then all rows fade out together. Cycle endpoints both sit at opacity
// 0 so loop restarts are seamless.
const STAGGER = 0.14
const FALL_DURATION = 0.5
const HOLD_DURATION = 1.3
const FADE_OUT_DURATION = 0.5
const LAST_SETTLE = (NUM_ROWS - 1) * STAGGER + FALL_DURATION
const FADE_OUT_START = LAST_SETTLE + HOLD_DURATION
const CYCLE_DURATION = FADE_OUT_START + FADE_OUT_DURATION
const FALL_OFFSET = 110

interface StudStackingLoaderProps {
    progress?: number
}

export function StudStackingLoader({ progress }: StudStackingLoaderProps) {
    const rawUid = useId().replace(/[^a-zA-Z0-9_-]/g, '_')
    const shouldReduce = useReducedMotion()

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className="relative"
                style={{ width: CONTAINER_W, height: CONTAINER_H }}
            >
                {ROW_COLORS.slice(0, NUM_ROWS).map((color, i) => {
                    const yTarget = (NUM_ROWS - 1 - i) * ROW_STRIDE
                    const yStart = yTarget - FALL_OFFSET
                    const rowStart = i * STAGGER
                    const rowSettle = rowStart + FALL_DURATION
                    const t1 = rowStart / CYCLE_DURATION
                    const t2 = rowSettle / CYCLE_DURATION
                    const t3 = FADE_OUT_START / CYCLE_DURATION
                    const uid = `${rawUid}-${i}`

                    if (shouldReduce) {
                        return (
                            <div
                                key={i}
                                className="absolute left-1/2"
                                style={{
                                    marginLeft: -BRICK_SVG_W / 2,
                                    transform: `translateY(${yTarget}px)`,
                                }}
                            >
                                <Brick3D p={color} uid={uid} />
                            </div>
                        )
                    }

                    return (
                        <motion.div
                            key={i}
                            initial={{ y: yStart, opacity: 0 }}
                            animate={{
                                y: [yStart, yStart, yTarget, yTarget, yTarget],
                                opacity: [0, 0, 1, 1, 0],
                            }}
                            transition={{
                                duration: CYCLE_DURATION,
                                times: [0, t1, t2, t3, 1],
                                // Fall ease is easeOutBack-style — accelerates
                                // hard then overshoots target slightly before
                                // settling, giving a satisfying "click" snap.
                                // Fade-out is an emphasized in-out curve for a
                                // punchier dissolve than a plain ease.
                                ease: [
                                    'linear',
                                    [0.34, 1.32, 0.64, 1],
                                    'linear',
                                    [0.7, 0, 0.3, 1],
                                ],
                                repeat: Infinity,
                                repeatDelay: 0,
                            }}
                            className="absolute left-1/2"
                            style={{ marginLeft: -BRICK_SVG_W / 2 }}
                        >
                            <Brick3D p={color} uid={uid} />
                        </motion.div>
                    )
                })}
            </div>

            <div className="text-center">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    Building your mosaic…
                </p>
                {typeof progress === 'number' && progress > 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 tabular-nums mt-0.5">
                        {Math.round(progress)}%
                    </p>
                )}
            </div>
        </div>
    )
}
