import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ImagePlus,
    ImageOff,
    X,
    CheckCircle2,
    UploadCloud,
    Crop as CropIcon,
    Check,
    FlipHorizontal2,
    FlipVertical2,
    RotateCw,
} from 'lucide-react'
import ReactCrop, { convertToPixelCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import clsx from 'clsx'

const ACCEPTED = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/avif',
]
// Browsers often report an empty or nonstandard MIME for HEIC/HEIF/AVIF
// (OS-registry dependent), so extensions back up the type check. The magic-byte
// sniff below is the real gate either way.
const ACCEPTED_EXT = /\.(jpe?g|png|gif|webp|heic|heif|avif)$/i
// What the file-picker offers; extensions included for the same reason.
const INPUT_ACCEPT = [...ACCEPTED, '.heic', '.heif', '.avif'].join(',')

// Max displayed height of the crop-mode image: box is h-60 (240px) minus the
// bottom button bar (~52px), with clearance so the selection's bottom drag
// handles stay reachable above the bar.
const CROP_MAX_HEIGHT = 168

// Shared overlay-button styles (bottom bar over the preview image).
const PILL_BTN = 'flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded-md border'
const PILL_IDLE = 'bg-zinc-900/80 border-zinc-700/60 text-zinc-400 hover:text-zinc-100'
const ICON_BTN =
    'w-7 h-7 rounded-md bg-zinc-900/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors'

export interface UploadedImage {
    file: File
    name: string
    preview: string
}

/**
 * Sniff the first 12 bytes of a file to verify it's a real image. file.type
 * is browser-determined and easily wrong; checking the signature catches
 * mislabeled files (e.g. an .exe renamed to .png) before they reach the API.
 *
 * Signatures:
 *   PNG:  89 50 4E 47 0D 0A 1A 0A
 *   JPEG: FF D8 FF
 *   GIF:  47 49 46 38 ("GIF8")
 *   WEBP: 52 49 46 46 ... 57 45 42 50 ("RIFF…WEBP")
 *   HEIC/HEIF/AVIF: ISO-BMFF — "ftyp" at offset 4, then a known brand
 */
async function isImageFile(file: File): Promise<boolean> {
    const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    if (buf.length < 4) return false
    // PNG
    if (
        buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
        buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
    ) return true
    // JPEG
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true
    // GIF8
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return true
    // RIFF…WEBP
    if (
        buf.length >= 12 &&
        buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    ) return true
    // ISO-BMFF "ftyp" box → HEIC/HEIF/AVIF brands
    if (
        buf.length >= 12 &&
        buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70
    ) {
        const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11])
        const HEIF_BRANDS = [
            'heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', // HEIC
            'mif1', 'msf1', // generic HEIF
            'avif', 'avis', // AVIF
        ]
        if (HEIF_BRANDS.includes(brand)) return true
    }
    return false
}

