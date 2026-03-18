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

    const baseColor = "#2563eb"
    const fillColor = "#ffd400"

    const isYellow = running && progress < 100

    return (
        <button
            type="button"
            disabled={disabled || running}
            onClick={onClick}
            className="relative w-[220px] h-[48px] border-2 border-black flex items-center justify-center overflow-visible"
            style={{ boxShadow: "inset 0 4px 0 rgba(0,0,0,0.2)" }}
        >
            {/* base */}
            <div
                className="absolute inset-0"
                style={{ backgroundColor: baseColor }}
            />

            {/* progress fill */}
            <div
                className="absolute bottom-0 left-0 h-full"
                style={{
                    width: `${progress}%`,
                    backgroundColor: fillColor,
                    transition: "width 0.1s linear"
                }}
            />

            {/* top cap — flush to top of button */}
            <div
                className="absolute top-0 left-0 w-full"
                style={{
                    height: `${topCapHeight}px`,
                    backgroundColor: isYellow ? fillColor : baseColor,
                    zIndex: 1
                }}
            />

            {/* studs — overflow-visible lets these poke above the button */}
            <div
                className="absolute flex justify-between w-[94%] px-2"
                style={{ top: `${studTopOffset}px`, zIndex: 2 }}
            >
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="relative">
                        {/* stud body */}
                        <div
                            className="border-2 border-black"
                            style={{
                                width: `${studWidth}px`,
                                height: `${studHeight}px`,
                                backgroundColor: isYellow ? fillColor : baseColor,
                                boxShadow: "inset 0 1px 0 rgba(0,0,0,0.2)"
                            }}
                        />
                        {/* stud oval top */}
                        <div
                            className="absolute left-0 rounded-full border-2 border-black"
                            style={{
                                width: `${studWidth}px`,
                                height: `${ovalHeight}px`,
                                top: `${(studHeight - ovalHeight) / 2 + ovalOffset}px`,
                                backgroundColor: isYellow ? "#ffe866" : "#60a5fa",
                                zIndex: 3
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* label */}
            <div
                className="text-white font-semibold"
                style={{ transform: `translateY(${textOffset}px)`, zIndex: 4, position: "relative" }}
            >
                {running ? (progress >= 100 ? "Done!" : `${Math.round(progress)}%`) : "Convert"}
            </div>
        </button>
    )
}