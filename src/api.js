const API = import.meta.env.VITE_API_URL;

// --- Health Check ---
export async function health() {
    const res = await fetch(`${API}/health`);
    if (!res.ok) throw new Error("API not reachable");
    return res.json();
}

// --- Submit Mosaic Job ---
export async function submitJob(formData) {
    const res = await fetch(`${API}/generate`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) throw new Error("Job submission failed");
    return res.json(); // { job_id }
}

// --- Poll Job Status ---
export async function getJob(jobId) {
    const res = await fetch(`${API}/jobs/${jobId}`);
    if (!res.ok) throw new Error("Job lookup failed");
    return res.json();
}

// --- Download URL Helper ---
export function getDownloadUrl(jobId) {
    return `${API}/jobs/${jobId}/download`;
}