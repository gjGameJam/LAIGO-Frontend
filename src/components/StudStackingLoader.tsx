import { motion } from 'framer-motion'

/**
 * Framer Motion replacement for the legacy brickStackNobg.gif — rows of
 * LEGO-style bricks drop in and settle, looping continuously while a job runs.
 */

const BRICK_W = 84
const BRICK_H = 24
const STUD_W = 12
const STUD_H = 6
const ROW_GAP = 4
const NUM_ROWS = 5

const ROW_COLORS = [
    { body: '#1C3F6E', top: '#2A5298' },
    { body: '#E3000B', top: '#FF3333' },
    { body: '#FFD700', top: '#FFE866' },
    { body: '#007A1F', top: '#00A32A' },
    { body: '#9B2D8E', top: '#C44DB8' },
]

function Brick({ body, top }: { body: string; top: string }) {
    const studs = 4
    return (
        <div
            className="relative"
            style={{ width: BRICK_W, height: BRICK_H, paddingTop: 4 }}
        >
            {/* studs */}
            <div
                className="absolute inset-x-0 flex justify-evenly"
                style={{ top: -STUD_H / 2 - 1, padding: '0 6px' }}
            >
                {Array.from({ length: studs }).map((_, i) => (
                    <div key={i} className="relative">
                        <div
                            style={{
                                width: STUD_W,
                                height: STUD_H + 2,
                                backgroundColor: body,
                                border: '1.5px solid #000',
                            }}
                        />
                        <div
                            className="absolute left-0 rounded-full"
                            style={{
                                width: STUD_W,
                                height: STUD_H,
                                top: -1,
                                backgroundColor: top,
                                border: '1.5px solid #000',
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* brick body */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundColor: body,
                    border: '1.5px solid #000',
                    boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.2)',
                    top: 4,
                }}
            >
                {/* top stripe */}
                <div
                    className="absolute top-0 left-0 right-0"
                    style={{ height: 4, backgroundColor: top, borderBottom: '1px solid #000' }}
                />
            </div>
        </div>
    )
}

interface StudStackingLoaderProps {
    progress?: number
}

export function StudStackingLoader({ progress }: StudStackingLoaderProps) {
    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className="relative"
                style={{
                    width: BRICK_W + 24,
                    height: NUM_ROWS * (BRICK_H + ROW_GAP) + 12,
                }}
            >
                {ROW_COLORS.slice(0, NUM_ROWS).map((color, i) => {
                    const yTarget = (NUM_ROWS - 1 - i) * (BRICK_H + ROW_GAP)
                    const delay = i * 0.35
                    return (
                        <motion.div
                            key={i}
                            initial={{ y: -80, opacity: 0 }}
                            animate={{ y: [yTarget - 90, yTarget, yTarget], opacity: [0, 1, 1] }}
                            transition={{
                                duration: 0.55,
                                times: [0, 0.7, 1],
                                ease: ['easeIn', 'easeOut'],
                                delay,
                                repeat: Infinity,
                                repeatDelay: NUM_ROWS * 0.35 + 0.4,
                            }}
                            className="absolute left-1/2"
                            style={{ marginLeft: -BRICK_W / 2 }}
                        >
                            <Brick body={color.body} top={color.top} />
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
