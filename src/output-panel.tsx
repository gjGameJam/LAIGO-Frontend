"use client"

import { useEffect, useState } from "react"
import { DownloadIcon, ImageIcon, PackageIcon, ShoppingCartIcon, HammerIcon } from "lucide-react"
import { getJob, getDownloadUrl } from "./api"
import { LegoButton } from "./LegoButton"

interface OutputPanelProps {
    jobId?: string
    outputFilename?: string
}

const STEPS = [
    { icon: DownloadIcon, text: "Download the zip file" },
    { icon: PackageIcon, text: "Open the zip — it contains piece list and instructions folders" },
    { icon: ShoppingCartIcon, text: "Go to Pick a Brick, upload list(s), order pieces, and wait for delivery" },
    { icon: HammerIcon, text: "Follow the instructions and enjoy!" },
]

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

    return (
        <div className="flex flex-col h-full font-LegoThick">

            {/* Preview Area */}
            <div className="output-preview flex flex-1 flex-col items-center justify-center rounded-lg overflow-hidden text-center">

                {status === "idle" && (
                    <div className="flex flex-col items-center gap-3 uppercase text-center">
                        <ImageIcon className="size-12" style={{ color: "#ffffff", opacity: 0.6 }} />
                        <p className="text-lg font-semibold" style={{ color: "#ffffff" }}>Upload an image and click convert</p>
                    </div>
                )}

                {status === "running" && (
                    <div className="flex flex-col items-center gap-3 uppercase text-center">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 rounded-full border-2 border-[#555]" />
                            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#fff]" />
                        </div>
                        <p className="text-lg font-semibold" style={{ color: "#ffffff" }}>Processing image…</p>
                    </div>
                )}

                {status === "failed" && (
                    <div className="flex flex-col items-start gap-4 w-full px-4 py-6">
                        <p className="text-2xl font-semibold uppercase" style={{ color: "#ff6b6b", fontFamily: "Nunito, sans-serif" }}>
                            {"Error: " + error}
                        </p>

                        <p className="text-lg font-medium uppercase" style={{ color: "#ff8c66", fontFamily: "Nunito, sans-serif" }}>
                            What does this mean?
                        </p>

                        {/* Example error #1 */}
                        <div className="flex flex-col gap-1 p-3 w-full" style={{ fontFamily: "Nunito, sans-serif" }}>
                            <p className="text-lg font-bold uppercase" style={{ color: "#ff8c66" }}>Failed To Fetch</p>
                            <p className="text-base" style={{ color: "#ffb299" }}>
                                The backend service went down temporarily. Please reload page and try again.
                            </p>
                        </div>

                        {/* Example error #2 */}
                        <div className="flex flex-col gap-1 p-3 w-full" style={{ fontFamily: "Nunito, sans-serif" }}>
                            <p className="text-lg font-bold uppercase" style={{ color: "#ff8c66" }}>Unsupported File Type</p>
                            <p className="text-base" style={{ color: "#ffb299" }}>
                                Only PNG, JPG, GIF, and WebP files are supported. Check your image and try again.
                            </p>
                        </div>

                        {/* Example error #3 */}
                        <div className="flex flex-col gap-1 p-3 w-full" style={{ fontFamily: "Nunito, sans-serif" }}>
                            <p className="text-lg font-bold uppercase" style={{ color: "#ff8c66" }}>Unexpected Error</p>
                            <p className="text-base" style={{ color: "#ffb299" }}>
                                An unexpected error occurred. Contact support if this keeps happening.
                            </p>
                        </div>
                    </div>
                )}

                {previewUrl && status === "complete" && (
                    <div className="w-full h-full flex flex-col">
                        <img
                            src={previewUrl}
                            alt={outputFilename ?? "OUTPUT PREVIEW"}
                            className="flex-1 max-h-full max-w-full object-contain p-4"
                        />
                        {/* Next steps overlay at bottom */}
                        <div className="px-4 pb-3 flex flex-col gap-1.5">
                            <p className="text-sm font-bold uppercase text-left" style={{ color: "#00c038", fontFamily: "Nunito, sans-serif" }}>Next Steps</p>
                            {STEPS.map(({ icon: Icon, text }, i) => (
                                <div key={i} className="flex items-start gap-2 text-left">
                                    <span className="text-base font-bold shrink-0" style={{ color: "#00c038", fontFamily: "Nunito, sans-serif" }}>{i + 1}.</span>
                                    <Icon className="size-3.5 shrink-0 mt-0.5" style={{ color: "#aaa" }} />
                                    <p className="text-sm leading-tight" style={{ color: "#ccc", fontFamily: "Nunito, sans-serif" }}>{text}</p>
                                </div>
                            ))}
                            <a
                                href="https://www.lego.com/en-us/pick-and-build/pick-a-brick?consent-modal=show"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline mt-0.5 text-left"
                                style={{ color: "#60a5fa" }}
                            >
                                lego.com/pick-a-brick →
                            </a>
                        </div>
                    </div>
                )}

                {!previewUrl && status === "complete" && (
                    <div className="flex flex-col gap-3 px-6 py-4 text-left w-full">
                        <p className="text-lg font-semibold uppercase text-center" style={{ color: "#00c038" }}>Job Complete</p>
                        <p className="text-sm font-bold uppercase" style={{ color: "#00c038", fontFamily: "Nunito, sans-serif" }}>Next Steps</p>
                        {STEPS.map(({ icon: Icon, text }, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <span className="text-base font-bold shrink-0" style={{ color: "#00c038", fontFamily: "Nunito, sans-serif" }}>{i + 1}.</span>
                                <Icon className="size-3.5 shrink-0 mt-0.5" style={{ color: "#aaa" }} />
                                <p className="text-sm leading-tight" style={{ color: "#ccc", fontFamily: "Nunito, sans-serif" }}>{text}</p>
                            </div>
                        ))}
                        <a
                            href="https://www.lego.com/en-us/pick-and-build/pick-a-brick?consent-modal=hide"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline"
                            style={{ color: "#60a5fa" }}
                        >
                            lego.com/pick-a-brick →
                        </a>
                    </div>
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