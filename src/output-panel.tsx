import { Button } from "./assets/button"
import { DownloadIcon, ImageIcon } from "lucide-react"

interface OutputPanelProps {
    outputImage: string | null
    outputFilename: string | null
    isProcessing: boolean
}

export function OutputPanel({
    outputImage,
    outputFilename,
    isProcessing,
}: OutputPanelProps) {
    return (
        <div className="flex h-full flex-col">
            {/* Output image area */}
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/10">
                {isProcessing ? (
                    <div className="flex flex-col items-center gap-2 sm:gap-3">
                        <div className="relative size-8 sm:size-10">
                            <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20" />
                            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground sm:text-sm">Processing image...</p>
                    </div>
                ) : outputImage ? (
                    <img
                        src={outputImage}
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

            {/* Download area */}
            <div className="mt-2 sm:mt-3">
                <Button
                    variant="outline"
                    className="w-full gap-2"
                    disabled={!outputImage || isProcessing}
                    onClick={() => {
                        if (!outputImage) return
                        const a = document.createElement("a")
                        a.href = outputImage
                        a.download = outputFilename ?? "output.zip"
                        a.click()
                    }}
                >
                    <DownloadIcon className="size-4" />
                    Download ZIP
                </Button>
            </div>
        </div>
    )
}
