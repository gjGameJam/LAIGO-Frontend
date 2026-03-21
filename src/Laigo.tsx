import { useState, useEffect } from "react"
import { ParameterForm, FormValues } from "./parameter-form"
import { OutputPanel } from "./output-panel"
import { health } from "./api"
import { LaigoTitle } from "./LaigoTitle"

export default function Laigo() {
    const [apiStatus, setApiStatus] = useState("checking...")
    const [values, setValues] = useState<FormValues>({
        file: null,
        intValue: 4,
        mosaicType: "3d",
        floatValue: 100,
        boolValue: true,
    })
    const [inputPreview, setInputPreview] = useState<string | null>(null)
    const [jobId, setJobId] = useState<string | null>(null)

    useEffect(() => {
        health()
            .then(() => setApiStatus("online"))
            .catch(() => setApiStatus("offline"))
    }, [])

    const studHeight = 11
    const studWidth = 20
    const ovalHeight = 7
    const studTopOffset = -15
    const ovalOffset = -4
    const studBodyColor = "#00b32c"
    const studOvalColor = "#00d94a"

    return (
        <main
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem"
            }}
        >
            {/* ── Title ── */}
            <LaigoTitle status={apiStatus} />

            <div
                style={{
                    display: "flex",
                    gap: "1rem",
                    width: "100%",
                    maxWidth: "1200px",
                    alignItems: "stretch"
                }}
            >
                {/* Input */}
                <section className="parameter-frame">
                    <div className="corner-bottom-left"></div>
                    <div className="corner-bottom-right"></div>

                    <h2 className="section-title">Input</h2>
                    <ParameterForm
                        values={values}
                        onChange={setValues}
                        preview={inputPreview}
                        onPreviewChange={setInputPreview}
                        onJobCreated={(id) => setJobId(id)}
                    />
                </section>

                {/* Output */}
                <section className="output-wall" style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
                    <h2 className="section-title">Output</h2>

                    {/* Black separation line between top cap and body */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '1px',
                        backgroundColor: '#000',
                        zIndex: 3
                    }} />

                    {/* Studs */}
                    <div className="output-wall-studs" style={{ top: `${studTopOffset}px`, zIndex: 2 }}>
                        {[...Array(26)].map((_, i) => (
                            <div key={i} className="relative output-stud">
                                {/* Stud body */}
                                <div
                                    className="border-2 border-black shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                                    style={{
                                        width: `${studWidth}px`,
                                        height: `${studHeight}px`,
                                        backgroundColor: studBodyColor
                                    }}
                                />
                                {/* Stud top oval */}
                                <div
                                    className="absolute left-0 rounded-full border-black border-2 z-10"
                                    style={{
                                        width: `${studWidth}px`,
                                        height: `${ovalHeight}px`,
                                        top: `${(studHeight - ovalHeight) / 2 + ovalOffset}px`,
                                        backgroundColor: studOvalColor
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <OutputPanel jobId={jobId ?? undefined} />
                    </div>
                </section>
            </div>
        </main>
    )
}