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
                <section className="output-wall" style={{ flex: 1 }}>
                    <h2 className="section-title" style={{ marginTop: '1.55rem' }}>Output</h2>

                    <div className="output-wall-studs">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="relative output-stud">
                                <div
                                    className="border-2 border-black shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                                    style={{ width: '20px', height: '11px', backgroundColor: '#b0b0b0' }}
                                />
                                <div
                                    className="absolute left-0 w-[20px] rounded-full border-black border-2 z-10"
                                    style={{
                                        height: '7px',
                                        top: `${(11 - 7) / 2 - 4}px`,
                                        backgroundColor: '#d0d0d0',
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