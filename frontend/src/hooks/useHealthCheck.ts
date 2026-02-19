/**
 * Polls the gateway health endpoint every 5 seconds.
 *
 * @returns { isHealthy: boolean; isLoading: boolean }
 *
 * @example
 * const { isHealthy, isLoading } = useHealthCheck()
 */

"use client"

import { useState, useEffect, useCallback } from "react"

const POLL_INTERVAL_MS = 5000

interface HealthCheckState {
    isHealthy: boolean
    isLoading: boolean
}

export function useHealthCheck(): HealthCheckState {
    const [state, setState] = useState<HealthCheckState>({
        isHealthy: false,
        isLoading: true,
    })

    const check = useCallback(async () => {
        try {
            const res = await fetch("/api/health", { cache: "no-store" })
            const data = await res.json()
            setState({ isHealthy: Boolean(data?.ok), isLoading: false })
        } catch {
            setState({ isHealthy: false, isLoading: false })
        }
    }, [])

    useEffect(() => {
        check()
        const id = setInterval(check, POLL_INTERVAL_MS)
        return () => clearInterval(id)
    }, [check])

    return state
}
