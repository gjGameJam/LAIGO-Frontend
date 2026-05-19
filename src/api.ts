/**
 * LAIGO backend API client.
 *
 * All console logging is gated on `import.meta.env.DEV` so production
 * builds don't leak the resolved API URL, FormData entries, or response
 * payloads to the browser console.
 */

const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

const DEV = import.meta.env.DEV

function log(...args: unknown[]) {
    if (DEV) console.log(...args)
}

function errLog(...args: unknown[]) {
    if (DEV) console.error(...args)
}

log('Resolved API:', API)

export type JobStatusValue = 'queued' | 'running' | 'complete' | 'failed'

export interface HealthResponse {
    [key: string]: unknown
}

export interface SubmitJobResponse {
    job_id: string
}

export interface JobResponse {
    status: JobStatusValue
    progress?: number
    queue_position?: number | null
    preview_url?: string | null
    error?: string | null
}

export interface BuildFormDataInput {
    file: File
    intValue: number
    mosaicType: '2d' | '3d'
    floatValue: number
    boolValue: boolean
}

/**
 * Read a response body as JSON if possible, falling back to plain text.
 * Used to extract a useful message for failed requests without exposing
 * raw HTML error pages to the user.
 */
async function readErrorMessage(res: Response, fallback: string): Promise<string> {
    const text = await res.text().catch(() => '')
    if (!text) return fallback
    try {
        const parsed = JSON.parse(text) as { detail?: string; error?: string; message?: string }
        return parsed.detail ?? parsed.error ?? parsed.message ?? fallback
    } catch {
        // Plain-text or HTML — truncate to keep error messages user-friendly.
        return text.length > 240 ? text.slice(0, 240) + '…' : text
    }
}

export async function health(signal?: AbortSignal): Promise<HealthResponse> {
    log('GET →', `${API}/health`)
    const res = await fetch(`${API}/health`, { signal })
    if (!res.ok) {
        const message = await readErrorMessage(res, 'API not reachable')
        errLog('Health check failed:', res.status, message)
        throw new Error('API not reachable')
    }
    const data = (await res.json()) as HealthResponse
    log('Health response:', data)
    return data
}

export async function submitJob(formData: FormData, signal?: AbortSignal): Promise<SubmitJobResponse> {
    log('POST →', `${API}/generate`)
    if (DEV) {
        for (const [key, value] of formData.entries()) {
            log('FormData:', key, value)
        }
    }
    const res = await fetch(`${API}/generate`, {
        method: 'POST',
        body: formData,
        signal,
    })
    if (!res.ok) {
        const message = await readErrorMessage(res, 'Job submission failed')
        errLog('Generate failed:', res.status, message)
        throw new Error(message)
    }
    const data = (await res.json()) as SubmitJobResponse
    log('Generate response:', data)
    return data
}

export async function getJob(jobId: string, signal?: AbortSignal): Promise<JobResponse> {
    log('GET →', `${API}/jobs/${jobId}`)
    const res = await fetch(`${API}/jobs/${jobId}`, { signal })
    if (!res.ok) {
        const message = await readErrorMessage(res, 'Job lookup failed')
        errLog('Job lookup failed:', res.status, message)
        throw new Error(message)
    }
    const data = (await res.json()) as JobResponse
    log('Job status response:', data)
    return data
}

export function getDownloadUrl(jobId: string): string {
    return `${API}/jobs/${jobId}/download`
}

export function buildFormData(values: BuildFormDataInput): FormData {
    if (!values.file) throw new Error('No file selected')

    const formData = new FormData()
    formData.append('file', values.file)
    formData.append('mosaic_block_width', String(values.intValue))
    formData.append('mosaic_type', values.mosaicType)
    formData.append('background_color_percent', String(values.floatValue))
    formData.append('to_frame', values.boolValue ? 'true' : 'false')
    log('FormData built successfully')
    return formData
}
