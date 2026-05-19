import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'theme'

/**
 * localStorage is not always available — Safari private mode and corporate
 * policy can throw on access. We always wrap in try/catch and fall through
 * to in-memory state so the toggle still works for the session.
 */
function readStored(): 'dark' | 'light' | null {
    try {
        const v = localStorage.getItem(STORAGE_KEY)
        if (v === 'dark' || v === 'light') return v
    } catch {
        // localStorage blocked — fall through to system preference
    }
    return null
}

function writeStored(value: 'dark' | 'light') {
    try {
        localStorage.setItem(STORAGE_KEY, value)
    } catch {
        // Storage quota / privacy block — toggle still applies in-memory
    }
}

function hasStoredPref(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== null
    } catch {
        return false
    }
}

export function useDarkMode(): [boolean, () => void] {
    const [dark, setDark] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false
        const stored = readStored()
        if (stored !== null) return stored === 'dark'
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark)
    }, [dark])

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = (e: MediaQueryListEvent) => {
            if (!hasStoredPref()) setDark(e.matches)
        }
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    const toggle = useCallback(() => {
        setDark((d) => {
            const next = !d
            writeStored(next ? 'dark' : 'light')
            return next
        })
    }, [])

    return [dark, toggle]
}
