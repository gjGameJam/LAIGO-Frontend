import { useState, useEffect } from "react"
import { ParameterForm, FormValues } from "./parameter-form"
import { OutputPanel } from "./output-panel"
import { health } from "./api"

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

    // Lighter green — matches output-wall CSS colors
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
            <h1 className="laigo-title">LAIGO: {apiStatus.toUpperCase()}</h1>

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
                <section className="output-wall" style={{ flex: 1, position: 'relative' }}>
                    <h2 className="section-title" style={{ marginTop: '2.55rem' }}>Output</h2>

                    {/* Top strip */}
                    <div className="output-wall-top" />

                    {/* Studs */}
                    <div className="output-wall-studs">
                        {[...Array(26)].map((_, i) => (
                            <div key={i} className="relative output-stud">

                                {/* Stud body */}
                                <div
                                    className="border-2 border-black shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                                    style={{
                                        width: "20px",
                                        height: "11px",
                                        backgroundColor: studBodyColor
                                    }}
                                />

                                {/* Stud top oval */}
                                <div
                                    className="absolute left-0 w-[20px] rounded-full border-black border-2 z-10"
                                    style={{
                                        height: "7px",
                                        top: `${(11 - 7) / 2 - 4}px`,
                                        backgroundColor: studOvalColor
                                    }}
                                />

                            </div>
                        ))}
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingTop: '1rem' }}>
                        <OutputPanel jobId={jobId ?? undefined} />
                    </div>
                </section>
            </div>
        </main>
    )
}