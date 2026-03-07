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
                <section
                    style={{
                        flexShrink: 0,
                        flexBasis: "300px",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "1rem",
                        backgroundColor: "#fff"
                    }}
                >
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
                <section
                    style={{
                        flex: 1,
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "1rem",
                        backgroundColor: "#fff",
                        display: "flex",
                        flexDirection: "column"
                    }}
                >
                    <h2 className="section-title">Output</h2>

                    <div style={{ flex: 1 }}>
                        <OutputPanel jobId={jobId ?? undefined} />
                    </div>
                </section>
            </div>
        </main>
    )
}