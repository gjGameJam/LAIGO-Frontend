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

export interface PreviewPalette {
    hex: string
    element_id: number | null
}

export interface PreviewFrame {
    thickness_studs: number
    height_plates: number
    palette_index: number
}

export interface PreviewData {
    schema_version: number
    job_id: string
    mosaic_type: '2d' | '3d'
    width_studs: number
    height_studs: number
    block_width: number
    block_height: number
    has_frame: boolean
    foreground_lift_plates: number
    frame: PreviewFrame
    palette: PreviewPalette[]
    background_grid: number[][]
    /** Present only when mosaic_type === '3d'. -1 sentinel = no foreground at this cell. */
    foreground_grid?: number[][]
}

/** Highest schema_version this frontend knows how to render. */
export const SUPPORTED_PREVIEW_SCHEMA = 1

export type PreviewErrorCode =
    | 'PREVIEW_NOT_AVAILABLE'
    | 'PREVIEW_CORRUPTED'
    | 'PREVIEW_SCHEMA_TOO_NEW'
    | 'PREVIEW_UNKNOWN'

export class PreviewError extends Error {
    code: PreviewErrorCode
    constructor(code: PreviewErrorCode, message: string) {
        super(message)
        this.name = 'PreviewError'
        this.code = code
    }
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
        const parsed = JSON.parse(text) as { detail?: unknown; error?: string; message?: string }
        // Modern backend contract is `{detail: {error, code}}`; legacy is `{detail: string}`.
        if (parsed.detail && typeof parsed.detail === 'object') {
            const d = parsed.detail as { error?: string }
            return d.error ?? fallback
        }
        if (typeof parsed.detail === 'string') return parsed.detail
        return parsed.error ?? parsed.message ?? fallback
    } catch {
        // Plain-text or HTML — truncate to keep error messages user-friendly.
        return text.length > 240 ? text.slice(0, 240) + '…' : text
    }
}

/**
 * Pull a structured error code out of `{detail: {error, code}}` bodies.
 * Returns null when the response doesn't use the modern contract.
 */
async function readErrorCode(res: Response): Promise<string | null> {
    const text = await res.clone().text().catch(() => '')
    if (!text) return null
    try {
        const parsed = JSON.parse(text) as { detail?: { code?: string } }
        return parsed.detail?.code ?? null
    } catch {
        return null
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

export function getPreviewUrl(jobId: string): string {
    return `${API}/jobs/${jobId}/preview`
}

export async function getPreview(jobId: string, signal?: AbortSignal): Promise<PreviewData> {
    log('GET →', `${API}/jobs/${jobId}/preview`)
    const res = await fetch(`${API}/jobs/${jobId}/preview`, { signal })
    if (!res.ok) {
        // Switch on detail.code rather than the error string (the backend
        // may reword the message). Unknown codes fall back to PREVIEW_UNKNOWN.
        const code = await readErrorCode(res)
        const message = await readErrorMessage(res, 'Preview unavailable')
        errLog('Preview fetch failed:', res.status, code, message)
        if (code === 'PREVIEW_NOT_AVAILABLE') {
            throw new PreviewError('PREVIEW_NOT_AVAILABLE', message)
        }
        if (code === 'PREVIEW_CORRUPTED') {
            throw new PreviewError('PREVIEW_CORRUPTED', message)
        }
        throw new PreviewError('PREVIEW_UNKNOWN', message)
    }
    const data = (await res.json()) as PreviewData
    log('Preview response: schema', data.schema_version, `${data.width_studs}x${data.height_studs}`)
    if (data.schema_version > SUPPORTED_PREVIEW_SCHEMA) {
        throw new PreviewError(
            'PREVIEW_SCHEMA_TOO_NEW',
            `Preview schema ${data.schema_version} is newer than this build (supports ${SUPPORTED_PREVIEW_SCHEMA}). Please refresh.`,
        )
    }
    return data
}

// ── Job stats ────────────────────────────────────────────────────────────────
// GET /jobs/:jobId/stats — authoritative piece count for the completed set
// (mosaic + frame + baseplate, matching the ZIP build pack) plus an optional
// shipping-free cost estimate. estimated_cost_cents is null while backend
// pricing is unfinished. A 404 (older backend deployments) is treated as
// "stats unavailable" (stats chip hidden). Lives under /jobs/:id (not
// /checkout/) so the piece count works even when the checkout gate is
// disabled.

export interface JobStats {
    /** Total physical pieces in the set, frame included. */
    piece_count: number
    /** Rough cost in minor units of `currency`; null until pricing is implemented. */
    estimated_cost_cents: number | null
    /** ISO-4217 code. Defaults to USD at the display site (formatCents). */
    currency?: string
    /** Date (YYYY-MM-DD) the backend's pricing data was last refreshed. */
    pricing_as_of?: string
}

export type JobStatsErrorCode = 'STATS_NOT_AVAILABLE' | 'STATS_UNKNOWN'

export class JobStatsError extends Error {
    code: JobStatsErrorCode
    status: number
    constructor(code: JobStatsErrorCode, status: number, message: string) {
        super(message)
        this.name = 'JobStatsError'
        this.code = code
        this.status = status
    }
}

export async function getJobStats(jobId: string, signal?: AbortSignal): Promise<JobStats> {
    log('GET →', `${API}/jobs/${jobId}/stats`)
    const res = await fetch(`${API}/jobs/${jobId}/stats`, { signal })
    if (res.status === 404) {
        // Expected state while the backend endpoint is unimplemented —
        // deliberately not logged so it doesn't spam the console every job.
        throw new JobStatsError('STATS_NOT_AVAILABLE', 404, 'Stats not available')
    }
    if (!res.ok) {
        const message = await readErrorMessage(res, 'Stats unavailable')
        errLog('Stats fetch failed:', res.status, message)
        throw new JobStatsError('STATS_UNKNOWN', res.status, message)
    }
    const data = (await res.json()) as Partial<JobStats>
    log('Stats response:', data)
    // Validate rather than trust the cast — a shape drift must degrade to
    // "stats unavailable" (chip hidden), never render undefined or crash.
    if (typeof data.piece_count !== 'number' || !Number.isFinite(data.piece_count)) {
        errLog('Stats response malformed (piece_count missing):', data)
        throw new JobStatsError('STATS_UNKNOWN', res.status, 'Malformed stats response')
    }
    return {
        piece_count: data.piece_count,
        estimated_cost_cents:
            typeof data.estimated_cost_cents === 'number' ? data.estimated_cost_cents : null,
        currency: typeof data.currency === 'string' ? data.currency : undefined,
        pricing_as_of: typeof data.pricing_as_of === 'string' ? data.pricing_as_of : undefined,
    }
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
