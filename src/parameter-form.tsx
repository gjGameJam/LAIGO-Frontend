"use client"

import { useState, useCallback, useRef } from "react"
import { Label } from "./assets/label"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { Switch } from "./assets/switch"
import { Button } from "./assets/button"
import { ImageIcon, UploadIcon, XIcon } from "lucide-react"
import { submitJob, buildFormData } from "./api"
import { OutputPanel } from "./output-panel"

export interface FormValues {
    file: File | null
    intValue: number
    mosaicType: "3d" | "2d"
    floatValue: number
    boolValue: boolean
}

interface ParameterFormProps {
    values: FormValues
    onChange: (values: FormValues) => void
    preview: string | null
    onPreviewChange: (url: string | null) => void
}

export function ParameterForm({
    values,
    onChange,
    preview,
    onPreviewChange,
}: ParameterFormProps) {
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Job submission state
    const [jobId, setJobId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFile = useCallback(
        (file: File | null) => {
            if (file && !file.type.startsWith("image/")) return
            onChange({ ...values, file })
            if (file) {
                onPreviewChange(URL.createObjectURL(file))
            } else {
                onPreviewChange(null)
            }
        },
        [values, onChange, onPreviewChange],
    )

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)
            handleFile(e.dataTransfer.files?.[0] ?? null)
        },
        [handleFile],
    )

    const removeFile = useCallback(() => {
        handleFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }, [handleFile])

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!values.file) return

        setIsSubmitting(true)
        setError(null)
        setJobId(null)

        try {
            const formData = buildFormData(values)
            const result = await submitJob(formData)
            setJobId(result.job_id)
        } catch (err: any) {
            console.error("Job submission failed:", err)
            setError(err.message || "Job submission failed")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-2.5 sm:gap-3">
                {/* -------------------- File Upload -------------------- */}
                <div className="flex flex-col gap-1.5">
                    <div
                        role="button"
                        tabIndex={0}
                        aria-label="Upload image file"
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click() } }}
                        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/40"} ${preview ? "p-1.5 sm:p-2" : "px-3 py-3 sm:px-4 sm:py-4"}`}
                    >
                        {preview ? (
                            <div className="relative w-full">
                                <img
                                    src={preview}
                                    alt="Upload preview"
                                    className="mx-auto max-h-16 rounded-md object-contain sm:max-h-24"
                                />
                                <div className="mt-1.5 flex items-center justify-between px-0.5">
                                    <span className="truncate text-xs text-muted-foreground">
                                        {values.file?.name}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-6"
                                        onClick={(e) => { e.stopPropagation(); removeFile() }}
                                        aria-label="Remove image"
                                    >
                                        <XIcon className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                                    {isDragging ? (
                                        <UploadIcon className="size-4 text-primary" />
                                    ) : (
                                        <ImageIcon className="size-4 text-muted-foreground" />
                                    )}
                                </div>
                                <p className="mt-1.5 text-xs font-medium text-foreground">
                                    Drop image or click to browse
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    PNG, JPG, GIF, WebP
                                </p>
                            </>
                        )}
                        <input
                            ref={fileInputRef}
                            id="file-upload"
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                        />
                    </div>
                </div>

                {/* -------------------- Block Width Slider -------------------- */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <Label htmlFor="int-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Block width
                            </Label>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                                Blocks are 16 studs long
                            </p>
                        </div>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium tabular-nums text-foreground">
                            {values.intValue}
                        </span>
                    </div>

                    <SliderPrimitive.Root
                        className="slider-root"
                        min={1}
                        max={40}
                        step={1}
                        value={[values.intValue]}
                        onValueChange={([v]) => onChange({ ...values, intValue: v })}
                    >
                        <SliderPrimitive.Track className="slider-track">
                            <SliderPrimitive.Range className="slider-range" />
                        </SliderPrimitive.Track>
                        <SliderPrimitive.Thumb className="slider-thumb" />
                    </SliderPrimitive.Root>

                    <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>1</span>
                        <span>40</span>
                    </div>
                </div>

                {/* -------------------- Mosaic Type -------------------- */}
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-2 py-1.5 sm:px-3 sm:py-2">
                    <div className="flex flex-col gap-0.5">
                        <Label className="text-sm">Mosaic Type</Label>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                            {values.mosaicType === "3d" ? "3D" : "2D"} mosaic
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange({ ...values, mosaicType: values.mosaicType === "3d" ? "2d" : "3d" })}
                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${values.mosaicType === "3d"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-muted text-foreground"
                            }`}
                    >
                        {values.mosaicType === "3d" ? "3D" : "2D"}
                    </button>
                </div>

                {/* -------------------- % Background Colors (3D only) -------------------- */}
                {values.mosaicType === "3d" && (
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="float-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                % of background colors
                            </Label>
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium tabular-nums text-foreground">
                                {values.floatValue.toFixed(1)}
                            </span>
                        </div>

                        <SliderPrimitive.Root
                            className="slider-root"
                            min={1}
                            max={100}
                            step={0.1}
                            value={[values.floatValue]}
                            onValueChange={([v]) => onChange({ ...values, floatValue: parseFloat(v.toFixed(1)) })}
                        >
                            <SliderPrimitive.Track className="slider-track">
                                <SliderPrimitive.Range className="slider-range" />
                            </SliderPrimitive.Track>
                            <SliderPrimitive.Thumb className="slider-thumb" />
                        </SliderPrimitive.Root>

                        <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>1.0</span>
                            <span>100.0</span>
                        </div>
                    </div>
                )}

                {/* -------------------- Framed Boolean -------------------- */}
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-2 py-1.5 sm:px-3 sm:py-2">
                    <div className="flex flex-col gap-0.5">
                        <Label htmlFor="bool-toggle">Framed</Label>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                            Add frame to lego mosaic set
                        </p>
                    </div>
                    <button
                        type="button"
                        id="bool-toggle"
                        onClick={() => onChange({ ...values, boolValue: !values.boolValue })}
                        className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${values.boolValue
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-muted text-foreground"
                            }`}
                    >
                        {values.boolValue ? "True" : "False"}
                    </button>
                </div>

                {/* -------------------- Submit Button -------------------- */}
                <Button
                    type="submit"
                    className="w-full border border-gray-300"
                    disabled={!values.file || isSubmitting}
                >
                    {isSubmitting ? "Submitting..." : "Convert"}
                </Button>

                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </form>

            {/* -------------------- Output Panel -------------------- */}
            {jobId && (
                <div className="mt-4">
                    <OutputPanel
                        jobId={jobId}
                        outputFilename="mosaic.zip"
                        preview={preview}
                    />
                </div>
            )}
        </div>
    )
}