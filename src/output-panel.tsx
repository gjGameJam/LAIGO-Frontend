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

    let brickColor = "#009624"
    if (status === "complete" && downloadUrl) brickColor = "#009624"
    if (status === "failed") brickColor = "#d00000"

    return (
        <div className="flex flex-col h-full font-LegoThick">

            {/* Preview Area */}
            <div
                className="flex flex-1 flex-col items-center justify-center rounded-lg border border-[#2a2a2a] overflow-hidden text-center"
                style={{ backgroundColor: "#1a1a1a" }}
            >
                {status === "idle" && (
                    <div className="flex flex-col items-center gap-3 uppercase text-center">
                        <ImageIcon className="size-10" style={{ color: "#444", opacity: 0.6 }} />
                        <p className="text-sm" style={{ color: "#444" }}>Upload an image and click convert</p>
                    </div>
                )}

                {status === "running" && (
                    <div className="flex flex-col items-center gap-3 uppercase text-center">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 rounded-full border-2 border-[#333]" />
                            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#888]" />
                        </div>
                        <p className="text-xs" style={{ color: "#555" }}>Processing image…</p>
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
                    <p className="text-sm uppercase" style={{ color: "#00c038" }}>Job Complete</p>
                )}
            </div>

            {/* LEGO Brick Button with bottom margin */}
            <div className="flex justify-center mt-3 mb-4 pt-3">
                <LegoButton
                    status={status}
                    onClick={() => { if (downloadUrl) window.open(downloadUrl, "_blank") }}
                    icon={<DownloadIcon className="size-4" />}
                />
            </div>
        </div>
    )
}