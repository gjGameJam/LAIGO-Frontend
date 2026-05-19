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
        mosaicType: "2d",
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
            <main className="laigo-main">
                {/* ── Title ── */}
                <LaigoTitle status={apiStatus} />

                <div ref={panelContainerRef} className="laigo-panels">

                    {/* Input */}
                    <section className="parameter-frame">
                        <div className="panel-sep-line" />

                        {/* Input studs */}
                        <div className="input-stud-row">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="relative">
                                    <div
                                        className="border-2 border-black shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                                        style={{ width: '20px', height: '11px', backgroundColor: '#1C3F6E' }}
                                    />
                                    <div
                                        className="absolute left-0 rounded-full border-black border-2"
                                        style={{ width: '20px', height: '7px', top: '-2px', backgroundColor: '#2A5298' }}
                                    />
                                </div>
                            ))}
                        </div>

                        <h2 className="section-title">Input</h2>
                        <div className="flex-col-fill">
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
                    <section className="output-wall output-wall-section">
                        <h2 className="section-title">Output</h2>

                        <div className="panel-sep-line" />

                        {/* Studs */}
                        <div className="output-wall-studs" style={{ top: `${studTopOffset}px`, zIndex: 2 }}>
                            {[...Array(26)].map((_, i) => (
                                <div key={i} className="relative output-stud">
                                    <div
                                        className="border-2 border-black shadow-[inset_0_1px_0_rgba(0,0,0,0.2)]"
                                        style={{ width: `${studWidth}px`, height: `${studHeight}px`, backgroundColor: studBodyColor }}
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

                        <div className="flex-col-fill">
                            <OutputPanel jobId={jobId ?? undefined} />
                        </div>
                    </section>
                </div>

                {/* Disclaimer */}
                <p className="laigo-disclaimer">
                    LAIGO is an independent fan project and is not affiliated with, endorsed by, or sponsored by the LEGO Group. LEGO is a trademark of the LEGO Group.
                </p>
            </main>
        </>
    )
}