import React from "react"

interface LegoProgressButtonProps {
    progress: number
    running: boolean
    onClick?: () => void
    disabled?: boolean
}

export function LegoProgressButton({
    progress,
    running,
    onClick,
    disabled
}: LegoProgressButtonProps) {

    const studHeight = 11
    const studWidth = 20
    const ovalHeight = 7
    const topCapHeight = 13
    const studTopOffset = -2
    const ovalOffset = -4
    const textOffset = 6

    const baseColor = "#2563eb"      // blue
    const fillColor = "#ffd400"      // lego yellow

    return (
        <button
            type="submit"
            disabled={disabled || running}
            onClick={onClick}
            className="relative w-[220px] h-[48px] border-2 border-black flex items-center justify-center
               shadow-[inset_0_4px_0_rgba(0,0,0,0.2)]"
        >

            {/* base */}
            <div
                className="absolute inset-0"
                style={{ backgroundColor: baseColor }}
            />

            {/* progress fill */}
            {running && (
                <div
                    className="absolute bottom-0 left-0 h-full"
                    style={{
                        width: `${progress}%`,
                        backgroundColor: fillColor,
                        transition: "width 0.25s linear"
                    }}
                />
            )}

            {/* top cap */}
            <div
                className="absolute top-0 left-0 w-full"
                style={{
                    height: `${topCapHeight}px`,
                    backgroundColor: running ? fillColor : "#3b82f6"
                }}
            />

            {/* studs */}
            <div
                className="absolute flex justify-between w-[94%] px-2"
                style={{ top: `${studTopOffset}px` }}
            >
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="relative">
                        <div
                            className="border-2 border-black shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                            style={{
                                width: `${studWidth}px`,
                                height: `${studHeight}px`,
                                backgroundColor: running ? fillColor : baseColor
                            }}
                        />

                        <div
                            className="absolute left-0 w-[20px] rounded-full border-black border-2"
                            style={{
                                height: `${ovalHeight}px`,
                                top: `${(studHeight - ovalHeight) / 2 + ovalOffset}px`,
                                backgroundColor: running ? "#ffe866" : "#60a5fa"
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* label */}
            <div
                className="z-10 text-white font-semibold"
                style={{ transform: `translateY(${textOffset}px)` }}
            >
                {running ? `${Math.round(progress)}%` : "Convert"}
            </div>

        </button>
    )
}