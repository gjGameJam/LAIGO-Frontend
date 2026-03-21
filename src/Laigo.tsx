import { useState, useEffect, useRef } from "react"
import { ParameterForm, FormValues } from "./parameter-form"
import { OutputPanel } from "./output-panel"
import { health } from "./api"
import { LaigoTitle } from "./LaigoTitle"
import { LegoBrickCanvas } from "./LaigoBrickCanvas"

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
    const [panelBounds, setPanelBounds] = useState({ left: 0, right: window.innerWidth })
    const panelContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        health()
            .then(() => setApiStatus("online"))
            .catch(() => setApiStatus("offline"))
    }, [])

    // Measure panel container on mount and resize
    useEffect(() => {
        const measure = () => {
            if (panelContainerRef.current) {
                const rect = panelContainerRef.current.getBoundingClientRect()
                setPanelBounds({ left: rect.left, right: rect.right })
            }
        }
        measure()
        window.addEventListener("resize", measure)
        return () => window.removeEventListener("resize", measure)
    }, [])

    const studHeight = 11
    const studWidth = 20
    const ovalHeight = 7
    const studTopOffset = -15
    const ovalOffset = -4
    const studBodyColor = "#007A1F"
    const studOvalColor = "#00A32A"

    return (
        <>
            <LegoBrickCanvas panelLeft={panelBounds.left} panelRight={panelBounds.right} />
            <main
                style={{
                    position: "relative",
                    zIndex: 1,
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
                    ref={panelContainerRef}
                    style={{
                        display: "flex",
                        gap: "1rem",
                        width: "100%",
                        maxWidth: "1200px",
                        alignItems: "stretch"
                    }}
                >
                    {/* Input */}
                    <section className="parameter-frame" style={{ display: "flex", flexDirection: "column", paddingTop: "0.4rem", paddingBottom: "0.5rem" }}>
                        {/* Black separation line */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '1px',
                            backgroundColor: '#000',
                            zIndex: 3
                        }} />

                        {/* Input studs — dark blue matching frame */}
                        <div style={{
                            position: 'absolute',
                            top: '-15px',
                            left: '8px',
                            right: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            zIndex: 2,
                            pointerEvents: 'none'
                        }}>
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="relative">
                                    <div
                                        className="border-2 border-black shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                                        style={{ width: '20px', height: '11px', backgroundColor: '#1C3F6E' }}
                                    />
                                    <div
                                        className="absolute left-0 rounded-full border-black border-2"
                                        style={{
                                            width: '20px',
                                            height: '7px',
                                            top: '-2px',
                                            backgroundColor: '#2A5298'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        <h2 className="section-title">Input</h2>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <ParameterForm
                                values={values}
                                onChange={setValues}
                                preview={inputPreview}
                                onPreviewChange={setInputPreview}
                                onJobCreated={(id) => setJobId(id)}
                            />
                        </div>
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
                                    <div
                                        className="border-2 border-black shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                                        style={{
                                            width: `${studWidth}px`,
                                            height: `${studHeight}px`,
                                            backgroundColor: studBodyColor
                                        }}
                                    />
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
        </>
    )
}