"use client"

import { useEffect, useState } from "react"
import { Button } from "./assets/button"
import { DownloadIcon, ImageIcon } from "lucide-react"
import { getJob, getDownloadUrl } from "./api"

interface OutputPanelProps {
    jobId: string
    outputFilename?: string
}

export function OutputPanel({ jobId, outputFilename }: OutputPanelProps) {
    const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle")
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        if (!jobId) return

        let timer: number

        const poll = async () => {
            try {
                setStatus("running")
                const job = await getJob(jobId)

                setStatus(job.status)

                if (job.status === "complete") {
                    setDownloadUrl(getDownloadUrl(jobId))
                    if (job.preview_url) setPreviewUrl(job.preview_url)
                    clearTimeout(timer)
                } else if (job.status === "failed") {
                    setError(job.error ?? "Job failed")
                    clearTimeout(timer)
                } else {
                    timer = window.setTimeout(poll, 2000)
                }
            } catch (err: any) {
                setError(err.message || "Failed to fetch job status")
                clearTimeout(timer)
            }
        }

        poll()

        return () => clearTimeout(timer)
    }, [jobId])

    return (
        <div className="flex flex-col gap-2">
            {/* Preview / Status */}
            <div className="flex min-h-[150px] items-center justify-center rounded-lg border bg-muted/10">
                {status === "running" ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20" />
                            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground">Processing...</p>
                    </div>
                ) : error ? (
                    <p className="text-red-500 text-sm">{error}</p>
                ) : previewUrl ? (
                    <img
                        src={previewUrl}
                        alt={outputFilename ?? "Output preview"}
                        className="max-h-full max-w-full object-contain p-2"
                    />
                ) : status === "complete" ? (
                    <p className="text-sm text-green-600">Job complete!</p>
                ) : (
                    <p className="text-sm text-muted-foreground">Waiting for job...</p>
                )}
            </div>

            {/* Download button */}
            <Button
                variant="outline"
                className="w-full gap-2"
                disabled={!downloadUrl || status !== "complete"}
                onClick={() => {
                    if (downloadUrl) window.location.href = downloadUrl
                }}
            >
                <DownloadIcon className="size-4" />
                {status === "running" ? "Processing..." : "Download ZIP"}
            </Button>
        </div>
    )
}