interface ImageUploadProps {
    value: UploadedImage | null
    onChange: (value: UploadedImage | null) => void
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)
    const [error, setError] = useState('')
    const dragCounterRef = useRef(0)
    const objectUrlRef = useRef<string | null>(null)

    // True when the browser can't decode the current file (e.g. HEIC/HEIF in
    // Chromium/Firefox — Safari-only). The backend converts it fine; we just
    // can't show or crop it locally.
    const [previewFailed, setPreviewFailed] = useState(false)

    // --- Crop mode state ---
    const [cropMode, setCropMode] = useState(false)
    const [crop, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
    const [cropSrc, setCropSrc] = useState<string | null>(null)
    const imgRef = useRef<HTMLImageElement>(null)
    // Pristine uploaded file — crop sessions always start from this so
    // repeated crops never compound quality loss.
    const originalFileRef = useRef<File | null>(null)
    // Current transformed bitmap within a crop session (flips/rotations chain
    // canvas→canvas so rapid clicks can't race the <img> reload).
    const workingCanvasRef = useRef<HTMLCanvasElement | null>(null)
    const cropUrlRef = useRef<string | null>(null)

    useEffect(() => () => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current)
    }, [])

    // Any new preview source (fresh upload, applied crop, clear) gets a clean
    // slate before its own onError can report otherwise.
    useEffect(() => {
        setPreviewFailed(false)
    }, [value?.preview])

    useEffect(() => {
        if (!value) {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current)
                objectUrlRef.current = null
            }
            if (cropUrlRef.current) {
                URL.revokeObjectURL(cropUrlRef.current)
                cropUrlRef.current = null
            }
            originalFileRef.current = null
            workingCanvasRef.current = null
            setCropSrc(null)
            setCropMode(false)
            setCrop(undefined)
            setCompletedCrop(undefined)
        }
    }, [value])

    const processFile = useCallback(
        async (file?: File | null) => {
            setError('')
            if (!file) return
            if (!ACCEPTED.includes(file.type) && !ACCEPTED_EXT.test(file.name)) {
                setError('Unsupported format. Use JPG, PNG, GIF, WEBP, HEIC, or AVIF.')
                return
            }
            if (file.size > 10 * 1024 * 1024) {
                setError('File too large. Maximum size is 10 MB.')
                return
            }
            // Verify magic bytes — file.type is browser-derived and trivially spoofable.
            const ok = await isImageFile(file).catch(() => false)
            if (!ok) {
                setError("That file isn't a valid image. Try a different one.")
                return
            }
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
            const url = URL.createObjectURL(file)
            objectUrlRef.current = url
            // A new upload becomes the pristine original for future crops;
            // any in-progress crop session is abandoned.
            originalFileRef.current = file
            workingCanvasRef.current = null
            if (cropUrlRef.current) {
                URL.revokeObjectURL(cropUrlRef.current)
                cropUrlRef.current = null
            }
            setCropSrc(null)
            setCropMode(false)
            setCrop(undefined)
            setCompletedCrop(undefined)
            onChange({ file, name: file.name, preview: url })
        },
        [onChange]
    )

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            dragCounterRef.current = 0
            setDragging(false)
            processFile(e.dataTransfer.files?.[0])
        },
        [processFile]
    )

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        dragCounterRef.current++
        setDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        // Clamp to 0 — dragLeave can fire without a matching dragEnter when
        // the drag starts inside the dropzone or when browsers reorder
        // enter/leave across child boundaries.
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1)
        if (dragCounterRef.current === 0) setDragging(false)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        processFile(e.target.files?.[0])

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(null)
        setError('')
        if (inputRef.current) inputRef.current.value = ''
    }

    // --- Crop mode helpers ---

    /** Swap the crop-source object URL, revoking the previous one. */
    const swapCropUrl = (url: string | null) => {
        if (cropUrlRef.current) URL.revokeObjectURL(cropUrlRef.current)
        cropUrlRef.current = url
        setCropSrc(url)
    }

    const enterCropMode = () => {
        // Fall back to the current file if the pristine original is gone
        // (e.g. this component remounted while the parent kept the value).
        const file = originalFileRef.current ?? value?.file
        if (!file) return
        originalFileRef.current = file
        workingCanvasRef.current = null
        setCrop(undefined)
        setCompletedCrop(undefined)
        swapCropUrl(URL.createObjectURL(file))
        setCropMode(true)
    }

    const exitCropMode = () => {
        setCropMode(false)
        workingCanvasRef.current = null
        setCrop(undefined)
        setCompletedCrop(undefined)
        swapCropUrl(null)
    }

    /**
     * Default selection once the crop-source image is (re)loaded: the full
     * image, so opening crop mode never trims anything by itself.
     */
    const handleCropImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget
        const initial: Crop = { unit: '%', x: 0, y: 0, width: 100, height: 100 }
        setCrop(initial)
        setCompletedCrop(convertToPixelCrop(initial, width, height))
    }

    /**
     * Flip or rotate the crop-session bitmap. Pure pixel moves on a canvas
     * (no resampling) re-encoded as PNG for display — lossless until Apply.
     */
    const applyTransform = (op: 'flipH' | 'flipV' | 'rotate') => {
        const source: HTMLCanvasElement | HTMLImageElement | null =
            workingCanvasRef.current ?? imgRef.current
        if (!source) return
        let w: number
        let h: number
        if (source instanceof HTMLImageElement) {
            if (!source.complete || !source.naturalWidth) return
            w = source.naturalWidth
            h = source.naturalHeight
        } else {
            w = source.width
            h = source.height
        }
        const canvas = document.createElement('canvas')
        canvas.width = op === 'rotate' ? h : w
        canvas.height = op === 'rotate' ? w : h
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        if (op === 'flipH') {
            ctx.translate(w, 0)
            ctx.scale(-1, 1)
        } else if (op === 'flipV') {
            ctx.translate(0, h)
            ctx.scale(1, -1)
        } else {
            // 90° clockwise: top edge of the source becomes the right edge.
            ctx.translate(h, 0)
            ctx.rotate(Math.PI / 2)
        }
        ctx.drawImage(source, 0, 0)
        workingCanvasRef.current = canvas
        // Old selection coordinates are meaningless after the pixels move;
        // onLoad of the new src re-seeds the default selection.
        setCrop(undefined)
        setCompletedCrop(undefined)
        canvas.toBlob((blob) => {
            if (blob) swapCropUrl(URL.createObjectURL(blob))
        }, 'image/png')
    }

    /** Extract the selected region at full resolution and emit a new File. */
    const applyCrop = () => {
        const img = imgRef.current
        if (!img || !value || !completedCrop || completedCrop.width < 1 || completedCrop.height < 1) return
        const scaleX = img.naturalWidth / img.width
        const scaleY = img.naturalHeight / img.height
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(completedCrop.width * scaleX))
        canvas.height = Math.max(1, Math.round(completedCrop.height * scaleY))
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        // Prefer the working canvas (identical pixels, skips a PNG re-decode).
        const source = workingCanvasRef.current ?? img
        ctx.drawImage(
            source,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        )
        // GIF can't be encoded by canvas; unsupported types fall back to PNG.
        const originalType = originalFileRef.current?.type
        const outType =
            originalType === 'image/jpeg' || originalType === 'image/webp'
                ? originalType
                : 'image/png'
        canvas.toBlob(
            (blob) => {
                if (!blob) return
                const croppedFile = new File([blob], value.name, { type: blob.type || outType })
                if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
                const url = URL.createObjectURL(croppedFile)
                objectUrlRef.current = url
                onChange({ file: croppedFile, name: value.name, preview: url })
                exitCropMode()
            },
            outType,
            outType === 'image/jpeg' ? 0.92 : undefined
        )
    }

    return (
        <div className="space-y-2">
            <div
                onClick={() => !value && inputRef.current?.click()}
                onKeyDown={(e) => {
                    if (!value && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        inputRef.current?.click()
                    }
                }}
                onDrop={handleDrop}
                onDragEnter={handleDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleDragLeave}
                tabIndex={!value ? 0 : undefined}
                role={!value ? 'button' : undefined}
                aria-label={
                    !value
                        ? 'Upload image — drop a file or press Enter to browse'
                        : 'Image upload zone'
                }
                className={[
                    'relative h-60 rounded-xl border-2 overflow-hidden transition-all duration-200',
                    !value ? 'cursor-pointer' : '',
                    dragging
                        ? 'border-brick-yellow bg-brick-yellow/[0.08] shadow-[0_0_0_4px_rgba(255,215,0,0.15)]'
                        : value
                            ? 'border-violet-500/40 border-solid'
                            : 'border-dashed border-zinc-300 hover:border-zinc-400 bg-white/50 dark:border-zinc-600 dark:hover:border-zinc-500 dark:bg-zinc-900/50',
                ].join(' ')}
            >
                <AnimatePresence mode="wait">
                    {value ? (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0"
                        >
                            {cropMode && cropSrc ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 pt-2 px-3 pb-14">
                                    <ReactCrop
                                        crop={crop}
                                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                                        onComplete={(c) => setCompletedCrop(c)}
                                        keepSelection
                                        minWidth={10}
                                        minHeight={10}
                                        className="max-w-full"
                                    >
                                        <img
                                            ref={imgRef}
                                            src={cropSrc}
                                            alt="Crop source"
                                            draggable={false}
                                            onLoad={handleCropImageLoad}
                                            className="max-w-full select-none"
                                            style={{ maxHeight: CROP_MAX_HEIGHT }}
                                        />
                                    </ReactCrop>
                                </div>
                            ) : previewFailed ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950 pb-10 text-center px-6">
                                    <ImageOff size={24} className="text-zinc-500" />
                                    <p className="text-sm font-medium text-zinc-300">
                                        Preview not available for this format
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        Your image will still convert normally.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <img
                                        src={value.preview}
                                        alt="Uploaded preview"
                                        onError={() => setPreviewFailed(true)}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                                </>
                            )}

                            {/* pointer-events-none so drags on the crop selection's bottom
                                handles pass through the bar's empty areas; the interactive
                                children re-enable themselves. */}
                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 pointer-events-none">
                                <div className="flex items-center gap-2 min-w-0">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    <span className="text-xs text-zinc-200 font-medium truncate">
                                        {value.name}
                                    </span>
                                </div>
                                {cropMode ? (
                                    <div className="flex items-center gap-1.5 shrink-0 ml-2 pointer-events-auto">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                applyTransform('flipH')
                                            }}
                                            className={ICON_BTN}
                                            title="Flip horizontally"
                                            aria-label="Flip horizontally"
                                        >
                                            <FlipHorizontal2 size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                applyTransform('flipV')
                                            }}
                                            className={ICON_BTN}
                                            title="Flip vertically"
                                            aria-label="Flip vertically"
                                        >
                                            <FlipVertical2 size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                applyTransform('rotate')
                                            }}
                                            className={ICON_BTN}
                                            title="Rotate 90° clockwise"
                                            aria-label="Rotate 90° clockwise"
                                        >
                                            <RotateCw size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                exitCropMode()
                                            }}
                                            className={clsx(PILL_BTN, PILL_IDLE)}
                                            aria-label="Cancel crop and exit without applying"
                                            title="Exit crop mode without applying"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                applyCrop()
                                            }}
                                            disabled={
                                                !completedCrop ||
                                                completedCrop.width < 1 ||
                                                completedCrop.height < 1
                                            }
                                            className={clsx(
                                                PILL_BTN,
                                                PILL_IDLE,
                                                'disabled:opacity-40 disabled:pointer-events-none'
                                            )}
                                            aria-label="Apply crop"
                                        >
                                            <Check size={13} />
                                            Apply
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 shrink-0 ml-2 pointer-events-auto">
                                        {/* Cropping needs the browser to decode the image —
                                            hidden when it can't (e.g. HEIC outside Safari). */}
                                        {!previewFailed && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    enterCropMode()
                                                }}
                                                className={clsx(PILL_BTN, PILL_IDLE)}
                                                aria-label="Crop or edit image"
                                            >
                                                <CropIcon size={13} />
                                                Crop/Edit
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                inputRef.current?.click()
                                            }}
                                            className={clsx(PILL_BTN, PILL_IDLE)}
                                        >
                                            Change
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClear}
                                            className="w-7 h-7 rounded-md bg-zinc-900/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-colors"
                                            aria-label="Remove image"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center select-none"
                        >
                            <motion.div
                                animate={{ scale: dragging ? 1.15 : 1, y: dragging ? -4 : 0 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className={[
                                    'w-11 h-11 rounded-xl flex items-center justify-center border transition-colors duration-200',
                                    dragging
                                        ? 'border-brick-yellow/60 bg-brick-yellow/20 text-zinc-900 dark:text-brick-yellow'
                                        : 'border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
                                ].join(' ')}
                            >
                                {dragging ? <UploadCloud size={20} /> : <ImagePlus size={20} />}
                            </motion.div>

                            <div>
                                <p
                                    className={`text-sm font-medium transition-colors duration-200 ${dragging
                                        ? 'text-zinc-900 dark:text-brick-yellow'
                                        : 'text-zinc-600 dark:text-zinc-300'
                                        }`}
                                >
                                    {dragging ? 'Release to upload' : 'Drop an image here'}
                                </p>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    or{' '}
                                    <span className="text-violet-500 dark:text-violet-400">
                                        click to browse
                                    </span>
                                </p>
                            </div>

                            <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
                                JPG · PNG · GIF · WEBP · HEIC · AVIF · max 10 MB
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5 overflow-hidden"
                    >
                        <X size={11} className="shrink-0" />
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>

            <input
                ref={inputRef}
                type="file"
                accept={INPUT_ACCEPT}
                onChange={handleInputChange}
                className="sr-only"
                aria-label="Upload image"
            />
        </div>
    )
}
