import { useEffect, useReducer } from 'react'
import {
    getDownloadUrl,
    getJob,
    getPreview,
    PreviewError,
    type JobStatusValue,
    type PreviewData,
    type PreviewErrorCode,
} from '../api'

export type JobStatus = 'idle' | JobStatusValue

export interface JobState {
    status: JobStatus
    progress: number
    queuePosition: number | null
    downloadUrl: string | null
    previewUrl: string | null
    previewData: PreviewData | null
    /** Set when preview fetch fails for a reason worth surfacing (corrupted file,
     *  schema mismatch). PREVIEW_NOT_AVAILABLE stays null since the placeholder
     *  cube is the appropriate fallback. */
    previewError: { code: PreviewErrorCode; message: string } | null
    error: string | null
}

const IDLE: JobState = {
    status: 'idle',
    progress: 0,
    queuePosition: null,
    downloadUrl: null,
    previewUrl: null,
    previewData: null,
    previewError: null,
    error: null,
}

type Action =
    | { type: 'reset' }
    | { type: 'queued'; queuePosition: number | null }
    | { type: 'running'; progress: number }
    | { type: 'complete'; downloadUrl: string; previewUrl: string | null }
    | { type: 'previewLoaded'; data: PreviewData }
    | { type: 'previewError'; code: PreviewErrorCode; message: string }
    | { type: 'failed'; error: string }

function reducer(state: JobState, action: Action): JobState {
    switch (action.type) {
        case 'reset':
            return IDLE
        case 'queued':
            // Full reset to queued — clears any progress/preview/download
            // carried over from a previous job at the same hook instance.
            return { ...IDLE, status: 'queued', queuePosition: action.queuePosition }
        case 'running':
            return {
                ...state,
                status: 'running',
                queuePosition: null,
                progress: Math.max(0, Math.min(100, action.progress)),
                error: null,
            }
        case 'complete':
            return {
                ...state,
                status: 'complete',
                queuePosition: null,
                progress: 100,
                downloadUrl: action.downloadUrl,
                previewUrl: action.previewUrl,
                error: null,
            }
        case 'previewLoaded':
            return { ...state, previewData: action.data, previewError: null }
        case 'previewError':
            return { ...state, previewError: { code: action.code, message: action.message } }
        case 'failed':
            return { ...state, status: 'failed', queuePosition: null, progress: 0, error: action.error }
        default:
            return state
    }
}

const POLL_INTERVAL_MS = 800

/**
 * Subscribes to /jobs/:id while jobId is set, exposing a derived JobState.
 * Single owner of polling — replaces the previous two-poller setup that had
 * ParameterForm and OutputPanel both hitting the backend.
 *
 * Cleanup: aborts the in-flight fetch and clears the next-poll timer on
 * jobId change and unmount, so stale responses can never overwrite state
 * for a newer job.
 */
export function useJob(jobId: string | null): JobState {
    const [state, dispatch] = useReducer(reducer, IDLE)

    useEffect(() => {
        if (!jobId) {
            dispatch({ type: 'reset' })
            return
        }

        const controller = new AbortController()
        let timer: number | null = null
        let cancelled = false

        // Optimistic: show queued immediately so the UI doesn't sit on idle
        // for the round-trip of the first poll.
        dispatch({ type: 'queued', queuePosition: null })

        const poll = async () => {
            if (cancelled) return
            try {
                const job = await getJob(jobId, controller.signal)
                if (cancelled) return

                if (job.status === 'queued') {
                    dispatch({ type: 'queued', queuePosition: job.queue_position ?? null })
                } else if (job.status === 'running') {
                    dispatch({ type: 'running', progress: job.progress ?? 0 })
                } else if (job.status === 'complete') {
                    dispatch({
                        type: 'complete',
                        downloadUrl: getDownloadUrl(jobId),
                        previewUrl: job.preview_url ?? null,
                    })
                    // Fire-and-forget preview fetch. The download still works
                    // regardless of how this resolves:
                    //   PREVIEW_NOT_AVAILABLE → silent (placeholder cube stays)
                    //   PREVIEW_CORRUPTED / schema mismatch → surface in UI
                    getPreview(jobId, controller.signal)
                        .then((data) => {
                            if (!cancelled) dispatch({ type: 'previewLoaded', data })
                        })
                        .catch((err) => {
                            if (cancelled || controller.signal.aborted) return
                            if (err instanceof PreviewError && err.code === 'PREVIEW_NOT_AVAILABLE') {
                                return
                            }
                            const code =
                                err instanceof PreviewError ? err.code : 'PREVIEW_UNKNOWN'
                            const message =
                                err instanceof Error ? err.message : 'Preview unavailable'
                            dispatch({ type: 'previewError', code, message })
                        })
                    return
                } else if (job.status === 'failed') {
                    dispatch({ type: 'failed', error: job.error ?? 'Job failed' })
                    return
                }

                timer = window.setTimeout(poll, POLL_INTERVAL_MS)
            } catch (err) {
                if (cancelled || controller.signal.aborted) return
                const message = err instanceof Error ? err.message : 'Job lookup failed'
                dispatch({ type: 'failed', error: message })
            }
        }

        poll()

        return () => {
            cancelled = true
            controller.abort()
            if (timer) clearTimeout(timer)
        }
    }, [jobId])

    return state
}
