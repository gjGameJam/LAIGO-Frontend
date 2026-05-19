import { useEffect, useState, useCallback } from 'react'

export function useDarkMode(): [boolean, () => void] {
    const [dark, setDark] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false
        const stored = localStorage.getItem('theme')
        if (stored === 'dark') return true
        if (stored === 'light') return false
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })

    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark)
    }, [dark])

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem('theme')) setDark(e.matches)
        }
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])

    const toggle = useCallback(() => {
        setDark((d) => {
            const next = !d
            localStorage.setItem('theme', next ? 'dark' : 'light')
            return next
        })
    }, [])

    return [dark, toggle]
}
