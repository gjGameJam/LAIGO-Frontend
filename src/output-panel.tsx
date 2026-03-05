import { useEffect, useState } from "react";
import { Button } from "./assets/button";
import { DownloadIcon, ImageIcon } from "lucide-react";
import { getJob, getDownloadUrl } from "./api";

interface OutputPanelProps {
    jobId: string | null;
    outputFilename?: string | null;
    preview?: string | null; // optional preview image URL
}

export function OutputPanel({ jobId, outputFilename, preview }: OutputPanelProps) {
    const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle");
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!jobId) {
            setStatus("idle");
            setDownloadUrl(null);
            setError(null);
            return;
        }

        setStatus("running");
        setDownloadUrl(null);
        setError(null);

        let timer: number;

        const poll = async () => {
            try {
                const result = await getJob(jobId);

                // Update status
                if (result.status === "complete") {
                    setStatus("complete");
                    setDownloadUrl(getDownloadUrl(jobId));
                    return; // stop polling
                } else if (result.status === "failed") {
                    setStatus("failed");
                    setError(result.error ?? "Job failed");
                    return; // stop polling
                } else {
                    setStatus("running");
                    timer = window.setTimeout(poll, 2000); // poll again in 2s
                }
            } catch (err: any) {
                setStatus("failed");
                setError(err.message ?? "Error fetching job status");
            }
        };

        poll();

        return () => clearTimeout(timer);
    }, [jobId]);

    return (
        <div className="flex h-full flex-col">
            {/* Output / preview */}
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/10">
                {status === "running" ? (
                    <div className="flex flex-col items-center gap-2 sm:gap-3">
                        <div className="relative size-8 sm:size-10">
                            <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20" />
                            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground sm:text-sm">Processing image...</p>
                    </div>
                ) : status === "failed" ? (
                    <p className="text-red-500 text-sm text-center">{error}</p>
                ) : preview ? (
                    <img
                        src={preview}
                        alt={outputFilename ?? "Converted output"}
                        className="max-h-full max-w-full object-contain p-2 sm:p-4"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-1.5 px-4 text-center sm:gap-2">
                        <div className="flex size-10 items-center justify-center rounded-full bg-muted sm:size-12">
                            <ImageIcon className="size-5 text-muted-foreground sm:size-6" />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                            No output yet
                        </p>
                        <p className="max-w-48 text-[11px] text-muted-foreground/70 leading-relaxed sm:text-xs">
                            Upload an image and configure parameters, then click Convert
                        </p>
                    </div>
                )}
            </div>

            {/* Download button */}
            <div className="mt-2 sm:mt-3">
                <Button
                    variant={status === "failed" ? "destructive" : "outline"}
                    className="w-full gap-2"
                    disabled={status !== "complete" || !downloadUrl}
                    onClick={() => {
                        if (!downloadUrl) return;
                        window.location.href = downloadUrl;
                    }}
                >
                    <DownloadIcon className="size-4" />
                    {status === "running" ? "Processing..." : status === "failed" ? "Failed" : "Download ZIP"}
                </Button>
            </div>
        </div>
    );
}