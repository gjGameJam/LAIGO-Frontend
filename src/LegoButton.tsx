interface LegoButtonProps {
    status: "idle" | "running" | "complete" | "failed";
    onClick: () => void;
    disabled?: boolean; // optional extra disabling
    label?: string;
    icon?: React.ReactNode;
    studCount?: number;
}

export function LegoButton({
    status,
    onClick,
    disabled,
    label = "Download",
    icon,
    studCount = 6,
}: LegoButtonProps) {
    const studHeight = 11;
    const studWidth = 20;
    const ovalHeight = 7;
    const topCapHeight = 13;       // taller top strip
    const studTopOffset = -2;      // studs slightly lower
    const ovalOffset = -4;         // move ovals up (negative = up)
    const textOffset = 6;          // move text lower
    const borderLineColor = "#000000"; // black separation line

    // Determine colors based on status
    let buttonBodyColor: string;
    let buttonTopColor: string;
    let buttonLabel: string;

    switch (status) {
        case "complete":
            buttonBodyColor = "#009624"; // dark green
            buttonTopColor = "#00c038";  // light green
            buttonLabel = label;
            break;
        case "failed":
            buttonBodyColor = "#d00000";
            buttonTopColor = "#ff4d4d";
            buttonLabel = "Failed";
            break;
        default:
            buttonBodyColor = "#b0b0b0"; // grey
            buttonTopColor = "#d0d0d0";
            buttonLabel = label;
            break;
    }

    // Only allow click if job is complete and not additionally disabled
    const isClickable = status === "complete" && !disabled;

    return (
        <button
            disabled={!isClickable}
            onClick={onClick}
            className={`relative w-[220px] h-[48px] border-2 border-black flex items-center justify-center
                        shadow-[inset_0_4px_0_rgba(0,0,0,0.2)]
                        disabled:opacity-60 disabled:cursor-not-allowed rounded-none`}
        >
            {/* Top cap */}
            <div
                className="absolute top-0 left-0 w-full"
                style={{ height: `${topCapHeight}px`, backgroundColor: buttonTopColor }}
            />

            {/* Thin black separation line */}
            <div
                className="absolute left-0 w-full"
                style={{
                    top: `${topCapHeight - 1}px`,
                    height: "1px",
                    backgroundColor: borderLineColor,
                    zIndex: 15,
                }}
            />

            {/* Button body */}
            <div
                className="absolute left-0 w-full bottom-0"
                style={{
                    top: `${topCapHeight}px`,
                    backgroundColor: buttonBodyColor,
                }}
            />

            {/* Studs */}
            <div
                className="absolute flex justify-between w-[94%] px-2"
                style={{ top: `${studTopOffset}px` }}
            >
                {[...Array(studCount)].map((_, i) => (
                    <div key={i} className="relative">
                        {/* Stud body */}
                        <div
                            className="border-2 border-black shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                            style={{ width: `${studWidth}px`, height: `${studHeight}px`, backgroundColor: buttonBodyColor }}
                        />
                        {/* Stud top oval */}
                        <div
                            className="absolute left-0 w-[20px] rounded-full border-black border-2 z-10"
                            style={{
                                height: `${ovalHeight}px`,
                                top: `${(studHeight - ovalHeight) / 2 + ovalOffset}px`,
                                backgroundColor: buttonTopColor,
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Label + icon */}
            <div
                className="flex items-center gap-2 z-20 text-white font-semibold"
                style={{ transform: `translateY(${textOffset}px)` }}
            >
                {icon && icon}
                {buttonLabel}
            </div>
        </button>
    );
}