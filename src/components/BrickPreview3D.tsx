import { useState, useRef, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '../ui/Button'

const SIZE = 120
const HALF = SIZE / 2

// Yellow + violet two-tone cube.
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
        bg: 'rgba(124, 58, 237, 0.22)',
        border: 'rgba(124, 58, 237, 0.55)',
        textColor: 'rgba(196, 181, 253, 0.95)',
    },
    {
        id: 'right',
        label: 'Right',
        transform: `rotateY(90deg) translateZ(${HALF}px)`,
        bg: 'rgba(167, 139, 250, 0.22)',
        border: 'rgba(139, 92, 246, 0.55)',
        textColor: 'rgba(196, 181, 253, 0.95)',
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
        textColor: 'rgba(91, 33, 182, 1)',
    },
    {
        id: 'bottom',
        label: 'Bottom',
        transform: `rotateX(90deg) translateZ(${HALF}px)`,
        bg: 'rgba(91, 33, 182, 0.30)',
        border: 'rgba(91, 33, 182, 0.65)',
        textColor: 'rgba(196, 181, 253, 0.95)',
    },
] as const

const DEFAULT_ROT = { x: -22, y: 26 }

interface BrickPreview3DProps {
    autoRotate?: boolean
}

export function BrickPreview3D({ autoRotate = true }: BrickPreview3DProps) {
    const [rot, setRot] = useState(DEFAULT_ROT)
    const [dragging, setDragging] = useState(false)
    const dragRef = useRef<{ startX: number; startY: number; rot: { x: number; y: number } } | null>(
        null,
    )

    // Auto-rotate when idle
    useEffect(() => {
        if (dragging || !autoRotate) return
        let id: number
        const tick = () => {
            setRot((r) => ({ ...r, y: r.y + 0.25 }))
            id = requestAnimationFrame(tick)
        }
        id = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(id)
    }, [dragging, autoRotate])

    // Global pointer tracking while dragging
    useEffect(() => {
        if (!dragging) return
        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!dragRef.current) return
            const isTouch = 'touches' in e
            const clientX = isTouch ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
            const clientY = isTouch ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
            const dx = clientX - dragRef.current.startX
            const dy = clientY - dragRef.current.startY
            setRot({
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
        dragRef.current = { startX: clientX, startY: clientY, rot: { ...rot } }
        e.preventDefault()
    }

    const reset = () => setRot(DEFAULT_ROT)

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
                    style={{ perspective: '800px', width: `${SIZE}px`, height: `${SIZE}px` }}
                    className={dragging ? 'cursor-grabbing' : 'cursor-grab'}
                    onMouseDown={startDrag}
                    onTouchStart={startDrag}
                >
                    <div
                        style={{
                            width: `${SIZE}px`,
                            height: `${SIZE}px`,
                            position: 'relative',
                            transformStyle: 'preserve-3d',
                            transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
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
