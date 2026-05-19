import { useState, useRef, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../ui/Button'

const SIZE = 120
const HALF = SIZE / 2

// Yellow + indigo-plum two-tone cube.
const FACES = [
    {
        id: 'front',
        label: 'Front',
        transform: `translateZ(${HALF}px)`,
        bg: 'rgba(255, 215, 0, 0.22)',
        border: 'rgba(229, 190, 0, 0.65)',
        textColor: 'rgba(133, 102, 0, 0.95)',
    },
    {
        id: 'back',
        label: 'Back',
        transform: `rotateY(180deg) translateZ(${HALF}px)`,
        bg: 'rgba(91, 63, 191, 0.22)',
        border: 'rgba(91, 63, 191, 0.55)',
        textColor: 'rgba(181, 165, 232, 0.95)',
    },
    {
        id: 'right',
        label: 'Right',
        transform: `rotateY(90deg) translateZ(${HALF}px)`,
        bg: 'rgba(155, 133, 240, 0.22)',
        border: 'rgba(107, 85, 220, 0.55)',
        textColor: 'rgba(181, 165, 232, 0.95)',
    },
    {
        id: 'left',
        label: 'Left',
        transform: `rotateY(-90deg) translateZ(${HALF}px)`,
        bg: 'rgba(255, 232, 102, 0.25)',
        border: 'rgba(229, 190, 0, 0.6)',
        textColor: 'rgba(133, 102, 0, 0.95)',
    },
    {
        id: 'top',
        label: 'LAIGO',
        transform: `rotateX(-90deg) translateZ(${HALF}px)`,
        bg: 'rgba(255, 215, 0, 0.55)',
        border: 'rgba(229, 190, 0, 0.85)',
        textColor: 'rgba(56, 38, 120, 1)',
    },
    {
        id: 'bottom',
        label: 'Bottom',
        transform: `rotateX(90deg) translateZ(${HALF}px)`,
        bg: 'rgba(56, 38, 120, 0.30)',
        border: 'rgba(56, 38, 120, 0.65)',
        textColor: 'rgba(181, 165, 232, 0.95)',
    },
] as const

const DEFAULT_ROT = { x: -22, y: 26 }

interface BrickPreview3DProps {
    autoRotate?: boolean
}

/**
 * Idle 3D preview cube. Auto-rotation runs on the compositor via a CSS
 * keyframe (.brick-auto-spin) — no per-frame React render. Once the user
 * drags, we switch to inline transforms and keep the user's rotation until
 * they hit Reset, which clears the override and resumes the CSS spin.
 */
export function BrickPreview3D({ autoRotate = true }: BrickPreview3DProps) {
    // null = use CSS auto-rotation; object = user has taken manual control
    const [userRot, setUserRot] = useState<{ x: number; y: number } | null>(null)
    const [dragging, setDragging] = useState(false)
    const dragRef = useRef<{ startX: number; startY: number; rot: { x: number; y: number } } | null>(null)

    useEffect(() => {
        if (!dragging) return
        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!dragRef.current) return
            const isTouch = 'touches' in e
            const clientX = isTouch ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
            const clientY = isTouch ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
            const dx = clientX - dragRef.current.startX
            const dy = clientY - dragRef.current.startY
            setUserRot({
                x: dragRef.current.rot.x - dy * 0.5,
                y: dragRef.current.rot.y + dx * 0.5,
            })
        }
        const onUp = () => {
            setDragging(false)
            dragRef.current = null
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
        window.addEventListener('touchmove', onMove)
        window.addEventListener('touchend', onUp)
        return () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
            window.removeEventListener('touchmove', onMove)
            window.removeEventListener('touchend', onUp)
        }
    }, [dragging])

    const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
        const isTouch = 'touches' in e
        const clientX = isTouch
            ? (e as React.TouchEvent).touches[0].clientX
            : (e as React.MouseEvent).clientX
        const clientY = isTouch
            ? (e as React.TouchEvent).touches[0].clientY
            : (e as React.MouseEvent).clientY
        setDragging(true)
        dragRef.current = { startX: clientX, startY: clientY, rot: userRot ?? DEFAULT_ROT }
        e.preventDefault()
    }

    const reset = () => setUserRot(null)

    const useCssSpin = userRot === null && autoRotate
    const inlineTransform = useCssSpin
        ? undefined
        : `rotateX(${(userRot ?? DEFAULT_ROT).x}deg) rotateY(${(userRot ?? DEFAULT_ROT).y}deg)`

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        3D Preview
                    </span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                        <span className="text-xs text-violet-500 dark:text-violet-400 font-medium">
                            Placeholder
                        </span>
                    </div>
                </div>
                <Button variant="secondary" size="sm" onClick={reset} className="gap-1.5">
                    <RotateCcw size={13} /> Reset
                </Button>
            </div>

            <div className="flex-1 glass rounded-xl overflow-hidden relative flex flex-col items-center justify-center select-none min-h-[300px]">
                <div
                    style={{ perspective: '2400px', width: `${SIZE}px`, height: `${SIZE}px` }}
                    className={dragging ? 'cursor-grabbing' : 'cursor-grab'}
                    onMouseDown={startDrag}
                    onTouchStart={startDrag}
                >
                    <div
                        className={useCssSpin ? 'brick-auto-spin' : undefined}
                        style={{
                            width: `${SIZE}px`,
                            height: `${SIZE}px`,
                            position: 'relative',
                            transformStyle: 'preserve-3d',
                            transform: inlineTransform,
                        }}
                    >
                        {FACES.map((face) => (
                            <div
                                key={face.id}
                                style={{
                                    position: 'absolute',
                                    width: `${SIZE}px`,
                                    height: `${SIZE}px`,
                                    transform: face.transform,
                                    backgroundColor: face.bg,
                                    border: `1.5px solid ${face.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backfaceVisibility: 'visible',
                                }}
                            >
                                <span
                                    style={{
                                        color: face.textColor,
                                        fontSize: face.id === 'top' ? '13px' : '11px',
                                        fontWeight: 700,
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {face.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="absolute bottom-3 text-[11px] text-zinc-400 dark:text-zinc-600 pointer-events-none">
                    Drag to rotate · convert your image to see the real preview
                </p>
            </div>
        </div>
    )
}
