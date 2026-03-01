"use client"

import { useState, useCallback, useRef } from "react"
import { Label } from "./assets/label"
import { Slider } from "./assets/slider"
import { Switch } from "./assets/switch"
import { Button } from "./assets/button"
import { ImageIcon, UploadIcon, XIcon } from "lucide-react"

export interface FormValues {
    file: File | null
    intValue: number
    floatValue: number
    boolValue: boolean
}

interface ParameterFormProps {
    values: FormValues
    onChange: (values: FormValues) => void
    preview: string | null
    onPreviewChange: (url: string | null) => void
    onSubmit: () => void
}

export function ParameterForm({
    values,
    onChange,
    preview,
    onPreviewChange,
    onSubmit,
}: ParameterFormProps) {
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit()
    }

    return (
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-2.5 sm:gap-3">
            {/* Image Upload */}
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="file-upload" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Image
                </Label>
                <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload image file"
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            fileInputRef.current?.click()
                        }
                    }}
                    className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/40"
                        } ${preview ? "p-1.5 sm:p-2" : "px-3 py-3 sm:px-4 sm:py-4"}`}
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
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation()
                                        removeFile()
                                    }}
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

            {/* Integer (1-40) */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="int-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Integer
                    </Label>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium tabular-nums text-foreground">
                        {values.intValue}
                    </span>
                </div>
                <Slider
                    id="int-input"
                    min={1}
                    max={40}
                    step={1}
                    value={[values.intValue]}
                    onValueChange={([v]: number[]) => onChange({ ...values, intValue: v })}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>1</span>
                    <span>40</span>
                </div>
            </div>

            {/* Float (1-100) */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="float-input" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Float
                    </Label>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium tabular-nums text-foreground">
                        {values.floatValue.toFixed(1)}
                    </span>
                </div>
                <Slider
                    id="float-input"
                    min={1}
                    max={100}
                    step={0.1}
                    value={[values.floatValue]}
                    onValueChange={([v]: number[]) =>
                        onChange({ ...values, floatValue: parseFloat(v.toFixed(1)) })
                    }
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>1.0</span>
                    <span>100.0</span>
                </div>
            </div>

            {/* Boolean */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-2 py-1.5 sm:px-3 sm:py-2">
                <div className="flex flex-col gap-0.5">
                    <Label htmlFor="bool-toggle" className="text-sm">Enabled</Label>
                    <p className="text-[11px] text-muted-foreground leading-tight">Toggle this option on or off</p>
                </div>
                <Switch
                    id="bool-toggle"
                    checked={values.boolValue}
                    onCheckedChange={(checked: boolean) =>
                        onChange({ ...values, boolValue: checked })
                    }
                />
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={!values.file}>
                Convert
            </Button>
        </form>
    )
}
