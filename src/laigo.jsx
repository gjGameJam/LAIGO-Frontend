import { useState, useEffect, useCallback } from "react";
// import your components and api helpers here
import { ParameterForm } from "./parameter-form";
import { OutputPanel } from "./output-panel";
import { submitJob, health } from "./api";

export default function Laigo() {
    // --- API status ---
    const [apiStatus, setApiStatus] = useState("checking...");
    useEffect(() => {
        health()
            .then(() => setApiStatus("online"))
            .catch(() => setApiStatus("offline"));
    }, []);

    // --- Form / processing state ---
    const [values, setValues] = useState({
        file: null,
        intValue: 20,
        mosaicType: "3d",
        floatValue: 100.0,
        boolValue: true,
    });
    const [inputPreview, setInputPreview] = useState(null);
    const [outputImage, setOutputImage] = useState(null);
    const [outputFilename, setOutputFilename] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = useCallback(async () => {
        if (!values.file || !inputPreview) return;

        setIsProcessing(true);
        setOutputImage(null);
        setOutputFilename(null);

        try {
            const formData = new FormData();
            formData.append("file", values.file);
            formData.append("mosaic_block_width", values.intValue.toString());
            formData.append("mosaic_type", values.mosaicType);
            formData.append("background_color_percent", values.floatValue.toString());
            formData.append("to_frame", values.boolValue.toString());

            const job = await submitJob(formData); // call your backend POST /generate
            const downloadUrl = `/jobs/${job.job_id}/download`; // or use full API URL
            setOutputImage(downloadUrl);
            setOutputFilename(`${values.file.name.replace(/\.[^.]+$/, "")}_converted.zip`);
        } catch (err) {
            console.error("Job submission failed:", err);
        } finally {
            setIsProcessing(false);
        }
    }, [values, inputPreview]);

    return (
        <main
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: "1rem",
                fontFamily: "sans-serif",
                minHeight: "100vh",
                padding: "1rem",
                backgroundColor: "#f4f4f4",
            }}
        >
            {/* Title with API status */}
            <h1 style={{ fontSize: "2rem", textAlign: "center" }}>
                LAIGO: {apiStatus.toUpperCase()}
            </h1>

            {/* Input / Output Panels */}
            <div style={{ display: "flex", gap: "1rem", width: "100%", maxWidth: "1200px" }}>
                {/* Left: Input Panel */}
                <section
                    style={{
                        flexShrink: 0,
                        flexBasis: "300px",
                        display: "flex",
                        flexDirection: "column",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                        padding: "1rem",
                        overflowY: "auto",
                    }}
                >
                    <h2>Input</h2>
                    {/* ParameterForm should handle file input, sliders, checkboxes, etc. */}
                    <ParameterForm
                        values={values}
                        onChange={setValues}
                        preview={inputPreview}
                        onPreviewChange={setInputPreview}
                        onSubmit={handleSubmit}
                    />
                </section>

                {/* Right: Output Panel */}
                <section
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        backgroundColor: "#fff",
                        padding: "1rem",
                        overflowY: "auto",
                    }}
                >
                    <h2>Output</h2>
                    <OutputPanel
                        outputImage={outputImage}
                        outputFilename={outputFilename}
                        isProcessing={isProcessing}
                    />
                </section>
            </div>
        </main>
    );
}