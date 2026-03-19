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
    const studRowWidth = buttonWidth * 0.94
    const studRowPadding = 8
    const usableWidth = studRowWidth - studRowPadding * 2
    const studRowLeft = (buttonWidth - studRowWidth) / 2 + studRowPadding

    // Colors
    const baseColor = "#2563eb"
    const baseCapColor = "#60a5fa"
    const fillColor = "#ffd400"
    const fillCapColor = "#ffe866"

    // How many px of the button width is filled
    const fillPx = running ? (progress / 100) * buttonWidth : 0

    // Shared transition for all overlay widths
    const transition = "width 0.1s linear"

    // Given an element's left edge and width (both in button-relative px),
    // return the fill overlay width % (0–100) local to that element
    function overlayPct(elemLeftPx: number, elemWidthPx: number): number {
        if (fillPx <= elemLeftPx) return 0
        if (fillPx >= elemLeftPx + elemWidthPx) return 100
        return ((fillPx - elemLeftPx) / elemWidthPx) * 100
    }

    return (
        <button
            type="button"
            disabled={disabled || running}
            onClick={onClick}
            className="relative w-[220px] h-[48px] border-2 border-black flex items-center justify-center overflow-visible"
            style={{ boxShadow: "inset 0 4px 0 rgba(0,0,0,0.2)" }}
        >
            {/* ── Face ── */}
            {/* base */}
            <div className="absolute inset-0" style={{ backgroundColor: baseColor }} />
            {/* fill overlay */}
            <div
                className="absolute bottom-0 left-0 h-full overflow-hidden"
                style={{ width: `${overlayPct(0, buttonWidth)}%`, transition }}
            >
                <div style={{ width: buttonWidth, height: "100%", backgroundColor: fillColor }} />
            </div>

            {/* ── Top cap ── */}
            {/* base */}
            <div
                className="absolute top-0 left-0 w-full overflow-hidden"
                style={{ height: topCapHeight, backgroundColor: baseCapColor, zIndex: 1 }}
            />
            {/* fill overlay */}
            <div
                className="absolute top-0 left-0 overflow-hidden"
                style={{
                    height: topCapHeight,
                    width: `${overlayPct(0, buttonWidth)}%`,
                    transition,
                    zIndex: 1
                }}
            >
                <div style={{ width: buttonWidth, height: topCapHeight, backgroundColor: fillCapColor }} />
            </div>

            {/* ── Studs ── */}
            <div
                className="absolute flex justify-between w-[94%] px-2"
                style={{ top: studTopOffset, zIndex: 2 }}
            >
                {[...Array(numStuds)].map((_, i) => {
                    const gap = usableWidth - numStuds * studWidth
                    const spacing = gap / (numStuds - 1)
                    const studLeft = studRowLeft + i * (studWidth + spacing)
                    const bodyFillPct = overlayPct(studLeft, studWidth)
                    const ovalFillPct = overlayPct(studLeft, studWidth)

                    return (
                        <div key={i} className="relative">
                            {/* stud body base */}
                            <div
                                className="border-2 border-black relative overflow-hidden"
                                style={{
                                    width: studWidth,
                                    height: studHeight,
                                    backgroundColor: baseColor,
                                    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.2)"
                                }}
                            >
                                {/* stud body fill overlay */}
                                <div
                                    className="absolute top-0 left-0 h-full"
                                    style={{
                                        width: `${bodyFillPct}%`,
                                        backgroundColor: fillColor,
                                        transition
                                    }}
                                />
                            </div>

                            {/* stud oval base */}
                            <div
                                className="absolute left-0 rounded-full border-2 border-black overflow-hidden"
                                style={{
                                    width: studWidth,
                                    height: ovalHeight,
                                    top: (studHeight - ovalHeight) / 2 + ovalOffset,
                                    backgroundColor: baseCapColor,
                                    zIndex: 3
                                }}
                            >
                                {/* stud oval fill overlay */}
                                <div
                                    className="absolute top-0 left-0 h-full"
                                    style={{
                                        width: `${ovalFillPct}%`,
                                        backgroundColor: fillCapColor,
                                        transition
                                    }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ── Label ── */}
            <div
                className="text-white font-semibold"
                style={{ transform: `translateY(${textOffset}px)`, zIndex: 4, position: "relative" }}
            >
                {running ? (progress >= 100 ? "Done!" : `${Math.round(progress)}%`) : "Convert"}
            </div>
        </button>
    )
}