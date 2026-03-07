"use client"

import { useEffect, useState } from "react"
import { Button } from "./assets/button"
import { DownloadIcon, ImageIcon } from "lucide-react"
import { getJob, getDownloadUrl } from "./api"

interface OutputPanelProps {
    jobId?: string
    outputFilename?: string
}

export function OutputPanel({ jobId, outputFilename }: OutputPanelProps) {
    const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle")
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!jobId) {
            setStatus("idle")
            setPreviewUrl(null)
            setDownloadUrl(null)
            return
        }

        let timer: number | null = null

        const poll = async () => {
            try {
                const job = await getJob(jobId)
                setStatus(job.status)

                if (job.status === "complete") {
                    setDownloadUrl(getDownloadUrl(jobId))
                    if (job.preview_url) setPreviewUrl(job.preview_url)
                    return
                }

                if (job.status === "failed") {
                    setError(job.error ?? "Job failed")
                    return
                }

                timer = window.setTimeout(poll, 2000)
            } catch (err: any) {
                setError(err.message || "Failed to fetch job status")
            }
        }

        setStatus("running")
        poll()

        return () => {
            if (timer) clearTimeout(timer)
        }
    }, [jobId])

    // Determine button color
    let buttonColorClass = "bg-gray-300 text-gray-800 cursor-not-allowed"
    if (status === "complete" && downloadUrl) buttonColorClass = "bg-green-600 text-white hover:bg-green-700"
    if (status === "failed") buttonColorClass = "bg-red-600 text-white"

    return (
        <div className="flex flex-col h-full">

            {/* Preview Area */}
            <div className="flex flex-1 items-center justify-center rounded-lg border overflow-hidden
                      bg-[linear-gradient(45deg,#f8f8f8_25%,transparent_25%),linear-gradient(-45deg,#f8f8f8_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8f8f8_75%),linear-gradient(-45deg,transparent_75%,#f8f8f8_75%)]
                      bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]">

                {/* Idle */}
                {status === "idle" && (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <ImageIcon className="size-10 opacity-50" />
                        <p className="text-sm">Upload an image and click Convert</p>
                    </div>
                )}

                {/* Running */}
                {status === "running" && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20" />
                            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">Processing image...</p>
                    </div>
                )}

                {/* Error */}
                {status === "failed" && <p className="text-sm text-red-500">{error}</p>}

                {/* Preview */}
                {previewUrl && status === "complete" && (
                    <div className="w-full h-full flex items-center justify-center">
                        <img
                            src={previewUrl}
                            alt={outputFilename ?? "Output preview"}
                            className="max-h-full max-w-full object-contain p-4"
                        />
                    </div>
                )}

                {/* Complete without preview */}
                {!previewUrl && status === "complete" && (
                    <p className="text-sm text-green-600">Job complete</p>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-center pt-3 border-t mt-3">
                <Button
                    className={`gap-2 ${buttonColorClass}`}
                    disabled={!(status === "complete" && downloadUrl)}
                    onClick={() => {
                        if (downloadUrl) window.open(downloadUrl, "_blank")
                    }}
                >
                    <DownloadIcon className="size-4" />
                    Download ZIP
                </Button>
            </div>
        </div>
    )
}