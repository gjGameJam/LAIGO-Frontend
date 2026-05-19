import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, X, CheckCircle2, UploadCloud } from 'lucide-react'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export interface UploadedImage {
    file: File
    name: string
    preview: string
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

    useEffect(() => () => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }, [])

    useEffect(() => {
        if (!value && objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current)
            objectUrlRef.current = null
        }
    }, [value])

    const processFile = useCallback(
        (file?: File | null) => {
            setError('')
            if (!file) return
            if (!ACCEPTED.includes(file.type)) {
                setError('Unsupported format. Use JPG, PNG, GIF, or WEBP.')
                return
            }
            if (file.size > 10 * 1024 * 1024) {
                setError('File too large. Maximum size is 10 MB.')
                return
            }
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
            const url = URL.createObjectURL(file)
            objectUrlRef.current = url
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
        dragCounterRef.current--
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
                    'relative h-48 rounded-xl border-2 overflow-hidden transition-all duration-200',
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
                            <img
                                src={value.preview}
                                alt="Uploaded preview"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

                            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    <span className="text-xs text-zinc-200 font-medium truncate">
                                        {value.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            inputRef.current?.click()
                                        }}
                                        className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors px-2 py-1 rounded-md bg-zinc-900/80 border border-zinc-700/60"
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
                                JPG · PNG · GIF · WEBP · max 10 MB
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
                accept={ACCEPTED.join(',')}
                onChange={handleInputChange}
                className="sr-only"
                aria-label="Upload image"
            />
        </div>
    )
}
