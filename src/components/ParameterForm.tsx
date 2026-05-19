import { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ruler, Box, Frame, ImagePlus } from 'lucide-react'
import { ImageUpload, type UploadedImage } from '../ui/ImageUpload'
import { Slider } from '../ui/Slider'
import { SegmentedControl } from '../ui/SegmentedControl'
import { ConvertButton } from './ConvertButton'
import { submitJob, buildFormData, getJob } from '../api'

export interface FormValues {
    image: UploadedImage | null
    blockWidth: number
    mosaicType: '2d' | '3d'
    backgroundPercent: number
    framed: boolean
}

export const DEFAULT_VALUES: FormValues = {
    image: null,
    blockWidth: 4,
    mosaicType: '2d',
    backgroundPercent: 100,
    framed: true,
}

interface ParameterFormProps {
    values: FormValues
    onChange: (v: FormValues) => void
    onJobCreated: (jobId: string) => void
    onError: (message: string) => void
}

const DIMENSION_OPTIONS = [
    { label: '2D', value: '2d' as const },
    { label: '3D', value: '3d' as const },
]

const FRAMED_OPTIONS = [
    { label: 'Framed', value: true },
    { label: 'No Frame', value: false },
]

function SectionLabel({ icon: Icon, children, hint }: { icon: typeof Ruler; children: React.ReactNode; hint?: string }) {
    return (
        <div className="flex items-end justify-between mb-3 gap-3">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 flex items-center justify-center shrink-0">
                    <Icon size={11} className="text-zinc-500 dark:text-zinc-400" />
                </div>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {children}
                </span>
            </div>
            {hint && <span className="text-[11px] text-zinc-400 dark:text-zinc-600">{hint}</span>}
        </div>
    )
}

function Divider() {
    return <div className="border-t border-zinc-200 dark:border-zinc-800/60" />
}

const fadeInUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
}

export function ParameterForm({ values, onChange, onJobCreated, onError }: ParameterFormProps) {
    const set = <K extends keyof FormValues>(key: K) => (val: FormValues[K]) =>
        onChange({ ...values, [key]: val })

    const [progress, setProgress] = useState(0)
    const [running, setRunning] = useState(false)
    const [queued, setQueued] = useState(false)
    const [queuePosition, setQueuePosition] = useState<number | null>(null)
    const drainTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const startDrain = useCallback(() => {
        if (drainTimerRef.current) clearInterval(drainTimerRef.current)
        let current = 100
        const steps = 20
        const stepSize = 100 / steps
        const stepMs = 500 / steps
        drainTimerRef.current = setInterval(() => {
            current -= stepSize
            if (current <= 0) {
                if (drainTimerRef.current) clearInterval(drainTimerRef.current)
                drainTimerRef.current = null
                setProgress(0)
                setRunning(false)
            } else {
                setProgress(current)
            }
        }, stepMs)
    }, [])

    const handleConvert = useCallback(async () => {
        if (!values.image) return

        setProgress(0)
        setRunning(false)
        setQueued(false)
        setQueuePosition(null)

        try {
            const formData = buildFormData({
                file: values.image.file,
                intValue: values.blockWidth,
                mosaicType: values.mosaicType,
                floatValue: values.backgroundPercent,
                boolValue: values.framed,
            })
            const { job_id } = await submitJob(formData)
            onJobCreated(job_id)

            let done = false
            while (!done) {
                await new Promise(r => setTimeout(r, 500))
                const job = await getJob(job_id)

                if (job.status === 'queued') {
                    setQueued(true)
                    setRunning(false)
                    setQueuePosition(job.queue_position ?? null)
                } else if (job.status === 'running') {
                    setQueued(false)
                    setQueuePosition(null)
                    setRunning(true)
                    setProgress(job.progress ?? 0)
                }

                if (job.status === 'complete' || job.status === 'failed') {
                    setQueued(false)
                    setQueuePosition(null)
                    done = true
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Job submission failed'
            console.error('Job submission failed:', err)
            onError(message)
            setQueued(false)
            setQueuePosition(null)
            setRunning(false)
        } finally {
            setQueued(false)
            setQueuePosition(null)
            setProgress(100)
            setTimeout(() => startDrain(), 500)
        }
    }, [values, onJobCreated, onError, startDrain])

    return (
        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
            {/* Image */}
            <motion.div {...fadeInUp}>
                <SectionLabel icon={ImagePlus}>Source Image</SectionLabel>
                <ImageUpload value={values.image} onChange={set('image')} />
            </motion.div>

            <Divider />

            {/* Block Width */}
            <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.06 }}>
                <SectionLabel icon={Ruler} hint="Blocks are 16 studs wide">
                    Block Width
                </SectionLabel>
                <Slider
                    value={values.blockWidth}
                    onChange={set('blockWidth')}
                    min={1}
                    max={10}
                    step={1}
                    leftLabel="1"
                    rightLabel="10"
                    ariaLabel="Block width"
                />
            </motion.div>

            <Divider />

            {/* Mosaic Type */}
            <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.12 }}>
                <SectionLabel icon={Box}>Mosaic Type</SectionLabel>
                <SegmentedControl
                    id="mosaic-type"
                    options={DIMENSION_OPTIONS}
                    value={values.mosaicType}
                    onChange={set('mosaicType')}
                    ariaLabel="Mosaic Type"
                />

                <AnimatePresence initial={false}>
                    {values.mosaicType === '3d' && (
                        <motion.div
                            key="bgpercent"
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                            style={{ overflow: 'hidden' }}
                        >
                            <SectionLabel icon={Box}>% Background Color</SectionLabel>
                            <Slider
                                value={values.backgroundPercent}
                                onChange={(v) => set('backgroundPercent')(Math.round(v))}
                                min={1}
                                max={100}
                                step={1}
                                leftLabel="1"
                                rightLabel="100"
                                ariaLabel="Background color percent"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <Divider />

            {/* Framed */}
            <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.18 }}>
                <SectionLabel icon={Frame}>Frame</SectionLabel>
                <SegmentedControl
                    id="framed"
                    options={FRAMED_OPTIONS}
                    value={values.framed}
                    onChange={set('framed')}
                    ariaLabel="Framed"
                />
            </motion.div>

            <Divider />

            {/* Convert */}
            <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.24 }}>
                <ConvertButton
                    progress={progress}
                    running={running}
                    queued={queued}
                    queuePosition={queuePosition}
                    noFile={!values.image}
                    onClick={handleConvert}
                />
            </motion.div>
        </form>
    )
}
