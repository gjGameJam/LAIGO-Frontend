"use client"

import { useEffect, useState } from "react"
import { DownloadIcon, ImageIcon } from "lucide-react"
import { getJob, getDownloadUrl } from "./api"
import { LegoButton } from "./LegoButton"

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
        let active = true

        const poll = async () => {
            if (!active) return

            try {
                const job = await getJob(jobId)
                setStatus(job.status) // always update status

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
                console.error(err)
                setError(err.message || "Job failed")
                setStatus("failed")
            }
        }

        setStatus("running")
        poll()

        return () => {
            active = false
            if (timer) clearTimeout(timer)
        }
    }, [jobId])

    // LEGO brick color
    let brickColor = "#b0b0b0" // grey
    if (status === "complete" && downloadUrl) brickColor = "#00a000" // green
    if (status === "failed") brickColor = "#d00000" // red

    return (
        <div className="flex flex-col h-full font-LegoThick">

            {/* Preview Area */}
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border overflow-hidden
                bg-[linear-gradient(45deg,#f8f8f8_25%,transparent_25%),linear-gradient(-45deg,#f8f8f8_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8f8f8_75%),linear-gradient(-45deg,transparent_75%,#f8f8f8_75%)]
                bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] text-center">

                {status === "idle" && (
                    <div className="flex flex-col items-center gap-3 uppercase text-center">
                        <ImageIcon className="size-10 opacity-50" />
                        <p className="text-sm">UPLOAD AN IMAGE AND CLICK CONVERT</p>
                    </div>
                )}

                {status === "running" && (
                    <div className="flex flex-col items-center gap-3 uppercase text-center">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20" />
                            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-foreground" />
                        </div>
                        <p className="text-xs">PROCESSING IMAGE…</p>
                    </div>
                )}

                {status === "failed" && (
                    <p className="text-sm text-red-500 uppercase">{error}</p>
                )}

                {previewUrl && status === "complete" && (
                    <div className="w-full h-full flex items-center justify-center">
                        <img
                            src={previewUrl}
                            alt={outputFilename ?? "OUTPUT PREVIEW"}
                            className="max-h-full max-w-full object-contain p-4"
                        />
                    </div>
                )}

                {!previewUrl && status === "complete" && (
                    <p className="text-sm text-green-600 uppercase">JOB COMPLETE</p>
                )}
            </div>

            {/* LEGO Brick Button */}
            <div className="flex justify-center pt-3 mt-3">
                <LegoButton
                    status={status}
                    onClick={() => { if (downloadUrl) window.open(downloadUrl, "_blank") }}
                    icon={<DownloadIcon className="size-4" />}
                />
            </div>
        </div>
    )
}