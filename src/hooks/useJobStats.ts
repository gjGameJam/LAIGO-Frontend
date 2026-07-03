import { useEffect, useReducer } from 'react'
import { getJobStats, type JobStats } from '../api'

export type JobStatsStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

export interface JobStatsState {
    status: JobStatsStatus
    stats: JobStats | null
}

const IDLE: JobStatsState = { status: 'idle', stats: null }

type Action =
    | { type: 'reset' }
    | { type: 'loading' }
    | { type: 'ready'; stats: JobStats }
    | { type: 'unavailable' }

function reducer(state: JobStatsState, action: Action): JobStatsState {
    switch (action.type) {
        case 'reset':
            return IDLE
        case 'loading':
            return { status: 'loading', stats: null }
        case 'ready':
            return { status: 'ready', stats: action.stats }
        case 'unavailable':
            return { status: 'unavailable', stats: null }
        default:
            return state
    }
}

/**
 * One-shot fetch of /jobs/:id/stats while jobId is set. No polling — stats
 * are static once a job completes. Any failure (including the 404 the
 * backend returns until the endpoint exists) resolves to 'unavailable';
 * consumers hide the stats UI rather than show an approximate number.
 *
 * Cleanup: aborts the in-flight fetch on jobId change and unmount, so a
 * stale response can never overwrite state for a newer job.
 */
export function useJobStats(jobId: string | null): JobStatsState {
    const [state, dispatch] = useReducer(reducer, IDLE)

    useEffect(() => {
        if (!jobId) {
            dispatch({ type: 'reset' })
            return
        }

        const controller = new AbortController()
        let cancelled = false

        dispatch({ type: 'loading' })
        getJobStats(jobId, controller.signal)
            .then((stats) => {
                if (!cancelled) dispatch({ type: 'ready', stats })
            })
            .catch(() => {
                if (cancelled || controller.signal.aborted) return
                dispatch({ type: 'unavailable' })
            })

        return () => {
            cancelled = true
            controller.abort()
        }
    }, [jobId])

    return state
}
