import { useState, useRef, useEffect } from 'react'
import { RotateCcw, DownloadIcon, AlertTriangle } from 'lucide-react'
import { MosaicScene, type MosaicSceneHandle } from './MosaicScene'
import type { PreviewData, PreviewErrorCode } from '../api'

const CUBE_SIZE = 120
const CUBE_HALF = CUBE_SIZE / 2

// Yellow + indigo-plum two-tone cube — placeholder shown until a job completes.
const FACES = [
    {
        id: 'front',
        label: 'Front',
        transform: `translateZ(${CUBE_HALF}px)`,
        bg: 'rgba(255, 215, 0, 0.22)',
        border: 'rgba(229, 190, 0, 0.65)',
        textColor: 'rgba(133, 102, 0, 0.95)',
    },
    {
        id: 'back',
        label: 'Back',
        transform: `rotateY(180deg) translateZ(${CUBE_HALF}px)`,
        bg: 'rgba(91, 63, 191, 0.22)',
        border: 'rgba(91, 63, 191, 0.55)',
        textColor: 'rgba(181, 165, 232, 0.95)',
    },
    {
        id: 'right',
        label: 'Right',
        transform: `rotateY(90deg) translateZ(${CUBE_HALF}px)`,
        bg: 'rgba(155, 133, 240, 0.22)',
        border: 'rgba(107, 85, 220, 0.55)',
        textColor: 'rgba(181, 165, 232, 0.95)',
    },
    {
        id: 'left',
        label: 'Left',
        transform: `rotateY(-90deg) translateZ(${CUBE_HALF}px)`,
        bg: 'rgba(255, 232, 102, 0.25)',
        border: 'rgba(229, 190, 0, 0.6)',
        textColor: 'rgba(133, 102, 0, 0.95)',
    },
    {
        id: 'top',
        label: 'LAIGO',
        transform: `rotateX(-90deg) translateZ(${CUBE_HALF}px)`,
        bg: 'rgba(255, 215, 0, 0.55)',
        border: 'rgba(229, 190, 0, 0.85)',
        textColor: 'rgba(56, 38, 120, 1)',
    },
    {
        id: 'bottom',
        label: 'Bottom',
        transform: `rotateX(90deg) translateZ(${CUBE_HALF}px)`,
        bg: 'rgba(56, 38, 120, 0.30)',
        border: 'rgba(56, 38, 120, 0.65)',
        textColor: 'rgba(181, 165, 232, 0.95)',
    },
] as const

const DEFAULT_ROT = { x: -22, y: 26 }

interface BrickPreview3DProps {
    autoRotate?: boolean
    /** When set, the bottom-right download button becomes an active link to this URL. */
    downloadUrl?: string | null
    /** When set, replaces the placeholder cube with a Three.js mosaic scene. */
    previewData?: PreviewData | null
    /** When set, replaces the bottom hint with an error banner. */
    previewError?: { code: PreviewErrorCode; message: string } | null
}

/**
 * Persistent 3D preview surface. Two render modes:
 *   - placeholder cube (idle / pre-complete) — CSS 3D with drag-rotate
 *   - mosaic scene (preview JSON loaded) — Three.js Canvas with OrbitControls
 */
export function BrickPreview3D({
    autoRotate = true,
    downloadUrl = null,
    previewData = null,
    previewError = null,
}: BrickPreview3DProps) {
    const sceneRef = useRef<MosaicSceneHandle | null>(null)
    const hasPreview = previewData !== null

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center mb-3 h-5">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-none">
                    3D Preview
                </span>
            </div>

            <div className="flex-1 glass rounded-xl overflow-hidden relative flex flex-col items-center justify-center select-none min-h-[360px]">
                {hasPreview ? (
                    // absolute inset-0 so the Canvas fills the card; flex
                    // centering above is only for the placeholder cube branch.
                    <div className="absolute inset-0">
                        <MosaicScene ref={sceneRef} data={previewData} autoRotate={autoRotate} />
                    </div>
                ) : (
                    <PlaceholderCube autoRotate={autoRotate} />
                )}

                <button
                    type="button"
                    onClick={() => {
                        if (hasPreview) sceneRef.current?.reset()
                        else window.dispatchEvent(new Event('brick-preview-reset'))
                    }}
                    aria-label="Reset view"
                    title="Reset view"
                    className="absolute top-3 right-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-700 dark:text-zinc-200 shadow-md shadow-black/10 transition-all hover:bg-white dark:hover:bg-zinc-900 hover:scale-105 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                >
                    <RotateCcw size={14} />
                </button>

                {previewError ? (
                    <div className="absolute bottom-3 left-3 right-16 flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span className="truncate">{previewError.message}</span>
                    </div>
                ) : (
                    <p className="absolute bottom-3 text-[11px] text-zinc-400 dark:text-zinc-600 pointer-events-none">
                        {hasPreview
                            ? 'Drag to rotate · scroll to zoom · your mosaic preview'
                            : 'Drag to rotate · convert your image to see the real preview'}
                    </p>
                )}

                {downloadUrl ? (
                    <a
                        href={downloadUrl}
                        download
                        rel="noopener noreferrer"
                        aria-label="Download build pack"
                        title="Download build pack"
                        className="absolute bottom-3 right-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-800 dark:text-zinc-100 shadow-lg shadow-black/10 transition-all hover:bg-white dark:hover:bg-zinc-900 hover:scale-105 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
                    >
                        <DownloadIcon size={16} />
                    </a>
                ) : (
                    <button
                        type="button"
                        disabled
                        aria-label="Download build pack (available after conversion)"
                        title="Available after conversion"
                        className="absolute bottom-3 right-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md border border-black/10 dark:border-white/10 text-zinc-400 dark:text-zinc-600 shadow-lg shadow-black/5 opacity-60 cursor-not-allowed"
                    >
                        <DownloadIcon size={16} />
                    </button>
                )}
            </div>
        </div>
    )
}

/**
 * Original CSS-3D placeholder cube — kept for the idle / pre-complete state.
 * Auto-rotation runs on the compositor via a CSS keyframe (.brick-auto-spin)
 * so there's no per-frame React render. Once the user drags, we switch to
 * inline transforms; a Reset event resumes the CSS spin.
 */
function PlaceholderCube({ autoRotate }: { autoRotate: boolean }) {
    const [userRot, setUserRot] = useState<{ x: number; y: number } | null>(null)
    const [dragging, setDragging] = useState(false)
    const dragRef = useRef<{ startX: number; startY: number; rot: { x: number; y: number } } | null>(null)

    useEffect(() => {
        const onReset = () => setUserRot(null)
        window.addEventListener('brick-preview-reset', onReset)
        return () => window.removeEventListener('brick-preview-reset', onReset)
    }, [])

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

    const useCssSpin = userRot === null && autoRotate
    const inlineTransform = useCssSpin
        ? undefined
        : `rotateX(${(userRot ?? DEFAULT_ROT).x}deg) rotateY(${(userRot ?? DEFAULT_ROT).y}deg)`

    return (
        <div
            style={{ perspective: '2400px', width: `${CUBE_SIZE}px`, height: `${CUBE_SIZE}px` }}
            className={dragging ? 'cursor-grabbing' : 'cursor-grab'}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
        >
            <div
                className={useCssSpin ? 'brick-auto-spin' : undefined}
                style={{
                    width: `${CUBE_SIZE}px`,
                    height: `${CUBE_SIZE}px`,
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
                            width: `${CUBE_SIZE}px`,
                            height: `${CUBE_SIZE}px`,
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
    )
}
