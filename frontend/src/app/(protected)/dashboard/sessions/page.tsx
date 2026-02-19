/**
 * Sessions page — lists all open/available sessions.
 */

"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { SessionList } from "./_components/session-list"
import type { Session } from "@/lib/types/openclaw"

export default function SessionsPage() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetch("/api/sessions?limit=100")
            .then((res) => res.json())
            .then((data) => {
                setSessions(Array.isArray(data) ? data : data.sessions ?? [])
            })
            .catch(() => setSessions([]))
            .finally(() => setIsLoading(false))
    }, [])

    return (
        <>
            <PageHeader
                title="Sessions"
                description="Active and available sessions across all channels."
            />
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <SessionList sessions={sessions} />
            )}
        </>
    )
}
