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
    const numStuds = 6

    // Button dimensions — must match className below
    const buttonWidth = 220
    // Stud row is w-[94%] px-2, so usable width = 220 * 0.94 - 16 (px-2 = 8px each side)
    const studRowWidth = buttonWidth * 0.94
    const studRowPadding = 8 // px-2 = 8px each side
    const usableWidth = studRowWidth - studRowPadding * 2
    // Left edge of stud row relative to button
    const studRowLeft = (buttonWidth - studRowWidth) / 2 + studRowPadding

    // Base face colors
    const baseColor = "#2563eb"
    const baseCapColor = "#60a5fa"
    const fillColor = "#ffd400"
    const fillCapColor = "#ffe866"

    const isYellow = running && progress < 100

    // How many px of the button is filled
    const fillPx = (progress / 100) * buttonWidth

    // For a stud at a given left edge (relative to button), compute the gradient
    // localFill is what % of THIS stud's width is filled
    function studGradient(studLeftPx: number, bodyColor: string, fillBodyColor: string): string {
        if (!isYellow) return bodyColor
        const studRightPx = studLeftPx + studWidth
        if (fillPx <= studLeftPx) return bodyColor           // fully blue
        if (fillPx >= studRightPx) return fillBodyColor      // fully yellow
        // Partially filled — hard stop gradient local to this stud
        const localPct = ((fillPx - studLeftPx) / studWidth) * 100
        return `linear-gradient(to right, ${fillBodyColor} ${localPct}%, ${bodyColor} ${localPct}%)`
    }

    // Top cap gradient (spans full button width)
    const topCapBackground = isYellow
        ? `linear-gradient(to right, ${fillCapColor} ${progress}%, ${baseCapColor} ${progress}%)`
        : baseCapColor

    return (
        <button
            type="button"
            disabled={disabled || running}
            onClick={onClick}
            className="relative w-[220px] h-[48px] border-2 border-black flex items-center justify-center overflow-visible"
            style={{ boxShadow: "inset 0 4px 0 rgba(0,0,0,0.2)" }}
        >
            {/* base — always blue */}
            <div className="absolute inset-0" style={{ backgroundColor: baseColor }} />

            {/* progress fill — yellow advancing left to right */}
            <div
                className="absolute bottom-0 left-0 h-full"
                style={{
                    width: `${progress}%`,
                    backgroundColor: fillColor,
                    transition: "width 0.1s linear"
                }}
            />

            {/* top cap — lighter shade, gradient follows progress */}
            <div
                className="absolute top-0 left-0 w-full"
                style={{
                    height: `${topCapHeight}px`,
                    background: topCapBackground,
                    transition: "background 0.1s linear",
                    zIndex: 1
                }}
            />

            {/* studs */}
            <div
                className="absolute flex justify-between w-[94%] px-2"
                style={{ top: `${studTopOffset}px`, zIndex: 2 }}
            >
                {[...Array(numStuds)].map((_, i) => {
                    // Calculate this stud's left edge in button-relative px
                    const gap = usableWidth - numStuds * studWidth
                    const spacing = gap / (numStuds - 1)
                    const studLeft = studRowLeft + i * (studWidth + spacing)

                    const bodyBg = studGradient(studLeft, baseColor, fillColor)
                    const ovalBg = studGradient(studLeft, baseCapColor, fillCapColor)

                    return (
                        <div key={i} className="relative">
                            {/* stud body */}
                            <div
                                className="border-2 border-black"
                                style={{
                                    width: `${studWidth}px`,
                                    height: `${studHeight}px`,
                                    background: bodyBg,
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
                                    background: ovalBg,
                                    zIndex: 3
                                }}
                            />
                        </div>
                    )
                })}
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