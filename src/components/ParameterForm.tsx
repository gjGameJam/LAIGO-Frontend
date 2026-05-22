import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ruler, Box, Frame, ImagePlus } from 'lucide-react'
import { ImageUpload } from '../ui/ImageUpload'
import { Slider } from '../ui/Slider'
import { SegmentedControl } from '../ui/SegmentedControl'
import { ConvertButton } from './ConvertButton'
import { submitJob, buildFormData } from '../api'
import type { JobStatus } from '../hooks/useJob'
import type { FormValues } from './parameterFormDefaults'

interface ParameterFormProps {
    values: FormValues
    onChange: (v: FormValues) => void
    onJobSubmit: (jobId: string) => void
    onSubmissionError: (message: string) => void
    jobStatus: JobStatus
    jobProgress: number
    jobQueuePosition: number | null
}

const DIMENSION_OPTIONS = [
    { label: '2D', value: '2d' as const },
    { label: '3D', value: '3d' as const },
]

const FRAMED_OPTIONS = [
    { label: 'Unframed', value: false },
    { label: 'Framed', value: true },
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

const fadeInUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
}

export function ParameterForm({
    values,
    onChange,
    onJobSubmit,
    onSubmissionError,
    jobStatus,
    jobProgress,
    jobQueuePosition,
}: ParameterFormProps) {
    const set = <K extends keyof FormValues>(key: K) => (val: FormValues[K]) =>
        onChange({ ...values, [key]: val })

    const handleConvert = useCallback(async () => {
        if (!values.image) return
        try {
            const formData = buildFormData({
                file: values.image.file,
                intValue: values.blockWidth,
                mosaicType: values.mosaicType,
                floatValue: values.backgroundPercent,
                boolValue: values.framed,
            })
            const { job_id } = await submitJob(formData)
            onJobSubmit(job_id)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Job submission failed'
            onSubmissionError(message)
        }
    }, [values, onJobSubmit, onSubmissionError])

    return (
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5 h-full">
            {/* Image */}
            <motion.div {...fadeInUp}>
                <SectionLabel icon={ImagePlus}>Source Image</SectionLabel>
                <ImageUpload value={values.image} onChange={set('image')} />
            </motion.div>

            {/* Block Width */}
            <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.06 }} className="mt-3">
                <SectionLabel icon={Ruler} hint={`${values.blockWidth * 16} legos wide`}>
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

            {/* Convert */}
            <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.24 }} className="mt-auto">
                <ConvertButton
                    progress={jobProgress}
                    running={jobStatus === 'running'}
                    queued={jobStatus === 'queued'}
                    queuePosition={jobQueuePosition}
                    noFile={!values.image}
                    onClick={handleConvert}
                />
            </motion.div>
        </form>
    )
}
