import React from "react"

interface LegoProgressButtonProps {
    progress: number
    running: boolean
    noFile?: boolean
    onClick?: () => void
    disabled?: boolean
}

export function LegoProgressButton({
    progress,
    running,
    noFile = false,
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

    // 220px outer width minus 2px border each side = 216px content width
    const buttonWidth = 216
    const studRowWidth = buttonWidth * 0.94
    const studRowPadding = 8
    const usableWidth = studRowWidth - studRowPadding * 2
    const studRowLeft = (buttonWidth - studRowWidth) / 2 + studRowPadding

    // Grey when no file uploaded, blue when ready, yellow when running
    const baseColor = noFile ? "#6b7280" : "#2563eb"
    const baseCapColor = noFile ? "#9ca3af" : "#60a5fa"
    const fillColor = "#ffd400"
    const fillCapColor = "#ffe866"

    const transition = "width 0.1s linear"

    const fillPx = running ? (progress / 100) * buttonWidth : 0
    const barPct = (fillPx / buttonWidth) * 100

    const gap = usableWidth - numStuds * studWidth
    const spacing = gap / (numStuds - 1)
    const studLefts = Array.from({ length: numStuds }, (_, i) =>
        studRowLeft + i * (studWidth + spacing)
    )

    function studFillPct(studLeft: number): number {
        const studRight = studLeft + studWidth
        if (fillPx <= studLeft) return 0
        if (fillPx >= studRight) return 100
        return ((fillPx - studLeft) / studWidth) * 100
    }

    const label = running
        ? (progress >= 100 ? "Done!" : `${Math.round(progress)}%`)
        : noFile ? "Upload Image" : "Convert"

    return (
        <button
            type="button"
            disabled={disabled || running}
            onClick={onClick}
            className="relative w-[220px] h-[48px] border-2 border-black flex items-center justify-center overflow-visible"
            style={{
                boxShadow: "inset 0 4px 0 rgba(0,0,0,0.2)",
                cursor: noFile ? "not-allowed" : "pointer"
            }}
        >
            {/* ── Face base ── */}
            <div className="absolute inset-0" style={{ backgroundColor: baseColor }} />

            {/* ── Face fill ── */}
            <div
                className="absolute bottom-0 left-0 h-full overflow-hidden"
                style={{ width: `${barPct}%`, transition }}
            >
                <div style={{ width: buttonWidth, height: "100%", backgroundColor: fillColor }} />
            </div>

            {/* ── Top cap base ── */}
            <div
                className="absolute top-0 left-0 w-full"
                style={{ height: topCapHeight, backgroundColor: baseCapColor, zIndex: 1 }}
            />

            {/* ── Top cap fill ── */}
            <div
                className="absolute top-0 left-0 overflow-hidden"
                style={{ height: topCapHeight, width: `${barPct}%`, transition, zIndex: 1 }}
            >
                <div style={{ width: buttonWidth, height: topCapHeight, backgroundColor: fillCapColor }} />
            </div>

            {/* ── Studs ── */}
            <div
                className="absolute flex justify-between w-[94%] px-2"
                style={{ top: studTopOffset, zIndex: 2 }}
            >
                {studLefts.map((studLeft, i) => {
                    const pct = studFillPct(studLeft)
                    return (
                        <div key={i} className="relative">
                            {/* stud body */}
                            <div
                                className="border-2 border-black relative overflow-hidden"
                                style={{
                                    width: studWidth,
                                    height: studHeight,
                                    backgroundColor: baseColor,
                                    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.2)"
                                }}
                            >
                                <div
                                    className="absolute top-0 left-0 h-full"
                                    style={{ width: `${pct}%`, backgroundColor: fillColor, transition }}
                                />
                            </div>

                            {/* stud oval */}
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
                                <div
                                    className="absolute top-0 left-0 h-full"
                                    style={{ width: `${pct}%`, backgroundColor: fillCapColor, transition }}
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
                {label}
            </div>
        </button>
    )
}