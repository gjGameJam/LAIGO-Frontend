// api.js

const API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

console.log("Resolved API:", API);

//
// --- Health Check ---
//
export async function health() {
    console.log("GET →", `${API}/health`);

    const res = await fetch(`${API}/health`);

    if (!res.ok) {
        const text = await res.text();
        console.error("Health check failed:", res.status, text);
        throw new Error("API not reachable");
    }

    const data = await res.json();
    console.log("Health response:", data);

    return data;
}

//
// --- Submit Mosaic Job ---
//
export async function submitJob(formData) {
    console.log("POST →", `${API}/generate`);

    // Log FormData contents explicitly
    for (const [key, value] of formData.entries()) {
        console.log("FormData:", key, value);
    }

    const res = await fetch(`${API}/generate`, {
        method: "POST",
        body: formData, // DO NOT manually set Content-Type
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("Generate failed:", res.status, text);
        throw new Error(text || "Job submission failed");
    }

    const data = await res.json();
    console.log("Generate response:", data);

    return data; // { job_id }
}

//
// --- Poll Job Status ---
//
export async function getJob(jobId) {
    console.log("GET →", `${API}/jobs/${jobId}`);

    const res = await fetch(`${API}/jobs/${jobId}`);

    if (!res.ok) {
        const text = await res.text();
        console.error("Job lookup failed:", res.status, text);
        throw new Error(text || "Job lookup failed");
    }

    const data = await res.json();
    console.log("Job status response:", data);

    return data;
}

//
// --- Download URL ---
//
export function getDownloadUrl(jobId) {
    const url = `${API}/jobs/${jobId}/download`;
    console.log("Download URL:", url);
    return url;
}

//
// --- Build FormData ---
//
export function buildFormData(values) {
    if (!values.file) {
        throw new Error("No file selected");
    }

    const formData = new FormData();

    formData.append("file", values.file);

    formData.append(
        "mosaic_block_width",
        String(values.intValue)
    );

    formData.append(
        "mosaic_type",
        values.mosaicType
    );

    formData.append(
        "background_color_percent",
        String(values.floatValue)
    );

    formData.append(
        "to_frame",
        values.boolValue ? "true" : "false"
    );

    console.log("FormData built successfully");

    return formData;
}