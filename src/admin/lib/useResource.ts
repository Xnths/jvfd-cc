'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorMessage } from './adminFetch'

/** Minimal GET-with-reload hook for admin lists. `path` null skips the request. */
export function useResource<T>(path: string | null) {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(path !== null)
    const seq = useRef(0)

    const load = useCallback(async () => {
        if (path === null) return
        const mine = ++seq.current
        setLoading(true)
        try {
            const d = await api<T>(path)
            if (mine === seq.current) {
                setData(d)
                setError(null)
            }
        } catch (e) {
            if (mine === seq.current) setError(errorMessage(e))
        } finally {
            if (mine === seq.current) setLoading(false)
        }
    }, [path])

    useEffect(() => {
        void load()
    }, [load])

    return { data, error, loading, reload: load, setData }
}
